# Chat & Message Protocol

This document extends `docs/engine.md` with the wire protocol for chat. It explains
how the shared message contracts map to game phases and which players are allowed
to speak.

## Client → Server

- `{"type":"CHAT","payload":{"gameId":string,"playerId":string,"text":string}}`  
  The server derives the channel from the current phase and sender role. Whitespace
  is trimmed and the final text must be 1–300 characters.
- `{"type":"TRIAL_CHAT","payload":{"gameId":string,"playerId":string,"text":string}}`  
  Dedicated path for the accused during `TRIAL`. Generic `CHAT` is rejected while
  a trial is in progress.

## Server → Client

- `{"type":"CHAT","payload":{"gameId":string,"playerId":string,"text":string,"channel":ChatChannel,"timestamp":number}}`  
  Broadcast whenever generic chat is allowed. `channel` is one of
  `LOBBY | DAY | NIGHT_TRAITORS | TRIAL | GAME_OVER`. `NIGHT_TRAITORS` payloads are
  only delivered to traitor sockets.
- `{"type":"TRIAL_CHAT","payload":{"gameId":string,"playerId":string,"text":string,"timestamp":number}}`  
  Broadcast to the entire room so everyone can hear the accused during a trial.

## Phase permissions

| Phase              | Who may send           | Channel          | Visibility           | Notes |
|--------------------|------------------------|------------------|----------------------|-------|
| LOBBY              | Any seated player      | `LOBBY`          | Entire room          | Pre-game banter |
| DAY_DISCUSSION     | Living players only    | `DAY`            | Entire room          | Dead players receive but cannot send |
| DAY_VERDICT        | Living players only    | `DAY`            | Entire room          | Same rules as discussion |
| TRIAL              | Accused player only    | `TRIAL_CHAT`     | Entire room          | Generic `CHAT` rejected for everyone |
| NIGHT              | Living traitors only   | `NIGHT_TRAITORS` | Traitors only        | Subjects never see these messages |
| GAME_OVER          | Any player             | `GAME_OVER`      | Entire room          | Post-game lobby chat |

## Policy summary

- `CHAT` is phase- and role-aware. Players do **not** choose channels; the server enforces
  the rules above and drops invalid attempts with `GameRuleError`.
- `TRIAL_CHAT` remains a specialized path so UI can clearly distinguish trial dialogue.
- Night chat visibility is limited to living traitors. Even though dead players can spectate,
  they do not receive traitor whispers to avoid leaking hidden roles.

## Debug-only messages

These are only honored when the server runs with `WEREWOLF_DEBUG=1` and the caller
is the current host of the game. They are intended for local UI development and
should not be exposed in production clients.

### Client → Server

- `{"type":"DEBUG_POPULATE_LOBBY","payload":{"gameId":string,"playerId":string,"totalPlayers"?:number}}`  
  Host-only. While `phase === "LOBBY"`, seeds anonymous bot players into the lobby
  until `totalPlayers` (or `minPlayers` if omitted) is reached. Also clamps
  `options.minPlayers` to `players.length` to allow tiny debug games.

- `{"type":"DEBUG_FORCE_TIMEOUT","payload":{"gameId":string,"playerId":string}}`  
  Host-only. Simulates the current phase timer firing immediately:

  - `NIGHT` → resolves night (`resolveNight`).
  - `DAY_DISCUSSION` → skips straight to night (`skipDayToNight`).
  - `TRIAL` → starts verdict (`startDayVerdict`).
  - `DAY_VERDICT` → resolves verdict (`resolveDayVerdict`).

  For other phases, the server returns `INVALID_DEBUG`.

These requests do not introduce new server → client message types; they trigger
the usual `GAME_STATE` broadcasts after the engine transitions.
