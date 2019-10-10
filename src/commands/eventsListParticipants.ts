import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsListParticipants = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_LIST_PARTICIPANTS,
        msg.content,
    );
};

export default eventsListParticipants;
