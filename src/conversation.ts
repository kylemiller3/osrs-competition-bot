import * as discord from 'discord.js';
import {
    Subscription, Observable, merge, Subject, of, from,
} from 'rxjs';
import {
    filter, timeout, map, tap, catchError, withLatestFrom, switchMap, concatMap, debounceTime,
} from 'rxjs/operators';
import { messageReceived$ } from '..';
import { MessageWrapper } from './messageWrapper';
import { Utils } from './utils';
import { Command } from './command';

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
    questions: (discord.Message | null)[]; // keep track of all questions
    answer: discord.Message; // and answers
}

export abstract class Conversation {
    protected opMessage: discord.Message;

    private _uuid: string;

    public get uuid(): string {
        return this._uuid;
    }

    private _qaSub: Subscription | undefined

    private _nextQa$: Observable<Qa>;

    private _errorInjector$: Subject<Qa>;

    protected _state: CONVERSATION_STATE;

    protected _lastErrorMessage: string | null;

    protected _returnMessage: string | null;

    protected _returnOptions: discord.MessageOptions | undefined;

    protected _params: Record<string, string | number | boolean | undefined>;

    protected static parser = <U>(command: Command.ALL, paramName: string, answer: string):
    Record<string, U> => Command.parseParameters<Record<string, U>>(
        command,
        `${paramName}=${answer}`,
    );

    public constructor(
        opMessage: discord.Message,
        params: Record<string, string | number | boolean | undefined> = Object(),
    ) {
        this._params = params;
        this.opMessage = opMessage;
        this._uuid = `${Math.random()}`;
        this._errorInjector$ = new Subject<Qa>();
        this._returnOptions = {
            reply: opMessage.author,
        };
        this._returnMessage = null;
        this._lastErrorMessage = null;

        const nextA$ = messageReceived$.pipe(
            // need op message state
            filter(
                (msg: discord.Message):
                boolean => msg.author.id === this.opMessage.author.id
                && msg.channel.id === this.opMessage.channel.id,
            ),
            debounceTime(500),
            timeout(60000),
            tap(
                (msg: discord.Message):
                void => {
                    Utils.logger.debug(`Conversation id '${this._uuid}' with user '${this.opMessage.author.tag}' continued with answer ${msg.content}`);
                },
            ),
            catchError(
                (error: Error):
                Observable<discord.Message> => {
                    Utils.logger.debug(`Conversation id ${this._uuid} with user '${this.opMessage.author.tag}' will end because they did not reply '${error}'`);
                    throw (error);
                },
            ),
        );

        const nextQ$ = MessageWrapper.sentMessages$.pipe(
            filter(
                (response: MessageWrapper.Response):
                boolean => response.tag === this._uuid,
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
                        },
                    ).join('\n');
                    Utils.logger.trace(`Conversation id '${this._uuid}' with user '${this.opMessage.author.tag}' continued with question '${content}'`);
                },
            ),
            catchError(
                (error: Error):
                Observable<MessageWrapper.Response> => {
                    Utils.logger.trace(`Conversation id ${this._uuid} with user '${this.opMessage.author.tag}' will end because the question did not send '${error}'`);
                    throw (error);
                },
            ),
        );

        const nextQa$ = nextA$.pipe(
            withLatestFrom(nextQ$),
            map(
                (value: [discord.Message, MessageWrapper.Response]):
                Qa => ({
                    answer: value[0],
                    questions: value[1].messages,
                }),
            ),
            catchError(
                (error: Error):
                Observable<Qa> => {
                    const sendInfo: MessageWrapper.SendInfo = {
                        message: this.opMessage,
                        content: 'Meowbe later.',
                        options: this._returnOptions,
                        tag: this._uuid,
                    };
                    MessageWrapper.sendMessages$.next(sendInfo);
                    throw (error);
                },
            ),
        );

        this._nextQa$ = merge(
            nextQa$,
            this._errorInjector$,
        );

        this._qaSub = this._nextQa$.pipe(
            switchMap(
                (qa: Qa): Observable<void> => from(
                    this.consumeQa(qa),
                ),
            ),
            concatMap(
                (): Observable<void> => {
                    let question: string | null;
                    switch (this._state) {
                        case CONVERSATION_STATE.Q1E:
                        case CONVERSATION_STATE.Q2E:
                        case CONVERSATION_STATE.Q3E:
                        case CONVERSATION_STATE.Q4E:
                        case CONVERSATION_STATE.Q5E:
                        case CONVERSATION_STATE.Q6E: {
                            question = this._lastErrorMessage;
                            this._lastErrorMessage = null;
                            break;
                        }
                        default:
                            question = this.produceQ();
                            break;
                    }
                    if (question !== null) {
                        const sendInfo: MessageWrapper.SendInfo = {
                            message: this.opMessage,
                            content: question,
                            options: this._returnOptions,
                            tag: this._uuid,
                        };
                        MessageWrapper.sendMessages$.next(sendInfo);
                    } else {
                        this.conversationDidEndSuccessfully();
                    }
                    return of();
                },
            ),
        ).subscribe(
            (): void => {},
            (error: Error): void => {
                Utils.logger.trace(`Conversation ended ${error}`);
                if (this._qaSub !== undefined) {
                    this._qaSub.unsubscribe();
                    this._qaSub = undefined;
                }
            },
        );

        // start conversation
        Utils.logger.trace(`Starting a new conversation id '${this._uuid}' with '${this.opMessage.author.tag}'`);
        this._state = CONVERSATION_STATE.Q1;
    }

    public abstract async init(): Promise<boolean>;

    protected abstract async consumeQa(qa: Qa): Promise<void>;

    public abstract produceQ(): string | null;

    public stopConversation(): void {
        if (this._qaSub !== undefined) {
            this._errorInjector$.error(
                new Error('Stop Conversation was called'),
            );
        }
    }

    public conversationDidEndSuccessfully(): void {
        let content: string;
        if (this._returnMessage === null) {
            if (this._lastErrorMessage === null) {
                content = 'Conversation state error! Report this.';
            } else {
                content = this._lastErrorMessage;
            }
        } else {
            content = this._returnMessage;
        }
        const sendInfo: MessageWrapper.SendInfo = {
            message: this.opMessage,
            content,
            options: this._returnOptions,
            tag: this._uuid,
        };
        MessageWrapper.sendMessages$.next(sendInfo);
        Utils.logger.trace(`Conversation with ${this.opMessage.author.tag} finished successfully.`);
        if (this._qaSub !== undefined) {
            this._qaSub.unsubscribe();
            this._qaSub = undefined;
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
        newConversation: Conversation,
    ): Promise<void> => {
        stopConversation(msg);

        const shorthand: boolean = await newConversation.init();
        if (shorthand === false) {
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
                sendInfo,
            );
        } else {
            newConversation.conversationDidEndSuccessfully();
        }
    };
}
