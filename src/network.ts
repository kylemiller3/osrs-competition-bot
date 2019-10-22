import { Observable, defer, of, } from 'rxjs';

import { retryBackoff, } from 'backoff-rxjs';
import { timeout, catchError, } from 'rxjs/operators';
import { Utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Network {
    /**
     * A generic network request function that calls the bound function and returns a promise
     * @param bound A bound network function to call
     * @returns A promise of the network result
     */
    export const genericNetworkObservable = <T>(
        bound: () => Promise<T | null>,
    ): Observable<T | null> => {
        const ret: Observable<T | null> = defer(
            (): Promise<T | null> => bound()
        ).pipe(
            retryBackoff({
                initialInterval: 50,
                maxInterval: 10000,
                maxRetries: 10,
            }),
            timeout(120000), // just in case
            catchError((error: Error): Observable<null> => { // must catch to get values
                Utils.logger.error(error);
                return of(null);
            }),
        );
        return ret;
    };
}
