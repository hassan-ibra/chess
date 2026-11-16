import { describe, expect, it } from "vitest";
import { parseBestMove } from "./uci";

describe("parseBestMove", () => {
  it("reads a move and ignores ponder", () => {
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toEqual({ from: "e2", to: "e4" });
  });

  it("reads a promotion letter", () => {
    expect(parseBestMove("bestmove e7e8q")).toEqual({ from: "e7", to: "e8", promotion: "q" });
  });

  it("rejects none and non-move lines", () => {
    expect(parseBestMove("bestmove (none)")).toBeNull();
    expect(parseBestMove("info depth 2 score cp 20")).toBeNull();
  });
});
