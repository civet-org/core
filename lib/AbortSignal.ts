import Notifier from './Notifier';

export type AbortSignalProxy = {
  listen: AbortSignal['listen'];
  locked: AbortSignal['locked'];
  aborted: AbortSignal['aborted'];
};

export default class AbortSignal {
  notifier = new Notifier();
  readonly locked: boolean = false;
  readonly aborted: boolean = false;

  constructor() {
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

  listen = (cb: () => void): (() => void) => {
    if (this.locked) return () => {};
    const alreadySubscribed = this.notifier.isSubscribed(cb);
    const unsubscribe = this.notifier.subscribe(cb);
    if (this.aborted && !alreadySubscribed) cb();
    return unsubscribe;
  };

  abort = (): void => {
    if (this.locked) return;
    this.lock();
    Object.defineProperty(this, 'aborted', {
      value: true,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    this.notifier.trigger();
  };

  lock = (): void => {
    if (this.locked) return;
    Object.defineProperty(this, 'locked', {
      value: true,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  };

  proxy = (): AbortSignalProxy => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const s = this;
    return {
      listen(cb) {
        return s.listen(cb);
      },
      get locked() {
        return s.locked!;
      },
      get aborted() {
        return s.aborted!;
      },
    };
  };
}
