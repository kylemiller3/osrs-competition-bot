import * as discord from 'discord.js';
import { Command, } from '../command';

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
};

export default eventsEndEvent;
