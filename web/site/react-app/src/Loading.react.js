import React from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';

const Loading = (props) => {
  const style = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '10px',
  };
  return (
    <div style={style} >
      <CircularProgress className="dark" />
    </div>
  );
};

export default Loading;
