import React from 'react';
import Status from './Status.react';
import UserName from './UserName.react';

const Player = ({player, black, className, white, style}) => {
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
      }}
      className={className}>
      <span className="med-text mono" style={{paddingRight: '4px'}}>
        {rating}
      </span>
      <Status status={player.status} />
      {photo}
      <span style={{display: 'inline-block'}}>
        <div className="med-text" style={{display: 'inline-block', fontWeight}} >
          {player.handle}
        </div>
        <UserName user={user} />
      </span>
    </span>
  );
};

export default Player;
