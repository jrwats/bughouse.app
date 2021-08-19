import React from 'react';
// import FormControl from '@material-ui/core/FormControl';
import TextField from '@material-ui/core/TextField';
import { ViewerContext } from "./ViewerProvider";

const GameMessages = ({gameID}) => {
  const { socket } = useContext(SocketContext);
  const { uid } = useContext(ViewerContext);
  const [messages, setMessages] = useState([]);
  const refMessages = useRef([]);
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
      let {id, sender, type} = data;
      if (gameID !== id) {
        console.error(`game_msg; ${gameID} != ${id}`);
      }
      let message = type === 'text' ? 
        {text: data.text} : 
        {msgID: data.msgID}; // TODO - enum?
      setMessages(messages.concat([{
        self: sender === uid, 
        type,
        ...message
      }]));
    };
    socket.on('game_msg', onMsg);
    return () => {
      socket.off('game_msg', onMsg);
    }
  }, [socket]);

  return (
    <div id="game_message_center">
      <div id="game_messages">messages go here</div>

      <form onSubmit={onSubmit} noValidate autoComplete="off">
        <TextField
          ref={textInput}
          id="game_message_input"
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
  );
}
export default GameMessages;
