import * as discord from 'discord.js';
import {
    Observable, of, Subject, forkJoin, from, concat,
} from 'rxjs';
import {
    mergeMap, map, share, filter, combineAll, flatMap, concatMap,
} from 'rxjs/operators';
import { rejects, } from 'assert';
import { Network, } from './network';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MessageWrapper {
    /**
     * Contract of the message information to post
     */
    export interface SendInfo {
        message: discord.Message
        content: string
        options?: discord.MessageOptions
        tag?: string
    }
    export const sendMessages$: Subject<SendInfo> = new Subject();

    /**
     * Contract of the message information to delete
     */
    export interface DeleteInfo {
        message: discord.Message
        tag?: string
    }
    export const deleteMessages$: Subject<DeleteInfo> = new Subject();

    /**
     * Contract of the message information to edit
     */
    export interface EditInfo {
        message: discord.Message
        newContent: string
        options?: discord.MessageOptions
        tag?: string
    }
    export const editMessage$: Subject<EditInfo> = new Subject();

    /**
     * Contract of the messages that were received
     */
    export interface Response {
        messages: (discord.Message | null)[]
        tag: string
    }

    const regex = /[\s\S]{1,1980}(?:\n|$)/g;
    export const getMessageChunks = (
        content: string
    ): string[] => content.match(regex) || [];

    export const sentMessages$ = sendMessages$.pipe(
        mergeMap(
            (sendInfo: SendInfo):
            Observable<[string, (discord.Message | null)[]]> => {
                const input: SendInfo = { ...sendInfo, };
                input.tag = input.tag
                    ? input.tag
                    : `${Math.random()}`;
                const chunks: string[] = getMessageChunks(input.content);
                const requests: Observable<(discord.Message | null)[]>[] = chunks.map(
                    (chunk: string, idx: number):
                    Observable<(discord.Message | null)[]> => {
                        if (idx !== 0 && input.options !== undefined) {
                            input.options.reply = undefined;
                        }
                        const bound = input.message.channel.send.bind(
                            input.message.channel,
                            chunk,
                            input.options,
                        );
                        return Network.genericNetworkFetch$<discord.Message | discord.Message[]>(
                            bound,
                        ).pipe(
                            map(
                                (x: discord.Message | discord.Message[] | null):
                                (discord.Message | null)[] => [
                                    x,
                                ].flatMap(
                                // @ts-ignore
                                    (t: discord.Message | discord.Message[] | null):
                                    (discord.Message | discord.Message[] | null) => t
                                )
                            )
                        );
                    }
                );

                const ret: Observable<(discord.Message | null)[]> = concat(
                    requests
                ).pipe(
                    combineAll(),
                    map(
                        (results: (discord.Message | null)[][]):
                        (discord.Message | null)[] => {
                            const flattened = results.flatMap(
                                (x: (discord.Message | null)[]):
                                (discord.Message | null)[] => x
                            );
                            return flattened;
                        }
                    )
                );
                return forkJoin(
                    of(input.tag),
                    ret,
                );

                // const requestPromise = requests
                //     .map(
                //         (obs: Observable<(discord.Message | null)[]>):
                //         Promise<(discord.Message | null)[]> => obs.toPromise()
                //     )
                //     .reduce(async (promiseChain, currentTask):
                //     Promise<(discord.Message | null)[]> => {
                //         const arr = [
                //             ...await promiseChain,
                //             ...await currentTask,
                //         ].flatMap((x): (discord.Message | null) => x);
                //         return arr;
                //     });

                // return forkJoin(
                //     of(input.tag),
                //     from(requestPromise)
                // );
            }
        ),
        map((x: [string, (discord.Message | null)[]]): Response => ({
            tag: x[0],
            messages: x[1],
        })),
        share(),
    );

    export const deletedMessages$ = deleteMessages$.pipe(
        mergeMap(
            (deleteInfo: DeleteInfo):
            Observable<[string, discord.Message | null]> => {
                const input: DeleteInfo = { ...deleteInfo, };
                input.tag = input.tag
                    ? input.tag
                    : `${Math.random()}`;
                const bound = input.message.delete.bind(
                    input.message,
                );
                const request = Network.genericNetworkFetch$<discord.Message>(
                    bound,
                );
                return forkJoin(
                    of(input.tag),
                    request
                );
            }
        ),
        map(
            (response: [string, discord.Message | null]): Response => ({
                messages: [
                    response[1],
                ].flatMap((x): (discord.Message | null) => x),
                tag: response[0],
            })
        ),
        share(),
    );

    export const editedMessage$ = editMessage$.pipe(
        mergeMap(
            (editInfo: EditInfo):
            Observable<[string, discord.Message | null]> => {
                const input: EditInfo = { ...editInfo, };
                input.tag = input.tag
                    ? input.tag
                    : `${Math.random()}`;

                // editInfo.messages.map(
                //     (message: discord.Message):
                //     Observable<discord.Message | null> => {
                //         const bound = input.message.edit.bind(
                //             input.message,
                //             input.newContent,
                //             input.options,
                //         );
                //         const request: Observable<discord.Message | null> = Network.genericNetworkFetch$<discord.Message>(
                //             bound,
                //         );
                //     }
                // );

                const bound = input.message.edit.bind(
                    input.message,
                    input.newContent,
                    input.options,
                );
                const request: Observable<discord.Message | null> = Network.genericNetworkFetch$<discord.Message>(
                    bound,
                );
                return forkJoin(
                    of(input.tag),
                    request
                );
            }
        ),
        map(
            (response: [string, discord.Message | null]): Response => ({
                messages: [
                    response[1],
                ].flatMap((x): (discord.Message | null) => x),
                tag: response[0],
            })
        ),
        share(),
    );

    /**
     * Send Message promise wrapper
     */
    export const sendMessage = (
        sendInfo: SendInfo
    ): Promise<Response> => {
        const taggedInfo: SendInfo = { ...sendInfo, };
        taggedInfo.tag = taggedInfo.tag !== undefined
            ? taggedInfo.tag
            : `${Math.random()}`;
        const p: Promise<Response> = new Promise(
            (resolver: (response: Response) => void, rejector: (error: Error) => void): void => {
                const sub = sentMessages$.pipe(
                    filter((msg: Response): boolean => msg.tag === taggedInfo.tag)
                ).subscribe(
                    (response: Response): void => {
                        resolver(response);
                        sub.unsubscribe();
                    }, (error: Error): void => {
                        rejector(error);
                    }
                );
            }
        );
        sendMessages$.next(taggedInfo);
        return p;
    };

    /**
     * Delete Message promise wrapper
     */
    export const deleteMessage = (
        deleteInfo: DeleteInfo
    ): Promise<Response> => {
        const taggedInfo: DeleteInfo = { ...deleteInfo, };
        taggedInfo.tag = taggedInfo.tag !== undefined
            ? taggedInfo.tag
            : `${Math.random()}`;
        const p: Promise<Response> = new Promise(
            (resolver: (response: Response) => void, rejector: (error: Error) => void): void => {
                const sub = deletedMessages$.pipe(
                    filter((msg: Response): boolean => msg.tag === taggedInfo.tag)
                ).subscribe(
                    (response: Response): void => {
                        resolver(response);
                        sub.unsubscribe();
                    }, (error: Error): void => {
                        rejector(error);
                    }
                );
            }
        );
        deleteMessages$.next(taggedInfo);
        return p;
    };

    /**
     * Edit Message promise wrapper
     */
    export const editMessage = (
        editInfo: EditInfo
    ): Promise<Response> => {
        const taggedInfo: EditInfo = { ...editInfo, };
        taggedInfo.tag = taggedInfo.tag !== undefined
            ? taggedInfo.tag
            : `${Math.random()}`;
        const p: Promise<Response> = new Promise(
            (resolver: (response: Response) => void, rejector: (error: Error) => void): void => {
                const sub = editedMessage$.pipe(
                    filter((msg: Response): boolean => msg.tag === taggedInfo.tag)
                ).subscribe(
                    (response: Response): void => {
                        resolver(response);
                        sub.unsubscribe();
                    }, (error: Error): void => {
                        rejector(error);
                    }
                );
            }
        );
        editMessage$.next(taggedInfo);
        return p;
    };

}
