import Button from "@material-ui/core/Button";
import React, { useContext, useState } from "react";
import Box from "@material-ui/core/Box";

import FormTable from "./FormTable.react";
import { UsersContext } from "./user/UsersProvider";
import Seeks from "./Seeks.react";

export const ActionExpansion = {
  NONE: 0,
  SEEKS: 1,
  FORM_GAME: 2,
};

const GamingLanding = () => {
  let { onlineUsers } = useContext(UsersContext);
  let [expansion, setExpansion] = useState(ActionExpansion.NONE);
  const onCancel = () => setExpansion(ActionExpansion.None);

  if (expansion === ActionExpansion.SEEKS) {
    return <Seeks onCancel={onCancel} />;
  } else if (expansion === ActionExpansion.FORM_GAME) {
    return <FormTable onCancel={onCancel} />;
  }

  return (
    <Box display="flex" flexWrap="wrap">
      <Box p={2}>
        <Button
          style={{ marginTop: "10px" }}
          variant="contained"
          color="primary"
          disabled={Object.keys(onlineUsers).length < 4}
          onClick={() => {
            setExpansion(ActionExpansion.SEEKS);
          }}
        >
          Seek Game
        </Button>
      </Box>
      <Box p={2}>
        <Button
          style={{ marginTop: "10px" }}
          variant="contained"
          color="primary"
          onClick={() => {
            setExpansion(ActionExpansion.FORM_GAME);
          }}
        >
          Create Table
          {/* Play with Friends */}
        </Button>
      </Box>
    </Box>
  );
};

export default GamingLanding;
