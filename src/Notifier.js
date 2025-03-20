class Notifier {
  listeners = new Set();

  subscribe = (handler) => {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  };

  isSubscribed = (handler) => this.listeners.has(handler);

  trigger = (...args) => {
    this.listeners.forEach((handler) => handler(...args));
  };
}

export default Notifier;
