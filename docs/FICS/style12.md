style12

  Style 12 is a type of machine parseable output that many of the FICS
interfaces use.  The output is documented here for those who wish to write new
interfaces.  Style 12 is also fully compatible with ICC (The Internet Chess
Club).

  The data is all on one line (displayed here as two lines, so it will show on
your screen).  Here is an example:  [Note: the beginning and ending quotation
marks are *not* part of the data string; they are needed in this help file
because some interfaces cannot display the string when in a text file.]

"<12> rnbqkb-r pppppppp -----n-- -------- ----P--- -------- PPPPKPPP RNBQ-BNR
 B -1 0 0 1 1 0 7 Newton Einstein 1 2 12 39 39 119 122 2 K/e1-e2 (0:06) Ke2 0"

This string always begins on a new line, and there are always exactly 31 non-
empty fields separated by blanks. The fields are:

* the string "<12>" to identify this line.
* eight fields representing the board position.  The first one is White's
  8th rank (also Black's 1st rank), then White's 7th rank (also Black's 2nd),
  etc, regardless of who's move it is.
* color whose turn it is to move ("B" or "W")
* -1 if the previous move was NOT a double pawn push, otherwise the chess
  board file  (numbered 0--7 for a--h) in which the double push was made
* can White still castle short? (0=no, 1=yes)
* can White still castle long?
* can Black still castle short?
* can Black still castle long?
* the number of moves made since the last irreversible move.  (0 if last move
  was irreversible.  If the value is >= 100, the game can be declared a draw
  due to the 50 move rule.)
* The game number
* White's name
* Black's name
* my relation to this game:
    -3 isolated position, such as for "ref 3" or the "sposition" command
    -2 I am observing game being examined
     2 I am the examiner of this game
    -1 I am playing, it is my opponent's move
     1 I am playing and it is my move
     0 I am observing a game being played
* initial time (in seconds) of the match
* increment In seconds) of the match
* White material strength
* Black material strength
* White's remaining time
* Black's remaining time
* the number of the move about to be made (standard chess numbering -- White's
  and Black's first moves are both 1, etc.)
* verbose coordinate notation for the previous move ("none" if there were
  none) [note this used to be broken for examined games]
* time taken to make previous move "(min:sec)".
* pretty notation for the previous move ("none" if there is none)
* flip field for board orientation: 1 = Black at bottom, 0 = White at bottom.

In the future, new fields may be added to the end of the data string, so
programs should parse from left to right.
Special information for bughouse games
--------------------------------------

When showing positions from bughouse games, a second line showing piece
holding is given, with "<b1>" at the beginning, for example:

  <b1> game 6 white [PNBBB] black [PNB]

Also, when pieces are "passed" during bughouse, a short data string -- not the
entire board position -- is sent.  For example:

  <b1> game 52 white [NB] black [N] <- BN

The final two letters indicate the piece that was passed; in the above
example, a knight (N) was passed to Black.

A prompt may preceed the <b1> header.

Credits
-------

  Style12 was designed by Daniel Sleator (sleator+@cs.cmu.edu) (Darooha@ICC)

  A big thanks to ICC for letting us use the specification document as the
basis for this helpfile.  There are only a couple of modifications to the
document to use FICS terminology.

  This helpfile may be used by others as long as the credit to ICC above
remains.

[Last modified: June 3, 1997 -- Friar]
