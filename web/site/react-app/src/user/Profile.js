import React from 'react'
import Typography from '@material-ui/core/Typography';

const Profile = ({user, ...rest}) => {
  const name = user.displayName || user.email;
  let picture = null;
  if (user.photoURL) {
    picture = <img alt="profile" style={{
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
      <span style={{...rest.style}}>
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
