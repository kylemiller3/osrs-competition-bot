import {
    hiscores,
} from 'osrs-json-api';
import {
    Observable, from, of, observable,
} from 'rxjs';
import {
    retry, publishReplay, refCount, catchError,
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
        skills: SkillsEnum[]
        bh: BountyHunterEnum[]
        lms: null
        clues: CluesEnum[]
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
        type: string
        tracking: Tracking
        participants: Participant[]
        hasNotifiedTwoHourWarning: boolean
        hasNotifiedStarted: boolean
        hasNotifiedEnded: boolean
    }

    /**
    * Fetches the supplied rsn from Jagex hiscores or cache
    * @param rsn rsn to lookup on hiscores
    * @returns Observable of the API response as [[hiscores.LookupResponse]]
    */
    export const hiscores$ = (
        rsn: string,
        pullNew: boolean
    ): Observable<hiscores.LookupResponse> => {
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
            hiscoreCache[rsn] = {
                observable: from(hiscores.getPlayer(rsn))
                    .pipe(
                        retry(10),
                        publishReplay(1),
                        refCount(),
                        catchError((error: Error): Observable<JSON> => {
                            hiscoreCache[rsn] = undefined;
                            utils.logError(error);
                            return of(null);
                        })
                    ) as unknown as Observable<hiscores.LookupResponse>,
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
