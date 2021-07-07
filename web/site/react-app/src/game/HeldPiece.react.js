import React, {useContext, useState} from 'react';
import Draggable from 'react-draggable';
import { pos2key } from 'chessground/util';
import { SocketContext } from '../socket/SocketProvider';

const roles = {
  P: 'pawn',
  R: 'rook',
  N: 'knight',
  B: 'bishop',
  Q: 'queen',
};

const HeldPiece = ({
  chessgroundRef,
  chessboard,
  piece,
  color,
  count,
  top,
  viewOnly
}) => {
  const disabled = viewOnly || count === 0;
  const pieceRef = React.useRef(null);
  const {telnet} = useContext(SocketContext);
  const [coords, setCoords] = useState({x: 0,y: 0});
  const relRef = React.useRef(null);

  const onDrag = (e, coords) => {
    setCoords(coords);
  };

  function onStop(e, relCoords) {
    const chessground = chessgroundRef.current;
    let {x, y} = relCoords;
    x += (relCoords.node.offsetWidth / 2) - chessground.el.offsetLeft;
    y += relCoords.node.offsetTop + (relCoords.node.offsetHeight / 2) -
      chessground.el.offsetTop;
    const sqWidth = chessground.el.offsetWidth / 8;
    const sqHeight = chessground.el.offsetHeight / 8;

    // Calculate piece coordinates relative to chessground chessboard
    const [relX, relY] = [Math.floor(x / sqWidth), Math.floor(y / sqHeight)];
    const pos = chessground.props.orientation === 'white'
      ? [relX, 7 - relY]
      : [7 - relX, relY];
    const key = pos2key(pos);
    setTimeout(() => { setCoords({x: 0,y: 0}); }, 80);
    // if the move is offboard or there is a piece in the location,
    // just cancel immediately.
    if (key == null || chessboard.getColorToMove() !== color) {
      return;
    }
    chessground.cg.newPiece({role: roles[piece], color: color}, key);
    chessboard.decrHolding({color, piece});
    telnet.sendEvent('move', `${piece}@${key}`);
  }

  const visibility = count === 0 ? 'hidden' : 'visible';
  let countCircle = null;
  if (count > 1) {
    countCircle = (
      <span className="countCircle" >
        {count}
      </span>
    );
  }
  return (
    <div ref={relRef} style={{
      visibility: visibility,
      height: '20%',
      width: '100%',
      }}>
      <Draggable
        nodeRef={pieceRef}
        bounds="#board1"
        disabled={disabled}
        onStop={onStop}
        onDrag={onDrag}
        position={coords}
        offsetParent={relRef?.current?.el}
        // grid={[64,64]}
        >
        <piece
          data-piece={piece}
          ref={pieceRef}
          className={`${color} ${roles[piece]}${viewOnly ? ' disabled' : ''}`}
          style={{
            position: 'absolute',
            visibility: visibility,
            top: top + 'px',
            left: 0,
            width: '100%',
            height: '12.5%',
          }} />
      </Draggable>
      {countCircle}
    </div>
  );
};

export default HeldPiece;
