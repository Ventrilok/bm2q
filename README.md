# BM2Q

BM2Q (Blanc Manger 2 Questions) is a multiplayer party card game inspired by **Cards Against Humanity**, built with **Next.js**, **Tailwind CSS**, and **Colyseus** for real-time multiplayer.

Players complete fill-in-the-blank statements using offensive, absurd, or politically incorrect answer cards. The funniest answer wins the round.

> The content of this game is intentionally provocative and not politically correct. It is intended purely for entertainment among consenting adults.

---

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Colyseus](https://img.shields.io/badge/Colyseus-7B4FFF?style=for-the-badge&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Framer Motion
- **Game server**: Colyseus 0.15 (real-time multiplayer over WebSocket)
- **Language**: TypeScript (full stack)
- **Runtime**: a single Node.js process serves both the website and the game on one port
- **Deployment**: Docker / Docker Compose

## How to Play

1. One player creates a room and shares the 4-letter code
2. Other players join using the code
3. Each round, a question card with blanks is shown
4. Players pick answer cards from their hand to fill the blanks (some questions require 2 or 3 cards)
5. Everyone votes for their favorite answer (or passes if none are funny)
6. A recap shows all answers ranked by votes — winners earn +1 point (or +2 with the golden card)
7. First player to reach the target score wins

### Features

- **Multi-blank questions**: Some questions need 2 or 3 answer cards, played in order
- **Round Recap**: After voting, see all answers ranked with vote counts
- **Golden Card**: One card per match is golden — if the round winner played it, they earn +2 instead of +1
- **Vote Pass**: Skip voting if no answer makes you laugh
- **Rematch**: Host can restart with the same players after game over
- **Player Avatars**: Each player gets a persistent color + emoji avatar
- **Change Hand**: Swap your entire hand once per round (limited uses)

## Installation

### Prerequisites

- **Node.js** 22+

### Setup

```bash
git clone https://github.com/Ventrilok/bm2q.git
cd bm2q
npm install
```

## Running

### Development

```bash
npm run dev
```

Starts the website and the game server together, on a single port (default: 3000, override with `PORT`).

### Production

```bash
npm run build
NODE_ENV=production npm start
```

Same single process and port. `GET /healthz` returns `200 {"status":"ok"}` for health checks.

Logs default to `info` in production and `debug` otherwise; set `LOG_LEVEL` (`debug`, `info`, `warn`, `error`) to override.

Game state lives in memory: restarting the server ends every game in progress.

### Docker

```bash
docker compose up -d --build
```

Runs one container on `http://localhost:3000`, restarted automatically unless stopped, with a health check on `/healthz`. The container runs as a non-root user.

## Tests

```bash
npm test                                             # game tests (starts an in-process game server)
npm run typecheck                                    # TypeScript checks
SMOKE_URL=http://localhost:3000 npm run test:smoke   # against a running production server
```

`tests/known-issues.test.ts` guards against regressions of the problems found in the October 2026 review. CI (`.github/workflows/ci.yml`) runs all of the above and also builds and checks the Docker image.

## Project Structure

```
server.ts           # Production entry: website + game server on one port
src/
  server/           # Colyseus game server
    rooms/          # Game room logic (BM2QRoom)
    schema/         # Colyseus state schemas
    data/           # Game data (questions, answers, congrats)
    index.ts        # Standalone game server (used by `npm run dev:split`)
  app/              # Next.js pages
    lobby/          # Room creation/joining + game board
  components/game/  # Game UI components
  lib/              # Client hooks and utilities
  types/            # Shared TypeScript types
tests/              # Game tests and production smoke test
docs/mockups/       # Design mockups (HTML)
```

## Customizing Game Content

Edit the JSON files in `src/server/data/`:

- **`answers.json`** — Array of answer card strings
- **`questions.json`** — Array of `{ text, pick }` objects. Use `______` for blanks (the `pick` value is auto-derived from the number of blanks)
- **`congrats.json`** — Array of winner congratulation messages (use `______` as placeholder for the winner's name)

## License

This project is licensed under the MIT License.
