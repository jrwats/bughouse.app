import React, { useContext, useEffect, useRef, useState } from "react";
import TextField from '@material-ui/core/TextField';
import { ViewerContext } from "../user/ViewerProvider";
import { SocketContext } from "../socket/SocketProvider";

const GameMessages = ({gameID}) => {
  const { socket } = useContext(SocketContext);
  const { uid } = useContext(ViewerContext);
  const messages = useRef([]);
  const [uiMessages, setMessages] = useState({val: messages.current});
  const textInput = useRef(null);

  const onSubmit = (evt) => {
    const newHandle = textInput.current.querySelector("input").value;
    socket.sendEvent("game_msg", {
      id: gameID,
      sender: uid,
      type: "text",
      text: textInput.current.querySelector("input").value 
    });
    evt.preventDefault();
  };

  useEffect(() => {
    const onMsg = (data) => {
      console.log(`GameMessages.game_msg: ${JSON.stringify(data)}`);
      let {id, sender, type} = data;
      if (gameID !== id) {
        console.error(`game_msg; ${gameID} != ${id}`);
      }
      let message = type === 'text' ? 
        {text: data.text} : 
        {msgID: data.msgID}; // TODO - enum?

      messages.current.push({
        self: sender === uid, 
        type,
        ...message
      });
      setMessages({val: messages.current});
    };
    socket.on('game_msg', onMsg);
    return () => {
      socket.off('game_msg', onMsg);
    }
  }, [socket]);
  console.log(`GameMessages len: ${uiMessages.length}`);

  return (
    <div id="game_message_center">
      <div id="game_messages">
        <div>Messages go here...</div>
        {uiMessages.val.map(msg => {
          const self = msg.self ? "self " : "";
          const msgID = msg.msgID || "";
          return (
            <div className={`message ${self}${msgID}`}>
              {msg.text} 
            </div>
          );
        })}
      </div>

      <div id="game_message_input">
        <form onSubmit={onSubmit} noValidate autoComplete="off">
          <TextField
            ref={textInput}
            label="Send Message"
            style={{ margin: 8 }}
            placeholder="Send Message to your partner"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            variant="outlined"
          />
        </form>
      </div>
    </div>
  );
}
export default GameMessages;
