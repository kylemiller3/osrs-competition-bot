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


    interface MySubject<T> {
        sub: Subscription
        obs$: Subject<T>
    }
    const parallelExecute = <T>(...obs$: Observable<T>[]): Observable<T> => {
        const subjects: MySubject<T>[] = obs$.map((o$): MySubject<T> => {
            const subject$ = new Subject<T>();
            const subscription: Subscription = o$.subscribe((o): void => { subject$.next(o); });
            return { sub: subscription, obs$: subject$.pipe(filter(Utils.isDefinedFilter)) as Subject<T>, };
        });
        const subject$ = new Subject<T>();
        function sub(index: number): void {
            const current = subjects[index];
            current.obs$.subscribe((c): void => {
                subject$.next(c);
                current.obs$.complete();
                current.sub.unsubscribe();
                if (index < subjects.length - 1) {
                    sub(index + 1);
                } else {
                    subject$.complete();
                }
            });
        }
        sub(0);
        return subject$;
    };

    const regex = /[\s\S]{1,1980}(?:\n|$)/g;
    export const sentMessages$ = sendMessage$.pipe(
        mergeMap(
            (input: SendInfo):
            Observable<(discord.Message | discord.Message[] | null)[]> => {
                const chunks: string[] = input.content.match(regex) || [];
                const observables: Observable<discord.Message | discord.Message[] | null>[] = chunks.map(
                    (chunk: string):
                    Observable<discord.Message | discord.Message[] | null> => {
                        const bound = input.message.channel.send.bind(
                            undefined,
                            chunk,
                            input.options,
                        );
                        return Network.genericNetworkObservable<discord.Message | discord.Message[]>(
                            bound,
                        );
                    }
                );

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
                const obs = parallelExecute<discord.Message | discord.Message[] | null>(...observables);
                return obs.pipe(
                    map((x) => [x].flatMap(x=>x))
                    // reduce((results, item) => [...results, item], [])
                );
                // return parallelExecute(...observables).pipe(
                //     reduce((results, item) => [...results, item,], []),
                //     flatMap((x): x => x),
                // );
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
