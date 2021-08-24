import Button from "@material-ui/core/Button";
import QuickMessages, { QuickMessagesText, QuickMessagesPiece } from './QuickMessages';
import React, { useContext, useEffect, useRef, useState } from "react";
import TextField from '@material-ui/core/TextField';
import Typography from "@material-ui/core/Typography";
import { opposite } from "chessground/util";
import { ViewerContext } from "../user/ViewerProvider";
import { SocketContext } from "../socket/SocketProvider";
import BlockIcon from '@material-ui/icons/Block';

const getQuickContent = ({key, self, playerColor}) => {
  const piece = QuickMessagesPiece[key];
  let color = piece == null ? null : 
    (key.startsWith('NEED_') ? playerColor : opposite(playerColor));
  color = self ? color : opposite(color);
  const classes = [
    'quick-msg', 
    piece || key.toLowerCase(),
    color, 
    (key.startsWith('NO_') ? ' no' : '')
  ];
  const btnClass = classes.filter(c => !!c).join(' ');  
  const content = key.startsWith('NO_') ? 
    <BlockIcon /> : 
    (QuickMessagesText[key] || '\u{3000}');
  return (
    <span key={key} className={btnClass}>
      <span className="text">
        {content}
      </span>
    </span>
  );
}

const BUTTON_GROUPS = [
  [
    QuickMessages.NEED_PAWN,
    QuickMessages.NEED_KNIGHT,
    QuickMessages.NEED_BISHOP,
    QuickMessages.NEED_ROOK,
    QuickMessages.NEED_QUEEN
  ],
  [
    QuickMessages.NO_PAWN,
    QuickMessages.NO_KNIGHT,
    QuickMessages.NO_BISHOP,
    QuickMessages.NO_ROOK,
    QuickMessages.NO_QUEEN
  ],
  [
    QuickMessages.EXCHANGE,
    QuickMessages.MATES,
    QuickMessages.STALL,
    QuickMessages.WATCH_TIME,
  ]
];

const GameMessages = ({playerColor, gameID}) => {
  const { socket } = useContext(SocketContext);
  const { uid } = useContext(ViewerContext);
  const messages = useRef([]);
  const [uiMessages, setMessages] = useState({val: messages.current});
  const textInput = useRef(null);
  const scrollRef = useRef(null);

  const onSubmit = (evt) => {
    const input = textInput.current.querySelector("input");
    const newHandle = input.value;
    socket.sendEvent("game_msg", {
      id: gameID,
      sender: uid,
      type: "text",
      text: textInput.current.querySelector("input").value 
    });
    evt.preventDefault();
    input.value = '';
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
        {quick: data.quick}; // TODO - enum?

      messages.current.push({
        self: sender === uid, 
        type,
        ...message
      });
      setMessages({val: messages.current});
      scrollRef.current.scrollTop = Number.MAX_SAFE_INTEGER;
    };
    socket.on('game_msg', onMsg);
    return () => {
      socket.off('game_msg', onMsg);
    }
  }, [socket]);

  const btnColumns = BUTTON_GROUPS.map(btnGroup => {
    const rows = btnGroup.map(key => {
      const content = getQuickContent({self: true, key, playerColor});
      return (
        <Button
          variant="outlined"
          color="secondary"
          onClick={(e) => {
            socket.sendEvent("game_msg", {
              id: gameID,
              sender: uid,
              type: "quick",
              quick: key,
            });
          }}
        >
          {content}
        </Button>
      );
    });
    return (<div style={{flex: "auto"}}>{rows}</div>);
  });

  return (
    <div id="game_message_center">
      <div style={{position: "absolute", display: "hidden"}}>
        <svg>
          <filter id="red-filter">
            <feColorMatrix type="matrix" values="
              1.00 0    0    0 0
              0    0.00 0    0 0
              0    0    0.58 0 0
              0    0    0    1 0" />
          </filter>
        </svg>
      </div>
      <div id="game_messages_quick_buttons">
        <Typography className="alien" variant="h5">Quick messages</Typography>
        <div style={{display: "flex", flexWrap: "nowrap"}}>
          {btnColumns}
        </div>
      </div>
      <div id="game_messages" ref={scrollRef}>
        {/* <div>Messages go here...</div> */}
        {uiMessages.val.map(msg => {
          const self = msg.self ? "self " : "";
          const quick = msg.quick || "";
          const content = msg.text != null ? msg.text : getQuickContent({
            key: msg.quick,
            self: msg.self,
            playerColor,
          });
          return (
            <div className={`message ${self}${quick}`}>
              {content}
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
