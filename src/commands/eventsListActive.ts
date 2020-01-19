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
        MessageWrapper.sendMessage({
            message: msg,
            content: 'No active events.',
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

export default eventsListActive;
