import * as discord from 'discord.js';
import {
    Observable, of, Subject, defer, forkJoin, merge, concat, from, combineLatest, observable, BehaviorSubject, Subscription,
} from 'rxjs';
import {
    retryBackoff,
} from 'backoff-rxjs';
import {
    catchError, mergeMap, map, share, timeout, filter, concatMap, combineAll, tap, toArray, flatMap, mergeAll, concatAll, switchMap, reduce,
} from 'rxjs/operators';
import { Utils, } from './utils';
import { Command, } from './command';
import { Network, } from './network';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MessageWrapper {
    /**
     * Contract of the message information to post
     */
    interface SendInfo {
        message: discord.Message
        content: string
        options?: discord.MessageOptions
    }
    export const sendMessage$: Subject<SendInfo> = new Subject();

    /**
     * Contract of the message information to delete
     */
    interface DeleteInfo {
        message: discord.Message
    }
    export const deleteMessages$: Subject<DeleteInfo[]> = new Subject();

    /**
     * Contract of the message information to edit
     */
    interface EditInfo {
        message: discord.Message
        newContent: string
        options?: discord.MessageOptions
    }
    export const editMessages$: Subject<EditInfo[]> = new Subject();

    const regex = /[\s\S]{1,1980}(?:\n|$)/g;
    export const sentMessages$ = sendMessage$.pipe(
        mergeMap(
            (input: SendInfo):
            Observable<(discord.Message | null)[]> => {
                const chunks: string[] = input.content.match(regex) || [];
                const observables: Observable<(discord.Message | null)[]>[] = chunks.map(
                    (chunk: string):
                    Observable<(discord.Message | null)[]> => {
                        const bound = input.message.channel.send.bind(
                            undefined,
                            chunk,
                            input.options,
                        );
                        // eslint-disable-next-line max-len
                        return Network.genericNetworkObservable<discord.Message | discord.Message[]>(
                            bound,
                        ).pipe(
                            // eslint-disable-next-line comma-dangle
                            map((x): (discord.Message | null)[] => [x].flatMap(
                                (t): (discord.Message | discord.Message[] | null) => t
                            ))
                        );
                    }
                );

                const promise = observables
                    .map(
                        (obs: Observable<(discord.Message | null)[]>):
                        Promise<(discord.Message | null)[]> => obs.toPromise()
                    )
                    .reduce(async (promiseChain, currentTask):
                    Promise<(discord.Message | null)[]> => [
                        ...await promiseChain,
                        ...await currentTask,
                    ].flatMap((x): (discord.Message | null) => x));

                return from(promise);

                // const mapped = observables.map(
                //     (o): Observable<(discord.Message | null)[]> => o.pipe(
                //         map((x): (discord.Message | null)[] => [x].flatMap(x => x))
                //     )
                // );
                // const r = mapped.reduce(
                //     (acc: Observable<(discord.Message | null)[]>, x: Observable<(discord.Message | null)[]>):
                //     Observable<(discord.Message | null)[]> => acc.pipe(
                //         concatMap((t): Observable<(discord.Message | null)[]> => {
                //             // Utils.logger.fatal(arr);
                //             return x.pipe(
                //                 map((u) => t.concat([u].flatMap(u => u))),
                //             );
                //         }),
                //     ), from(Promise.resolve([]))
                // );
                // return r;
            }
        ),
        // map(e => [e].flatMap(a=>a)),
        tap(e => Utils.logger.fatal(e)),
        share(),
    );

    export const deletedMessages$ = deleteMessages$.pipe(
        mergeMap(
            (input: DeleteInfo[]):
            Observable<(discord.Message | null)[]> => {
                const observables: Observable<discord.Message | null>[] = input.map(
                    (dict: {message: discord.Message}):
                    Observable<discord.Message | null> => {
                        const bound = dict.message.delete.bind(undefined);
                        return Network.genericNetworkObservable<discord.Message>(
                            bound,
                        );
                    }
                );
                return concat(forkJoin(...observables)).pipe(
                    map(
                        (obj: (discord.Message | discord.Message[] | null)[]):
                        (discord.Message | null)[] => obj.flatMap(
                            ((v: discord.Message | null): discord.Message | null => v)
                        )
                    ),
                );
            }
        ),
        share(),
    );

    export const editedMessages$ = editMessages$.pipe(
        mergeMap(
            (input: EditInfo[]):
            Observable<(discord.Message | null)[]> => {
                const observables: Observable<discord.Message | null>[] = input.map(
                    (dict: {message: discord.Message; newContent: string; options: discord.MessageOptions}):
                    Observable<discord.Message | null> => {
                        const bound = dict.message.edit.bind(undefined, dict.newContent, dict.options);
                        return Network.genericNetworkObservable<discord.Message>(
                            bound,
                        );
                    }
                );
                return forkJoin(...observables).pipe(
                    map(
                        (obj: (discord.Message | discord.Message[] | null)[]):
                        (discord.Message | null)[] => obj.flatMap(
                            ((v: discord.Message | null): discord.Message | null => v)
                        )
                    ),
                );
            }
        ),
        share(),
    );
}
