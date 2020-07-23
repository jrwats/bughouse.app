import React, {useContext} from 'react'
import {AuthContext} from '../auth/AuthProvider';
import Typography from '@material-ui/core/Typography';

const Profile = (props) => {
  const {user} = useContext(AuthContext);
  const name = user.displayName || user.email;
  let picture = null;
  if (user.photoURL) {
    picture = <img style={{
      top: '10px',
      position: 'relative',
      paddingRight: '10px',
      height: '40px',
      width: '40px'}}
      src={user.photoURL}
    />;
  }
  return (
    <React.Fragment>
      <span {...props}>
        {picture}
        <span>
          <Typography style={{display: "inline"}} variant="h6" noWrap>
            {name}
          </Typography>
        </span>
      </span>
    </React.Fragment>
  );
}

export default Profile;
