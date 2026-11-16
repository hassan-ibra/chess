import type { EngineClient } from "../engine/client";
import type { Game } from "../game/game";
import type { DifficultyName, SearchResult } from "../game/types";

type TurnOutcome = "applied" | "stalled" | "stopped" | "retry";

function outcome(game: Game, result: SearchResult): TurnOutcome {
  if (!result.ok) {
    if (result.reason === "stopped") {
      return "stopped";
    }
    if (result.reason === "unparsed") {
      return "retry";
    }
    return "stalled";
  }
  return game.engineMove(result.move).ok ? "applied" : "retry";
}

export async function playEngineTurn(
  game: Game,
  client: EngineClient,
  difficulty: DifficultyName,
): Promise<"applied" | "stalled" | "stopped"> {
  const first = outcome(game, await client.search(game.snapshot().fen, difficulty));
  if (first !== "retry") {
    return first;
  }
  const second = outcome(game, await client.search(game.snapshot().fen, difficulty));
  return second === "retry" ? "stalled" : second;
}
