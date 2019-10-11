import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsEdit = (
    msg: discord.Message
): void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_EDIT,
        msg.content,
    );
};

export default eventsEdit;
