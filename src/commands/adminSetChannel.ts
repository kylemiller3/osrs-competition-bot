import * as discord from 'discord.js';
import {
    filter, take, timeout, tap,
} from 'rxjs/operators';
import { Observable, } from 'rxjs';
import { Utils, } from '../utils';
import { MessageWrapper, } from '../messageWrapper';
import { messageReceived$, } from '../main';
import { Conversation, ConversationManager, } from '../conversation';

enum PARAM {
    NO_CHANNEL
}

let awaitAnswer$: Observable<discord.Message>;
let questionSent$: Observable<MessageWrapper.Response>;
let conversation: Conversation;
const startNewConversation = (msg: discord.Message, params: PARAM[]): void => {
    conversation = ConversationManager.requestNewConversation(msg);
    awaitAnswer$ = conversation.nextAnswer$();
    questionSent$ = conversation.questionsSent$();

    const questionSub = questionSent$.subscribe(
        (question: MessageWrapper.Response):
        void => {
            Utils.logger.trace(`Conversation with '${msg.author.username}' id '${question.tag}' continued with question '${question.messages.map((m: discord.Message): string => m.content).join('\n')}'`);
        }
    );

    const answerSub = awaitAnswer$.subscribe(
        (answer: discord.Message): void => {
            Utils.logger.trace(`Conversation with '${answer.author.username}' continued with answer '${answer.content}'`);
            answerSub.unsubscribe();

            const sendInfo: MessageWrapper.SendInfo = {
                message: msg,
                content: 'Thanks for the reply!',
                tag: conversation.uuid,
            };
            MessageWrapper.sendMessage$.next(sendInfo);
        },
        (err: Error): void => {
            Utils.logger.trace(`Conversation ended prematurely: ${err}`);
            answerSub.unsubscribe();
            questionSub.unsubscribe();
        }
    );

    const sendInfo: MessageWrapper.SendInfo = {
        message: msg,
        content: 'Hello world!',
        tag: conversation.uuid,
    };
    MessageWrapper.sendMessage$.next(sendInfo);
};


/**
 * Validates and executes set channel function
 * @param msg the input message
 */
const adminSetChannel = (
    msg: discord.Message
): void => {
    startNewConversation(msg, [PARAM.NO_CHANNEL]);
    // const channel = msg.mentions.channels.first();
    // if (channel === undefined) return;
    // if (msg.guild.channels.get(channel.id) === undefined) return;

    // // save to db
    // Utils.logger.debug(`Channel set to ${channel.id}`);
    // msg.reply(`channel set to <#${channel.id}>.`);
};

export default adminSetChannel;
