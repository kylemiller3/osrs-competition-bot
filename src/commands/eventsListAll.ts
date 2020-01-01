import * as discord from 'discord.js';
import { Event, } from '../event';
import { MessageWrapper, } from '../messageWrapper';
import { Db, } from '../database';

const eventsListAll = async (
    msg: discord.Message
): Promise<void> => {
    const now: Date = new Date();
    const events: Event.Object[] | null = await Db.fetchAllGuildEvents(
        msg.guild.id,
        Db.mainDb
    );
    if (events === null) {
        MessageWrapper.sendMessage$.next({
            message: msg,
            content: 'No events.',
            tag: 'eventsListAll',
        });
    } else {
        const content: string = events.map(
            (event: Event.Object):
            string => `${event.id}. ${event.name}`
        ).join('\n');

        MessageWrapper.sendMessage$.next({
            message: msg,
            content,
            tag: 'eventsListAll',
        });
    }
};

export default eventsListAll;
