import Notifier, { type NotifierCallback } from './Notifier';

type ChannelNotifierTrigger<TriggerArgs extends unknown[]> = {
  bivarianceHack(channel: string | undefined, ...args: TriggerArgs): void;
}['bivarianceHack'];

export default class ChannelNotifier<TriggerArgs extends unknown[] = never[]> {
  private channels: { [channel: string]: Notifier<TriggerArgs> } = {};

  subscribe = (
    channel: string,
    callback: NotifierCallback<TriggerArgs>,
  ): (() => void) => {
    if (channel == null || !`${channel}`) {
      throw new Error('Channel is required');
    }
    if (this.channels[channel] == null) this.channels[channel] = new Notifier();
    return this.channels[channel].subscribe(callback);
  };

  once = (
    channel: string,
    callback: NotifierCallback<TriggerArgs>,
  ): (() => void) => {
    if (channel == null || !`${channel}`) {
      throw new Error('Channel is required');
    }
    if (this.channels[channel] == null) this.channels[channel] = new Notifier();
    return this.channels[channel].once(callback);
  };

  isSubscribed = (
    channel: string,
    callback: NotifierCallback<TriggerArgs>,
  ): boolean => {
    if (channel == null || !`${channel}`) {
      throw new Error('Channel is required');
    }
    return (
      this.channels[channel] != null &&
      this.channels[channel].isSubscribed(callback)
    );
  };

  trigger: ChannelNotifierTrigger<TriggerArgs> = (
    channel: string | undefined,
    ...args: TriggerArgs
  ): void => {
    if (channel == null) {
      Object.values(this.channels).forEach((notifier) =>
        notifier.trigger(...args),
      );
    } else if (this.channels[channel] != null) {
      this.channels[channel].trigger(...args);
    }
  };
}
