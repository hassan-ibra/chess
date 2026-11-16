import { describe, expect, it } from "vitest";
import { difficultySettings } from "./difficulty";

describe("difficultySettings", () => {
  it("maps the three levels", () => {
    expect(difficultySettings("easy")).toEqual({ name: "easy", skill: 0, go: "go depth 2" });
    expect(difficultySettings("medium")).toEqual({ name: "medium", skill: 8, go: "go movetime 250" });
    expect(difficultySettings("hard")).toEqual({ name: "hard", skill: 20, go: "go movetime 800" });
  });
});
