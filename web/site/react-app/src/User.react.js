import React, {useContext} from 'react';
import Typography from '@material-ui/core/Typography';
import Status from './Status.react';
import OnlineUsers from './user/OnlineUsers';

const User = ({user, style, ...rest}) => {
  const fontWeight =
    OnlineUsers.get().getUserFromHandle(user.handle) ? 'bold' : 'auto';
  return (
    <span style={{borderRadius: 4, padding: '4px', ...style}} {...rest}>
      <Typography variant="h6" noWrap
        style={{fontFamily: 'courier', display: "inline"}} >
        {user.rating}
      </Typography>
      <Status status={user.status}/ >
      <Typography style={{display: "inline", fontWeight}} variant="h6" noWrap>
        {user.handle}
      </Typography>
    </span>
  );
};

export default User;
