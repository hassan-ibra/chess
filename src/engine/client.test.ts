import { afterEach, describe, expect, it, vi } from "vitest";
import { createEngineClient, type EngineWorker } from "./client";

const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function fakeWorker() {
  const sent: string[] = [];
  let messageHandler: EngineWorker["onmessage"] = null;
  let errorHandler: EngineWorker["onerror"] = null;
  const worker: EngineWorker & {
    sent: string[];
    emit: (data: string) => void;
    fail: () => void;
  } = {
    sent,
    postMessage(message: string) {
      sent.push(message);
    },
    set onmessage(fn) {
      messageHandler = fn;
    },
    get onmessage() {
      return messageHandler;
    },
    set onerror(fn) {
      errorHandler = fn;
    },
    get onerror() {
      return errorHandler;
    },
    emit(data: string) {
      messageHandler?.({ data });
    },
    fail() {
      errorHandler?.(new Event("error"));
    },
  };
  return worker;
}

async function readyClient() {
  const worker = fakeWorker();
  const client = createEngineClient(worker);
  expect(worker.sent[0]).toBe("uci");
  worker.emit("uciok");
  expect(worker.sent).toContain("setoption name Threads value 1");
  expect(worker.sent).toContain("setoption name Hash value 16");
  expect(worker.sent).toContain("isready");
  worker.emit("readyok");
  await client.ready;
  return { client, worker };
}

describe("createEngineClient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("becomes ready after uci and isready", async () => {
    const { client } = await readyClient();
    await expect(client.ready).resolves.toBeUndefined();
  });

  it("rejects ready when the worker errors first", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker);
    const ready = client.ready;
    worker.fail();
    await expect(ready).rejects.toBeInstanceOf(Event);
  });

  it("returns the parsed best move for a search", async () => {
    const { client, worker } = await readyClient();
    const pending = client.search(fen, "easy");
    expect(worker.sent).toContain("setoption name Skill Level value 0");
    expect(worker.sent).toContain(`position fen ${fen}`);
    expect(worker.sent).toContain("go depth 2");
    worker.emit("bestmove e2e4 ponder e7e5");
    await expect(pending).resolves.toEqual({ ok: true, move: { from: "e2", to: "e4" } });
  });

  it("uses the medium and hard go commands", async () => {
    const { client, worker } = await readyClient();
    const medium = client.search(fen, "medium");
    expect(worker.sent).toContain("go movetime 250");
    worker.emit("bestmove e2e4");
    await medium;

    const hard = client.search(fen, "hard");
    expect(worker.sent).toContain("go movetime 800");
    worker.emit("bestmove e2e4");
    await hard;
  });

  it("treats bestmove none as unparsed", async () => {
    const { client, worker } = await readyClient();
    const pending = client.search(fen, "easy");
    worker.emit("bestmove (none)");
    await expect(pending).resolves.toEqual({ ok: false, reason: "unparsed" });
  });

  it("ignores a bestmove after stop", async () => {
    const { client, worker } = await readyClient();
    const pending = client.search(fen, "easy");
    client.stop();
    worker.emit("bestmove e2e4");
    await expect(pending).resolves.toEqual({ ok: false, reason: "stopped" });
    expect(worker.sent).toContain("stop");
  });

  it("times out and ignores a late bestmove", async () => {
    vi.useFakeTimers();
    const { client, worker } = await readyClient();
    const pending = client.search(fen, "hard");
    await vi.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toEqual({ ok: false, reason: "timeout" });
    expect(worker.sent).toContain("stop");

    worker.emit("bestmove e2e4");
    const next = client.search(fen, "easy");
    worker.emit("bestmove g1f3");
    await expect(next).resolves.toEqual({ ok: true, move: { from: "g1", to: "f3" } });
  });

  it("starts a new game and stops the current search", async () => {
    const { client, worker } = await readyClient();
    const pending = client.search(fen, "easy");
    client.beginGame();
    await expect(pending).resolves.toEqual({ ok: false, reason: "stopped" });
    expect(worker.sent).toContain("stop");
    expect(worker.sent).toContain("ucinewgame");
  });

  it("fails an in-flight search when the worker errors", async () => {
    const { client, worker } = await readyClient();
    const pending = client.search(fen, "easy");
    worker.fail();
    await expect(pending).resolves.toEqual({ ok: false, reason: "error" });
  });
});
