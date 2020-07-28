/**
 * Responsible for parsing FICS output relevant to playing a bughouse game
 * bugwho, partnering, challenges, game status, droppable pieces, messages, etc
 */
const log = require('./log');
const fs = require('fs');
/*
Bughouse games in progress

 0 games displayed.

Partnerships not playing bughouse

 0 partnerships displayed.

Unpartnered players with bugopen on

1541.drzach         ----^alextheseaman  ----^DoktorM        ---- fluters        ----.ricardoflorez  ---- yitian
1492.LokiSon        ----.BOTCHvinik     ----.Durol          ----^Kraehe         ----.rugs
 735.abdragan       ----^chesterzzz     ---- fixerator      ----^morts          ----.slaran

 16 players displayed (of 325). (*) indicates system administrator.
*/


const _handlers = [

  // Bughouse games in progress
  //  72 1703 lrzal       1360 buszak     [ Br  2   0]   0:51 -  1:06 (57-53) W: 20
  // 137 2257 SEREBRO     1557 ovsaik     [ Br  2   0]   0:48 -  1:06 (21-25) B: 24
  //
  //  1 game displayed.
  {
    re: /^Bughouse games in progress\s*([\s\S]*)\s+(\d+) games? displayed\./,
    on: (result) => {
      log(`Bughouse games`);
      log(result[1]);
      log(result[2]);
    }
  },
  // Partnerships not playing bughouse
  //
  // 1340 buszak / 1601 networc
  // 2240 SEREBRO / 1135 sadurang
  //  2 partnerships displayed.
  {
    re: /^Partnerships not playing bughouse\s*([\s\S]*)\s+(\d+) partnerships? displayed\./m,
    on: (result) => {
      log(`Partnerships`);
      log(result[1]);
      log(result[2]);
    }
  },

  // Status codes:
  //   ^   involved in a game
  //   ~   running a simul match
  //   :   not open for a match
  //   #   examining a game
  //   .   inactive for 5 minutes or longer, or if "busy" is set
  //       not busy
  //   &   involved in a tournament

  // Unpartnered players with bugopen on
  //
  // 1763^letsgetiton    ----.adenin         ----.jlojedaf       ----.SereneThought
  // 1662 Drukkarg       ---- alextheseaman  ----^Kraehe         ----^THEBIRDS
  // 1616^Allnovice      ----^allegories     ----.kukiriza       ----:Tingum
  // 1607.nirbak         ----^amedved        ----.LeeLody        ---- tinoman
  // 1603 networc        ----.benaguasil     ----^Luciopwm       ----.toodlebug
  // 1418.brucrigiov     ----.benzebest      ---- Lusitania      ----:torie
  // 1258^clementi       ----^Bkosuta        ----^maienberger    ----.trynottolaugh
  // 1204.RICHARDEUR     ----.brainsoup      ----^manoah         ----.UrGameOver
  // 1139^sadurang       ---- bricola        ----^mdeleon        ----.Urobe
  // 1138.Ishtaire       ----^chiefien       ----^pedda          ----^WANGDAYE
  //  875 skeckler       ---- floare         ----.petpet         ++++ GuestKBSJ(U)
  //  735.abdragan       ----^flyingpawn     ----^richardmario
  //  673^JoeO           ----^FOWARDL        ----^RikTheKing
  //  623^wycliff        ---- HAKARI         ----.SenTimo
  //
  //  53 players displayed (of 607). (*) indicates system administrator.
  {
    re: /^Unpartnered players with bugopen on\s*([\s\S]*)\s+(\d+) players? displayed/m,
    on: (result) => {
      log(`Bughousers`);
      log(result[1]);
      log(result[2]);
    }
  },
]

class FicsParser {
  constructor(ficsMgr) {
    this._ficsMgr = ficsMgr;
  }

  handle(text) {
    let handled = false;
    // console.log(text);
    for (const handler of _handlers) {
      const result = handler.re.exec(text);
      if (result !== null) {
        handled = true;
        handler.on(result);
      }
    }
    return handled;
  }

}

module.exports = FicsParser;
