import React, { useContext, useRef, useState } from "react";
import Draggable from "react-draggable";
import { NAMES } from "./Piece";
import { SocketContext } from "../socket/SocketProvider";
import { drop, setDropMode } from "chessground/drop";
import { cancelMove, unsetPremove, unsetPredrop, whitePov } from "chessground/board";

const HeldPiece = ({
  boardID,
  chessboard,
  chessground,
  color,
  container,
  count,
  gameID,
  onPredrop,
  onDropSelect,
  piece,
  selected,
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

  const dropPiece = (evt) => {
    const cg = chessground.current?.cg;
    const key = cg.getKeyAtDomPos(
      [evt.x, evt.y],
      whitePov(cg.state),
      cg.state.dom.bounds(),
    );
    // Cancel if the move is offboard or there's a piece at the square
    if (key == null) {
      return;
    }
    const move = `${piece}@${key}`;
    cancelMove(cg.state);
    unsetPremove(cg.state);
    unsetPredrop(cg.state);
    if (chessboard.getColorToMove() !== color) {
      // Try a pre-drop
      cg.set({ predroppable: { current: { role: NAMES[piece], key } } });
      onPredrop(`${move}`);
    } else {
      setDropMode(cg.state, {role: NAMES[piece], color});
      drop(cg.state, evt);
    }
  }

  const onDrag = (e, coords) => {
    setCoords(coords);
    setDragging(true);
  };

  function onClick(evt) {
    onDropSelect && onDropSelect(piece);
  }

  function onStop(evt, relCoords) {
    setDragging(false);
    setTimeout(() => {
      setCoords({ x: 0, y: 0 });
    }, 80);

    dropPiece(evt);
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
      onClick={onClick}
      ref={relRef}
      className={`heldPiece ${selected ? "selected" : ""}`}
      style={{ visibility: visibility }}
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
            width: "100%",
            height: "100%",
          }}
        />
          {countCircle}
        </div>
      </Draggable>
    </div>
  );
};

export default HeldPiece;
