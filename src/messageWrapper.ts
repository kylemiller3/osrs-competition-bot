import * as discord from 'discord.js';
import {
    Observable, from, of, Subscription, Subject, zip, concat,
} from 'rxjs';
import {
    concatMap, catchError, filter, mergeMap, map,
} from 'rxjs/operators';
import { Utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MessageWrapper {
    export const sendMessage: Subject<[discord.Message, boolean]> = new Subject();
    sendMessage.pipe(
        mergeMap(
            (input: [discord.Message, boolean]):
            Observable<discord.Message | discord.Message[]> => {
                const chunks: string[] = input[0].content.match(
                    /[\s\S]{1,1975}(?:\n|$)/g
                ) || [];

                const test: Promise<discord.Message | discord.Message[]> = chunks.map(
                    (chunk: string):
                    () => Promise<discord.Message | discord.Message[]> => input[0]
                        .channel.send.bind(
                            input[0].channel,
                            chunk,
                            { code: input[1], }
                        )
                ).reduce(
                    (acc, x): any => acc.then(x), Promise.resolve()
                );
                Utils.logger.error(test);

                return from(
                    test
                ).pipe(
                    catchError(
                        (err: Error):
                        Observable<null> => {
                            Utils.logError(err);
                            return of(null);
                        }
                    ),
                    filter(Utils.isDefinedFilter)
                );
            }
        )
    ).subscribe(
        (obj: discord.Message | discord.Message[]) => Utils.logger.fatal(obj)
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
