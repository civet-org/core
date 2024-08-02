class Notifier {
  constructor() {
    this.subscriptions = [];
  }

  subscribe(handler) {
    if (typeof handler !== 'function') throw new Error('Handler must be a function');
    if (!this.isSubscribed(handler)) {
      this.subscriptions.push(handler);
    }
    return () => {
      this.subscriptions = this.subscriptions.filter((item) => item !== handler);
    };
  }

  isSubscribed(handler) {
    return this.subscriptions.includes(handler);
  }

  trigger() {
    this.subscriptions.forEach((handler) => handler());
  }
}

export default Notifier;
