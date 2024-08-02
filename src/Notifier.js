class Notifier {
  subscriptions = [];

  subscribe = (handler) => {
    if (typeof handler !== 'function') throw new Error('Handler must be a function');
    if (!this.isSubscribed(handler)) {
      this.subscriptions.push(handler);
    }
    return () => {
      this.subscriptions = this.subscriptions.filter((item) => item !== handler);
    };
  };

  isSubscribed = (handler) => this.subscriptions.includes(handler);

  trigger = (...args) => {
    this.subscriptions.forEach((handler) => handler(...args));
  };
}

export default Notifier;
