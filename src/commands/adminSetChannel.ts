import * as discord from 'discord.js';
import {
    filter, take, timeout, tap,
} from 'rxjs/operators';
import { Observable, Subscribable, Subscription, } from 'rxjs';
import { Utils, } from '../utils';
import { MessageWrapper, } from '../messageWrapper';
import { messageReceived$, spoofMessage, gClient, } from '../main';
import { Conversation, Qa, } from '../conversation';
import { Command, } from '../command';

enum ADMIN_SET_CHANNEL {
    WHICH_CHANNEL,
    WHICH_CHANNEL_ERROR,
    DONE,
}

class AdminSetChannelConversation extends Conversation<ADMIN_SET_CHANNEL> {
    constructor(opMessage: discord.Message) {
        super(opMessage);
        this.state = ADMIN_SET_CHANNEL.WHICH_CHANNEL;
    }

    produceQ(): [string, ADMIN_SET_CHANNEL] | null {
        switch (this.state) {
            case ADMIN_SET_CHANNEL.WHICH_CHANNEL:
                return ['Set to which text channel?', ADMIN_SET_CHANNEL.WHICH_CHANNEL,];
            case ADMIN_SET_CHANNEL.WHICH_CHANNEL_ERROR:
                return ['Could not find channel mention.\nex: \'#general\'', ADMIN_SET_CHANNEL.WHICH_CHANNEL_ERROR,];
            default:
                return null;
        }
    }

    consumeQa(qa: Qa<ADMIN_SET_CHANNEL>): void {
        const parser = <T>(paramName: string):
        Record<string, T> => Command.parseParameters<Record<string, T>>(
            Command.ALL.ADMIN_SET_CHANNEL,
            `${paramName}=${qa.answer.content}`
        );
        const answer = <T>(param: string):
        T | undefined => parser<T>(param)[param];
        switch (this.state) {
            // case ADMIN_SET_CHANNEL.WHICH_CHANNEL:
            // case ADMIN_SET_CHANNEL.WHICH_CHANNEL_ERROR: {
            //     const parsed: string | undefined = answer('channel');
            //     if (parsed) {
            //         this.mergeParams({ channel: parsed, });
            //         this.state = ADMIN_SET_CHANNEL.DONE;
            //     } else {
            //         this.state = ADMIN_SET_CHANNEL.WHICH_CHANNEL_ERROR;
            //     }
            //     break;
            // }
            case ADMIN_SET_CHANNEL.WHICH_CHANNEL:
            case ADMIN_SET_CHANNEL.WHICH_CHANNEL_ERROR: {
                const channelMentions = qa.answer.mentions.channels;
                if (channelMentions.array().length === 0) {
                    this.state = ADMIN_SET_CHANNEL.WHICH_CHANNEL_ERROR;
                } else {
                    this.state = ADMIN_SET_CHANNEL.DONE;
                }
                break;
            }
            default:
                break;
        }
    }

    done(): void {
        Utils.logger.trace(`Conversation with ${this.opMessage.author.username} finished successfully.`);
    }
}

const tempDict = {};

/**
 * Validates and executes set channel function
 * @param msg the input message
 */
const adminSetChannel = (
    msg: discord.Message,
): void => {
    // ConversationManager.handleConversation(
    //     msg,
    //     Command.ALL.ADMIN_SET_CHANNEL,
    //     (qa: [discord.Message, MessageWrapper.Response]): void => {
    //         const conversation =
    //     }
    // );

    const adminSetChannelConversation = new AdminSetChannelConversation(msg);
    tempDict[msg.author.id] = adminSetChannelConversation;

    const question = adminSetChannelConversation.produceQ();
    if (question === null) {
        return;
    }
    const sendInfo: MessageWrapper.SendInfo = {
        message: msg,
        content: question[0],
        tag: adminSetChannelConversation.uuid,
    };
    MessageWrapper.sendMessage$.next(
        sendInfo
    );

    // const channel = msg.mentions.channels.first();
    // if (channel === undefined) return;
    // if (msg.guild.channels.get(channel.id) === undefined) return;

    // // save to db
    // Utils.logger.debug(`Channel set to ${channel.id}`);
    // msg.reply(`channel set to <#${channel.id}>.`);
};

//     //     [Command.ALL.ADMIN_SET_CHANNEL]: {
//     //         channel: {
//     //             q: 'Set to which text channel?',
//     //             ex: '#general',
//     //             err: 'Could not find channel mention.',
//     //         },
//     //     },

export default adminSetChannel;
