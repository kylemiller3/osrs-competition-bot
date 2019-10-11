import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsUnsignup = (msg: discord.Message):
void => {
    const params: Command.EventsUnsignup = Command.parseParameters(
        Command.ALL.EVENTS_UNSIGNUP,
        msg.content,
    );
};

export default eventsUnsignup;
