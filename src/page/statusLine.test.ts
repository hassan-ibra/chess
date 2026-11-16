import { describe, expect, it } from "vitest";
import { statusLine } from "./statusLine";

const playing = {
  phase: "game" as const,
  loadFailed: false,
  stalled: false,
  thinking: false,
  result: null,
  inCheck: false,
};

describe("statusLine", () => {
  it("stays empty during setup until the engine fails to load", () => {
    expect(statusLine({ ...playing, phase: "setup" })).toBe("");
    expect(statusLine({ ...playing, phase: "setup", loadFailed: true })).toBe(
      "The opponent failed to load.",
    );
  });

  it("follows the game priority", () => {
    expect(
      statusLine({
        ...playing,
        result: "Checkmate. White wins.",
        stalled: true,
        thinking: true,
        inCheck: true,
      }),
    ).toBe("Checkmate. White wins.");
    expect(statusLine({ ...playing, stalled: true, thinking: true, inCheck: true })).toBe(
      "Stockfish stalled.",
    );
    expect(statusLine({ ...playing, thinking: true, inCheck: true })).toBe("Stockfish is thinking.");
    expect(statusLine({ ...playing, inCheck: true })).toBe("Check.");
    expect(statusLine(playing)).toBe("Your turn.");
  });
});
