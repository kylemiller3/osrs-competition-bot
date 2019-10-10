import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsForceSignup = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_FORCE_SIGNUP,
        msg.content,
    );
};

export default eventsForceSignup;
