import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Dialog from '@material-ui/core/Dialog';
import { NAMES}  from './Piece';

const useStyles = makeStyles((theme) => ({
  paper: {
    overflow: 'hidden',
    padding: "2em 2em",
  },
  container: {
    position: 'relative',
    height: "20vw",
    left: "10.5vw",
    width: 'fit-content',
    overflow: 'hidden',
  },
}));

function PromotionDialog(props) {
  const classes = useStyles();
  const { color, onClose, selectedValue, open } = props;

  const handleClose = () => {
    onClose(selectedValue);
  };

  const handleListItemClick = (value) => {
    onClose(value);
  };
  console.log(`PromotionDialog color: ${color}`);

  return (
    <Dialog 
      classes={classes}
      fullWidth={true}
      onClose={handleClose}
      aria-labelledby="simple-dialog-title"
      open={open}>
      <Grid container alignItems="center" spacing={1}>
        {['n', 'b', 'r', 'q'].map((piece) => (
          <Grid item xs={3} spacing={8}>
            <span 
              onClick={() => handleListItemClick(piece)} 
              style={{
                cursor: "pointer",
                display: "inline-block",
                width: "min(6vw, 8vh)",
                height: "min(6vw, 8vh)",
                position: "relative",
                marginLeft: ".5em",
                marginRight: ".5em",
              }}>
              <piece
                data-piece={piece}
                className={`${color} ${NAMES[piece]}`}
                style={{
                  position: "absolute",
                  visibility: "visible",
                  left: 0,
                  width: "100%",
                  height: "100%",
                }}
              />
            </span>
          </Grid>
        ))}
      </Grid>
    </Dialog>
  );
}

PromotionDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired,
  selectedValue: PropTypes.string.isRequired,
};

export default PromotionDialog;
