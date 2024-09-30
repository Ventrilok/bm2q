import { setup } from './setup';
import { moves } from './moves';
import { phases } from './phases';
import { isAllPlayerReady } from '../utils/utils';

const BlancMangerQQ = {
  name: 'Blanc-Manger-QQ',
  setup,
  moves,
  phases,
  endIf: ({G, ctx}) => {
    if (isAllPlayerReady(G.players)) {
      for (let i = 0; i < ctx.numPlayers; i += 1) {
        if (G.players[i].score >= G.firstAt) {
          return { winner: i };
        }
      }
    }
  },
};

export default BlancMangerQQ;
