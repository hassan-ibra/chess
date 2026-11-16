export type DifficultyName = "easy" | "medium" | "hard";
export type Difficulty = { name: DifficultyName; skill: number; go: string };
export type Promotion = "q" | "r" | "b" | "n";
export type UciMove = { from: string; to: string; promotion?: Promotion };
export type PlayerColor = "white" | "black";
export type SearchResult =
  | { ok: true; move: UciMove }
  | { ok: false; reason: "timeout" | "error" | "stopped" | "unparsed" };
