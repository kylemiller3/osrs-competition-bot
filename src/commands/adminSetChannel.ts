import * as discord from 'discord.js';
import { Utils, } from '../utils';

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

    // save to db
    Utils.logger.debug(`Channel set to ${channel.id}`);
    msg.reply(`channel set to <#${channel.id}>.`);
};

export default adminSetChannel;
