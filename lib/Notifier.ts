export default class Notifier<TriggerArgs extends unknown[] = never[]> {
  listeners = new Set<(...args: TriggerArgs) => void>();

  subscribe = (callback: (...args: TriggerArgs) => void): (() => void) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };

  isSubscribed = (callback: (...args: TriggerArgs) => void): boolean =>
    this.listeners.has(callback);

  trigger = (...args: TriggerArgs): void => {
    this.listeners.forEach((callback) => callback(...args));
  };
}
