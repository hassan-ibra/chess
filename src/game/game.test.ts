import { describe, expect, it } from "vitest";
import { createGame } from "./game";

const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const whiteMates = "7k/6Q1/5K2/8/8/8/8/8 b - - 0 1";
const promotion = "8/P7/7K/8/8/8/8/k7 w - - 0 1";

describe("createGame", () => {
  it("starts at the standard position for the chosen color", () => {
    const white = createGame("white");
    expect(white.snapshot().fen).toBe(startFen);
    expect(white.isPlayerTurn()).toBe(true);

    const black = createGame("black");
    expect(black.snapshot().fen).toBe(startFen);
    expect(black.isPlayerTurn()).toBe(false);
  });

  it("applies a legal player move and ignores illegal ones", () => {
    const game = createGame("white");
    const moved = game.playerMove("e2", "e4");
    expect(moved.fen).not.toBe(startFen);
    expect(moved.lastMove).toEqual({ from: "e2", to: "e4" });

    const illegal = game.playerMove("e2", "e5");
    expect(illegal.fen).toBe(moved.fen);

    const opponentPiece = createGame("white");
    expect(opponentPiece.playerMove("e7", "e5").fen).toBe(startFen);
  });

  it("ignores a player move after the game is over", () => {
    const game = createGame("black", whiteMates);
    const before = game.snapshot().fen;
    expect(game.playerMove("h8", "g8").fen).toBe(before);
  });

  it("promotes for the player and the engine", () => {
    const byEngine = createGame("white", promotion);
    const engine = byEngine.engineMove({ from: "a7", to: "a8", promotion: "q" });
    expect(engine.ok).toBe(true);
    expect(engine.snapshot.fen).toContain("Q");

    const byPlayer = createGame("white", promotion);
    const player = byPlayer.playerMove("a7", "a8", "q");
    expect(player.fen).toContain("Q");
  });

  it("rejects an illegal engine move", () => {
    const game = createGame("white");
    const before = game.snapshot().fen;
    const result = game.engineMove({ from: "e2", to: "e5" });
    expect(result.ok).toBe(false);
    expect(result.snapshot.fen).toBe(before);
  });

  it("lists the player's legal destinations only on their turn", () => {
    const white = createGame("white");
    expect(white.legalDestinations("e2")).toEqual(expect.arrayContaining(["e3", "e4"]));

    const black = createGame("black");
    expect(black.legalDestinations("e7")).toEqual([]);
  });
});
