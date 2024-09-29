import { moves } from '../moves';
import { isAllPlayerReady } from '../../utils/utils';

export const ready = {
  start: true,
  next: 'play',
  moves: {
    ready: moves.ready,
  },
  onBegin: ({G, ctx}) => {
    moves.ready(G, ctx);
  },
  onEnd: ({G, ctx}) => {
    for (let i = 0; i < ctx.numPlayers; i += 1) {
      G.players[i].ready = false;
    }
    return G;
  },
  endIf: ({G}) => isAllPlayerReady(G.players),
};
