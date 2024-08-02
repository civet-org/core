import Notifier from './Notifier';

class AbortSignal {
  constructor() {
    this.notifier = new Notifier();
    Object.defineProperties(this, {
      locked: {
        value: false,
        enumerable: true,
        writable: false,
        configurable: true,
      },
      aborted: {
        value: false,
        enumerable: true,
        writable: false,
        configurable: true,
      },
    });
  }

  listen(cb) {
    if (this.locked) return () => {};
    const alreadySubscribed = this.notifier.isSubscribed(cb);
    const unsubscribe = this.notifier.subscribe(cb);
    if (this.aborted && !alreadySubscribed) cb();
    return unsubscribe;
  }

  abort() {
    if (this.locked) return;
    this.lock();
    Object.defineProperty(this, 'aborted', {
      value: true,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    this.notifier.trigger();
  }

  lock() {
    if (this.locked) return;
    Object.defineProperty(this, 'locked', {
      value: true,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }

  proxy() {
    const s = this;
    return {
      get notifier() {
        return s.notifier;
      },
      get locked() {
        return s.locked;
      },
      get aborted() {
        return s.locked;
      },
    };
  }
}

export default AbortSignal;
