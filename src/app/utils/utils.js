export const isAllPlayerReady = (players) => {
  for (let i = 0; i < players.length; i += 1) {
    if (!players[i].ready) {
      return false;
    }
  }
  return true;
};
