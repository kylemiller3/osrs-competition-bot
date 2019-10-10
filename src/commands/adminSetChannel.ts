import * as discord from 'discord.js';
import { willSaveToDb$, } from '../botEvent';
import { Command } from './command';

const adminSetChannel = (
    msg: discord.Message
): boolean => {
    const channel = msg.mentions.channels.first();
    if (channel === undefined) return false;
    if (msg.guild.channels.get(channel.id) === undefined) return false;
    willSaveToDb$.next({
        command: Command.ALL.ADMIN_SET_CHANNEL,
        data: channel.id,
    });
    return true;
};

export default adminSetChannel;
