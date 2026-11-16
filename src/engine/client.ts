import { difficultySettings } from "../game/difficulty";
import type { DifficultyName, SearchResult } from "../game/types";
import { parseBestMove } from "../game/uci";

export type EngineWorker = {
  postMessage: (message: string) => void;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: Event) => void) | null;
};

export type EngineClient = {
  ready: Promise<void>;
  beginGame: () => void;
  search: (fen: string, difficulty: DifficultyName) => Promise<SearchResult>;
  stop: () => void;
};

type PendingSearch = {
  id: number;
  resolve: (result: SearchResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

type QueuedSearch = {
  fen: string;
  difficulty: DifficultyName;
  resolve: (result: SearchResult) => void;
};

export function createEngineClient(worker: EngineWorker, timeoutMs = 5000): EngineClient {
  let generation = 0;
  let readySettled = false;
  let announced = false;
  let staleBestmoves = 0;
  let pending: PendingSearch | null = null;
  const queued: QueuedSearch[] = [];
  let resolveReady: () => void = () => {};
  let rejectReady: (reason: Event) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  void ready.catch(() => {});

  function finish(result: SearchResult) {
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    const resolve = pending.resolve;
    pending = null;
    resolve(result);
  }

  function abandonSearch(reason: "stopped" | "timeout") {
    const active = pending;
    if (active) {
      staleBestmoves += 1;
    }
    generation += 1;
    worker.postMessage("stop");
    if (active) {
      finish({ ok: false, reason });
    }
  }

  function onTimeout(id: number) {
    if (!pending || pending.id !== id) {
      return;
    }
    abandonSearch("timeout");
  }

  function rejectQueued(result: SearchResult) {
    const jobs = queued.splice(0);
    for (const job of jobs) {
      job.resolve(result);
    }
  }

  function stop() {
    abandonSearch("stopped");
    rejectQueued({ ok: false, reason: "stopped" });
  }

  function startSearch(fen: string, difficulty: DifficultyName): Promise<SearchResult> {
    if (pending) {
      abandonSearch("stopped");
    }
    generation += 1;
    const id = generation;
    const settings = difficultySettings(difficulty);
    worker.postMessage(`setoption name Skill Level value ${settings.skill}`);
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(settings.go);
    return new Promise<SearchResult>((resolve) => {
      pending = {
        id,
        resolve,
        timer: setTimeout(() => onTimeout(id), timeoutMs),
      };
    });
  }

  function flushQueued() {
    const jobs = queued.splice(0);
    for (const job of jobs) {
      void startSearch(job.fen, job.difficulty).then(job.resolve);
    }
  }

  function onMessage(event: { data: string }) {
    if (typeof event.data !== "string") {
      return;
    }
    for (const line of event.data.split("\n")) {
      const text = line.trim();
      if (text === "uciok" && !announced) {
        announced = true;
        worker.postMessage("setoption name Threads value 1");
        worker.postMessage("setoption name Hash value 16");
        worker.postMessage("isready");
      } else if (text === "readyok" && !readySettled) {
        readySettled = true;
        resolveReady();
        flushQueued();
      } else if (text.startsWith("bestmove")) {
        if (staleBestmoves > 0) {
          staleBestmoves -= 1;
          continue;
        }
        if (pending && pending.id === generation) {
          const move = parseBestMove(text);
          finish(move ? { ok: true, move } : { ok: false, reason: "unparsed" });
        }
      }
    }
  }

  function onError(event: Event) {
    if (!readySettled) {
      readySettled = true;
      rejectReady(event);
      rejectQueued({ ok: false, reason: "error" });
      return;
    }
    if (!pending) {
      return;
    }
    generation += 1;
    finish({ ok: false, reason: "error" });
  }

  worker.onmessage = onMessage;
  worker.onerror = onError;
  worker.postMessage("uci");

  return {
    ready,
    stop,
    beginGame() {
      stop();
      worker.postMessage("ucinewgame");
    },
    search(fen, difficulty) {
      if (!readySettled) {
        return new Promise<SearchResult>((resolve) => {
          queued.push({ fen, difficulty, resolve });
        });
      }
      return startSearch(fen, difficulty);
    },
  };
}
