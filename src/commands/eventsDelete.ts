import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsDelete = (
    msg: discord.Message
): void => {
    const params: Command.EventsDelete = Command.parseParameters(
        Command.ALL.EVENTS_DELETE,
        msg.content,
    );

    if (params.id === undefined) {
        return;
    }

    msg.reply(`event ${params.id} deleted.`);
};

export default eventsDelete;
