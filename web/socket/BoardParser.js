
// <12> r-b----r ppNnknpp -------- -QNPb--- -------- --K-P--- P-P---PP R-----NR W -1 0 0 0 0 0 8 touchpadonly JarlC 0 2 0 43 32 31 93 20 B/@@-e5 (0:02) B@e5+ 0 1 0

const boardRE = new RegExp(
  '^<12>(?<rows>(?: [pnbrkqPNBRKQ-]{8}){8}) ' +
  '(?<toMove>B|W) (?<pawnPush>-1|[0-7]) ' +
  '(?<wCS>0|1) (?<wCL>0|1) (?<bCS>0|1) (?<bCL>0|1) ' +
  '(?<numMoves>\\d+) (?<id>\\d+) ' +
  '(?<wHandle>\\w+) (?<bHandle>\\w+) ' +
  '(?<viewerRelation>-[1-3]|[0-2]) (?<initialTime>\\d+) (?<incr>\\d+) ' +
  '(?<wms>\\d+) (?<bms>\\d+) (?<wRT>\\d+) (?<bRT>\\d+) (?<moveNum>\\d+) ' +
  '(?<moveMade>none|[PNBRKQ]\\/(?:[a-h][1-8]|@@)-[a-h][1-8]) ' +
  '\\((?<timeTaken>\\d+:\\d+)\\) (?<prettyMove>none|[\\w@+#]+) ' +
  '(?<flip>0|1).*$',
  'm'
);

const holdingsRE = new RegExp(
  '^<b1> game (?<id>\\d+) ' +
  'white \\[(?<wHoldings>[PNBRKQ]*)\\] ' +
  'black \\[(?<bHoldings>[PNBRKQ]*)\\]' +
  '( <- (?<passer>B|W)(?<piece>[PNBRKQ]))?.*$',
  'm'
);

class BoardParser {

  static parseBoard(text) {
    const match = boardRE.exec(text);
    if (match == null) {
      return {board: null, match};
    }
    return {board: BoardParser.toBoard(match), match};
  }

  static parseHoldings(text) {
    const match = holdingsRE.exec(text);
    if (match == null) {
      return {holdings: null, match};
    }
    const holdings = {
      id: match.id,
      white: match.wHoldings,
      black: match.bHoldings,
      passer: match.passer,
      piece: match.piece
    };
    return {holdings, match};
  }

  static toBoard(match) {
    if (match == null) {
      return null;
    }
    const {groups} = match;
    const rowArray = groups.rows.trimLeft().split(' ');
    return {
      id: groups.id,
      board: rowArray,
      pawnPush: groups.pawnPush,
      white: {
        handle: groups.wHandle,
        cs: groups.wCS,
        cl: groups.wCL,
        time: groups.wRT
      },
      black: {
        handle: groups.bHandle,
        cs: groups.bCS,
        cl: groups.bCL,
        time: groups.bRT,
      },
      numMoves: groups.numMoves,
      moveNum: groups.moveNum,
      moveMade: groups.moveMade,
      timeTaken: groups.timeTaken,
      prettyMove: groups.prettyMove,
      initialTime: groups.initialTime,
      incr: groups.incr,
    };
  }
}

module.exports = BoardParser;
