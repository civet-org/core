export type NotifierCallback<TriggerArgs extends unknown[]> = {
  bivarianceHack(...args: TriggerArgs): void;
}['bivarianceHack'];

type NotifierTrigger<TriggerArgs extends unknown[]> = {
  bivarianceHack(...args: TriggerArgs): void;
}['bivarianceHack'];

export default class Notifier<TriggerArgs extends unknown[] = never[]> {
  listeners: Set<NotifierCallback<TriggerArgs>> = new Set();

  subscribe = (callback: NotifierCallback<TriggerArgs>): (() => void) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };

  once = (callback: NotifierCallback<TriggerArgs>): (() => void) => {
    const unsub = this.subscribe((...args) => {
      unsub();
      callback(...args);
    });
    return unsub;
  };

  isSubscribed = (callback: NotifierCallback<TriggerArgs>): boolean =>
    this.listeners.has(callback);

  trigger: NotifierTrigger<TriggerArgs> = (...args: TriggerArgs): void => {
    this.listeners.forEach((callback) => callback(...args));
  };
}
