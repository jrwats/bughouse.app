let _lock = null;

class ScreenLock {

  static release() {
    if (_lock != null) {
      _lock.release();
    }
  }

  static async attemptAcquire() {
    if (_lock != null) {
      return;
    }
    if ('wakeLock' in global.navigator) {
      try {
        _lock = await navigator.wakeLock.request('screen');
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export default ScreenLock;
