// {Game 58 (fixerator vs. GuestGTWN) Creating unrated bughouse match\\.}
// Your partner is playing game 59 (GuestXYBH vs. GuestVBTD).

/*
{Game 117 (networc vs. VladimirPutin) VladimirPutin checkmated} 1-0
fics%
{Game 120 (mtatewaki vs. ovsaik) ovsaik's partner won} 0-1
fics%
Removing game 117 from observation list.
fics%
Removing game 120 from observation list.
```

# End of Game
```
fics%
{Game 36 (GuestLKCP vs. GuestSCFS) GuestSCFS forfeits on time} 1-0

{Game 41 (GuestZMHJ vs. GuestTZFW) GuestTZFW's partner won} 0-1

No ratings adjustment done.




fics%Auto-flagging.



fics%
{Game 17 (GuestPZNJ vs. GuestPSBG) GuestPZNJ forfeits on time} 0-1

{Game 55 (GuestRYBV vs. GuestHJCX) GuestRYBV's partner won} 1-0

No ratings adjustment done.
*/

const re = new RegExp(
  '\\{Game (?<id>\\d+) \\((?<white>\\w+) vs\\. (?<black>\\w+)\\) ' +
    '(?<reason>[^}]+)} (?<result>[01]-[01])\\s+' +
  '(?:\\{Game (?<id2>\\d+) \\((?<white2>\\w+) vs\\. (?<black2>\\w+)\\) ' +
    '(?<reason2>[^}]+)} (?<result2>[01]-[01]))?'
);

class GameEndParser {
  constructor(gameObserver) {
    this._gameObserver = gameObserver;
  }

  static parseEnd(text) {
    const match = re.exec(text);
    if (match == null) {
      return null;
    }
    const {id, white, black, reason, result} = match.groups;
    const boards = [{id, white, black, reason, result}];
    if (match.groups.id2 != null) {
      const {id2, white2, black2, reason2, result2} = match.groups;
      boards.push({
        id: id2,
        white: white2,
        black: black2,
        reason: reason2,
        result: result2,
      });
    }
    return boards;
  }

  getMatch(text) {
    return GameEndParser.parseEnd(text);
  }

  onMatch(match, _ /*clientSocket*/) {
    for (const b of match) {
      this._gameObserver.msgSubscribers(b.id, 'gameOver', b);
    }
  }

  // Go ahead and let this thru to the client console
  stripMatch(_, text) {
    return text;
  }

}

module.exports = GameEndParser;
