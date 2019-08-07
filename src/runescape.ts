import {
    hiscores,
} from 'osrs-json-api';
import {
    Observable, of, timer, defer,
} from 'rxjs';
import {
    publishReplay, refCount, catchError, retryWhen, mergeMap,
} from 'rxjs/operators';
import { utils } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace runescape {
    /**
     * @ignore
     */
    const hiscoreCache: Record<
    string,
    { observable: Observable<hiscores.LookupResponse>; date: Date }
    > = {};

    /**
     * @ignore
     */
    const CACHE_SIZE = 1000;

    /**
     * Enum of all Runescape skills
     * @category Tracking
     */
    export enum SkillsEnum {
        ATTACK = 'attack',
        STRENGTH = 'strength',
        DEFENSE = 'defense',
        RANGED = 'ranged',
        PRAYER = 'prayer',
        MAGIC = 'magic',
        RUNECRAFT = 'runecraft',
        CONSTRUCTION = 'construction',
        HITPOINTS = 'hitpoints',
        AGILITY = 'agility',
        HERBLORE = 'herblore',
        THIEVING = 'thieving',
        CRAFTING = 'crafting',
        FLETCHING = 'fletching',
        SLAYER = 'slayer',
        HUNTER = 'hunter',
        MINING = 'mining',
        SMITHING = 'smithing',
        FISHING = 'fishing',
        COOKING = 'cooking',
        FIREMAKING = 'firemaking',
        WOODCUTTING = 'woodcutting',
        FARMING = 'farming'
    }

    /**
     * Enum of all bounty hunter stats to track
     * @category Tracking
     */
    export enum BountyHunterEnum {
        ROGUE = 'rogue',
        HUNTER = 'hunter'
    }

    export enum LmsEnum {
        LMS = 'lms'
    }

    /**
     * Enum of all clue stats to track
     * @category Tracking
     */
    export enum CluesEnum {
        ALL = 'all',
        BEGINNER = 'beginner',
        EASY = 'easy',
        MEDIUM = 'medium',
        HARD = 'hard',
        ELITE = 'elite',
        MASTER = 'master'
    }

    /**
     * Interface containing information about an Event's Participants
     * @category Event
     */
    export interface Participant extends Record<string, unknown> {
        discordId: string
        runescapeAccounts: AccountInfo[]
    }

    /**
     * @description Interface containing information about a Participant's Runescape account
     * @category Event
     */
    export interface AccountInfo extends Record<string, unknown> {
        rsn: string
    }

    /**
     * Interface extending information about a Participant's Runescape account
     * for competitive events
     * @category Event
     */
    export interface CompetitiveAccountInfo extends AccountInfo {
        starting: hiscores.LookupResponse
        ending: hiscores.LookupResponse
    }

    /**
     * @description Interface of all possible things to track
     * @category Tracking
     */
    export interface Tracking extends Record<string, unknown> {
        skills?: SkillsEnum[]
        bh?: BountyHunterEnum[]
        lms?: LmsEnum[]
        clues?: CluesEnum[]
    }

    /**
     * Interface containing information about a Runescape event
     * @category Event
     */
    export interface Event extends Record<string, unknown> {
        id: string
        name: string
        startingDate: Date
        endingDate: Date
        type: EVENT_TYPE
        tracking?: Tracking
        teams?: string[][]
        participants: Participant[]
        passTwoHourWarning: boolean
        hasStarted: boolean
        hasEnded: boolean
    }

    /**
     * Enum of all Event types
     * @category Tracking
     */
    export enum EVENT_TYPE {
        SKILLS = 'skills',
        CLUES = 'clues',
        BH = 'bh',
        LMS = 'lms',
        CUSTOM = 'custom',
        CASUAL = 'casual'
    }

    /**
     * Checks an event to see if it is casual or competitive
     * @param event The event to check
     * @returns If the event is a causal event
     * @category Helper
     */
    export const isEventCasual = (event: Event):
    boolean => event.type === EVENT_TYPE.CASUAL;

    /**
     * Enum of all possible trackings
     * @category Tracking
     */
    export enum TrackingEnum {
        SKILLS = 'skills',
        CLUES = 'clues',
        BH = 'bh',
        LMS = 'lms'
    }

    /**
     * Custom HTTP Error class
     */
    class HTTPError extends Error {
        status: number
    }

    /**
     * Retries a web service exponentially
     * @param maxRetryAttempts How many retries to attempt
     * @param scalingDuration Exponential backoff factor
     * @param excludedStatusCodes HTTP error codes to abort on
     */
    const exponentialBackoff = ({
        maxRetryAttempts = 10,
        scalingDuration = 1000,
        excludedStatusCodes = [],
    }: {
        maxRetryAttempts?: number
        scalingDuration?: number
        excludedStatusCodes?: number[]
    } = {}):
        (errors: Observable<HTTPError>) => Observable<number> => (attempts: Observable<HTTPError>):
    Observable<number> => attempts.pipe(
        mergeMap((error: HTTPError, i: number): Observable<number> => {
            const retryAttempt = i + 1;
            // if maximum number of retries have been met
            // or response is a status code we don't wish to retry, throw error
            if (retryAttempt > maxRetryAttempts
                || excludedStatusCodes.find((e: number): boolean => e === error.status)) {
                throw error;
            }
            const jitter = Math.floor(
                (Math.random() * 300) - 150
            );
            utils.logger.debug(
                `Attempt ${retryAttempt}: retrying in ${retryAttempt * scalingDuration + jitter}ms`
            );
            return timer(retryAttempt * scalingDuration + jitter);
        })
    );

    /**
    * Fetches the supplied rsn from Jagex hiscores or cache
    * @param rsn rsn to lookup on hiscores
    * @returns Observable of the API response as [[hiscores.LookupResponse]]
    */
    export const hiscores$ = (
        rsn: string,
        pullNew: boolean
    ): Observable<hiscores.LookupResponse> => {
        utils.logger.info(`Looking up rsn '${rsn}'`);
        if (hiscoreCache[rsn] !== undefined) {
            const date: Date = new Date(hiscoreCache[rsn].date);
            date.setMinutes(
                date.getMinutes() + 20
            );
            if (utils.isInPast(date) || pullNew) {
                hiscoreCache[rsn] = undefined;
            }
        }

        if (hiscoreCache[rsn] === undefined) {
            const obs: Observable<hiscores.LookupResponse> = defer(
                (): Promise<JSON> => hiscores.getPlayer(rsn)
            )
                .pipe(
                    retryWhen(exponentialBackoff()),
                    publishReplay(1),
                    refCount(),
                    catchError((error: Error): Observable<JSON> => {
                        hiscoreCache[rsn] = undefined;
                        utils.logError(error);
                        utils.logger.error(`Could not find rsn '${rsn}'`);
                        return of(null);
                    })
                ) as unknown as Observable<hiscores.LookupResponse>;

            hiscoreCache[rsn] = {
                observable: obs,
                date: new Date(),
            };
        }

        const cached: Observable<hiscores.LookupResponse> = hiscoreCache[rsn].observable;
        const keys = Object.keys(hiscoreCache);
        if (keys.length >= CACHE_SIZE) {
            const idxToRemove: number = Math.floor(
                (Math.random() * CACHE_SIZE)
            );
            const keyToRemove: string = keys[idxToRemove];
            hiscoreCache[keyToRemove] = undefined;
            return cached;
        }
        return cached;
    };
}
