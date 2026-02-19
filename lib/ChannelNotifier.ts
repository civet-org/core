import Notifier from './Notifier';

export default class ChannelNotifier<TriggerArgs extends unknown[] = never[]> {
  private channels: { [channel: string]: Notifier<TriggerArgs> } = {};

  subscribe = (
    channel: string,
    callback: (...args: TriggerArgs) => void,
  ): (() => void) => {
    if (channel == null || !`${channel}`) {
      throw new Error('Channel is required');
    }
    if (this.channels[channel] == null) this.channels[channel] = new Notifier();
    return this.channels[channel].subscribe(callback);
  };

  once = (
    channel: string,
    callback: (...args: TriggerArgs) => void,
  ): (() => void) => {
    if (channel == null || !`${channel}`) {
      throw new Error('Channel is required');
    }
    if (this.channels[channel] == null) this.channels[channel] = new Notifier();
    return this.channels[channel].once(callback);
  };

  isSubscribed = (
    channel: string,
    callback: (...args: TriggerArgs) => void,
  ): boolean => {
    if (channel == null || !`${channel}`) {
      throw new Error('Channel is required');
    }
    return (
      this.channels[channel] != null &&
      this.channels[channel].isSubscribed(callback)
    );
  };

  trigger = (channel: string, ...args: TriggerArgs): void => {
    if (channel == null) {
      Object.values(this.channels).forEach((notifier) =>
        notifier.trigger(...args),
      );
    } else if (this.channels[channel] != null) {
      this.channels[channel].trigger(...args);
    }
  };
}
