import React, { useContext, useRef, useState, useEffect } from "react";
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import { Link } from "@reach/router";
import AlertTitle from '@material-ui/lab/AlertTitle';
import { SocketContext } from "./socket/SocketProvider";
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
    },
  },
}));

function getErrorMessage(err) {
  switch (err.err?.kind) {
    case "in_game":
      const game_id = err.err.game_id;
      return (
        <span>Already seated at: &nbsp; 
          <Link to={`/table/${game_id}`}>{game_id}</Link>
        </span>
      );
    default:
      return err.reason || `Unknown error: ${JSON.stringify(err)}`;
  }
}

// const Alert = (props) => {
//   return <MuiAlert elevation={6} variant="filled" {...props} />;
// };

const Errors = () => {
  const classes = useStyles();
  const { socket } = useContext(SocketContext);
  let errors = useRef([]);
  let [uiErrors, setErrors] = useState({val: errors.current});
  console.log(`Errors, uiErrors: ${JSON.stringify(uiErrors)}`);

  useEffect(() => {
    const onErr = (e) => {
      console.error(`Errors.onErr: ${JSON.stringify(e)}`);
      errors.current.push(e);
      setErrors({val: errors.current});
      console.log(`errors: ${JSON.stringify(errors)}`);
    };
    socket.on('err', onErr);
    return () => { socket.off('err', onErr); };
  }, [socket]);

  if (uiErrors.val.length === 0) {
    return null;
  }

  const alerts = uiErrors.val.map((err, idx) => {
    const onClose = (_e) => {
      errors.current.splice(idx, idx + 1);
      setErrors({val: errors.current});
    };
    return (
      <Alert key={idx} severity="error" onClose={onClose}>
        <AlertTitle>Error</AlertTitle>
        {getErrorMessage(err)}
      </Alert>
    );
  });
  console.log(`alerts: ${JSON.stringify(uiErrors)}`);
  return (
    <div className={classes.root}>
      <Snackbar
        anchorOrigin={{vertical: 'top', horizontal: 'center'}}
        open={true}>
        <div>
          {alerts}
        </div>
      </Snackbar>
    </div>
  );
};

export default Errors;