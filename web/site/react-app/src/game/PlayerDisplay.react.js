import React, {useEffect, useState} from 'react';
import { EventEmitter } from 'events';
import HandleDisplay from './HandleDisplay.react';

class Ticker extends EventEmitter {
  onTick() {
    this.emit('tick');
  }
}
const _ticker = new Ticker();
setInterval(() => { _ticker.onTick(); }, 1000);

const PlayerDisplay = ({color, chessboard}) => {

  const playerData = chessboard.getBoard()[color];
  const [handle, setHandle] = useState(playerData?.handle);
  const [time, setTime] = useState(parseInt(playerData?.time));

  useEffect(() => {
    const onUpdate = () => {
      const playerData = chessboard.getBoard()[color];
      if (playerData?.handle !== handle) {
        setHandle(playerData.handle);
      }
      setTime(parseInt(playerData?.time));
    };
    const onTick = () => {
      const board = chessboard.getBoard();
      if ((board.toMove === 'W') === (color === 'white')) {
        setTime(Math.max(0, time - 1));
      }
    };
    chessboard.on('update', onUpdate);
    _ticker.on('tick', onTick);
    return () => {
      chessboard.off('update', onUpdate);
      _ticker.off('tick', onTick);
    };
  });
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return (
    <div className="playerData">
      <HandleDisplay handle={handle} />
      <span className="h6 mono bold light">
        {mins}:{(secs < 10 ? '0' : '') + secs}
      </span>
    </div>
  );
}

export default PlayerDisplay;
