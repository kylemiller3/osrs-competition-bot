import * as discord from 'discord.js';
import { Command, } from './command';

const usersStats = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.USERS_STATS,
        msg.content,
    );
};

export default usersStats;
