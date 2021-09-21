import React, { useContext, useRef, useState } from "react";
import Draggable from "react-draggable";
import { NAMES } from "./Piece";
import { SocketContext } from "../socket/SocketProvider";

const HeldPiece = ({
  boardID,
  chessboard,
  chessgroundRef,
  color,
  container,
  count,
  gameID,
  onPredrop,
  piece,
  top,
  viewOnly,
}) => {
  const { handle, socket } = useContext(SocketContext);
  const disabled =
    viewOnly || count === 0 || chessboard.getHandleColor(handle) == null;
  const pieceRef = useRef(null);
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
    const move = `${piece}@${key}`;
    if (key == null) {
      return;
    } else if (chessboard.getColorToMove() !== color) {
      // Try a pre-drop
      chessground.cg.cancelPredrop();
      chessground.cg.set({ predroppable: { current: { role: piece, key } } });
      onPredrop(`${move}`);
      return;
    }
    chessground.cg.newPiece({ role: NAMES[piece], color: color }, key);
    chessboard.decrHolding({ color, piece });
    socket.sendEvent("move", { id: gameID, move });
  }

  const visibility = count === 0 ? "hidden" : "visible";
  let countCircle = null;
  if (count > 1) {
    countCircle = <span className="countCircle">{count}</span>;
  }
  // TODO: bounds is undefined because setting it limits dragging to the lower
  // half of screen right now.  Need to debug that.  We *SHOULD* be able to set
  // bounds to the board container
  return (
    <div
      ref={relRef}
      style={{
        position: "relative",
        visibility: visibility,
        height: "20%",
        width: "100%",
        textAlign: "center",
      }}
    >
      <Draggable
        nodeRef={pieceRef}
        bounds={undefined /* `#${boardID}`*/}
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
            left: "10%",
            width: "100%",
            height: "100%", // "calc(12.5% - 3px)",
          }}
        />
      </Draggable>
      {countCircle}
    </div>
  );
};

export default HeldPiece;
