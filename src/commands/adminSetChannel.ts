import * as discord from 'discord.js';
import { willSaveToDb$, } from '../botEvent';
import { Command, } from '../command';

/**
 * Validates and executes set channel function
 * @param msg the input message
 */
const adminSetChannel = (
    msg: discord.Message
): void => {
    const channel = msg.mentions.channels.first();
    if (channel === undefined) return;
    if (msg.guild.channels.get(channel.id) === undefined) return;
    willSaveToDb$.next({
        command: Command.ALL.ADMIN_SET_CHANNEL,
        data: {
            channelId: channel.id,
        },
    });
};

export default adminSetChannel;
