"use client";

import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";

import BlancMangerQQ from "../game/game";
import BlancMangerQQBoard from "../../components/board";

const BM2QClient = Client({
  game: BlancMangerQQ,
  board: BlancMangerQQBoard,
  numPlayers: 2,
  //multiplayer: SocketIO({ server: "localhost:8000" }),
  debug: false,
});

const App = () => <BM2QClient playerID="0" />;

export default App;
