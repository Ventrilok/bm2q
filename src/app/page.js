"use client";

import { Client } from "boardgame.io/react";
import { SocketIO, Local } from "boardgame.io/multiplayer";

import BlancMangerQQ from "./game/game";
import BlancMangerQQBoard from "../components/board";

const BM2QClient = Client({
  game: BlancMangerQQ,
  board: BlancMangerQQBoard,
  numPlayers: 2,
  //multiplayer: SocketIO({ server: 'localhost:8000' }),
  multiplayer: Local(),
  debug: true,
  // matchData: [
  //   { id: 0, name: 'Joueur 1' },
  //   { id: 1, name: 'Joueur 2' },
  // ],
});

const App = () => (
  <>
    <BM2QClient playerID="0" />
    <BM2QClient playerID="1" />
  </>
);

export default App;
