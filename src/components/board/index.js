import React, { useState } from "react";
import { GameCard } from "../gamecard";
import { Leaderboard } from "../leaderboard";

const BlancMangerQQBoard = (props) => {
  const { G, ctx, moves, playerID, matchData } = props;
  const [selectedPlayingCard, selectPlayingCard] = useState(-1);
  const [selectedVotingCard, selectVotingCard] = useState(-1);

  //const isMyTurn = ctx.currentPlayer === playerID;

  const playCard = (uid) => {
    if (!G.players[playerID].ready) {
      selectPlayingCard(uid);
      selectVotingCard(-1);
      moves.playCard(uid, playerID);
    }
  };

  const validateChoice = () => {
    console.log("Je valide");
    moves.validateChoice(playerID);
  };

  const selectVote = (index, selectedPlayerID) => {
    if (!G.players[playerID].hasVoted) {
      selectPlayingCard(-1);
      selectVotingCard(index);
      moves.voteAnswer(selectedPlayerID, playerID);
    }
  };

  const changeHand = () => {
    moves.changeHand(playerID);
  };

  let qText = G.currentQuestion.text;

  let readyToValidate =
    G.players[playerID].selectedCards.length == G.currentQuestion.pick;

  let gameoverText = "";
  if (ctx.gameover) {
    gameoverText = G.congrats.replace(
      "______",
      matchData === undefined
        ? `player ${ctx.gameover.winner}`
        : matchData[ctx.gameover.winner].name,
    );
  }

  // let btnChangeCardStyle = classnames('btn btn-neutral-focus m-1 btn-xs ', {
  //   'btn-disabled': G.players[playerID].hasChangedCard,
  // });

  // let btnValidateCardStyle = classnames('btn m-1 btn-xs', {
  //   'btn-disabled': !readyToValidate,
  // });

  return (
    <div className="flex h-screen flex-col justify-between bg-base-100 text-black">
      <div className="w-full bg-neutral p-4">
        <div className="flex flex-wrap justify-center gap-4">
          <div class="flex w-24 flex-col items-center rounded bg-white p-2 shadow-lg sm:w-32">
            <p class="text-xs font-bold sm:text-sm md:text-base">
              {G.firstAt}{" "}
            </p>
            <p class="text-xs sm:text-sm">Manches</p>
          </div>
          <Leaderboard
            players={G.players}
            playerNames={matchData}
            currentPlayer={ctx.currentPlayer}
            pick={G.currentQuestion.pick}
          />
        </div>
      </div>

      {ctx.phase !== "vote" && !ctx.gameover && (
        <>
          <div className="mx-auto flex w-full max-w-6xl flex-grow flex-col items-center justify-center p-4">
            <div className="mb-8 flex justify-center">
              <GameCard cardType="questionCard" questionText={qText} />
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {G.players[playerID].hand.map((card, index) => (
                <GameCard
                  key={card.uid}
                  cardType="answerCard"
                  answerText={card.text}
                  active={G.players[playerID].selectedCards.some(
                    (selectedCard) => selectedCard.uid === card.uid,
                  )}
                  selectedPosition={
                    G.players[playerID].selectedCards.findIndex(
                      (item) => item.uid === card.uid,
                    ) + 1
                  }
                  onCardClick={() => playCard(card.uid)}
                />
              ))}
            </div>
          </div>
          <div class="fixed bottom-4 right-4 flex space-x-2 sm:space-x-4">
            <button
              class="btn btn-xs sm:btn-sm md:btn-md lg:btn-lg"
              disabled={G.players[playerID].hasChangedCard}
              onClick={() => changeHand()}
            >
              Changer
            </button>
            <button
              class="btn btn-success btn-xs sm:btn-sm md:btn-md lg:btn-lg"
              onClick={() => validateChoice()}
            >
              Valider
            </button>
          </div>
        </>
      )}
      {ctx.phase === "vote" && !ctx.gameover && (
        <div className="mx-auto flex w-full max-w-6xl flex-grow flex-col items-center justify-center p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {G.players.map((aPlayer, index) => (
              <GameCard
                key=""
                cardType="voteCard"
                questionText={qText}
                answerText={aPlayer.selectedCards}
                by={aPlayer.name}
                onCardClick={() => selectVote(index, aPlayer.id)}
                active={index === selectedVotingCard}
                hasVoted={G.players[playerID].hasVoted}
              />
            ))}
          </div>
        </div>
      )}

      {ctx.gameover && (
        <div className="mx-auto flex w-full max-w-6xl flex-grow flex-col items-center justify-center p-4">
          <GameCard cardType="questionCard" questionText={gameoverText} />
        </div>
      )}
    </div>
  );
};

export default BlancMangerQQBoard;
