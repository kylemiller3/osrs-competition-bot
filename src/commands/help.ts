import * as discord from 'discord.js';
import { Command, } from '../command';
import { isAdmin, } from '../main';
import { MessageWrapper, } from '../messageWrapper';

const help = (
    msg: discord.Message
): void => {
    const admin: boolean = isAdmin(
        msg.guild,
        msg.author,
    );
    const helpStr: string = Command.generateHelpString(admin);
    MessageWrapper.sendMessage({
        message: msg,
        content: helpStr,
        options: {
            code: true,
        },
    });
};

export default help;
