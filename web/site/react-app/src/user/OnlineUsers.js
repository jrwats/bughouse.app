import { EventEmitter } from "events";
import SocketProxy from "../socket/SocketProxy";

/**
 * Listens to the relevant socket events from the server for maintaining list
 * of online users.
 */
class OnlineUsers extends EventEmitter {
  constructor(socket) {
    console.log(`OnlineUsers ctor`);
    super();
    this._uids = {};
    this._users = {};
    this._handle2uid = {};
    this._unpartnered = {};
    this._partners = [];
    this._listeners = {};
    this._subscriptions = {};
    this._outgoingOffers = {};
    this._incomingOffers = {};

    console.log(`OnlineUsers ${Date.now()}`);
    this._socket = socket;

    const onPartners = (partners) => {
      console.log(`OnlineUsers partners`);
      console.log(partners);
      this._partners = partners;
      this._mergePartnerHandles();
      this.emit("partners", partners);
    };
    const onPending = ({ pending }) => {
      const { outgoing, incoming } = pending;
      if (outgoing == null) {
        debugger;
      }
      for (const { handle } of outgoing.offers || []) {
        this._outgoingOffers[handle] = true;
      }
      this._outgoingChallenges = outgoing.challenges;
      for (const { handle } of incoming.offers || []) {
        this._incomingOffers[handle] = true;
      }
      this._incomingChallenges = incoming.challenges;
      this.emit("incomingChallenges", this._incomingChallenges);
      this.emit("incomingOffers", this._incomingOffers);
    };
    const onIncomingOffer = ({ handle }) => {
      console.log(`OnlineUsers onIncomingOffer(${handle})`);
      this._incomingOffers[handle] = true;
      this.emit("incomingOffers", this._incomingOffers);
    };
    const onLogout = () => {
      this._incomingOffers = {};
    };
    const onOutgoingCancelled = ({ user, handle }) => {
      delete this._outgoingOffers[handle];
      this.emit("outgoingOffers", this._outgoingOffers);
    };
    const onLogin = (data) => {
      socket.sendEvent("online_players", { count: 0, cursor: null });
    };
    socket.on("unpartneredHandles", (handles) => {
      this._onUnpartneredHandles(handles);
    });
    socket.on("partners", onPartners);
    socket.on("partnerAccepted", (data) => this._formPartner(data));
    socket.on("incomingOffer", onIncomingOffer);
    socket.on("outgoingOfferCancelled", onOutgoingCancelled);
    socket.on("pending", onPending);
    socket.on("login", onLogin);
    socket.on("logout", onLogout);
    socket.on("unpartnered", ({ user }) => {
      if (!(user.uid in this._users)) {
        return;
      }
      const handle = this._users[user.uid].handle;
      for (let i = 0; i < this._partners.length; ++i) {
        const [p1, p2] = this._partners[i];
        if (p1.handle === handle || p2.handle === handle) {
          this._partners.splice(i, 1);
          onPartners(this._partners);
          return;
        }
      }
      console.error(`Unpartnered ${handle} not found?`);
    });

    const onOnlineUpdate = (data) => {
      console.log(`online_players_update: ${data}`);
      console.log(data);
      for (const uid of data.offline) {
        delete this._users[uid];
      }
      for (const user of data.online) {
        const [uid, handle, rating] = user;
        this._users[uid] = { uid, handle, rating };
      }
      this.emit("value", this._users);
    };
    socket.on("online_players", ({ players }) => {
      if (players == null) {
        return;
      }
      this._users = {};
      for (const [uid, handle, rating] of players) {
        this._users[uid] = { uid, handle, rating };
      }
      this.emit("value", this._users);
    });
    socket.on("online_players_update", onOnlineUpdate);
    socket.sendEvent("online_players", { count: 0, cursor: null });
  }

  _onUnpartneredHandles(unpartneredFicsPlayers) {
    const newUnpartnered = {};
    for (const player of unpartneredFicsPlayers) {
      const { handle } = player;
      newUnpartnered[handle] = player;
    }
    this._unpartnered = newUnpartnered;
    this._mergeUserHandles();
    this.emit("unpartneredHandles", this._unpartnered);
  }

  _mergeUserHandles() {
    for (const handle in this._unpartnered) {
      if (handle in this._handle2uid) {
        this._unpartnered[handle].user = this._users[this._handle2uid[handle]];
      }
    }
  }

  _mergePartnerHandles() {
    for (let i = 0; i < this._partners.length; ++i) {
      const [p1, p2] = this._partners[i];
      if (p1.handle in this._handle2uid) {
        this._partners[i][0] = {
          ...p1,
          user: this.getUserFromHandle(p1.handle),
        };
      }
      if (p2.handle in this._handle2uid) {
        this._partners[i][1] = {
          ...p2,
          user: this.getUserFromHandle(p2.handle),
        };
      }
    }
  }

  _formPartner({ user, handle }) {
    if (user == null) {
      debugger;
    }
    const { uid } = user;
    const viewerHandle = this._users[uid].handle;
    if (handle in this._unpartnered && viewerHandle in this._unpartnered) {
      this._partners.push([
        this._unpartnered[handle],
        this._unpartnered[viewerHandle],
      ]);
    } else {
      console.error(`Already partnered? ${viewerHandle} ${handle}`);
    }
    delete this._outgoingOffers[handle];
    delete this._incomingOffers[handle];
    delete this._unpartnered[handle];
    delete this._unpartnered[viewerHandle];
    this.emit("partners", [...this._partners]);
    this.emit("unpartneredHandles", this._unpartnered);
  }

  offerTo({ user, handle }) {
    if (this._incomingOffers[handle]) {
      this._formPartner({ user, handle });
      return;
    }
    this._outgoingOffers[handle] = true;
    this.emit("outgoingOffers", this._outgoingOffers);
  }

  getOutgoingOffers() {
    return this._outgoingOffers;
  }

  hasOutgoingOffer(handle) {
    return handle in this._outgoingOffers;
  }

  getIncomingOffers() {
    return this._incomingOffers;
  }

  getUsers() {
    return { ...this._users };
  }

  getUserFromHandle(handle) {
    const uid = this._handle2uid[handle];
    return uid && this._users[uid];
  }

  getHandleToUsers() {
    const handle2user = {};
    for (const handle in this._handle2uid) {
      const uid = this._handle2uid[handle];
      handle2user[handle] = this._users[uid];
    }
    // console.log(`handleToUser: ${JSON.stringify(handle2user)}`);
    return handle2user;
  }

  // Filters (deduplicates) out existing bughouse.app users
  getUnpartnered() {
    return this._unpartnered;
  }

  getPendingOffers() {
    return this._pendingOffers;
  }

  // Filters (deduplicates) out existing bughouse.app users
  getPartners() {
    return this._partners;
  }
}

let singleton = null;
const OnlineUsersGetter = {
  get() {
    if (singleton == null) {
      singleton = new OnlineUsers(SocketProxy.get());
      window.__onlineUsers = singleton;
    }
    return singleton;
  },
};
export default OnlineUsersGetter;
