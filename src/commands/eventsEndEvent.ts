import * as discord from 'discord.js';
import { Command, } from '../command';
import { Db, } from '../database';
import { willSaveToDb$, } from '../botEvent';

const eventsEndEvent = (
    msg: discord.Message
): void => {
    const params: Command.EventsEndEvent = Command.parseParameters(
        Command.ALL.EVENTS_END_EVENT,
        msg.content,
    );

    if (params.id === undefined) {
        return;
    }

    /*
    willSaveToDb$.next({
        command: Db.MUTATE.EVENT_END,
        guildId: msg.guild.id,
        data: {
            eventId: params.id,
        },
    });
    */
    willSaveToDb$.next();
};

export default eventsEndEvent;
