import * as discord from 'discord.js';
import {
    filter, take, timeout, tap,
} from 'rxjs/operators';
import { Observable, Subscribable, Subscription, } from 'rxjs';
import { Utils, } from '../utils';
import { MessageWrapper, } from '../messageWrapper';
import { messageReceived$, } from '../main';
import { Conversation, ConversationManager, } from '../conversation';
import { Command } from '../command';

/**
 * Validates and executes set channel function
 * @param msg the input message
 */
const adminSetChannel = (
    msg: discord.Message,
): void => {
    const conver = new Conversation(msg, (qa: [discord.Message, MessageWrapper.Response]): void => {
        const sendInfo: MessageWrapper.SendInfo = {
            message: msg,
            content: 'uwu whats this',
            tag: this.uuid,
        };
        MessageWrapper.sendMessage$.next(
            sendInfo
        );
    });

    setTimeout((): void => {
        conver.stopConversation();
        const conver2 = new Conversation(msg, (qa2: [discord.Message, MessageWrapper.Response]): void => {
            const sendInfo: MessageWrapper.SendInfo = {
                message: msg,
                content: 'sowwy',
                tag: this.uuid,
            };
            MessageWrapper.sendMessage$.next(
                sendInfo
            );
        });
        const sendInfo2: MessageWrapper.SendInfo = {
            message: msg,
            content: 'notices u',
            tag: this.uuid,
        };
        MessageWrapper.sendMessage$.next(
            sendInfo2
        );
    }, 5000);

    const sendInfo: MessageWrapper.SendInfo = {
        message: msg,
        content: 'hewwo World!',
        tag: this.uuid,
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

export default adminSetChannel;
