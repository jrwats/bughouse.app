import React, { useContext, useRef, useState } from "react";
import Draggable from "react-draggable";
import { NAMES } from "./Piece";
import { SocketContext } from "../socket/SocketProvider";

const HeldPiece = ({
  boardID,
  chessboard,
  chessgroundRef,
  color,
  count,
  gameID,
  piece,
  top,
  viewOnly,
}) => {
  const disabled = viewOnly || count === 0;
  const pieceRef = useRef(null);
  const { socket } = useContext(SocketContext);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const relRef = useRef(null);

  const onDrag = (e, coords) => {
    setCoords(coords);
  };

  function onStop(evt, relCoords) {
    const chessground = chessgroundRef.current;
    const key = chessground.cg.getKeyAtDomPos(
      [evt.x, evt.y],
      chessground.props.orientation === "white",
      chessground.el.getBoundingClientRect()
    );
    setTimeout(() => {
      setCoords({ x: 0, y: 0 });
    }, 80);
    // if the move is offboard or there is a piece in the location,
    // just cancel immediately.
    if (key == null || chessboard.getColorToMove() !== color) {
      return;
    }
    chessground.cg.newPiece({ role: NAMES[piece], color: color }, key);
    chessboard.decrHolding({ color, piece });
    socket.sendEvent("move", { id: gameID, move: `${piece}@${key}` });
  }

  const visibility = count === 0 ? "hidden" : "visible";
  let countCircle = null;
  if (count > 1) {
    countCircle = <span className="countCircle">{count}</span>;
  }
  return (
    <div
      ref={relRef}
      style={{
        visibility: visibility,
        height: "20%",
        width: "100%",
      }}
    >
      <Draggable
        nodeRef={pieceRef}
        bounds={`#${boardID}`}
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
          className={`${color} ${NAMES[piece]}${viewOnly ? " disabled" : ""}`}
          style={{
            position: "absolute",
            visibility: visibility,
            top: top + "px",
            left: 0,
            width: "100%",
            height: "12.5%",
          }}
        />
      </Draggable>
      {countCircle}
    </div>
  );
};

export default HeldPiece;
