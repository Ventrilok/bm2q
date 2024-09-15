import React from 'react';
import classnames from 'classnames';
import reactStringReplace from 'react-string-replace';

export const GameCard = ({ cardType, questionText, answerText, by, active, selectedPosition, hasVoted, onCardClick }) => {
  function getCardText(cardType) {
    switch (cardType) {
      case 'questionCard':
        return questionText;

      case 'answerCard':
        return answerText;

      case 'voteCard':
        let cnt = 0;
        let final = questionText.replace(/______/g, function ($0) {
          if (cnt === answerText.length) cnt = 0;
          return '#' + answerText[cnt++].text + '#';
        });

        return reactStringReplace(final, /#(.*?)\#/gm, (match, i) => (
          <span className="text-yellow-400" key={i}>
            {match}
          </span>
        ));
      default:
        return 'error';
    }
  }

  let cardStyle = classnames('card text-center p-2 shadow-lg', {
    'bg-neutral text-accent-content shadow-2xl font-medium tracking-wide text-2xl': cardType === 'questionCard' ? true : false,
    'bg-white text-neutral border-gray-200 border h-60 w-60 text-lg hover:bg-secondary-focus hover:text-white': cardType === 'answerCard' ? true : false,
    'bg-neutral': cardType === 'voteCard' ? true : false,
    'bg-secondary-focus text-white': active,
  });

  let cardTextStyle = classnames('card-body', {
    'text-primary-content': active,
  });

  let badgeStyle = classnames('indicator-item badge', {
    invisible: !active,
  });

  let cardText = getCardText(cardType);
  console.log('hasVoted:', hasVoted);
  return (
    <div className="m-6 indicator">
      <div className={badgeStyle}>{selectedPosition}</div>
      <div className={cardStyle} onClick={() => onCardClick()}>
        <div className={cardTextStyle}>{cardText}</div>
        {cardType === 'voteCard' && <div className="text-right text-xs italic pr-2">- {hasVoted ? by : '???'} -</div>}
      </div>
    </div>
  );
};
