import * as discord from 'discord.js';
import {
    Observable, of, Subject, defer, forkJoin,
} from 'rxjs';
import {
    retryBackoff,
} from 'backoff-rxjs';
import {
    catchError, mergeMap, map, share, timeout,
} from 'rxjs/operators';
import { Utils, } from './utils';


// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MessageWrapper {
    export const sendMessage$: Subject<discord.Message> = new Subject();
    export const sentMessages$ = sendMessage$.pipe(
        mergeMap(
            (input: discord.Message):
            Observable<(discord.Message | null)[]> => {
                const msgs: discord.Message[] = (input.content.match(
                    /[\s\S]{1,1975}(?:\n|$)/g
                ) || []).map(
                    (chunk: string):
                    discord.Message => ({
                        ...input,
                        content: chunk,
                    } as discord.Message)
                );

                const observables: Observable<discord.Message | discord.Message[] | null>[] = msgs.map(
                    (msg: discord.Message):
                    Observable<discord.Message | discord.Message[] | null> => defer(
                        (): Promise<discord.Message | discord.Message[]> => msg.channel.send()
                    ).pipe(
                        retryBackoff({
                            initialInterval: 50,
                            maxInterval: 10000,
                            maxRetries: 10,
                        }),
                        catchError((error: Error): Observable<null> => {
                            Utils.logger.error(error);
                            return of(null);
                        }),
                    )
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
