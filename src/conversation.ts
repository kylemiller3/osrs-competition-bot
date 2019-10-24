import * as discord from 'discord.js';
import { Subscription, Observable, merge, } from 'rxjs';
import {
    filter, timeout, map, take, tap,
} from 'rxjs/operators';
import { async, } from 'rxjs/internal/scheduler/async';
// import { uuid, } from 'uuid-v4';
import { messageReceived$, } from './main';
import { Command, } from './command';
import { MessageWrapper, } from './messageWrapper';
import { Utils, } from './utils';

export interface Qa {
    questions: (discord.Message | null)[] // keep track of all questions
    answer?: discord.Message // and answers
}

export class Conversation {
    qa: Qa[];
    opMessage: discord.Message; // original message containing author id etc
    uuid: string; // conversation tag

    constructor(opMessage: discord.Message) {
        this.opMessage = opMessage;
        this.uuid = `${Math.random()}`;
        this.qa = [];
        Utils.logger.debug(`Starting a new conversation with '${this.opMessage.author.username}' with conversation id '${this.uuid}'`);
    }

    // answer received
    nextAnswer$(): Observable<discord.Message> {
        return messageReceived$.pipe(
            // need op message state
            filter(
                (msg: discord.Message):
                boolean => msg.author.id === this.opMessage.author.id
            ),
            take(1),
            tap(
                (msg: discord.Message):
                void => Utils.logger.trace(`The user '${this.opMessage.author.username}' id '${this.uuid}' sent a reply '${msg.content}'`)
            ),
            timeout(60000),
            tap(
                (msg: discord.Message):
                void => {
                    this.qa[this.qa.length - 1].answer = msg;
                    if (msg.content === '!stop!') {
                        Utils.logger.trace(`The conversation with '${this.opMessage.author.username}' id '${this.uuid}' was stopped by the user`);
                        throw (new Error('User stopped the conversation'));
                    }
                }
            ),
        );
    }

    questionsSent$(): Observable<MessageWrapper.Response> {
        return MessageWrapper.sentMessages$.pipe(
            filter(
                (response: MessageWrapper.Response):
                boolean => response.tag === this.uuid
            ),
            tap(
                (response: MessageWrapper.Response):
                void => {
                    this.qa.push({
                        questions: response.messages,
                    });
                }
            ),
        );
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ConversationManager {
    let allConversations = [];

    export const requestNewConversation = (
        opMessage: discord.Message
    ): Conversation => {
        const foundConversation: Conversation | undefined = allConversations.find(
            (conversation: Conversation):
            boolean => opMessage.author.id === conversation.opMessage.author.id
        );
        if (foundConversation) {
            // we found a conversation let's end the previous
            // not sure what to do here? delete? replace?
            allConversations = allConversations.filter(
                (conversation: Conversation):
                boolean => opMessage.author.id !== conversation.opMessage.author.id
            );
        }
        // make a new conversation
        return new Conversation(opMessage);
    };
}

// export class Conversation {
//     questions: discord.Message[][] = [];
//     answers: discord.Message[] = [];
//     opMessage: discord.Message;

//     constructor (
//         opMessage: discord.Message,
//         questionAskedCallback: (discord.Message[]) => void
//     ) {
//         this.opMessage = opMessage;

//         // this will fire when we ask a question
//         // we need to make sure the question out is our question
//         MessageWrapper.sentMessages$
//     }

//     askNext(
//         userInputReceived: discord.Message,
//         contentToSend: string,
//         options?: discord.MessageOptions
//     ): Observable<discord.Message> {
//         const filteredReceive = messageReceived$.pipe(
//             filter((msg: discord.Message): boolean => msg.author.id === this.opMessage.author.id),
//             take(1),
//             timeout(60000),
//             tap((msg: discord.Message): number => this.answers.push(msg)),
//         );

//         const mes$ = MessageWrapper.sentMessages$.
//         MessageWrapper.sendMessage$.next({
//             message: userInputReceived,
//             content: contentToSend,
//             options,
//         });

//         return filteredReceive;
//     }

//     deleteConversation
// }

// eslint-disable-next-line @typescript-eslint/no-namespace
// export namespace Conversation {
//     export interface Question {
//         q: string
//         ex: string
//         err: string
//     }

//     // const CommandQuestionLookup: Record<string, Record<string, Question>> = {
//     //     [Command.ALL.EVENTS_ADD]: {
//     //         name: {
//     //             q: 'What would you like to name the event?',
//     //             ex: 'Example: Runecrafting Event #1',
//     //             err: 'Failed to name the event.',
//     //         },
//     //         starting: {
//     //             q: 'When would you like to start the event?',
//     //             ex: 'Example: 2019-12-20T14:00-05:00 - (which is December 20th, 2019 at 2:00pm ET)',
//     //             err: 'Failed to set date.',
//     //         },
//     //         ending: {
//     //             q: 'When would you like to end the event?',
//     //             ex: 'Example: 2019-12-21T14:00-05:00 - (which is December 21st, 2019 at 2:00pm ET)',
//     //             err: 'Failed to set date.',
//     //         },
//     //         type: {
//     //             q: 'Which type of event would you like?',
//     //             ex: 'Choices are casual, skills with skill name list, bh with bh mode (rogue and/or hunter), lms, clues with clue difficulty list, or custom',
//     //             err: 'Could not set event type.',
//     //         },
//     //         global: {
//     //             q: 'Would you like other Discord guilds to be able to compete?',
//     //             ex: 'yes or no',
//     //             err: 'Could not set global flag.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_DELETE]: {
//     //         id: {
//     //             q: 'Which event number would you like to delete?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_EDIT]: {
//     //         id: {
//     //             q: 'Which event number would you like to edit?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_END_EVENT]: {
//     //         id: {
//     //             q: 'Which event number would you like to end?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_FORCE_SIGNUP]: {
//     //         id: {
//     //             q: 'Which event number would you like to signup the user for?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //         rsn: {
//     //             q: 'What is the users Runescape name?',
//     //             ex: 'harry tipper',
//     //             err: 'Could not parse Runescape name.',
//     //         },
//     //         user: {
//     //             q: 'Please mention the user now.',
//     //             ex: '@some discord user',
//     //             err: 'Could not find a mention.',
//     //         },
//     //         team: {
//     //             q: 'Which team would you like the user to signup for?',
//     //             ex: 'spaghetti and meatballs',
//     //             err: 'Could not parse team name.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_FORCE_UNSIGNUP]: {
//     //         id: {
//     //             q: 'Which event number would you like to unsignup the user for?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //         user: {
//     //             q: 'Please mention the user now.',
//     //             ex: '@some discord user',
//     //             err: 'Could not find a mention.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_ADD_SCORE]: {
//     //         id: {
//     //             q: 'Which event number is the participant in?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //         score: {
//     //             q: 'What score would you like to add?',
//     //             ex: '-5',
//     //             err: 'Could not parse number.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_SIGNUP]: {
//     //         id: {
//     //             q: 'Which event number would you like to signup for?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //         rsn: {
//     //             q: 'What is your Runescape name?',
//     //             ex: 'Zezima',
//     //             err: 'Could not parse Runescape name.',
//     //         },
//     //         team: {
//     //             q: 'Which team would you like to join?',
//     //             ex: 'Team n0trout',
//     //             err: 'Could not parse team name.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_UNSIGNUP]: {
//     //         id: {
//     //             q: 'Which event number would you like to unsignup for?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_LIST_PARTICIPANTS]: {
//     //         id: {
//     //             q: 'Which event number would you like to list participants for?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //     },
//     //     [Command.ALL.EVENTS_AMISIGNEDUP]: {
//     //         id: {
//     //             q: 'Which event number would you like to check?',
//     //             ex: 'Hint: find the event number with the list events command.',
//     //             err: 'Could not parse number.',
//     //         },
//     //     },
//     //     [Command.ALL.USERS_STATS]: {
//     //         user: {
//     //             q: 'Who\'s stats would you like to lookup?',
//     //             ex: '@skitzo dancer',
//     //             err: 'Could not find mention',
//     //         },
//     //     },
//     //     [Command.ALL.ADMIN_SET_CHANNEL]: {
//     //         channel: {
//     //             q: 'Set to which text channel?',
//     //             ex: '#general',
//     //             err: 'Could not find channel mention.',
//     //         },
//     //     },
//     // };

//     // interface KeyAnswer {
//     //     key: string
//     //     answer: string
//     // }

//     // export class ConversationComponent {
//     //     messageIn: discord.Message;
//     //     messageInOpt: discord.MessageOptions;
//     //     postedMessagesOut: (discord.Message | null)[];
//     //     replyToSend: string;

//     //     constructor(
//     //         message: discord.Message,
//     //         content: string,
//     //         options?: discord.MessageOptions
//     //     ) {
//     //         this.messageIn = message;
//     //         this.replyToSend = content;
//     //         this.messageInOpt = options;
//     //     }

//     //     async send(): Promise<void> {
//     //         const ret: Promise<void> = new Promise(
//     //             (resolve, reject): void => {
//     //                 const sub = MessageWrapper.sentMessages$.subscribe(
//     //                     (out: (discord.Message | null)[]): void => {
//     //                         this.postedMessagesOut = out;

//     //                         // do processing
//     //                         if (this.postedMessagesOut.includes(null)) {
//     //                             this.postedMessagesOut.forEach(
//     //                                 (messageOut: discord.Message | null, idx: number):
//     //                                 void => {
//     //                                     // delete messages
//     //                                     if (messageOut !== null) {
//     //                                         messageOut.delete().then(():
//     //                                         void => {
//     //                                             this.postedMessagesOut[idx] = null;
//     //                                         }).catch(
//     //                                             (err: Error):
//     //                                             void => Utils.logError(err)
//     //                                         );
//     //                                     }
//     //                                 }
//     //                             );
//     //                             // post error message
//     //                             this.messageIn.reply('An error occurred. Please try again later.').catch(
//     //                                 (err: Error): void => Utils.logError(err)
//     //                             );
//     //                             Utils.logger.info(`A conversation with ${this.messageIn.author.username} was interrupted due to errors.`);
//     //                             reject();
//     //                         } else {
//     //                             resolve();
//     //                         }
//     //                         sub.unsubscribe();
//     //                     }
//     //                 );
//     //             }
//     //         );
//     //         MessageWrapper.sendMessage$.next({
//     //             message: this.messageIn,
//     //             content: this.replyToSend,
//     //             options: this.messageInOpt,
//     //         });
//     //         return ret;
//     //     }

//     //     async delete(): Promise<discord.Message> {
//     //         return this.messageIn;
//     //     }
//     // }

//     // export class CommandConversation {
//     //     conversationBits: ConversationComponent[] = []

//     //     async ask(
//     //         question: string,
//     //         inputMessage: discord.Message
//     //     ): Promise<discord.Message> {
//     //         const conversationBit: ConversationComponent = new ConversationComponent(
//     //             inputMessage,
//     //             question,
//     //             {},
//     //         );
//     //         this.conversationBits.push(conversationBit);

//     //         return new Promise(
//     //             async (resolve): Promise<void> => {
//     //                 await conversationBit.send();
//     //                 const sub: Subscription = messageReceived$.pipe(
//     //                     filter(
//     //                         (msg: discord.Message):
//     //                         boolean => msg.author.id === inputMessage.author.id
//     //                     ),
//     //                     timeout(60000),
//     //                 ).subscribe(
//     //                     (msg: discord.Message): void => {
//     //                         sub.unsubscribe();
//     //                         resolve(msg);
//     //                     },
//     //                 );
//     //             }
//     //         );
//     //     }

//     //     async delete(): Promise<discord.Message> {
//     //         return this.conversationBits[0].delete();
//     //     }
//     // }

// }
