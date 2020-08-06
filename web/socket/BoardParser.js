const log = require('./log');

// https://www.freechess.org/Help/HelpFiles/style12.html
// <12> r-b----r ppNnknpp -------- -QNPb--- -------- --K-P--- P-P---PP R-----NR W -1 0 0 0 0 0 8 foo bar 0 2 0 43 32 31 93 20 B/@@-e5 (0:02) B@e5+ 0 1 0
//
// <12> Qnb-kb-r p----ppp ----pn-- -------- -------- -------- PPPQ-PPP RNB-KBNR B -1 1 1 1 0 0 146 GuestZFRK fixerator 1 5 0 46 24 261 102 6 P/b7-a8=Q (0:05) bxa8=Q 1 1 0
// <12> Qnbqkb-r p----ppp ----pn-- -------- -------- -------- PPPP-PPP RNBQKBNR B -1 1 1 1 0 0 47 GuestCJPY GuestRPRR 0 5 0 47 31 284 250 5 P/b7-a8=Q (0:02) bxa8=Q 0 1 0
// <b1> game 146 white [] black [PP]

const boardRE = new RegExp(
  '<12>(?<rows>(?: [pnbrkqPNBRKQ-]{8}){8}) ' +
  '(?<toMove>B|W) (?<pawnPush>-1|[0-7]) ' +
  '(?<wCS>0|1) (?<wCL>0|1) (?<bCS>0|1) (?<bCL>0|1) ' +
  '(?<numHalfMoves>\\d+) (?<id>\\d+) ' +
  '(?<wHandle>\\w+) (?<bHandle>\\w+) ' +
  '(?<viewerRelation>-[1-3]|[0-2]) (?<initialTime>\\d+) (?<incr>\\d+) ' +
  '(?<wms>\\d+) (?<bms>\\d+) (?<wRT>\\d+) (?<bRT>\\d+) (?<moveNum>\\d+) ' +
  '(?<moveMade>none|[PNBRKQ]\\/(?:[a-h][1-8]|@@)-[a-h][1-8](?:=[NBRQ])?) ' +
  '\\((?<timeTaken>\\d+:\\d+)\\) (?<prettyMove>none|[\\w@+=#]+) ' +
  '(?<flip>0|1).*$',
  'm'
);

const holdingsRE = new RegExp(
  '<b1> game (?<id>\\d+) ' +
  'white \\[(?<wHoldings>[PNBRQ]*)\\] ' +
  'black \\[(?<bHoldings>[PNBRQ]*)\\]' +
  '( <- (?<passer>B|W)(?<piece>[PNBRQ]))?.*$',
  'm'
);


// https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
function _getFENBoard(groups) {
  return groups.rows.trimLeft().split(' ').map(row => {
    let fenRow = '';
    let lastPieceIdx = -1;
    for (let i = 0; i < row.length; ++i) {
      const piece = row[i];
      if (piece !== '-') {
        const numEmpty = i - lastPieceIdx - 1;
        if (numEmpty > 0) {
          fenRow += String(numEmpty);
        }
        fenRow += piece;
        lastPieceIdx = i;
      }
    }
    const numEmpty = 7 - lastPieceIdx;
    if (numEmpty > 0) {
      fenRow += String(numEmpty);
    }
    return fenRow;
  }).join('/');
}

function _getFENPawnSquare(groups) {
  const {pawnPush, toMove} = groups;
  if (pawnPush === '-1') {
    return '-';
  }
  return 'abcdefgh'[parseInt(pawnPush)] + toMove === 'W' ? '3' : '6';
}

function _getFENCastling(groups) {
  const {wCS, wCL, bCS, bCL} = groups;
  const castleFEN =  (wCS === '1' ? 'K' : '') +
        (wCL === '1' ? 'Q' : '') +
        (bCS === '1' ? 'k' : '') +
        (bCL === '1' ? 'q' : '');
  return castleFEN === '' ? '-' : castleFEN;
}

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
    const {groups} = match;
    const holdings = {
      id: groups.id,
      white: groups.wHoldings,
      black: groups.bHoldings,
      passer: groups.passer,
      piece: groups.piece
    };
    return {holdings, match};
  }

  static toBoard(match) {
    if (match == null) {
      return null;
    }
    const {groups} = match;
    const fen = BoardParser._toFEN(groups);
    log(`BoardParser: ${fen}`);

    return {
      id: groups.id,
      fen,
      // pieces: rowArray,
      toMove: groups.toMove,
      pawnPush: groups.pawnPush,
      white: {
        handle: groups.wHandle,
        time: groups.wRT
      },
      black: {
        handle: groups.bHandle,
        time: groups.bRT,
      },
      moveNum: groups.moveNum,
      moveMade: groups.moveMade,
      timeTaken: groups.timeTaken,
      prettyMove: groups.prettyMove,
      initialTime: groups.initialTime,
      incr: groups.incr,
    };
  }

  static _toFEN(groups) {
    const {numHalfMoves, toMove, moveNum} = groups;
    return _getFENBoard(groups) + ' ' + toMove.toLowerCase() + ' ' +
      _getFENCastling(groups) +  ' '  + _getFENPawnSquare(groups) + ' ' +
      numHalfMoves + ' ' + moveNum;
  }

}

module.exports = BoardParser;
