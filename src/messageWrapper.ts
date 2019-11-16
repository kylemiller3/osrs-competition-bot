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
        tag: string
    }
    export const sendMessage$: Subject<SendInfo> = new Subject();

    /**
     * Contract of the message information to delete
     */
    export interface DeleteInfo {
        message: discord.Message
        tag: string
    }
    export const deleteMessages$: Subject<DeleteInfo> = new Subject();

    /**
     * Contract of the message information to edit
     */
    export interface EditInfo {
        message: discord.Message
        newContent: string
        options?: discord.MessageOptions
        tag: string
    }
    /**
     * Contract of the messages that were received
     */
    export interface Response {
        messages: (discord.Message | null)[]
        tag: string
    }
    export const editMessages$: Subject<EditInfo> = new Subject();

    const regex = /[\s\S]{1,1980}(?:\n|$)/g;
    export const sentMessages$ = sendMessage$.pipe(
        mergeMap(
            (input: SendInfo):
            Observable<[string, (discord.Message | null)[]]> => {
                const chunks: string[] = input.content.match(regex) || [];
                const requests: Observable<(discord.Message | null)[]>[] = chunks.map(
                    (chunk: string):
                    Observable<(discord.Message | null)[]> => {
                        const bound = input.message.channel.send.bind(
                            input.message.channel,
                            chunk,
                            input.options,
                        );
                        // eslint-disable-next-line max-len
                        return Network.genericNetworkFetch$<discord.Message | discord.Message[]>(
                            bound,
                        ).pipe(
                            // eslint-disable-next-line comma-dangle
                            map((x: discord.Message | discord.Message[] | null): (discord.Message | null)[] => [x].flatMap(
                                // @ts-ignore
                                (t: discord.Message | discord.Message[] | null): (discord.Message | discord.Message[] | null) => t
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
            (input: DeleteInfo):
            Observable<[string, discord.Message | null]> => {
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

    export const editedMessages$ = editMessages$.pipe(
        mergeMap(
            (input: EditInfo):
            Observable<[string, discord.Message | null]> => {
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
}
