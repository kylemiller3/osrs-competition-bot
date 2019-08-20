import {
    hiscores,
} from 'osrs-json-api';
import {
    Observable, of, timer, defer,
} from 'rxjs';
import {
    publishReplay, refCount, catchError, retryWhen, mergeMap, filter,
} from 'rxjs/operators';
import { utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace runescape {
    /**
     * @ignore
     */
    const hiscoreCache: Record<
    string,
    {
        observable: Observable<hiscores.LookupResponse>
        date: Date
    }
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
        customScore?: number
        runescapeAccounts: AccountInfo[]
    }

    /**
     * Interface containing information about a Participant's Runescape account
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
     * Interface of all possible things to track
     * @category Tracking
     */
    export interface Tracking extends Record<string, unknown> {
        skills?: SkillsEnum[]
        bh?: BountyHunterEnum[]
        lms?: LmsEnum[]
        clues?: CluesEnum[]
    }

    /**
     * Interface for information on a team
     * @category Event
     */
    export interface TeamInfo extends Record<string, unknown> {
        name: string
        linkedDiscordIds: string[]
    }

    /**
     * Interface containing information about a Runescape event
     * @category Event
     */
    export interface Event extends Record<string, unknown> {
        id: string
        scoreboardMessageId?: string
        statusMessageId?: string
        name: string
        startingDate: Date
        endingDate: Date
        type: EVENT_TYPE
        tracking?: Tracking
        teams?: TeamInfo[]
        participants: Participant[]
        hasPassedTwoHourWarning: boolean
        hasStarted: boolean
        hasEnded: boolean
        isFinalized?: boolean
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
     * Finds a participant by their Discord id
     * @param event The participants to search
     * @returns found participant
     */
    export const getParticipantByDiscordId = (participants: Participant[], discordId: string):
    Participant => participants.find(
        (participant: Participant): boolean => participant.discordId === discordId
    );

    /**
     * Gets all participants in a team
     * @param event The event get participants from
     * @param teamName The name to find
     * @returns A list of valid participants
     * @category Team Helper
     */
    export const getTeamParticipants = (event: Event, teamName: string):
    Participant[] => {
        if (event.teams === undefined) return undefined;
        const foundTeam: TeamInfo = event.teams.find(
            (info: TeamInfo):
            boolean => info.name === teamName
        );
        if (foundTeam === undefined) return undefined;
        const teamParticipants: Participant[] = foundTeam.linkedDiscordIds.map(
            (discordId: string):
            Participant => getParticipantByDiscordId(
                event.participants,
                discordId
            )
        );
        const filteredParticipants: Participant[] = teamParticipants.filter(
            (participant: Participant):
            boolean => participant !== undefined
        );
        return filteredParticipants;
    };

    /**
     * Checks an event to see if it is a team event
     * @param event The event to check
     * @returns If the event is a team event
     * @category Helper
     */
    export const isTeamEvent = (event: Event):
    boolean => event.teams !== undefined;

    /**
     * Checks an event to see if it is casual or competitive
     * @param event The event to check
     * @returns If the event is a causal event
     * @category Helper
     */
    export const isEventCasual = (event: Event):
    boolean => event.type === EVENT_TYPE.CASUAL;

    /**
     * Checks an event to see if it is custom or not
     * @param event The event to check
     * @returns If the event is a custom event
     * @category Helper
     */
    export const isEventCustom = (event: Event):
    boolean => event.type === EVENT_TYPE.CUSTOM;

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
        maxRetryAttempts = 5,
        scalingDuration = 1000,
        excludedStatusCodes = [],
        excludedMessages = [
            'Player not found! Check RSN or game mode.',
            'RSN must be less or equal to 12 characters',
            'RSN must be of type string',
        ],
    }: {
        maxRetryAttempts?: number
        scalingDuration?: number
        excludedStatusCodes?: number[]
        excludedMessages?: string[]
    } = {}):
        (errors: Observable<HTTPError>) => Observable<number> => (attempts: Observable<HTTPError>):
    Observable<number> => attempts.pipe(
        mergeMap((error: HTTPError, i: number): Observable<number> => {
            const retryAttempt = i + 1;
            // if maximum number of retries have been met
            // or response is a status code we don't wish to retry, throw error
            if (retryAttempt > maxRetryAttempts
                || excludedStatusCodes.find(
                    (e: number):
                    boolean => e === error.status
                )
                || excludedMessages.find(
                    (e: string):
                    boolean => e.toLowerCase() === error.message.toLowerCase()
                )) {
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
    * @param asciiRsn rsn to lookup on hiscores
    * @returns Observable of the API response as [[hiscores.LookupResponse]]
    */
    export const hiscores$ = (
        rsn: string,
        pullNew: boolean
    ): Observable<hiscores.LookupResponse> => {
        // eslint-disable-next-line no-control-regex
        const asciiRsn: string = rsn.replace(/[^\x00-\x7F]/g, '');
        utils.logger.info(`Looking up rsn '${asciiRsn}'`);
        if (hiscoreCache[asciiRsn] !== undefined) {
            const date: Date = new Date(hiscoreCache[asciiRsn].date);
            date.setMinutes(
                date.getMinutes() + 20
            );
            if (utils.isInPast(date) || pullNew) {
                hiscoreCache[asciiRsn] = undefined;
            }
        }

        if (hiscoreCache[asciiRsn] === undefined) {
            const obs: Observable<hiscores.LookupResponse> = defer(
                (): Promise<JSON> => hiscores.getPlayer(asciiRsn)
            )
                .pipe(
                    retryWhen(exponentialBackoff()),
                    publishReplay(1),
                    refCount(),
                    catchError((error: Error): Observable<JSON> => {
                        hiscoreCache[asciiRsn] = undefined;
                        utils.logError(error);
                        utils.logger.error(`Could not find rsn '${asciiRsn}'`);
                        return of(null);
                    })
                ) as unknown as Observable<hiscores.LookupResponse>;

            hiscoreCache[asciiRsn] = {
                observable: obs,
                date: new Date(),
            };
        }

        const cached: Observable<hiscores.LookupResponse> = hiscoreCache[asciiRsn].observable;
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
