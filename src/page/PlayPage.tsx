import { useEffect, useRef, useState } from "react";
import { createEngineClient, type EngineClient, type EngineWorker } from "../engine/client";
import { createGame, type Game, type Snapshot } from "../game/game";
import type { DifficultyName, PlayerColor, Promotion } from "../game/types";
import BoardView from "./BoardView";
import { playEngineTurn } from "./engineTurn";
import PromotionPicker from "./PromotionPicker";
import { statusLine } from "./statusLine";

const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function pieceAt(fen: string, square: string): string | null {
  const ranks = fen.split(" ")[0]?.split("/") ?? [];
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const row = ranks[8 - rank];
  if (!row || file < 0 || file > 7 || rank < 1 || rank > 8) {
    return null;
  }
  let column = 0;
  for (const char of row) {
    if (char >= "1" && char <= "8") {
      const skip = Number(char);
      if (file < column + skip) {
        return null;
      }
      column += skip;
    } else if (column === file) {
      return char;
    } else {
      column += 1;
    }
  }
  return null;
}

function isPromotion(fen: string, from: string, to: string): boolean {
  const piece = pieceAt(fen, from);
  return (piece === "P" && to[1] === "8") || (piece === "p" && to[1] === "1");
}

function fileIndex(square: string, orientation: PlayerColor): number {
  const file = square.charCodeAt(0) - 97;
  return orientation === "white" ? file : 7 - file;
}

export default function PlayPage() {
  const [load, setLoad] = useState<"loading" | "ready" | "failed">("loading");
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const [color, setColor] = useState<PlayerColor>("white");
  const [difficulty, setDifficulty] = useState<DifficultyName>("easy");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [thinking, setThinking] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);
  const clientRef = useRef<EngineClient | null>(null);
  const gameRef = useRef<Game | null>(null);
  const gameIdRef = useRef(0);
  const thinkingRef = useRef(false);

  useEffect(() => {
    const worker = new Worker("/stockfish-19-lite-single.js");
    let onmessage: EngineWorker["onmessage"] = null;
    let onerror: EngineWorker["onerror"] = null;
    const adapted: EngineWorker = {
      postMessage(message: string) {
        worker.postMessage(message);
      },
      set onmessage(fn: EngineWorker["onmessage"]) {
        onmessage = fn;
        worker.onmessage = (event: MessageEvent) => {
          onmessage?.({ data: String(event.data) });
        };
      },
      get onmessage(): EngineWorker["onmessage"] {
        return onmessage;
      },
      set onerror(fn: EngineWorker["onerror"]) {
        onerror = fn;
        worker.onerror = (event) => {
          onerror?.(event);
        };
      },
      get onerror(): EngineWorker["onerror"] {
        return onerror;
      },
    };
    const client = createEngineClient(adapted);
    clientRef.current = client;
    let active = true;
    client.ready.then(
      () => {
        if (active) {
          setLoad("ready");
        }
      },
      () => {
        if (active) {
          setLoad("failed");
        }
      },
    );
    return () => {
      active = false;
      worker.terminate();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, []);

  async function runEngine(current: Game, id: number, level: DifficultyName) {
    const client = clientRef.current;
    if (!client) {
      return;
    }
    thinkingRef.current = true;
    setThinking(true);
    const outcome = await playEngineTurn(current, client, level);
    if (gameIdRef.current !== id) {
      return;
    }
    thinkingRef.current = false;
    setThinking(false);
    setSnapshot(current.snapshot());
    if (outcome === "stalled") {
      setStalled(true);
    }
  }

  function startGame() {
    const client = clientRef.current;
    if (!client || load !== "ready") {
      return;
    }
    const next = createGame(color);
    const id = gameIdRef.current + 1;
    gameIdRef.current = id;
    gameRef.current = next;
    client.beginGame();
    setSnapshot(next.snapshot());
    setPhase("playing");
    setThinking(false);
    thinkingRef.current = false;
    setStalled(false);
    setSelected(null);
    setPromotion(null);
    if (color === "black") {
      void runEngine(next, id, difficulty);
    }
  }

  function newGame() {
    clientRef.current?.stop();
    gameIdRef.current += 1;
    gameRef.current = null;
    thinkingRef.current = false;
    setPhase("setup");
    setSnapshot(null);
    setThinking(false);
    setStalled(false);
    setSelected(null);
    setPromotion(null);
  }

  function requestMove(from: string, to: string): boolean {
    const current = gameRef.current;
    if (!current || phase !== "playing" || thinkingRef.current || stalled || promotion) {
      return false;
    }
    const before = current.snapshot();
    if (before.over || !current.legalDestinations(from).includes(to)) {
      return false;
    }
    if (isPromotion(before.fen, from, to)) {
      setPromotion({ from, to });
      setSelected(null);
      return true;
    }
    const after = current.playerMove(from, to);
    if (after.fen === before.fen) {
      return false;
    }
    setSnapshot(after);
    setSelected(null);
    if (!after.over) {
      void runEngine(current, gameIdRef.current, difficulty);
    }
    return true;
  }

  function choosePromotion(piece: Promotion) {
    const current = gameRef.current;
    if (!current || !promotion) {
      return;
    }
    const before = current.snapshot().fen;
    const after = current.playerMove(promotion.from, promotion.to, piece);
    setPromotion(null);
    if (after.fen === before) {
      return;
    }
    setSnapshot(after);
    if (!after.over) {
      void runEngine(current, gameIdRef.current, difficulty);
    }
  }

  const playing = phase === "playing" && snapshot;
  const locked = !playing || thinking || stalled || snapshot?.over === true || promotion !== null;
  const orientation = playing ? snapshot.playerColor : color;
  const line = statusLine({
    phase: playing ? "game" : "setup",
    loadFailed: load === "failed",
    stalled,
    thinking,
    result: snapshot?.result ?? null,
    inCheck: snapshot?.inCheck ?? false,
  });

  return (
    <main className="page">
      <h1>Chess</h1>
      <p className="status" aria-live="polite">
        {line}
      </p>
      <div className="board-wrap">
        <BoardView
          fen={playing ? snapshot.fen : startFen}
          orientation={orientation}
          locked={locked}
          selected={selected}
          destinations={selected && playing ? gameRef.current?.legalDestinations(selected) ?? [] : []}
          lastMove={playing ? snapshot.lastMove : null}
          onSelect={(square) => {
            const current = gameRef.current;
            if (!square || !current || current.legalDestinations(square).length === 0) {
              setSelected(null);
              return;
            }
            setSelected(square);
          }}
          onMove={requestMove}
        />
        {promotion ? (
          <div className="promotion-anchor" style={{ left: `${fileIndex(promotion.to, orientation) * 12.5}%` }}>
            <PromotionPicker onChoose={choosePromotion} onCancel={() => setPromotion(null)} />
          </div>
        ) : null}
      </div>
      {phase === "setup" ? (
        <div className="choices">
          <fieldset>
            <legend>Color</legend>
            <label>
              <input
                type="radio"
                name="color"
                checked={color === "white"}
                onChange={() => setColor("white")}
              />
              White
            </label>
            <label>
              <input
                type="radio"
                name="color"
                checked={color === "black"}
                onChange={() => setColor("black")}
              />
              Black
            </label>
          </fieldset>
          <fieldset>
            <legend>Difficulty</legend>
            {(["easy", "medium", "hard"] as const).map((level) => (
              <label key={level}>
                <input
                  type="radio"
                  name="difficulty"
                  checked={difficulty === level}
                  onChange={() => setDifficulty(level)}
                />
                {level[0]?.toUpperCase()}
                {level.slice(1)}
              </label>
            ))}
          </fieldset>
          <button type="button" onClick={startGame} disabled={load !== "ready"}>
            Start
          </button>
        </div>
      ) : (
        <button type="button" onClick={newGame}>
          New Game
        </button>
      )}
      <footer>Opponent: Stockfish (GPL-3.0)</footer>
    </main>
  );
}
