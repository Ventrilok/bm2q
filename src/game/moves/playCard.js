export const playCard = ({G, ctx}, uid, playerID) => {
  const indexHand = G.players[playerID].hand.findIndex((item) => item.uid === uid);
  const indexSelected = G.players[playerID].selectedCards.findIndex((item) => item.uid === uid);
  const playedCard = G.players[playerID].hand[indexHand];

  if (G.currentQuestion.pick !== G.players[playerID].selectedCards.length.toString()) {
    console.log('on continue de jouer');
    if (indexSelected === -1) {
      G.players[playerID].selectedCards.push(playedCard);
    } else {
      G.players[playerID].selectedCards.splice(indexSelected, 1);
    }
  } else {
    console.log('on a pris toutes les cartes, on enlève seulemnt');
    if (indexSelected !== -1) {
      G.players[playerID].selectedCards.splice(indexSelected, 1);
    }
  }
};
