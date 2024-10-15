# BM2Q

BM2Q is a personal version of **Cards Against Humanity**, developed during the COVID lockdown and later migrated to **Next.js**, **Tailwind CSS** with **DaisyUI**.

We are well aware that the game is not politically correct and can be offensive to some people. The content of the game is not endorsed by us, and it is intended purely for entertainment purposes.

---

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![DaisyUI](https://img.shields.io/badge/DaisyUI-5A29E4?style=for-the-badge&logo=daisyui&logoColor=white)
![Boardgame.io](https://img.shields.io/badge/Boardgame.io-FF7E00?style=for-the-badge&logo=boardgame.io&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## Game Rules

The game is a simple card game where players complete fill-in-the-blank statements using words or phrases typically deemed as offensive, risqué, or politically incorrect printed on playing cards.

---

## Installation

### Prerequisites

- **Node.js** (version <= 21)

To check if Node.js is installed and confirm the version, run:

```bash
node -v
```

### Steps

1. Clone the repository:

```bash
git clone https://github.com/yourusername/BM2Q.git
```

2. Navigate to the project directory:

```bash
cd BM2Q
```

3. Install the dependencies:

```bash
npm install
```

## Running the Project

To run the application, you'll need to start both the server and the client.

1. Run the server:

```bash
npm run serve
```

This will start the backend server, which handles game logic and serves static files (port 8000).

2. Run the client:

Open a separate terminal window and run:

```bash
npm run start
```

This will start the game development server, and you can access the application at http://localhost:3000.

Ensure both the server and client are running for the application to work correctly.

### Docker

A Dockerfile and `docker-compose.yml` are provided to build and run the application in a container.

1. Build the Docker image:

```bash
docker compose build
```

2. Run the Docker container:

```bash
docker compose up
```

The application will be accessible at http://localhost:3000.

To stop the Docker container, run:

```bash
docker compose down
```

## How to Play BM2Q

Once the game is running, retrieve the IP hosting the game and ask your players to connect via `http://<IP_HOSTING_THE_GAME>:3000`.

Players will enter a lobby where they can create or join games. Once a game is started, the game master will start the game and players will join.

Each turn, a card with blanks will be displayed. Players will choose the best answer from their hand to complete the sentence. All players then vote on the best answer, and the player with the most votes wins the round.

## Personalize the Game

You can personalize the game by editing the following files in the `/src/app/data` folder:

- answers.json
- congrats.json
- questions.json
- questions2.json

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Known Issues & TODOs

- UI improvements needed for a more polished experience
- Player names are not passed into the game, displaying the default "Joueur x" in the leaderboard
- Multi-answer sets should be integrated (feature exists but untested)

## Useful Links

- [Cards Against Humanity](https://cardsagainsthumanity.com/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [DaisyUI](https://daisyui.com/)
- [Boardgame.io](https://boardgame.io/)
