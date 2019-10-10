import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsEndEvent = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_END_EVENT,
        msg.content,
    );
};

export default eventsEndEvent;
