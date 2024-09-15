import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSkull } from '@fortawesome/free-solid-svg-icons';

export const Leaderboard = ({ players, playerNames, pick }) => {
  const playerName = players;
  return (
    <ul className="divide-y divide-gray-100">
      {playerName.map((player, index) => (
        <article key={player.name + index} className="p-4 flex space-x-4">
          <div className="flex justify-between items-center w-full">
            <div className="avatar placeholder">
              <div className="bg-neutral-focus text-neutral-content rounded-full w-10 h-10">
                <FontAwesomeIcon icon={faSkull} color={players[index].ready && !players[index].hasVoted ? '#C9BB3C' : '#ffffff'} size="lg" />
              </div>
            </div>
            <div className="text-neutral text-xl">{playerName[index].name}</div>
            <div className="avatar placeholder">
              <div className="bg-neutral-focus text-neutral-content rounded-full w-10 h-10">{players[index].score}</div>
            </div>
          </div>
        </article>
      ))}
    </ul>
  );
};
