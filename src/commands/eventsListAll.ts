import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsListAll = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_LIST_ALL,
        msg.content,
    );
};

export default eventsListAll;
