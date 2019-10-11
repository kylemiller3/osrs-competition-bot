import * as discord from 'discord.js';
import { Command, } from '../command';
import { isAdmin, } from '../main';

const help = (
    msg: discord.Message
): void => {
    const admin: boolean = isAdmin(
        msg.guild,
        msg.author,
    );
    const helpStr: string = Command.generateHelpString(admin);

    msg.reply(helpStr);
};

export default help;
