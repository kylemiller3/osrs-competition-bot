import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsListActive = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_LIST_ACTIVE,
        msg.content,
    );
};

export default eventsListActive;
