import * as discord from 'discord.js';
import { Event, } from '../event';
import { Db, } from '../database';
import { MessageWrapper, } from '../messageWrapper';

const eventsListActive = async (
    msg: discord.Message,
): Promise<void> => {
    const now: Date = new Date();
    const events: Event.Object[] | null = await Db.fetchAllGuildEventsBetweenDates(
        msg.guild.id,
        now,
        now,
        Db.mainDb
    );
    if (events === null) {
        MessageWrapper.sendMessage$.next({
            message: msg,
            content: 'No active events.',
            tag: 'eventsListActive',
        });
    } else {
        const content: string = events.map(
            (event: Event.Object):
            string => `${event.id}. ${event.name}`
        ).join('\n');

        MessageWrapper.sendMessage$.next({
            message: msg,
            content,
            tag: 'eventsListActive',
        });
    }
};

export default eventsListActive;
