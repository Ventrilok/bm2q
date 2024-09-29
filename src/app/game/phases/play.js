import { Stage } from 'boardgame.io/core';
import { moves } from '../moves';
import { isAllPlayerReady } from '../../utils/utils';

export const play = {
  next: 'vote',
  moves: {
    playCard: moves.playCard,
    changeHand: moves.changeHand,
    validateChoice: moves.validateChoice,
  },
  turn: {
    activePlayers: { all: Stage.NULL },
  },
  onEnd: ({G, ctx}) => {
    for (let i = 0; i < ctx.numPlayers; i += 1) {
      G.players[i].ready = false;
    }
    return G;
  },
  endIf: ({G}) => isAllPlayerReady(G.players),
};
