import {
    Observable, defer, of, from,
} from 'rxjs';

import { retryBackoff, } from 'backoff-rxjs';
import {
    timeout, catchError, publishReplay, refCount, tap,
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
    export const genericNetworkFetch$ = <T>(
        bound: () => Promise<T | null>,
        shouldRetry: (error: Error) => boolean = (): boolean => true
    ): Observable<T | null> => {
        const ret: Observable<T | null> = from(
            bound()
        ).pipe(
            retryBackoff({
                initialInterval: 50,
                maxInterval: 10000,
                maxRetries: 10,
                shouldRetry,
            }),
            catchError((error: Error): Observable<null> => { // must catch to get values
                Utils.logger.error(error);
                return of(null);
            }),
        );
        return ret;
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
    * Cache invalidates every 10 minutes. See [[hiscores.Player]]
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
                date.getMinutes() + 10
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
            const obs: Observable<hiscores.Player | null> = genericNetworkFetch$(
                bound,
                (error: Error): boolean => {
                    if (
                        error.message.toLowerCase() === 'Player not found! Check RSN or game mode.'.toLowerCase()
                        || error.message.toLowerCase() === 'RSN must be less or equal to 12 characters'.toLowerCase()
                        || error.message.toLowerCase() === 'RSN must be of type string'.toLowerCase()
                    ) {
                        return false;
                    }
                    return true;
                },
            ).pipe(
                publishReplay(1),
                refCount(),
                tap(
                    (response: hiscores.Player):
                    void => {
                        if (response === null) {
                            Utils.logger.error(`Could not find rsn '${asciiRsn}'`);
                            hiscoreCache[asciiRsn] = undefined;
                        }
                    }
                )
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
