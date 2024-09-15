import { Stage } from 'boardgame.io/core';
import { moves } from '../moves';
import { isAllPlayerReady } from '../../utils/utils';

export const vote = {
  next: 'ready',
  moves: {
    voteAnswer: moves.voteAnswer,
  },
  turn: {
    activePlayers: { all: Stage.NULL, moveLimit: 1 },
  },
  onBegin: ({G, ctx,random}) => {
    G.randomizedPlayersOrder = random.Shuffle(ctx.playOrder);
  },
  onEnd: ({G, ctx}) => {
    for (let i = 0; i < ctx.numPlayers; i += 1) {
      G.players[i].ready = false;
    }
    G.randomizedPlayersOrder = [];
    return G;
  },
  endIf: ({G}) => isAllPlayerReady(G.players),
};
