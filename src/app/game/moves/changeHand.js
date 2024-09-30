import constant from "../../utils/constant";

export const changeHand = ({ G, ctx }, playerID) => {
  G.players[playerID].hasChangedCard = true;

  G.players[playerID].changeQuota -= 1;
  for (let j = 0; j < constant.NB_CARD_IN_HAND; j += 1) {
    G.players[playerID].hand[j] = G.answerDeck.pop();
  }
};
