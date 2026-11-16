import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { resultText } from "./status";

describe("resultText", () => {
  it("names the winner of a checkmate", () => {
    expect(resultText(new Chess("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1"))).toBe("Checkmate. White wins.");
    expect(resultText(new Chess("7K/6q1/5k2/8/8/8/8/8 w - - 0 1"))).toBe("Checkmate. Black wins.");
  });

  it("names stalemate", () => {
    expect(resultText(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"))).toBe("Stalemate.");
  });

  it("names insufficient material", () => {
    expect(resultText(new Chess("8/8/8/8/8/8/4k3/4K3 w - - 0 1"))).toBe("Draw by insufficient material.");
  });

  it("names the fifty-move rule", () => {
    expect(resultText(new Chess("8/8/8/8/4k3/8/4P3/4K3 w - - 100 80"))).toBe(
      "Draw by the fifty-move rule.",
    );
  });

  it("names threefold repetition", () => {
    const chess = new Chess();
    for (const san of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) {
      chess.move(san);
    }
    expect(resultText(chess)).toBe("Draw by threefold repetition.");
  });

  it("returns null while the game is going", () => {
    expect(resultText(new Chess())).toBeNull();
  });
});
