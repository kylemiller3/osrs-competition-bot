import * as discord from 'discord.js';
import {
    Observable, from, of, Subscription, Subject, zip, concat, forkJoin, defer, observable,
} from 'rxjs';
import {
    concatMap, catchError, filter, mergeMap, map, concatAll, share, tap, combineAll, reduce, toArray, flatMap, shareReplay, merge, multicast, publish, refCount, publishReplay,
} from 'rxjs/operators';
import { fork, } from 'child_process';
import { Utils, } from './utils';
import { expect } from 'chai';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MessageWrapper {
    export const sendMessage$: Subject<discord.Message> = new Subject();
    export const sentMessages$ = sendMessage$.pipe(
        mergeMap(
            (input: discord.Message):
            Observable<discord.Message[]> => {
                const msgs: discord.Message[] = (input.content.match(
                    /[\s\S]{1,1975}(?:\n|$)/g
                ) || [])
                    .map(
                        (chunk: string):
                        discord.Message => ({
                            ...input,
                            content: chunk,
                        } as discord.Message)
                    );

                const observables: Observable<discord.Message[]>[] = msgs.map(
                    (msg: discord.Message):
                    Observable<discord.Message[]> => defer(
                        (): Promise<discord.Message[]> => msg.channel
                            .send()
                            .then(
                                (a: discord.Message | discord.Message[]):
                                discord.Message[] => Array.of(a).flat()
                            ),
                    ),
                );
                Utils.logger.error(observables);
                return concat(...observables).pipe(
                    toArray(),
                    // eslint-disable-next-line prefer-spread
                    map((value: discord.Message[][]): discord.Message[] => [].concat.apply([], value))
                );
            }
        ),
        share(),
        // concatMap(
        //     (input: [discord.Message, boolean]):
        //     Observable<(discord.Message | discord.Message[] | null)> => {
        //         const chunks: string[] = input[0].content.match(
        //             /[\s\S]{1,1975}(?:\n|$)/g
        //         ) || [];

        //         // const observables: Promise<discord.Message | discord.Message[] | null> = chunks.map(
        //         //     (chunk: string):
        //         //     Promise<discord.Message | discord.Message[]> => input[0].channel.send(
        //         //         chunk,
        //         //         { code: input[1], },
        //         //     ),
        //         // ).reduce(
        //         //     (acc, x): Promise<discord.Message | discord.Message[] | null> => acc.then(x), Promise.resolve(input[0]),
        //         // );

        //         const promises: (() => Promise<discord.Message | discord.Message[]>)[] = chunks.map(
        //             (chunk: string):
        //             () => Promise<discord.Message | discord.Message[]> => input[0]
        //                 .channel.send.bind(
        //                     input[0].channel,
        //                     chunk,
        //                     { code: input[1], }
        //                 )
        //         );

        //         const observables: Observable<discord.Message | discord.Message[]>[] = promises.map(
        //             (bind): Observable<discord.Message | discord.Message[]> => from(
        //                 bind.call(null)
        //             ) as Observable<discord.Message | discord.Message[]>
        //         );

        //         return concat(
        //             ...observables
        //         ).pipe(
        //             catchError(
        //                 (err: Error):
        //                 Observable<null> => {
        //                     Utils.logError(err);
        //                     return of(null);
        //                 }
        //             )
        //         );
        //     }
        // ),
    );
}


// class MessageWrapper2 {
//     message: discord.Message;
//     chunks: string[];
//     chunkPtr: number = 0;
//     postedMessages: discord.Message[];
//     blockQuotes: boolean;


//     constructor(message: discord.Message, blockQuotes: boolean) {
//         this.message = message;
//         this.chunks = message.content.match(/[\s\S]{1,1975}(?:\n|$)/g) || [];
//         this.blockQuotes = blockQuotes;
//     }

//     // sendEntireMessage(content: string, blockQuotes: boolean): void {
//     //     this.chunks.forEach(
//     //         (): boolean => this.sendNextMessage()
//     //     );
//     //     const sub = this.sendEntireMessageSub(this.chunks);
//     //     this.chunkPtr = this.chunks.length - 1;
//     //     sub.unsubscribe();
//     // }

//     // sendNextChunk(): void {
//     //     const chunk: string = this.chunks[this.chunkPtr];
//     //     this.chunkPtr += 1;
//     //     if (this.chunks.length > 0) {
//     //         chunk.concat('...');
//     //     }
//     //     return this.message.channel.send(
//     //         chunk,
//     //         { code: this.blockQuotes, },
//     //     ).catch((e: Error): null => {
//     //         Utils.logError(e);
//     //         return null;
//     //     });
//     // }

//     sendEntireMessageSub = (
//         chunks: string[]
//     ): Subscription => from(chunks)
//         .pipe(
//             concatMap(
//                 (chunk: string):
//                 Observable<discord.Message | discord.Message[]> => {
//                     this.chunks = this.chunks.slice(1);
//                     if (this.chunks.length > 0) {
//                         chunk.concat('...');
//                     }
//                     return from(this.message.channel.send(
//                         chunk,
//                         { code: this.blockQuotes, },
//                     ));
//                 }
//             ),
//             catchError(
//                 (err: Error):
//                 Observable<null> => {
//                     Utils.logError(err);
//                     this.message.reply(
//                         'There was an error posting a message. Please try again later.'
//                     ).catch();
//                     throw err;
//                 }
//             ),
//             filter(Utils.isDefinedFilter),
//         )
//         .subscribe(
//             (msg: discord.Message | discord.Message[]):
//             void => {
//                 this.postedMessages.concat(msg);
//             },
//             (): void => {},
//             (): void => Utils.logger.debug('Successfully posted all messages.'),
//         )
// }
