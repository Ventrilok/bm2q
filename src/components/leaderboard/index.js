import React from "react";
import clsx from "clsx";

export const Leaderboard = ({ players, playerNames, pick }) => {
  const playerName = players;
  return (
    <>
      {playerName.map((player, index) => (
        <div
          className={clsx(
            "flex w-24 flex-col items-center rounded bg-white p-2 shadow-lg sm:w-32",
            players[index].ready && !players[index].hasVoted && "bg-secondary",
          )}
          key={player.name + index}
        >
          <p class="text-xs font-bold sm:text-sm md:text-base">
            {playerName[index].name}
          </p>
          <p class="text-xs sm:text-sm">Score: {players[index].score}</p>
        </div>
      ))}
    </>
  );
};
