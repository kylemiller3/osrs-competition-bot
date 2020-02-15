import * as discord from 'discord.js';
import { Command } from '../command';
import { isAdmin } from '../..';
import { MessageWrapper } from '../messageWrapper';
import { ConversationManager } from '../conversation';

const help = (
    msg: discord.Message,
): void => {
    const admin: boolean = isAdmin(
        msg.guild,
        msg.author,
    );
    const helpStr: string = Command.generateHelpString(admin);
    ConversationManager.stopConversation(msg);
    MessageWrapper.sendMessage({
        message: msg,
        content: helpStr,
        options: {
            code: true,
        },
    });
};

export default help;
