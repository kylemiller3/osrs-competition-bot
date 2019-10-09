import * as discord from 'discord.js';
import { Command, } from './command';

const eventsDelete = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_DELETE,
        msg.content,
    );
};

export default eventsDelete;
