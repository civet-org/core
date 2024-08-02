class AbortSignal {
  constructor() {
    this.locked = false;
    this.aborted = false;
    this.listeners = [];
  }

  listen(cb) {
    if (typeof cb !== 'function' || this.listeners.includes(cb)) return;
    this.listeners.push(cb);
    if (this.aborted) cb();
  }

  abort() {
    if (this.locked) return;
    this.locked = true;
    this.aborted = true;
    this.listeners.forEach(cb => cb());
  }

  lock() {
    this.locked = true;
  }
}

export default AbortSignal;
