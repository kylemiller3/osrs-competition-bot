import * as discord from 'discord.js';
import {
    Subscription, Observable, merge, Subject,
} from 'rxjs';
import {
    filter, timeout, map, tap, catchError, withLatestFrom, distinctUntilChanged,
} from 'rxjs/operators';
import { messageReceived$, } from './main';
import { MessageWrapper, } from './messageWrapper';
import { Utils, } from './utils';
import { Command, } from './command';

export enum CONVERSATION_STATE {
    Q1,
    Q1E,
    Q1C,
    Q1O,
    Q2,
    Q2E,
    Q2C,
    Q2O,
    Q3,
    Q3E,
    Q3C,
    Q3O,
    Q4,
    Q4E,
    Q4C,
    Q4O,
    Q5,
    Q5E,
    Q5C,
    Q5O,
    Q6,
    Q6E,
    Q6C,
    Q6O,
    CONFIRM,
    DONE,
}

export interface Qa {
    questions: (discord.Message | null)[] // keep track of all questions
    answer: discord.Message // and answers
}

export abstract class Conversation {
    qa: Qa[];
    opMessage: discord.Message;
    uuid: string;
    qaSub: Subscription | undefined
    nextQa$: Observable<Qa>;
    errorInjector$: Subject<Qa>;
    state: CONVERSATION_STATE;
    returnMessage: string;
    returnOptions: discord.MessageOptions | undefined;
    params: Record<string, string | number | boolean | undefined>;

    static parser = <U>(command: Command.ALL, paramName: string, answer: string):
    Record<string, U> => Command.parseParameters<Record<string, U>>(
        command,
        `${paramName}=${answer}`
    );

    constructor(
        opMessage: discord.Message,
        params: Record<string, string | number | boolean | undefined> = Object(),
    ) {
        this.params = params;
        this.qa = [];
        this.opMessage = opMessage;
        this.uuid = `${Math.random()}`;
        this.errorInjector$ = new Subject<Qa>();
        this.returnOptions = {
            reply: opMessage.author,
        };
        this.returnMessage = 'Conversation state error!';

        const nextA$ = messageReceived$.pipe(
            // need op message state
            filter(
                (msg: discord.Message):
                boolean => msg.author.id === this.opMessage.author.id
                && msg.channel.id === this.opMessage.channel.id
            ),
            timeout(60000),
            tap(
                (msg: discord.Message):
                void => {
                    Utils.logger.trace(`Conversation id '${this.uuid}' with user '${this.opMessage.author.tag}' continued with answer ${msg.content}`);
                }
            ),
            catchError(
                (error: Error):
                Observable<discord.Message> => {
                    Utils.logger.trace(`Conversation id ${this.uuid} with user '${this.opMessage.author.tag}' will end because they did not reply '${error}'`);
                    throw (error);
                }
            ),
        );

        const nextQ$ = MessageWrapper.sentMessages$.pipe(
            filter(
                (response: MessageWrapper.Response):
                boolean => response.tag === this.uuid
            ),
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
                    Utils.logger.trace(`Conversation id '${this.uuid}' with user '${this.opMessage.author.tag}' continued with question '${content}'`);
                }
            ),
            catchError(
                (error: Error):
                Observable<MessageWrapper.Response> => {
                    Utils.logger.trace(`Conversation id ${this.uuid} with user '${this.opMessage.author.tag}' will end because the question did not send '${error}'`);
                    throw (error);
                }
            ),
        );

        const nextQa$ = nextA$.pipe(
            withLatestFrom(nextQ$),
            map(
                (value: [discord.Message, MessageWrapper.Response]):
                Qa => ({
                    answer: value[0],
                    questions: value[1].messages,
                })
            ),
            catchError(
                (error: Error):
                Observable<Qa> => {
                    const sendInfo: MessageWrapper.SendInfo = {
                        message: this.opMessage,
                        content: 'Meowbe later.',
                        options: this.returnOptions,
                        tag: this.uuid,
                    };
                    MessageWrapper.sendMessages$.next(sendInfo);
                    throw (error);
                }
            ),
        );

        this.nextQa$ = merge(
            nextQa$,
            this.errorInjector$,
        );

        this.qaSub = this.nextQa$.subscribe(
            async (qa: Qa):
            Promise<void> => {
                await this.consumeQa(qa);
                const question: string | null = this.produceQ();
                if (question !== null) {
                    const sendInfo: MessageWrapper.SendInfo = {
                        message: this.opMessage,
                        content: question,
                        options: this.returnOptions,
                        tag: this.uuid,
                    };
                    MessageWrapper.sendMessages$.next(sendInfo);
                } else {
                    this.conversationDidEndSuccessfully();
                }
            },
            (error: Error): void => {
                Utils.logger.trace(`Conversation ended ${error}`);
                if (this.qaSub !== undefined) {
                    this.qaSub.unsubscribe();
                    this.qaSub = undefined;
                }
            },
        );

        // start conversation
        Utils.logger.trace(`Starting a new conversation id '${this.uuid}' with '${this.opMessage.author.tag}'`);
        this.state = CONVERSATION_STATE.Q1;
    }

    abstract async init(): Promise<boolean>;
    abstract async consumeQa(qa: Qa): Promise<void>;
    abstract produceQ(): string | null;

    stopConversation(): void {
        if (this.qaSub !== undefined) {
            this.errorInjector$.error(
                new Error('Stop Conversation was called'),
            );
        }
    }

    conversationDidEndSuccessfully(): void {
        const sendInfo: MessageWrapper.SendInfo = {
            message: this.opMessage,
            content: this.returnMessage,
            options: this.returnOptions,
            tag: this.uuid,
        };
        MessageWrapper.sendMessages$.next(sendInfo);
        Utils.logger.trace(`Conversation with ${this.opMessage.author.tag} finished successfully.`);
        if (this.qaSub !== undefined) {
            this.qaSub.unsubscribe();
            this.qaSub = undefined;
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ConversationManager {
    const allConversations: Record<string, Conversation> = {};

    export const stopConversation = (
        msg: discord.Message,
    ): void => {
        const foundConversation: Conversation | undefined = allConversations[
            msg.author.id
        ];

        if (foundConversation) {
            foundConversation.stopConversation();
        }
    };

    export const startNewConversation = async (
        msg: discord.Message,
        newConversation: Conversation
    ): Promise<void> => {
        stopConversation(msg);

        const shorthand: boolean = await newConversation.init();
        if (!shorthand) {
            const question = newConversation.produceQ();
            if (question === null) {
                return;
            }

            allConversations[msg.author.id] = newConversation;
            const sendInfo: MessageWrapper.SendInfo = {
                message: msg,
                content: question,
                options: {
                    reply: msg.author,
                },
                tag: newConversation.uuid,
            };
            MessageWrapper.sendMessages$.next(
                sendInfo
            );
        } else {
            newConversation.conversationDidEndSuccessfully();
        }
    };
}
