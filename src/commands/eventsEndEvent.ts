import * as discord from 'discord.js';
import { Command, } from '../command';
import Error from '../strings';

const eventsEndEvent = (
    msg: discord.Message
): void => {
    const params: Command.EventsEndEvent = Command.parseParameters(
        Command.ALL.EVENTS_END_EVENT,
        msg.content,
    );

    if (params.id === undefined) {
        msg.reply(Error.NO_EVENT_SPECIFIED);
        return;
    }

    msg.reply(`event ${params.id} ended.`);
};

export default eventsEndEvent;
