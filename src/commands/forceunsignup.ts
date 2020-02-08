import * as discord from 'discord.js';
import { Command, } from '../command';
import { spoofMessage, } from '../..';

const eventsForceUnsignup = (
    msg: discord.Message
): void => {
    if (msg.mentions.members.array().length === 0) {
        return;
    }

    spoofMessage(
        Command.ALL.EVENTS_UNSIGNUP,
        msg,
        msg.mentions.users.array()[0],
    );
};

export default eventsForceUnsignup;
