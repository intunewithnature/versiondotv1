import { GameRuleError, GameState } from "../engine/types";
import * as transitions from "../engine/transitions";

/**
 * Seeds bot players into the lobby so local dev can meet minPlayers
 * without real clients.
 *
 * - Only valid while phase === "LOBBY".
 * - Bots are anonymous SUBJECTs until roles are assigned.
 * - totalPlayers controls the desired final lobby size (including the host).
 */
export function populateLobbyWithBots(game: GameState, totalPlayers?: number): GameState {
  if (game.phase !== "LOBBY") {
    throw new GameRuleError("INVALID_DEBUG", "Can only populate lobby before the game starts");
  }

  const target = totalPlayers ?? game.options.minPlayers;
  const current = game.players.length;
  const botsNeeded = Math.max(0, target - current);

  let next = game;
  for (let i = 0; i < botsNeeded; i++) {
    const index = next.players.length + 1;
    const botId = `bot-${index}`;
    next = transitions.addPlayerToLobby(next, {
      accountId: `debug-bot-${botId}`,
      playerId: botId,
      name: `Bot ${index}`
    });
  }

  // Ensure minPlayers is not higher than current roster size so START_GAME
  // doesn't fail in tiny debug setups.
  if (next.options.minPlayers > next.players.length) {
    next = {
      ...next,
      options: { ...next.options, minPlayers: next.players.length }
    };
  }

  return next;
}
