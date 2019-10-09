import * as discord from 'discord.js';
import { Command, } from './command';

const eventsUnsignup = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_UNSIGNUP,
        msg.content,
    );
};

export default eventsUnsignup;
