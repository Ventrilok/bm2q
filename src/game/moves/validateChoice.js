export const validateChoice = ({G, ctx, events}, playerID) => {
  G.players[playerID].ready = true;
  events.endTurn();
};
