import React, {useContext, useState} from 'react';
import Draggable from 'react-draggable';
import { pos2key, eventPosition } from 'chessground/util';
import { TelnetContext } from '../telnet/TelnetProvider';

const roles = {
  P: 'pawn',
  R: 'rook',
  N: 'knight',
  B: 'bishop',
  Q: 'queen',
};

const HeldPiece = ({chessgroundRef, piece, color, count, top, viewOnly}) => {
  const disabled = viewOnly || count === 0;
  const visibility = count === 0 ? 'hidden' : 'visible';
  const pieceRef = React.useRef(null);
  const {telnet} = useContext(TelnetContext);
  const [coords, setCoords] = useState({x: 0,y: 0});

  const onDrag = (e, coords) => {
    setCoords(coords);
  };

  function onStop(e, coords) {
    const chessground = chessgroundRef.current;
    let [evtX, evtY] = eventPosition(e);
    evtX -= chessground.el.offsetLeft;
    evtY -= (pieceRef.current.offsetHeight / 2);
    const width = chessground.el.offsetWidth / 8;
    const height = chessground.el.offsetHeight / 8;
    const [x, y] = [Math.floor(evtX / width), Math.floor(evtY / height)];
    const pos = chessground.props.orientation === 'white'
      ? [x, 7 - y]
      : [7 - x, y];
    const key = pos2key(pos);
    // if the move is offboard or there is a piece in the location,
    // just cancel immediately.
    if (key == null ||
        chessground.cg.state.pieces.get(key) != null ||
        // TODO support pre-drop
        chessground.cg.state.turnColor !== color) {
      // pieceRef.current.style.transform = 'translate(0px, 0px)';
      setCoords({x: 0,y: 0})
      return;
    } else {
      setCoords(coords);
    }
    telnet.sendEvent('move', `${piece}@${key}`);
  }

  // let pieceCount = null;
  // if (count > 1) {
  //   pieceCount = (
  //     <div
  //       data-piece={piece}
  //       ref={pieceRef}
  //       className={`${color} ${roles[piece]}${viewOnly ? ' disabled' : ''}`}
  //       style={{
  //         position: 'absolute',
  //         visibility: visibility,
  //         top: top + 'px',
  //         left: 0,
  //         width: '100%',
  //         height: '12.5%'
  //       }}>
  //       {pieceCount}
  //     </div>
  //   );
  // }

  return (
    <div style={{
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
            // transform: transform,
          }} />
      </Draggable>
    </div>
  );
};

export default HeldPiece;
