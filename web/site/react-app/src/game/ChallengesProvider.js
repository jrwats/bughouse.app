import React, { createContext, useEffect, useState } from "react";
import ChallengesSource from "./ChallengesSource";

export const ChallengesContext = createContext({
  challenges: {},
});

const ChallengesProvider = (props) => {
  const src = ChallengesSource.get();
  const [challenges, setChallenges] = useState(src.getChallenges());

  useEffect(() => {
    const onChallenges = (challenges) => {
      setChallenges({ ...challenges });
    };
    src.on("challenges", onChallenges);
    return () => {
      src.off("challenges", onChallenges);
    };
  });
  return (
    <ChallengesContext.Provider value={{ challenges }}>
      {props.children}
    </ChallengesContext.Provider>
  );
};

export default ChallengesProvider;
