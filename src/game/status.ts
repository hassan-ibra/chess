import type { Chess } from "chess.js";

export function resultText(chess: Chess): string | null {
  if (chess.isCheckmate()) {
    return chess.turn() === "b" ? "Checkmate. White wins." : "Checkmate. Black wins.";
  }
  if (chess.isStalemate()) {
    return "Stalemate.";
  }
  if (chess.isThreefoldRepetition()) {
    return "Draw by threefold repetition.";
  }
  if (chess.isInsufficientMaterial()) {
    return "Draw by insufficient material.";
  }
  const halfmove = Number(chess.fen().split(" ")[4]);
  if (halfmove >= 100) {
    return "Draw by the fifty-move rule.";
  }
  return null;
}
