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
      _lock = await navigator.wakeLock.request('screen');
    }
  }
}

export default ScreenLock;
