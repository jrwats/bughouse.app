import { makeStyles, withStyles } from "@mui/styles";
import TableRow from "@mui/material/TableRow";

const StyledTableRow = withStyles((theme) => ({
  root: {
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.action.hover,
    },
  },
}))(TableRow);

export default StyledTableRow;
