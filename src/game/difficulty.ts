import type { Difficulty, DifficultyName } from "./types";

const settings: Record<DifficultyName, Difficulty> = {
  easy: { name: "easy", skill: 0, go: "go depth 2" },
  medium: { name: "medium", skill: 8, go: "go movetime 250" },
  hard: { name: "hard", skill: 20, go: "go movetime 800" },
};

export function difficultySettings(name: DifficultyName): Difficulty {
  return settings[name];
}
