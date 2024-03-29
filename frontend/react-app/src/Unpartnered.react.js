import React from "react";
import UnpartneredPlayer from "./UnpartneredPlayer.react";

const Unpartnered = ({ unpartnered }) => {
  const bughouseUsers = [],
    ficsPlayers = [];
  for (const handle in unpartnered) {
    const player = unpartnered[handle];
    if (player.user != null) {
      bughouseUsers.push(player);
    } else {
      ficsPlayers.push({ handle: handle, uid: null, ...player });
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <div className="h5 mono leftBuffer">Unpartnered Players</div>
      <div
        className="leftPad"
        style={{
          height: "100%",
        }}
      >
        <div className="grid">
          {bughouseUsers.concat(ficsPlayers).map((player) => {
            return (
              <div className="cell" key={player.handle}>
                <UnpartneredPlayer player={player} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Unpartnered;
