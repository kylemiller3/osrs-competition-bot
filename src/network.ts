import {
    Observable, defer, of, from, Subject, GroupedObservable, forkJoin,
} from 'rxjs';

import { retryBackoff } from 'backoff-rxjs';
import {
    catchError, publishReplay, refCount, mergeMap, groupBy, scan, switchMap, toArray,
} from 'rxjs/operators';
import { hiscores } from 'osrs-json-api';
import SocksProxyAgent from 'socks-proxy-agent';

import { Utils } from './utils';


// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Network {

    // export interface Request {
    //     tag: string;
    //     bounds: (() => Promise<unknown>)[];
    //     shouldRetry: (error: Error) => boolean;
    //     server: number;
    // }

    // export const networkRequestDispatch$ = new Subject<Request>();
    // export const networkRequestResponse$ = networkRequestDispatch$.pipe(
    //     groupBy(
    //         (request: Request): string => request.tag,
    //     ),
    //     mergeMap(
    //         (group: GroupedObservable<string, Request>):
    //         Observable<[string, unknown[]]> => group.pipe(
    //             switchMap(
    //                 (req: Request):
    //                 Observable<[string, unknown[]]> => {
    //                     const obs$: Observable<unknown[]> = req.bounds.map(
    //                         (bound: () => Promise<unknown>):
    //                         Observable<unknown> => genericNetworkFetch$(
    //                             bound,
    //                             req.shouldRetry,
    //                         ),
    //                     );
    //                     const req$: Observable<unknown[]> = forkJoin(...req.bounds).pipe(
    //                         toArray(),
    //                     );
    //                     return forkJoin(of(req.tag), req$);
    //                 },
    //             ),
    //         ),
    //     ),
    // );

    // const serverCount = 2;
    // let currCount = 1;
    // export const makeRequest = <T>(
    //     tag: string,
    //     request: Observable<T>,
    //     isPremium: boolean,
    // ): void => {
    //     let server = 0;
    //     if (isPremium && serverCount > 1) {
    //         currCount += 1;
    //         if (currCount === serverCount) {
    //             currCount = 1;
    //         }
    //         server = currCount;
    //     }
    //     networkRequestDispatch$.next({
    //         tag,
    //         request,
    //         server,
    //     });
    // };

    export const genericNetworkFetch$ = <T>(
        bound: () => Promise<T>,
        shouldRetry: (error: Error) => boolean = (): boolean => true,
    ): Observable<T> => {
        // factory function because promises do not have retry functionality
        const networkRequestFactory: Observable<T> = defer(
            (): Observable<T> => of(null).pipe(
                mergeMap((): Observable<T> => from(bound())),
            ),
        );

        const ret: Observable<T> = networkRequestFactory.pipe(
            retryBackoff({
                initialInterval: 100,
                maxInterval: 20000,
                maxRetries: 10,
                shouldRetry,
                backoffDelay: (
                    (iteration: number, initialInterval: number):
                    number => initialInterval * (2 ** iteration) + Math.random() * 1000
                ),
            }),
            catchError((error: Error): Observable<T> => {
                Utils.logger.warn(`Network Error: ${error.message}`);
                throw error;
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
        observable: Observable<hiscores.Player | null>;
        date: Date;
    }

    /**
     * Implementation of the [[HiscoreCache]]
     * @category Hiscore Cache
     * @ignore
    */
    const hiscoreCache: Record<string, HiscoreCache | undefined> = {};

    /**
     * Fetches the supplied rsn from RuneScape API hiscores or cache.
     * Cache invalidates every 9 minutes. See [[hiscores.Player]]
     * @param rsn The rsn to lookup on hiscores
     * @param pullNew Forces a cache miss
     * @returns Observable of the RuneScape web API response
     * @category RuneScape API
    */
    export const hiscoresFetch$ = (
        rsn: string,
        pullNew: boolean,
    ): Observable<hiscores.Player | null> => {
        Utils.logger.debug(`Looking up user ${rsn}`);
        // eslint-disable-next-line no-control-regex
        const asciiRsn: string = rsn.replace(/[^\x00-\x7F]/g, '');
        let cachedRsn = hiscoreCache[asciiRsn];
        if (cachedRsn !== undefined) {
            const date: Date = new Date(cachedRsn.date);
            date.setMinutes(
                date.getMinutes() + 9,
            );
            if (Utils.isInPast(date) || pullNew) {
                hiscoreCache[asciiRsn] = undefined;
                cachedRsn = undefined;
            }
        }

        const proxyHost = 'localhost';
        const proxyPort = 4711;
        const proxyOptions = `socks5://${proxyHost}:${proxyPort}`;
        const httpsAgent = SocksProxyAgent(proxyOptions);
        const httpAgent = httpsAgent;
        const config = { httpsAgent, httpAgent };
        if (cachedRsn === undefined) {
            const bound = hiscores.getPlayer.bind(
                undefined,
                asciiRsn,
                'main',
                config,
            );

            const isInputError: (error: Error) => boolean = (
                error: Error,
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
                        if (isInputError(error)) {
                            Utils.logger.debug(`The rsn could not be looked up because ${error.message}`);
                            // consume this error
                            // not a real networking error
                            return of(null);
                        }
                        hiscoreCache[asciiRsn] = undefined;
                        throw error;
                    },
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
                    (Math.random() * CACHE_SIZE),
                );
                const keyToRemove: string = keys[idxToRemove];
                hiscoreCache[keyToRemove] = undefined;
            }
            return obs;
        }
        return cachedRsn.observable;
    };
}
