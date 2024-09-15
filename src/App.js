import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer'

import BlancMangerQQ from './game/game';
import BlancMangerQQBoard from './components/board';

const BM2QClient = Client({
  game: BlancMangerQQ,
  board: BlancMangerQQBoard,
  numPlayers: 2,
  multiplayer: SocketIO({ server: 'localhost:8000' }),
  debug: true,
  // matchData: [
  //   { id: 0, name: 'Joueur 1' },
  //   { id: 1, name: 'Joueur 2' },
  // ],
});


const App = () => (
  <div>
    <BM2QClient playerID="0" />
  </div>
);

export default App;
