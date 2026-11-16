import { Chess, type Square } from "chess.js";
import { resultText } from "./status";
import type { PlayerColor, Promotion, UciMove } from "./types";

export type Snapshot = {
  fen: string;
  turn: "w" | "b";
  playerColor: PlayerColor;
  inCheck: boolean;
  over: boolean;
  result: string | null;
  lastMove: { from: string; to: string } | null;
};

export type Game = {
  snapshot: () => Snapshot;
  isPlayerTurn: () => boolean;
  legalDestinations: (square: string) => string[];
  playerMove: (from: string, to: string, promotion?: Promotion) => Snapshot;
  engineMove: (move: UciMove) => { ok: boolean; snapshot: Snapshot };
};

export function createGame(playerColor: PlayerColor, fen?: string): Game {
  const chess = fen ? new Chess(fen) : new Chess();
  let lastMove: Snapshot["lastMove"] = null;

  function snapshot(): Snapshot {
    const result = resultText(chess);
    return {
      fen: chess.fen(),
      turn: chess.turn(),
      playerColor,
      inCheck: chess.isCheck(),
      over: result !== null,
      result,
      lastMove,
    };
  }

  function isPlayerTurn(): boolean {
    return (
      (playerColor === "white" && chess.turn() === "w") ||
      (playerColor === "black" && chess.turn() === "b")
    );
  }

  function apply(from: string, to: string, promotion?: Promotion): boolean {
    if (snapshot().over) {
      return false;
    }
    try {
      chess.move({ from: from as Square, to: to as Square, promotion });
      lastMove = { from, to };
      return true;
    } catch {
      return false;
    }
  }

  return {
    snapshot,
    isPlayerTurn,
    legalDestinations(square: string): string[] {
      if (!isPlayerTurn() || snapshot().over) {
        return [];
      }
      return chess.moves({ square: square as Square, verbose: true }).map((move) => move.to);
    },
    playerMove(from, to, promotion) {
      if (isPlayerTurn()) {
        apply(from, to, promotion);
      }
      return snapshot();
    },
    engineMove(move) {
      const ok = apply(move.from, move.to, move.promotion);
      return { ok, snapshot: snapshot() };
    },
  };
}
