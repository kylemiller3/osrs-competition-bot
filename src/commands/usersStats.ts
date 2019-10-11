import * as discord from 'discord.js';
import { Command, } from '../command';
import { spoofMessage, } from '../main';

const usersStats = (
    msg: discord.Message
): void => {
    if (msg.mentions.members.array().length === 0) {
        // get users stats
        return;
    }

    spoofMessage(
        Command.ALL.USERS_STATS,
        msg,
        msg.mentions.users.array()[0],
    );
};

export default usersStats;
