export function statusLine(input: {
  phase: "setup" | "game";
  loadFailed: boolean;
  stalled: boolean;
  thinking: boolean;
  result: string | null;
  inCheck: boolean;
}): string {
  if (input.phase === "setup") {
    return input.loadFailed ? "The opponent failed to load." : "";
  }
  if (input.result) {
    return input.result;
  }
  if (input.stalled) {
    return "Stockfish stalled.";
  }
  if (input.thinking) {
    return "Stockfish is thinking.";
  }
  if (input.inCheck) {
    return "Check.";
  }
  return "Your turn.";
}
