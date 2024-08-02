import Notifier from './Notifier';

class AbortSignal {
  constructor() {
    this.notifier = new Notifier();
    this.locked = false;
    this.aborted = false;
  }

  listen(cb) {
    const alreadySubscribed = this.notifier.isSubscribed(cb);
    const unsubscribe = this.notifier.subscribe(cb);
    if (this.aborted && !alreadySubscribed) cb();
    return unsubscribe;
  }

  abort() {
    if (this.locked) return;
    this.locked = true;
    this.aborted = true;
    this.notifier.trigger();
  }

  lock() {
    this.locked = true;
  }
}

export default AbortSignal;
