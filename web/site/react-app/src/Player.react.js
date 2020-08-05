import React from 'react';
import Status from './Status.react';

const Player = ({player, black, white, style}) => {
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
  const backgroundColor = black != null
    ? '#2a2a2a'
    : (white != null ? 'efefef' : undefined);
  const color = black != null ? '#efefef' : undefined;

  let rating = '';
  for (let i = 0; i < 4 - player.rating.length; ++i) {
    rating += '\u00A0'
  }
  rating += player.rating;
  return (
    <span style={{
      alignItems: 'center',
      backgroundColor,
      borderRadius: 4,
      color,
      display: 'flex',
      justifyContent: 'left',
      padding: '4px',
      }} >
      <span className="med-text mono" style={{paddingRight: '4px'}}>
        {rating}
      </span>
      <Status status={player.status} />
      {photo}
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
