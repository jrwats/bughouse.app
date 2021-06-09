import React, {useEffect, useRef, useState} from 'react';
import { EventEmitter } from 'events';
import HandleDisplay from './HandleDisplay.react';

const _ticker = new EventEmitter();
setInterval(() => { _ticker.emit('tick'); }, 1000);

const PlayerDisplay = ({color, chessboard}) => {

  const playerData = chessboard.getBoard()[color];
  const [handle, setHandle] = useState(playerData?.handle);
  const refTime = useRef(parseInt(playerData?.time));
  const [time, setTime] = useState(refTime.current);

  useEffect(() => {
    const onUpdate = () => {
      const playerData = chessboard.getBoard()[color];
      if (playerData == null) {
        console.log(`PlayerDisplay NULL for ${chessboard.getID()} ${color}`);
        return;
      }
      if (playerData.handle !== handle) {
        setHandle(playerData.handle);
      }
      const numTime = parseInt(playerData.time);
      if (Number.isNaN(numTime)) {
        console.log(`PlayerDisplay ${playerData.time} isNaN`);
        return;
      }
      refTime.current = parseInt(playerData?.time);
      setTime(refTime.current);
    };
    const onTick = () => {
      const board = chessboard.getBoard();
      if ((board.toMove === 'W') === (color === 'white')) {
        refTime.current = Math.max(0, refTime.current - 1);
        setTime(refTime.current);
      }
    };
    chessboard.on('update', onUpdate);
    _ticker.on('tick', onTick);
    return () => {
      chessboard.off('update', onUpdate);
      _ticker.off('tick', onTick);
    };
  }, [color, chessboard, handle]);
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
