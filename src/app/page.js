"use client";
import React, { useState } from "react";
import { Lobby } from "boardgame.io/react";
import BlancMangerQQ from "./game/game";
import BlancMangerQQBoard from "../components/board";

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
      refreshInterval={2500}
      gameComponents={[{ game: BlancMangerQQ, board: BlancMangerQQBoard }]}
      renderer={(L) => {
        return (
          <div className="absolute h-full w-full">
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
        <h1 className="mb-4 text-center text-2xl font-bold">Entre ton nom</h1>
        <form>
          <div className="mb-4">
            <input
              type="text"
              id="name"
              name="name"
              className="input w-full max-w-xs"
              placeholder="Ton nom ici"
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
            className="btn btn-accent btn-active w-full"
            onClick={() => {
              if (playerName !== "") {
                L.handleEnterLobby(playerName);
              }
            }}
          >
            Entrer
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
        className="btn btn-error btn-xs sm:btn-sm"
        onClick={() => {
          L.handleExitLobby();
        }}
      >
        Quitter
      </button>
      <div className="flex w-full justify-center bg-base-100">
        <div className="max-w-lg flex-grow">
          <div className="mb-5 text-center">Salut {L.playerName}!</div>
          <div className="flex items-center justify-evenly gap-1">
            <select
              className="select select-bordered select-sm w-full max-w-xs"
              name="playerCount"
              id="playerCountSelect"
              defaultValue={"2"}
              onChange={({ target: { value } }) => {
                setNumPlayers(parseInt(value));
              }}
            >
              <option disabled selected>
                Nombre de joueur
              </option>

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
              className="btn btn-primary btn-xs sm:btn-sm"
              onClick={() => {
                L.handleCreateMatch(L.gameComponents[0].game.name, numPlayers);
              }}
            >
              Créer une partie
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Partie</th>
                  <th>Joueurs</th>
                  <th></th>
                </tr>
              </thead>
              {matches.map((m) => (
                <tr key={m.matchID}>
                  <td>{m.matchID}</td>
                  <td>
                    {m.players.map((p, index) => (
                      <span
                        key={index}
                        className={`badge m-2 ${p.name ? "badge-primary" : "badge-secondary"}`}
                      >
                        {p.name ?? "libre"}
                      </span>
                    ))}
                  </td>
                  <td>{createMatchButtons(L, m, numPlayers)}</td>
                </tr>
              ))}
            </table>
          </div>
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
          className="btn btn-error btn-xs sm:btn-sm"
          onClick={() => {
            L.handleExitMatch();
          }}
        >
          Quitter
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
        className="btn btn-error btn-xs sm:btn-sm"
        onClick={() => {
          L.handleLeaveMatch(m.gameName, m.matchID);
        }}
      >
        Sortir
      </button>
    );
  }
  if (freeSeat) {
    return (
      <button
        type="submit"
        className="btn btn-success btn-xs sm:btn-sm"
        onClick={() => {
          L.handleJoinMatch(m.gameName, m.matchID, "" + freeSeat.id);
        }}
      >
        Rejoindre
      </button>
    );
  }
  if (playerSeat) {
    return (
      <>
        <button
          type="submit"
          className="btn btn-success btn-xs mr-2 sm:btn-sm"
          onClick={() => {
            L.handleStartMatch(m.gameName, {
              numPlayers,
              playerID: "" + playerSeat.id,
              matchID: m.matchID,
            });
          }}
        >
          Jouer
        </button>
        <button
          type="submit"
          className="btn btn-error btn-xs sm:btn-sm"
          onClick={() => {
            L.handleLeaveMatch(m.gameName, m.matchID);
          }}
        >
          Sortir
        </button>
      </>
    );
  }
  return <div>Match In Progress...</div>;
}

export default BM2QLobby;
