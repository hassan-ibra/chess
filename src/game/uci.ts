import type { Promotion, UciMove } from "./types";

const movePattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function parseBestMove(line: string): UciMove | null {
  const [command, move] = line.trim().split(/\s+/);
  if (command !== "bestmove" || !move || !movePattern.test(move)) {
    return null;
  }

  const parsed: UciMove = { from: move.slice(0, 2), to: move.slice(2, 4) };
  if (move.length === 5) {
    parsed.promotion = move[4] as Promotion;
  }
  return parsed;
}
