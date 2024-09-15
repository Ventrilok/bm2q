import React, { useState } from 'react';
import classnames from 'classnames';

import { GameCard } from '../gamecard';
import { Leaderboard } from '../leaderboard';

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
    console.log('Je valide');
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

  let readyToValidate = G.players[playerID].selectedCards.length == G.currentQuestion.pick;

  let gameoverText = '';
  if (ctx.gameover) {
    gameoverText = G.congrats.replace('______', matchData === undefined ? `player ${ctx.gameover.winner}` : matchData[ctx.gameover.winner].name);
  }

  let btnChangeCardStyle = classnames('btn btn-neutral-focus m-1 btn-xs ', {
    'btn-disabled': G.players[playerID].hasChangedCard,
  });

  let btnValidateCardStyle = classnames('btn m-1 btn-xs', {
    'btn-disabled': !readyToValidate,
  });

  return (
    <div className="text-center flex flex-col h-screen p-2 gap-2">
      <main className="flex-1 flex">
        <div className="sidebar-1 p-2">
          <div className="bg-white rounded-tl-xl sm:rounded-t-xl lg:rounded-xl shadow-lg divide-y divide-gray-100">
            <div className="divide-y divide-gray-100">
              <div className="p-4 bg-neutral-focus text-accent-content text-lg text-center">{G.firstAt} horreurs et c'est gagné !</div>
              <Leaderboard players={G.players} playerNames={matchData} currentPlayer={ctx.currentPlayer} pick={G.currentQuestion.pick} />
            </div>
            <div className="p-2">
              <button className={btnChangeCardStyle} disabled={G.players[playerID].hasChangedCard} onClick={() => changeHand()}>
                changer mes cartes
              </button>
              <button className="btn btn-xs" onClick={() => validateChoice()}>
                Valide mon choix
              </button>
            </div>
          </div>
        </div>

        <div className="content flex-1">
          {ctx.phase !== 'vote' && !ctx.gameover && (
            <div>
              <div className="mb-2">
                <GameCard cardType="questionCard" questionText={qText} />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {G.players[playerID].hand.map((card, index) => (
                  <GameCard
                    key={card.uid}
                    cardType="answerCard"
                    answerText={card.text}
                    active={G.players[playerID].selectedCards.some((selectedCard) => selectedCard.uid === card.uid)}
                    selectedPosition={G.players[playerID].selectedCards.findIndex((item) => item.uid === card.uid) + 1}
                    onCardClick={() => playCard(card.uid)}
                  />
                ))}
              </div>
            </div>
          )}

          {ctx.phase === 'vote' && !ctx.gameover && (
            <div>
              <div className="grid grid-cols-4 gap-2">
                {G.players.map((aPlayer, index) => (
                  <GameCard
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
            <div>
              <div className="mb-2">
                <GameCard cardType="questionCard" questionText={gameoverText} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BlancMangerQQBoard;
