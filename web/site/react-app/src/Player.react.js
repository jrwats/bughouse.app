import React from 'react';
import Status from './Status.react';

const Player = ({player, style}) => {
  const {user} = player;
  const fontWeight = user != null ? 'bold' : 'auto';
  let photo = null;
  if (user?.photoURL != null) {
    photo = <img alt="profile" style={{
      paddingRight: '4px',
      height: '40px',
      width: '40px'}}
      src={user.photoURL}
    />;
  }
  let name = null;
  if (user != null) {
    const displayName = user.displayName || (user.email || '').split('@')[0];
    name = (
      <div style={{display: 'block'}}>
        (<span className="roboto" style={{overflow: 'ellipsis', maxWidth: '20rem'}}>
          {displayName}
        </span>)
      </div>
    );
  }

  return (
    <span style={{
      display: 'flex',
      justifyContent: 'left',
      alignItems: 'center',
      borderRadius: 4,
      padding: '4px',
      ...style}} >
      {photo}
      <span className="med-text mono">
        {player.rating}
      </span>
      <Status status={player.status}/ >
      <span style={{display: 'inline-block'}}>
        <div className="med-text" style={{display: 'inline-block', fontWeight}} >
          {player.handle}
        </div>
        {name}
      </span>
    </span>
  );
};

export default Player;
