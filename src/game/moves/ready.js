import { size, isNil } from 'lodash';
import constant from '../../utils/constant';

export const ready = (G, ctx) => {
  console.log(G)
  if (size(G.questionDeck) > 0) {
    G.nbRound += 1;
    G.currentQuestion = G.questionDeck.pop();

    // Distribute new card for every removed card
    for (let i = 0; i < ctx.numPlayers; i += 1) {
      // remove previously played card if any
      if (G.players[i].selectedCards.length > 0) {
        G.players[i].hand.splice(G.players[i].selectedCards, 1, null);

        G.players[i].selectedCards = [];
        G.players[i].hasVoted = false;
      }

      // Bonus of changing cards
      if (G.players[i].changeQuota > 0) {
        G.players[i].hasChangedCard = false;
      }

      // Distribute the cards
      for (let j = 0; j < constant.NB_CARD_IN_HAND; j += 1) {
        if (isNil(G.players[i].hand[j])) {
          G.players[i].hand[j] = G.answerDeck.pop();
        }
      }
      G.players[i].ready = true;
    }
  } else {
    //ctx.events.endGame({winnerIDs: winnerIDs})
    ctx.events.endGame();
  }
};
