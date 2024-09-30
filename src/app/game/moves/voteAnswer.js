export const voteAnswer = ({G, ctx,events}, selectedPlayer, playerID) => {
  G.players[selectedPlayer].score += 1;
  G.players[playerID].hasVoted = true;
  G.players[playerID].ready = true;
  events.endTurn();
};
