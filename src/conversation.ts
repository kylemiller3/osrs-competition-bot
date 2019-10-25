import * as discord from 'discord.js';
import {
    Subscription, Observable, merge, zip, Subject, throwError, BehaviorSubject, of,
} from 'rxjs';
import {
    filter, timeout, map, take, tap, catchError, withLatestFrom, distinctUntilChanged,
} from 'rxjs/operators';
import { async, } from 'rxjs/internal/scheduler/async';
// import { uuid, } from 'uuid-v4';
import { as } from 'pg-promise';
import { messageReceived$, } from './main';
import { Command, } from './command';
import { MessageWrapper, } from './messageWrapper';
import { Utils, } from './utils';

export interface Qa {
    questions: (discord.Message | null)[] // keep track of all questions
    answer: discord.Message // and answers
}

export class Conversation {
    qa: Qa[];
    opMessage: discord.Message;
    uuid: string;
    nextQa$: Observable<[discord.Message, MessageWrapper.Response]>;
    qaSub: Subscription
    errorInjector$: Subject<[discord.Message, MessageWrapper.Response]>

    constructor(opMessage: discord.Message, handler: (qa: [discord.Message, MessageWrapper.Response]) => void) {
        this.qa = [];
        this.opMessage = opMessage;
        this.uuid = `${Math.random()}`;

        const nextA$ = messageReceived$.pipe(
            // need op message state
            filter(
                (msg: discord.Message):
                boolean => msg.author.id === this.opMessage.author.id
            ),
            timeout(60000),
            tap(
                (msg: discord.Message):
                void => {
                    Utils.logger.trace(`Conversation id '${this.uuid}' with user '${this.opMessage.author.username}' continued with answer ${msg.content}`);
                }
            ),
            catchError(
                (error: Error):
                Observable<discord.Message> => {
                    Utils.logger.trace(`Conversation id ${this.uuid} with user '${this.opMessage.author.username}' will end because they did not reply '${error}'`);
                    throw (error);
                }
            ),
        );

        const nextQ$ = MessageWrapper.sentMessages$.pipe(
            // filter(
            //     (response: MessageWrapper.Response):
            //     boolean => response.tag === this.uuid
            // ),
            tap(
                (response: MessageWrapper.Response):
                void => {
                    const content = response.messages.map(
                        (msg: discord.Message | null): string => {
                            if (msg !== null) {
                                return msg.content;
                            }
                            return '(NULL)';
                        }
                    ).join('\n');
                    Utils.logger.trace(`Conversation id '${this.uuid}' with user '${this.opMessage.author.username}' continued with question '${content}'`);
                }
            ),
            catchError(
                (error: Error):
                Observable<MessageWrapper.Response> => {
                    Utils.logger.trace(`Conversation id ${this.uuid} with user '${this.opMessage.author.username}' will end because the question did not send '${error}'`);
                    throw (error);
                }
            ),
        );

        const nextQa$ = nextA$.pipe(
            withLatestFrom(nextQ$),
            distinctUntilChanged(
                (x, y): boolean => {
                    const xContent = x[0].content;
                    const yContent = y[0].content;
                    return xContent === yContent;
                }
            ),
            tap(
                (arr: [discord.Message, MessageWrapper.Response]):
                void => {
                    if (this.qa[this.qa.length - 1]) {
                        // check to see if our question is distinct or assign
                        // this.qa[this.qa.length]
                        // DO I NEED THIS????
                    }
                    // DO I NEED THIS???
                    this.qa.push({
                        questions: arr[1].messages,
                        answer: arr[0],
                    });
                }
            ),
            catchError(
                (error: Error):
                Observable<[discord.Message, MessageWrapper.Response]> => {
                    const sendInfo: MessageWrapper.SendInfo = {
                        message: this.opMessage,
                        content: 'Meowbe later.',
                        tag: this.uuid,
                    };
                    MessageWrapper.sendMessage$.next(sendInfo);
                    this.stopConversation();
                    return of([null,  null]) as unknown as Observable<[discord.Message, MessageWrapper.Response]>;
                }
            )
        );

        this.nextQa$ = nextQa$;
        this.qaSub = this.nextQa$.subscribe(
            handler,
        );

        // start conversation
        Utils.logger.trace(`Starting a new conversation id '${this.uuid}' with '${this.opMessage.author.username}'`);
    }

    stopConversation(): void {
        Utils.logger.trace(`Ending conversation id '${this.uuid}' with '${this.opMessage.author.username}'`);
        this.qaSub.unsubscribe();
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ConversationManager {
    interface ConversationRecord {
        conversation: Conversation
        command: Command.ALL
    }
    export const allConversations: Record<string, ConversationRecord> = {};

    // export const requestNewConversation = (
    //     opMessage: discord.Message,
    //     command: Command.ALL,
    // ): Conversation => {
    //     // find our record
    //     const foundConversation: ConversationRecord | undefined = allConversations[
    //         opMessage.author.id
    //     ];
    //     if (foundConversation) {
    //         // we found a conversation let's end the previous
    //         foundConversation.conversation.stopConversation();
    //     }

    //     const conversation = new Conversation(opMessage);
    //     // make a new conversation
    //     allConversations[opMessage.author.id] = {
    //         conversation,
    //         command,
    //     };
    //     return new Conversation(opMessage);
    // };

    // export const getConversation = (
    //     authorId: string,
    //     command: Command.ALL,
    // ): Conversation | undefined => {
    //     const record: ConversationRecord = allConversations[authorId];
    //     if (record) {
    //         // is this a conversation about our command?
    //         return record.command === command
    //             ? record.conversation
    //             : undefined;
    //     }
    //     return undefined;
    // };
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
