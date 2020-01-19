import * as discord from 'discord.js';
import { Event, } from '../event';
import { MessageWrapper, } from '../messageWrapper';
import { Db, } from '../database';

const eventsListAll = async (
    msg: discord.Message
): Promise<void> => {
    // const now: Date = new Date();
    const events: Event.Object[] | null = await Db.fetchAllGuildEvents(
        msg.guild.id,
        Db.mainDb
    );
    if (events === null) {
        MessageWrapper.sendMessage({
            message: msg,
            content: 'No events.',
        });
    } else {
        const content: string = events.map(
            (event: Event.Object):
            string => `${event.id}. ${event.name}`
        ).join('\n');

        MessageWrapper.sendMessage({
            message: msg,
            content,
        });
    }
};

export default eventsListAll;
