import { nanoid } from 'nanoid';
import constant from '../utils/constant';
import questions from '../data/questions2.json';
import answers from '../data/answers.json';
import congrats from '../data/congrats.json';

const createPlayer = (idx) => ({
  id: idx,
  name: `Joueur ${idx}`,
  ready: false,
  score: 0,
  selectedCards: new Array(1),
  hasChangedCard: false,
  changeQuota: 2,
  hasVoted: false,
  hand: new Array(constant.NB_CARD_IN_HAND),
});

function createPlayers(num) {
  const players = [];
  for (let i = 0; i < num; i += 1) {
    players[i] = createPlayer(i);
  }

  return players;
}

export function setup({ctx,random}) {
  const Game = {
    firstAt: ctx.numPlayers >= 4 ? ctx.numPlayers * 4 : 15,
    nbRound: 0,
    seed: nanoid(random.Die(40)),
    randomizedPlayersOrder: [],
    currentQuestion: '',
    players: createPlayers(ctx.numPlayers),
    questionDeck: random.Shuffle(questions),
    answerDeck: random.Shuffle(
      answers.map((text) => ({ text, uid: nanoid(10) })),
    ),
    congrats: random.Shuffle(congrats).pop(),
  };

  return Game;
}
