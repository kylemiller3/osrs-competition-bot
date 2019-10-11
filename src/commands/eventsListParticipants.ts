import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsListParticipants = (
    msg: discord.Message
): void => {
    const params: Command.EventsListParticipants = Command.parseParameters(
        Command.ALL.EVENTS_LIST_PARTICIPANTS,
        msg.content,
    );
};

export default eventsListParticipants;
