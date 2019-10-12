import * as discord from 'discord.js';
import { Command, } from '../command';
import Error from '../strings';

const eventsUnsignup = (msg: discord.Message):
void => {
    const params: Command.EventsUnsignup = Command.parseParameters(
        Command.ALL.EVENTS_UNSIGNUP,
        msg.content,
    );

    if (params.id === undefined) {
        msg.reply(Error.NO_EVENT_SPECIFIED);
        return;
    }
};

export default eventsUnsignup;
