import Notifier from './Notifier';

class ChannelNotifier {
  channels = {};

  subscribe = (channel, handler) => {
    if (channel == null || !`${channel}`) {
      throw new Error('Channel is required');
    }
    if (this.channels[channel] == null) this.channels[channel] = new Notifier();
    return this.channels[channel].subscribe(handler);
  };

  isSubscribed = (channel, handler) => {
    if (channel == null || !`${channel}`) {
      throw new Error('Channel is required');
    }
    return this.channels[channel] != null && this.channels[channel].isSubscribed(handler);
  };

  trigger = (channel, ...args) => {
    if (channel == null) {
      Object.values(this.channels).forEach((notifier) => notifier.trigger(...args));
    } else if (this.channels[channel] != null) {
      this.channels[channel].trigger(...args);
    }
  };
}

export default ChannelNotifier;
