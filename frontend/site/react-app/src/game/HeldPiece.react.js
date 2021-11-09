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
  const draggableRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const relRef = useRef(null);

  const onDrag = (e, coords) => {
    setCoords(coords);
    setDragging(true);
  };

  function onStop(evt, relCoords) {
    setDragging(false);
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
    const className = `countCircle ${dragging ? 'dragging' : ''}`;
    countCircle = <span className={className}>{count}</span>;
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
        zIndex: 500,
      }}
    >
      <Draggable
        nodeRef={draggableRef}
        bounds={undefined /* `#${boardID}`*/}
        disabled={disabled}
        onStop={onStop}
        onDrag={onDrag}
        position={coords}
        offsetParent={relRef?.current?.el}
        // grid={[64,64]}
      >
        <div
          ref={draggableRef}
          style={{
            cursor: "pointer",
            height: "100%",
            width: "100%",
            textAlign: "center",
          }}
        >
        <piece
          data-piece={piece}
          className={`${color} ${NAMES[piece]}${viewOnly ? " disabled" : ""}`}
          style={{
            display: "block",
            position: "relative",
            visibility: visibility,
            left: "10%",
            width: "100%",
            height: "100%", // "calc(12.5% - 3px)",
          }}
        />
          {countCircle}
        </div>
      </Draggable>
    </div>
  );
};

export default HeldPiece;
