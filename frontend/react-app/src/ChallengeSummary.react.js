import React /*, {useContext}*/ from "react";
import Player from "./Player.react";
// import { UsersContext } from './user/UsersProvider';

const ChallengeSummary = ({ challenge }) => {
  // Show Challenger partner?
  // const {partners, partnerMap} = useContext(UsersContext);
  const { challenger } = challenge;
  return (
    <div className="challenge">
      <span>
        <Player player={challenger} />
      </span>
      <span
        style={{
          marginLeft: "10px",
          padding: "4px",
          borderRadius: 4,
          backgroundColor: "#131313",
          borderColor: "#dfdfdf",
          borderWidth: "1px",
          borderStyle: "solid",
          color: "#efefef",
        }}
      >
        <span className="h6" style={{ display: "inline", padding: "4px" }}>
          {challenge.mins}/{challenge.incr}
        </span>
      </span>
    </div>
  );
};

export default ChallengeSummary;
