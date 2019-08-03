import {
    hiscores,
} from 'osrs-json-api'
import { Observable, from, of } from 'rxjs'
import {
    retry, publishReplay, refCount, catchError,
} from 'rxjs/operators'
import { utils } from './utils'

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace runescape {
    const hiscoreCache: Record<string, Observable<hiscores.LookupResponse>> = {}

    /**
    * @description Enum of all Runescape skills
    * @enum
    * @default
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
     * @description Enum of all bounty hunter items to track
     * @enum
     * @default
     */
    export enum BountyHunterEnum {
        ROGUE = 'rogue',
        HUNTER = 'hunter'
    }

    /**
     * @description Enum of all clue items to track
     * @enum
     * @default
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

    export enum TrackingEnum {
        SKILLS = 'skills',
        CLUES = 'clues',
        BH = 'bh',
        LMS = 'lms'
    }

    /**
     * @description Contract containing information about Runescape event participants
     * @interface
     */
    export interface Participant extends Record<string, unknown> {
        discordId: string
        runescapeAccounts: AccountInfo[]
    }

    /**
     * @description Contract containing information about a Runescape account
     * @interface
     */
    export interface AccountInfo extends Record<string, unknown> {
        rsn: string
    }

    /**
     * @description Contract extending information about a Runescape account for competitive events
     * @interface
     */
    export interface CompetitiveAccountInfo extends AccountInfo {
        starting: hiscores.LookupResponse
        ending: hiscores.LookupResponse
    }

    /**
     * @description Contract of all possible things to track
     * @interface
     * @default
     */
    export interface Tracking extends Record<string, unknown> {
        skills: SkillsEnum[]
        bh: BountyHunterEnum[]
        lms: null
        clues: CluesEnum[]
    }

    /**
     * @description Contract containing information about a Runescape event
     * @interface
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
    * @function
    * @description Fetches the supplied RSN from hiscores or cache
    * @param {string} rsn RSN to lookup
    * @returns {Observable<JSON>} Observable of the JSON response or Observable of null
    * @todo handle the error properly
    */
    export const hiscores$ = (rsn: string): Observable<hiscores.LookupResponse> => {
        if (hiscoreCache[rsn] === undefined) {
            hiscoreCache[rsn] = from(hiscores.getPlayer(rsn))
                .pipe(
                    retry(10),
                    publishReplay(1, 20 * 60 * 1000),
                    refCount(), catchError((error: Error): Observable<JSON> => {
                        utils.logError(error)
                        return of(null)
                    })
                ) as unknown as Observable<hiscores.LookupResponse>
        }

        const cached: Observable<hiscores.LookupResponse> = hiscoreCache[rsn]
        const keys = Object.keys(hiscoreCache)
        if (keys.length >= 10000) {
            const idxToRemove: number = Math.floor((Math.random() * 10000))
            const keyToRemove: string = keys[idxToRemove]
            hiscoreCache[keyToRemove] = undefined
            return cached
        }
        return cached
    }
}
