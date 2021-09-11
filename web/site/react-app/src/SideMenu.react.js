import React, { useContext, useState } from "react";
import { withStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";
import FeaturedVideoIcon from "@material-ui/icons/FeaturedVideo";
import MonetizationOnIcon from '@material-ui/icons/MonetizationOn';
import ListItemIcon from "@material-ui/core/ListItemIcon";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemText from "@material-ui/core/ListItemText";
import VolumeOffIcon from "@material-ui/icons/VolumeOff";
import VolumeUpIcon from "@material-ui/icons/VolumeUp";

// TODO - animate menu depending on open/close state
// import MenuOpenIcon from '@material-ui/icons/MenuOpen';
import MenuIcon from "@material-ui/icons/Menu";
import { Link } from "@reach/router";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import { SocketContext } from "./socket/SocketProvider";
import { ViewerContext } from "./user/ViewerProvider";
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

const SoundMenuItem = () => {
  const off = parseInt(localStorage.getItem("soundOff") || "0");
  let [soundDisabled, setSoundDisabled] = useState(off);
  const icon = soundDisabled ? (
    <VolumeUpIcon fontSize="small" />
  ) : (
    <VolumeOffIcon fontSize="small" />
  );

  const onClick = (_e) => {
    localStorage.setItem("soundOff", soundDisabled ? 0 : 1);
    setSoundDisabled(!soundDisabled);
  };

  return (
    <StyledMenuItem onClick={onClick}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={`Sound ${soundDisabled ? "on" : "off"}`} />
    </StyledMenuItem>
  );
};

const SideMenu = ({ style }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { socket } = useContext(SocketContext);
  const { handle } = useContext(ViewerContext);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div style={{ display: "inline-block", zIndex: "50", ...style }}>
      <Button
        style={{
          padding: "2px 2px",
          minWidth: "3em",
          color: "#efef",
          // backgroundColor: "#6c8cad",
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
        <Link to="/">
          <StyledMenuItem>
            <ListItemIcon>
              <FeaturedVideoIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </StyledMenuItem>
        </Link>
        <Link to="/profile">
          <StyledMenuItem>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </StyledMenuItem>
        </Link>
        {/*
        <Link to="/fics_console">
          <StyledMenuItem>
            <ListItemIcon>
              <img alt="console" src="/Octicons-terminal.svg" width="18px" />
            </ListItemIcon>
            <ListItemText primary="Console" />
          </StyledMenuItem>
        </Link>
        <StyledMenuItem>
          <ListItemIcon>
            <img alt="console" style={{backgroundColor: "black"}} src="/favicon.ico" width="18px" />
          </ListItemIcon>
          <ListItemText primary="Game" />
        </StyledMenuItem>
        */}
        {/*
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
        */}
        <StyledMenuItem
          onClick={(e) => {
            logout(socket);
          }}
        >
          <ListItemIcon>
            <ExitToAppIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={`Sign out ${handle}`} />
        </StyledMenuItem>
        <div style={{ borderTop: "1px solid #303030" }}>
          <SoundMenuItem />
        </div>
        <div style={{ borderTop: "1px solid #303030" }}>
          <form id="paypal_form" action="https://www.paypal.com/donate" method="post" target="_top">
            <input type="hidden" name="hosted_button_id" value="VLPN33836X4MC" />
            <StyledMenuItem>
              <ListItemIcon>
                <MonetizationOnIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Donate" />
            </StyledMenuItem>
            <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
          </form>
        </div>
      </StyledMenu>
    </div>
  );
};

export default SideMenu;
