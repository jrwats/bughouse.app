
## Features
 * Flesh out react-chessboard use
   * Implement dragging held pieces onto board (currently only displayed)
   * Enable pre-moves and pre-drops
 * Clean up UI
   * It's currently disgusting

 * **Messaging**
   * We'll want to listen to any "channels" the player is in
   * These are ('tells')[http://freechess.org/Help/HelpFiles/tell.html] to the channel
   * Private tells (DMs) should also be displayed
   * UX-wise, this entails some tabulated display similar to FB messenger and it's ilk

## Bugs
* Game Challenges are displayed wrong
  * first name isn't necessarily going to play as white
* Partering lag
  * Offeror/Initiator has a log - implement "accepted"
    listener rather than relying on polling
* Unpartnering "cancel" button displays wrong in Firefox
