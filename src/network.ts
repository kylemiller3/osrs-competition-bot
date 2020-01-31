import {
    Observable, defer, of, from,
} from 'rxjs';

import { retryBackoff, } from 'backoff-rxjs';
import {
    timeout, catchError, publishReplay, refCount, tap, map,
} from 'rxjs/operators';
import { hiscores, } from 'osrs-json-api';
import { Utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Network {
    /**
     * A generic network request function that calls the bound function and returns a promise
     * @param bound A bound network function to call
     * @returns A promise of the network result
     */
    // export const genericNetworkFetch$ = <T>(
    //     bound: () => Promise<T | null>,
    //     shouldRetry: (error: Error) => boolean = (): boolean => true
    // ): Observable<T | null> => {
    //     const ret: Observable<T | null> = from(
    //         bound()
    //     ).pipe(
    //         retryBackoff({
    //             initialInterval: 50,
    //             maxInterval: 10000,
    //             maxRetries: 10,
    //             shouldRetry,
    //         }),
    //         catchError((error: Error): Observable<null> => { // must catch to get values
    //             Utils.logger.error(error);
    //             return of(null);
    //         }),
    //     );
    //     return ret;
    // };

    export const genericNetworkFetch$ = <T>(
        bound: () => Promise<T>,
        shouldRetry: (error: Error) => boolean = (): boolean => true
    ): Observable<T> => {
        const deferred: Observable<T> = defer(
            (): Observable<T> => {
                const ret: Observable<T> = from(
                    bound()
                ).pipe(
                    retryBackoff({
                        initialInterval: 50,
                        maxInterval: 10000,
                        maxRetries: 10,
                        shouldRetry,
                    }),
                    catchError((error: Error): Observable<T> => {
                        Utils.logger.error(error);
                        throw error;
                    }),
                );
                return ret;
            }
        );
        return deferred;
    };

    const CACHE_SIZE = 1000;

    /**
     * Interface describing the Hiscore Cache
     * @category Hiscore Cache
     * @ignore
     */
    interface HiscoreCache {
        observable: Observable<hiscores.Player | null>
        date: Date
    }

    /**
     * Implementation of the [[HiscoreCache]]
     * @category Hiscore Cache
     * @ignore
     */
    const hiscoreCache: Record<string, HiscoreCache | undefined> = {};

    /**
    * Fetches the supplied rsn from RuneScape API hiscores or cache.
    * Cache invalidates every 5 minutes. See [[hiscores.Player]]
    * @param rsn The rsn to lookup on hiscores
    * @param pullNew Forces a cache miss
    * @returns Observable of the RuneScape web API response
    * @category RuneScape API
    */
    export const hiscoresFetch$ = (
        rsn: string,
        pullNew: boolean
    ): Observable<hiscores.Player | null> => {
        // eslint-disable-next-line no-control-regex
        const asciiRsn: string = rsn.replace(/[^\x00-\x7F]/g, '');
        Utils.logger.trace(`Looking up rsn '${asciiRsn}'`);
        let cachedRsn = hiscoreCache[asciiRsn];
        if (cachedRsn !== undefined) {
            const date: Date = new Date(cachedRsn.date);
            date.setMinutes(
                date.getMinutes() + 5
            );
            if (Utils.isInPast(date) || pullNew) {
                hiscoreCache[asciiRsn] = undefined;
                cachedRsn = undefined;
            }
        }

        if (cachedRsn === undefined) {
            const bound = hiscores.getPlayer.bind(
                undefined,
                asciiRsn,
            );

            const isInputError: (error: Error) => boolean = (
                error: Error
            ): boolean => error.message === 'Player not found! Check RSN or game mode.'
                || error.message === 'RSN must be less or equal to 12 characters'
                || error.message === 'RSN must be of type string';
            const obs = genericNetworkFetch$<hiscores.Player | null>(
                bound,
                (error: Error): boolean => {
                    if (isInputError(error)) {
                        return false;
                    }
                    return true;
                },
            ).pipe(
                catchError(
                    (error: Error): Observable<null> => {
                        Utils.logger.error(`${error.name}`);
                        if (isInputError(error)) {
                            // consume this error
                            // not a real networking error
                            return of(null);
                        }
                        hiscoreCache[asciiRsn] = undefined;
                        throw error;
                    }
                ),
                publishReplay(1),
                refCount(),
            );

            hiscoreCache[asciiRsn] = {
                observable: obs,
                date: new Date(),
            };

            const keys = Object.keys(hiscoreCache);
            if (keys.length >= CACHE_SIZE) {
                const idxToRemove: number = Math.floor(
                    (Math.random() * CACHE_SIZE)
                );
                const keyToRemove: string = keys[idxToRemove];
                hiscoreCache[keyToRemove] = undefined;
            }
            return obs;
        }
        return cachedRsn.observable;
    };
}
