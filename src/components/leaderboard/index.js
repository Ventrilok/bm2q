import React from "react";
import clsx from "clsx";

export const Leaderboard = ({ players, playerNames, pick }) => {
  const playerName = players;
  return (
    <>
      {playerName.map((player, index) => (
        <div
          className={clsx(
            "flex w-24 flex-col items-center rounded p-2 shadow-lg sm:w-32",
            players[index].ready && "bg-secondary",
            !players[index].ready && "bg-white",
          )}
          key={player.name + index}
        >
          <p className="text-xs font-bold sm:text-sm md:text-base">
            {playerName[index].name}
          </p>
          <p className="text-xs sm:text-sm">Score: {players[index].score}</p>
        </div>
      ))}
    </>
  );
};
