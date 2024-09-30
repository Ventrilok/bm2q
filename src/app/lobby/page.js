"use client";
import React, { useState } from "react";
import { Lobby } from "boardgame.io/react";
import BlancMangerQQ from "../game/game";
import BlancMangerQQBoard from "../../components/board";

// Replace TypeScript enum with a plain object
const LobbyPhases = {
  ENTER: "enter",
  PLAY: "play",
  LIST: "list",
};

const port = process.env.REACT_APP_PORT;

const BM2QLobby = () => {
  const { protocol, hostname, port } = window.location;
  const server = `${protocol}//${hostname}:${port == 3000 ? 8000 : port}`;
  return (
    <Lobby
      gameServer={server}
      lobbyServer={server}
      debug={true}
      gameComponents={[{ game: BlancMangerQQ, board: BlancMangerQQBoard }]}
      renderer={(L) => {
        return (
          <div className="absolute h-full w-full bg-green-900">
            {L.phase === LobbyPhases.ENTER && <EnterLobbyView L={L} />}
            {L.phase === LobbyPhases.LIST && <ListGamesView L={L} />}
            {L.phase === LobbyPhases.PLAY && <RunningMatchView L={L} />}

            {/* {L.errorMsg && (
              <div className="absolute bottom-5 left-0 right-0 flex justify-center">
                <div className=" text-center rounded-md bg-red-700 w-2/3 max-w-sm shadow-2xl p-4">
                  ⚠️{L.errorMsg}
                </div>
              </div>
            )} */}
          </div>
        );
      }}
    />
  );
};

const EnterLobbyView = ({ L }) => {
  const [playerName, setPlayerName] = useState(L.playerName);
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100">
      <div className="w-full max-w-xs rounded-lg bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-center text-2xl font-bold">Enter Your Name</h1>
        <form>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
              placeholder="Your Name"
              value={playerName}
              onFocus={() => {
                setPlayerName("");
              }}
              onChange={(e) => {
                setPlayerName(e.target.value);
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && playerName !== "") {
                  L.handleEnterLobby(playerName);
                }
              }}
            />
          </div>
          <button
            type="submit"
            className="focus:shadow-outline w-full rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
            onClick={() => {
              if (playerName !== "") {
                L.handleEnterLobby(playerName);
              }
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};

const ListGamesView = ({ L }) => {
  const [numPlayers, setNumPlayers] = useState(2);
  const matches = [];
  const seen = new Set();
  for (const m of L.matches) {
    if (!seen.has(m.matchID)) {
      matches.push(m);
      seen.add(m.matchID);
    }
  }

  return (
    <div className="p-2">
      <button
        type="submit"
        className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
        onClick={() => {
          L.handleExitLobby();
        }}
      >
        Leave Lobby
      </button>
      <div className="flex w-full justify-center">
        <div className="max-w-lg flex-grow">
          <div className="text-center">Hi {L.playerName}!</div>
          <div className="flex items-center justify-evenly gap-1">
            <label htmlFor="playerCount">Players:</label>
            <select
              className="flex-grow text-primary-content"
              name="playerCount"
              id="playerCountSelect"
              defaultValue={"2"}
              onChange={({ target: { value } }) => {
                setNumPlayers(parseInt(value));
              }}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
            </select>
            <button
              type="submit"
              className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
              onClick={() => {
                L.handleCreateMatch(L.gameComponents[0].game.name, numPlayers);
              }}
            >
              Create Match
            </button>
          </div>

          <div className="text-lg">Join a Match</div>
          {matches.map((m) => (
            <div
              className="flex items-center justify-between gap-3 border-b-2 border-black"
              key={m.matchID}
            >
              <div>{m.gameName}</div>
              <div>{m.players.map((p) => p.name ?? "[free]").join(", ")}</div>
              {createMatchButtons(L, m, numPlayers)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const RunningMatchView = ({ L }) => {
  return (
    <div>
      {L.runningMatch && (
        <L.runningMatch.app
          matchID={L.runningMatch.matchID}
          playerID={L.runningMatch.playerID}
          credentials={L.runningMatch.credentials}
        />
      )}
      <div className="absolute">
        <button
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
          onClick={() => {
            L.handleExitMatch();
          }}
        >
          Exit
        </button>
      </div>
    </div>
  );
};

function createMatchButtons(L, m, numPlayers) {
  const playerSeat = m.players.find((p) => p.name === L.playerName);
  const freeSeat = m.players.find((p) => !p.name);
  if (playerSeat && freeSeat) {
    return (
      <button
        type="submit"
        className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
        onClick={() => {
          L.handleLeaveMatch(m.gameName, m.matchID);
        }}
      >
        Leave
      </button>
    );
  }
  if (freeSeat) {
    return (
      <button
        type="submit"
        className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
        onClick={() => {
          L.handleJoinMatch(m.gameName, m.matchID, "" + freeSeat.id);
        }}
      >
        Join
      </button>
    );
  }
  if (playerSeat) {
    return (
      <>
        <button
          type="submit"
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
          onClick={() => {
            L.handleStartMatch(m.gameName, {
              numPlayers,
              playerID: "" + playerSeat.id,
              matchID: m.matchID,
            });
          }}
        >
          Play
        </button>
        <button
          type="submit"
          className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
          onClick={() => {
            L.handleLeaveMatch(m.gameName, m.matchID);
          }}
        >
          Leave
        </button>
      </>
    );
  }
  return <div>Match In Progress...</div>;
}

export default BM2QLobby;
