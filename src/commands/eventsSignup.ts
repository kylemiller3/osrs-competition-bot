import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsSignup = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_SIGNUP,
        msg.content,
    );
};

export default eventsSignup;
