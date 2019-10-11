import * as discord from 'discord.js';

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
    msg.reply('channel set.');
};

export default adminSetChannel;
