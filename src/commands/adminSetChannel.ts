import * as discord from 'discord.js';
import { willSaveToDb$, } from '../botEvent';
import { Db, } from '../database';

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

    /*
    willSaveToDb$.next({
        command: Db.MUTATE.NOTIFICATION_CHANNEL_SET,
        guildId: msg.guild.id,
        data: {
            channelId: channel.id,
        },
    });
    */
    willSaveToDb$.next();
    //save to db
    
};

export default adminSetChannel;
