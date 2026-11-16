import { describe, expect, it } from "vitest";
import type { EngineClient } from "../engine/client";
import { createGame } from "../game/game";
import type { SearchResult } from "../game/types";
import { playEngineTurn } from "./engineTurn";

const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function scriptedClient(results: SearchResult[]) {
  const calls: string[] = [];
  const client: EngineClient = {
    ready: Promise.resolve(),
    beginGame() {},
    stop() {},
    search(fen) {
      calls.push(fen);
      const next = results.shift();
      if (!next) {
        return Promise.reject(new Error("missing scripted result"));
      }
      return Promise.resolve(next);
    },
  };
  return { client, calls };
}

describe("playEngineTurn", () => {
  it("applies one legal move", async () => {
    const game = createGame("white");
    const { client, calls } = scriptedClient([{ ok: true, move: { from: "e2", to: "e4" } }]);
    await expect(playEngineTurn(game, client, "easy")).resolves.toBe("applied");
    expect(calls).toEqual([startFen]);
    expect(game.snapshot().fen).not.toBe(startFen);
  });

  it("retries once after an illegal move", async () => {
    const game = createGame("white");
    const { client, calls } = scriptedClient([
      { ok: true, move: { from: "e2", to: "e5" } },
      { ok: true, move: { from: "e2", to: "e4" } },
    ]);
    await expect(playEngineTurn(game, client, "easy")).resolves.toBe("applied");
    expect(calls).toHaveLength(2);
    expect(game.snapshot().fen).toContain("4P3");
  });

  it("stalls when both replies are illegal", async () => {
    const game = createGame("white");
    const { client, calls } = scriptedClient([
      { ok: true, move: { from: "e2", to: "e5" } },
      { ok: true, move: { from: "e2", to: "e5" } },
    ]);
    await expect(playEngineTurn(game, client, "easy")).resolves.toBe("stalled");
    expect(calls).toHaveLength(2);
    expect(game.snapshot().fen).toBe(startFen);
  });

  it("stalls on timeout without a retry", async () => {
    const game = createGame("white");
    const { client, calls } = scriptedClient([{ ok: false, reason: "timeout" }]);
    await expect(playEngineTurn(game, client, "hard")).resolves.toBe("stalled");
    expect(calls).toHaveLength(1);
    expect(game.snapshot().fen).toBe(startFen);
  });

  it("stalls on a worker error without a retry", async () => {
    const game = createGame("white");
    const { client, calls } = scriptedClient([{ ok: false, reason: "error" }]);
    await expect(playEngineTurn(game, client, "easy")).resolves.toBe("stalled");
    expect(calls).toHaveLength(1);
  });

  it("retries an unparsed reply once", async () => {
    const game = createGame("white");
    const { client, calls } = scriptedClient([
      { ok: false, reason: "unparsed" },
      { ok: true, move: { from: "e2", to: "e4" } },
    ]);
    await expect(playEngineTurn(game, client, "easy")).resolves.toBe("applied");
    expect(calls).toHaveLength(2);
  });

  it("leaves the position unchanged when the search is stopped", async () => {
    const game = createGame("white");
    const { client } = scriptedClient([{ ok: false, reason: "stopped" }]);
    await expect(playEngineTurn(game, client, "easy")).resolves.toBe("stopped");
    expect(game.snapshot().fen).toBe(startFen);
  });
});
