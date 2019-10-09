import * as discord from 'discord.js';
import { Command, } from './command';

const eventsAmISignedUp = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_AMISIGNEDUP,
        msg.content,
    );
};

export default eventsAmISignedUp;
