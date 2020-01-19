import * as discord from 'discord.js';
import {
    Observable, of, Subject, forkJoin, from,
} from 'rxjs';
import {
    mergeMap, map, share,
} from 'rxjs/operators';
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
    export const sentMessages$ = sendMessages$.pipe(
        mergeMap(
            (sendInfo: SendInfo):
            Observable<[string, (discord.Message | null)[]]> => {
                const input: SendInfo = { ...sendInfo, };
                input.tag = input.tag
                    ? input.tag
                    : `${Math.random()}`;
                const chunks: string[] = input.content.match(regex) || [];
                const requests: Observable<(discord.Message | null)[]>[] = chunks.map(
                    (chunk: string, idx: number):
                    Observable<(discord.Message | null)[]> => {
                        const clonedOptions: discord.MessageOptions = { ...input.options, };
                        if (idx !== 0) {
                            clonedOptions.reply = undefined;
                        }
                        const bound = input.message.channel.send.bind(
                            input.message.channel,
                            chunk,
                            clonedOptions,
                        );
                        // eslint-disable-next-line max-len
                        return Network.genericNetworkFetch$<discord.Message | discord.Message[]>(
                            bound,
                        ).pipe(
                            map((x: discord.Message | discord.Message[] | null):
                            (discord.Message | null)[] => [
                                x,
                            ].flatMap(
                                // @ts-ignore
                                (t: discord.Message | discord.Message[] | null):
                                (discord.Message | discord.Message[] | null) => t
                            ))
                        );
                    }
                );

                // this possibly works
                // return concat(observables).pipe(
                //     combineAll(),
                //     map(x => x.flatMap(t=>t))
                // );

                const requestPromise = requests
                    .map(
                        (obs: Observable<(discord.Message | null)[]>):
                        Promise<(discord.Message | null)[]> => obs.toPromise()
                    )
                    .reduce(async (promiseChain, currentTask):
                    Promise<(discord.Message | null)[]> => {
                        const arr = [
                            ...await promiseChain,
                            ...await currentTask,
                        ].flatMap((x): (discord.Message | null) => x);
                        return arr;
                    });

                return forkJoin(
                    of(input.tag),
                    from(requestPromise)
                );
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

                const bound = input.message.edit.bind(
                    input.message,
                    input.newContent,
                    input.options,
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

    /**
     * Send Message promise wrapper
     */
    export const sendMessage = (
        sendInfo: SendInfo
    ): Promise<Response> => {
        const p: Promise<Response> = new Promise(
            (resolver: (response: Response) => void): void => {
                const sub = sentMessages$.subscribe(
                    (response: Response): void => {
                        resolver(response);
                        sub.unsubscribe();
                    }
                );
            }
        );
        sendMessages$.next(sendInfo);
        return p;
    };

    /**
     * Delete Message promise wrapper
     */
    export const deleteMessage = (
        deleteInfo: DeleteInfo
    ): Promise<Response> => {
        const p: Promise<Response> = new Promise(
            (resolver: (response: Response) => void): void => {
                const sub = deletedMessages$.subscribe(
                    (response: Response): void => {
                        resolver(response);
                        sub.unsubscribe();
                    }
                );
            }
        );
        deleteMessages$.next(deleteInfo);
        return p;
    };

    /**
     * Edit Message promise wrapper
     */
    export const editMessage = (
        editInfo: EditInfo
    ): Promise<Response> => {
        const p: Promise<Response> = new Promise(
            (resolver: (response: Response) => void): void => {
                const sub = editedMessage$.subscribe(
                    (response: Response): void => {
                        resolver(response);
                        sub.unsubscribe();
                    }
                );
            }
        );
        editMessage$.next(editInfo);
        return p;
    };

}
