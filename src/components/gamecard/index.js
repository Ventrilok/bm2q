import React from "react";
import reactStringReplace from "react-string-replace";
import clsx from "clsx";

export const GameCard = ({
  cardType,
  questionText,
  answerText,
  by,
  active,
  selectedPosition,
  hasVoted,
  onCardClick,
}) => {
  function getCardText(cardType) {
    switch (cardType) {
      case "questionCard":
        return questionText;

      case "answerCard":
        return answerText;

      case "voteCard":
        let cnt = 0;
        let final = questionText.replace(/______/g, function ($0) {
          if (cnt === answerText.length) cnt = 0;
          return "#" + answerText[cnt++].text + "#";
        });

        return reactStringReplace(final, /#(.*?)\#/gm, (match, i) => (
          <span className="text-yellow-400" key={i}>
            {match}
          </span>
        ));
      default:
        return "error";
    }
  }

  const cardBkgd = clsx(
    "card shadow-lg  w-36 sm:w-56 h-64 sm:h-80 flex flex-col items-center justify-start",
    cardType === "questionCard" && "bg-accent-content text-white",
    cardType === "voteCard" && "bg-accent-content text-white",
    cardType === "answerCard" && "bg-white text-black",
  );

  const btnDispaly = clsx(
    "btn text-xs sm:text-sm px-3 sm:px-4",
    cardType === "questionCard" && "hidden",
    cardType === "voteCard" && "",
    cardType === "answerCard" && "",
  );

  const bdgDisplay = clsx(
    "badge",
    selectedPosition >= 0 && "",
    selectedPosition == 0 && "hidden",
  );

  let cardText = getCardText(cardType);

  return (
    <div className={cardBkgd}>
      <div className="card-body">
        <div className="mb-auto justify-center font-specialelite text-sm sm:text-lg">
          {cardText}
        </div>
        {cardType === "voteCard" && (
          <div className="text-right text-xs italic">
            - {hasVoted ? by : "???"} -
          </div>
        )}
        <div className="card-actions justify-center">
          <button className={btnDispaly} onClick={() => onCardClick()}>
            Choisir
            <div className={bdgDisplay}>{selectedPosition}</div>
          </button>
        </div>
      </div>
    </div>
  );
};
