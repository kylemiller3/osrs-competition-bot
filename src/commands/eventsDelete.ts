import * as discord from 'discord.js';
import { Command, } from '../command';
import Error, { ERROR, } from '../strings';

const eventsDelete = (
    msg: discord.Message
): void => {
    const params: Command.EventsDelete = Command.parseParameters(
        Command.ALL.EVENTS_DELETE,
        msg.content,
    );

    if (params.id === undefined) {
        msg.reply(ERROR.NO_EVENT_SPECIFIED);
        return;
    }

    msg.reply(`event ${params.id} deleted.`);
};

export default eventsDelete;
