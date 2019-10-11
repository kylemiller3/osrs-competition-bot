import * as discord from 'discord.js';
import { Command, } from '../command';
import { willSaveToDb$, } from '../botEvent';
import { Db, } from '../database';

const eventsDelete = (
    msg: discord.Message
): void => {
    const params: Command.EventsDelete = Command.parseParameters(
        Command.ALL.EVENTS_DELETE,
        msg.content,
    );

    if (params.id === undefined) {
        return;
    }

    /*
    willSaveToDb$.next({
        command: Db.MUTATE.EVENT_DELETE,
        guildId: msg.guild.id,
        data: {
            eventId: params.id,
        },
    });
    */
    willSaveToDb$.next();
};

export default eventsDelete;
