import React, { useContext } from "react";
import { withStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
// TODO - animate menu depending on open/close state
// import MenuOpenIcon from '@material-ui/icons/MenuOpen';
import MenuIcon from "@material-ui/icons/Menu";
import PeopleIcon from "@material-ui/icons/People";
import { Link } from "@reach/router";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import { SocketContext } from "./socket/SocketProvider";
import logout from "./logout";

const StyledMenu = withStyles({
  paper: {
    border: "1px solid #d3d4d5",
  },
})((props) => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "center",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "center",
    }}
    {...props}
  />
));

const StyledMenuItem = withStyles((theme) => ({
  root: {
    "&:focus": {
      backgroundColor: theme.palette.primary.main,
      "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
        color: theme.palette.common.white,
      },
    },
  },
}))(MenuItem);

const SideMenu = ({ style }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { socket, handle } = useContext(SocketContext);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div style={{ zIndex: "99", ...style }}>
      <Button
        style={{
          padding: "2px 2px",
          minWidth: "3em",
          color: "#efef",
          backgroundColor: "#6c8cad",
        }}
        aria-controls="customized-menu"
        aria-haspopup="true"
        variant="contained"
        color="primary"
        onClick={handleClick}
      >
        <MenuIcon />
      </Button>
      <StyledMenu
        id="customized-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <Link to="/home">
          <StyledMenuItem>
            <ListItemIcon>
              <PeopleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </StyledMenuItem>
        </Link>
        <Link to="/home/fics_console">
          <StyledMenuItem>
            <ListItemIcon>
              <img alt="console" src="/Octicons-terminal.svg" width="18px" />
            </ListItemIcon>
            <ListItemText primary="Console" />
          </StyledMenuItem>
        </Link>
        {/*
        <StyledMenuItem>
          <ListItemIcon>
            <img alt="console" style={{backgroundColor: "black"}} src="/favicon.ico" width="18px" />
          </ListItemIcon>
          <ListItemText primary="Game" />
        </StyledMenuItem>
        */}
        <StyledMenuItem
          onClick={(e) => {
            socket.logout();
          }}
        >
          <ListItemIcon>
            <ExitToAppIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={`Logout as ${handle}`} />
        </StyledMenuItem>
        <StyledMenuItem
          onClick={(e) => {
            logout(socket);
          }}
        >
          <ListItemIcon>
            <ExitToAppIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign out" />
        </StyledMenuItem>
      </StyledMenu>
    </div>
  );
};

export default SideMenu;
