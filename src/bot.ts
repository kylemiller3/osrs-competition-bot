
import * as jsonfile from 'jsonfile';
import {
    Observable, timer, defer, of,
} from 'rxjs';
import { hiscores, } from 'osrs-json-api';
import {
    mergeMap, retryWhen, publishReplay, refCount, catchError,
} from 'rxjs/operators';
import {
    Event,
} from './event';
import { Utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Bot {
    /**
     * Blank cache
     * @ignore
     */
    const loadCache:
    Record<string, GuildContext> = {};

    /**
     * Default blank [[GuildContext]]
     * @category Context
     */
    const DATA_DEFAULT: GuildContext = {
        guildId: undefined,
        settings: {
            admins: [],
            notificationChannelId: undefined,
        },

        events: [],
    };

    /**
     * Contract describing each Command
     * @category Command
     */
    export interface Command extends Record<string, unknown> {
        description: string
        accessControl: AccessControl
        usage: string
        command: string
    }

    /**
     * Contract describing Access Controls of each bot [[Command]]
     * @category Command
     */
    export interface AccessControl {
        controlFunction: (
            data: GuildContext,
            authorId: string,
        ) => boolean
        description: string
    }

    /**
     * Contract of all known bot [[Command]]s
     * @category Command
     */
    export interface AllCommands extends Record<string, Command> {
        DEBUG: Command
        ADD_ADMIN: Command
        ADD_UPCOMING: Command
        LIST_UPCOMING: Command
        DELETE_UPCOMING: Command
        SIGNUP_UPCOMING: Command
        UNSIGNUP_UPCOMING: Command
        AMISIGNEDUP_UPCOMING: Command
        LIST_PARTICIPANTS_UPCOMING: Command
        HELP: Command
        SET_CHANNEL: Command
        FORCESIGNUP_UPCOMING: Command
        FORCEUNSIGNUP_UPCOMING: Command
        SHOWSTATS: Command
        FINALIZE: Command
        LIST_CUSTOM: Command
        UPDATESCORE: Command
    }

    /**
     * Contract for a Guild's Settings
     * @category Context
     */
    export interface Settings extends Record<string, unknown> {
        admins: string[]
        notificationChannelId: string
    }

    /**
     * Top level contract for each Guild's configuration
     * @category Context
     */
    export interface GuildContext extends Record<string, unknown> {
        guildId: string
        settings: Settings
        events: Event.Event[]
    }

    /**
     * Checks a [[GuildContext]] for any administrators
     * @param context The context to check
     * @returns True if the context has one or more administrator
     * @category Context Property
     */
    export const hasAdmin = (
        context: GuildContext,
    ): boolean => context.settings.admins.length > 0;

    /**
     * Checks if the author id of a Discord message is an administrator
     * for a given [[GuildContext]]
     * @param context The context to check
     * @param authorId The Discord author id of the message
     * @returns If the author is an administrator
     * @category Context Property
     */
    export const isAdmin = (
        context: GuildContext,
        authorId: string,
    ): boolean => context.settings.admins.includes(
        authorId
    );

    /**
     * Implementation of [[AccessControl]] for unset
     * [[GuildContext]] or admin users only access
     * @category Command
     */
    export const ONLY_UNSET_ADMINS_OR_ADMIN: AccessControl = {
        controlFunction: (
            guildData: GuildContext,
            authorId: string,
        ): boolean => !hasAdmin(guildData) || isAdmin(
            guildData,
            authorId,
        ),
        description: 'unset guild configuration or have admin privileges',
    };

    /**
     * Implementation of [[AccessControl]] for
     * admin users only access
     * @category Command
     */
    export const ONLY_ADMIN: AccessControl = {
        controlFunction: (
            guildData: GuildContext,
            authorId: string,
        ): boolean => isAdmin(
            guildData,
            authorId
        ),
        description: 'have admin privileges',
    };

    /**
     * Implementation of [[AccessControl]] for any user access
     * @category Command
     */
    export const ANY_USER: AccessControl = {
        controlFunction: (): boolean => true,
        description: 'any user',
    };

    /**
     * Implementation of [[AllCommands]]
     * @category Command
     * @ignore
     */
    export const ALL_COMMANDS: AllCommands = {
        DEBUG: {
            command: '!f debug',
            description: 'logs debug info to console',
            accessControl: ONLY_ADMIN,
            usage: '!f debug',
        },
        ADD_ADMIN: {
            command: '!f add admin ',
            description: 'adds administration for this guild',
            accessControl: ONLY_UNSET_ADMINS_OR_ADMIN,
            usage: '!f add admin @admin1 @admin2',
        },

        ADD_UPCOMING: {
            command: '!f add event ',
            description: 'schedules a new event',
            accessControl: ONLY_ADMIN,
            usage: '!f add event name (unique name) starting (start date) ending (end date) type skills (skill list)\n'
            + 'OR !f add event name (unique name) starting (start date) ending (end date) type bh (hunter OR rogue)\n'
            + 'OR !f add event name (unique name) starting (start date) ending (end date) type lms lms\n'
            + 'OR !f add event name (unique name) starting (start date) ending (end date) type clues (clue difficulty list)',
        },

        LIST_UPCOMING: {
            command: '!f events',
            description: 'lists scheduled events along with event name',
            accessControl: ANY_USER,
            usage: '!f events',
        },

        DELETE_UPCOMING: {
            command: '!f delete ',
            description: 'deletes an event by event name',
            accessControl: ONLY_ADMIN,
            usage: '!f delete (event name)',
        },

        SIGNUP_UPCOMING: {
            command: '!f signup ',
            description: 'signs up for an event with event name and RuneScape name',
            accessControl: ANY_USER,
            usage: '!f signup event (event name) rsn (RuneScape name)',
        },

        UNSIGNUP_UPCOMING: {
            command: '!f unsignup ',
            description: 'un-signs up for an event with event name',
            accessControl: ANY_USER,
            usage: '!f unsignup (event name)',
        },

        AMISIGNEDUP_UPCOMING: {
            command: '!f amisignedup ',
            description: 'checks to see if you are signed up for an event with event name',
            accessControl: ANY_USER,
            usage: '!f amisignedup (event name)',
        },

        LIST_PARTICIPANTS_UPCOMING: {
            command: '!f list ',
            description: 'lists all participants in an event with event name)',
            accessControl: ANY_USER,
            usage: '!f list (event name)',
        },

        HELP: {
            command: '!f help',
            description: 'prints this help',
            accessControl: ANY_USER,
            usage: '!f help',
        },

        SET_CHANNEL: {
            command: '!f set channel ',
            description: 'sets the channel for notifications - must be set or there will be no notifications',
            accessControl: ONLY_ADMIN,
            usage: '!f set channel #channel',
        },

        FORCESIGNUP_UPCOMING: {
            command: '!f forcesignup ',
            description: 'forces signup for a scheduled event number with RuneScape name and mention (use with \'!f events\')',
            accessControl: ONLY_ADMIN,
            usage: '!f forcesignup event (event name) @mention rsn (RuneScape name)',
        },

        FORCEUNSIGNUP_UPCOMING: {
            command: '!f forceunsignup ',
            description: 'forces un-signup for a scheduled event number with RuneScape name and mention (use with \'!f events\')',
            accessControl: ONLY_ADMIN,
            usage: '!f forceunsignup (event name) @mention',
        },

        SHOWSTATS: {
            command: '!f stats',
            description: 'prints stats for a user',
            accessControl: ANY_USER,
            usage: '!f stats\nOR !f stats @mention',
        },

        FINALIZE: {
            command: '!f finalize ',
            description: 'ends and finalizes a long running or custom event',
            accessControl: ONLY_ADMIN,
            usage: '!f finalize (event name)',
        },

        LIST_CUSTOM: {
            command: '!f custom',
            description: 'lists custom events that have yet to end or have yet to be finalized',
            accessControl: ONLY_ADMIN,
            usage: '!f custom',
        },

        UPDATESCORE: {
            command: '!f updatescore ',
            description: 'updates score of a custom event participant',
            accessControl: ONLY_ADMIN,
            usage: 'index, mention, score to add',
        },
    };

    /**
     * Loads the [[GuildContext]] using cache or [[DATA_DEFAULT]] if none or dirty
     * @param id Guild id of context to load
     * @param dirty Loads context from disk if set
     * @returns The loaded context in storage
     * @category Context
     */
    export const load = (
        id: string,
        dirty: boolean = false
    ): GuildContext => {
        if (dirty || loadCache[id] === undefined) {
            try {
                loadCache[id] = jsonfile.readFileSync(
                    (`./guilds/${id}.json`), {
                        // this is very fragile but works for our data structures
                        reviver: ((key: string, value: unknown): unknown => {
                            if (key.toLowerCase().includes('date')) { return new Date(value as string); }
                            return value;
                        }),
                    }
                );
            } catch (error) {
                if (error.errno === -2) {
                    Utils.logger.info('Guild has no configuration');
                    return DATA_DEFAULT;
                }
                Utils.logError(error);
                Utils.logger.error(`Error loading ${id} from disk`);
                throw error;
            }
        }

        const cached: GuildContext = loadCache[id];
        const keys = Object.keys(loadCache);
        if (keys.length >= 1000) {
            const idxToRemove: number = Math.floor((Math.random() * 10));
            const keyToRemove: string = keys[idxToRemove];
            loadCache[keyToRemove] = undefined;
        }
        return cached;
    };

    /**
     * Saves the [[GuildContext]] and then triggers a dirty [[load]]
     * @param id Guild id context to save
     * @param data The context to save to disk
     * @returns The loaded context in storage
     * @category Context
     */
    export const save = (
        context: GuildContext
    ): GuildContext => {
        try {
            jsonfile.writeFileSync(`./guilds/${context.guildId}.json`, context);
            Utils.logger.debug(`Wrote settings to ${context.guildId}`);
            return load(context.guildId, true);
        } catch (error) {
            Utils.logError(error);
            Utils.logger.error(`Error writing ${context.guildId} to disk`);
            throw error;
        }
    };

    /**
     * Interface describing the Hiscore Cache
     * @category Hiscore Cache
     * @ignore
     */
    interface HiscoreCache {
        observable: Observable<hiscores.LookupResponse>
        date: Date
    }

    /**
     * Implementation of the [[HiscoreCache]]
     * @category Hiscore Cache
     * @ignore
     */
    const hiscoreCache: Record<string, HiscoreCache> = {};

    /**
     * Default cache size
     * @category Hiscore Cache
     * @ignore
     */
    const CACHE_SIZE = 1000;

    /**
     * Custom HTTP Error class
     * @category Error
     */
    class HTTPError extends Error {
        status: number
    }

    /**
     * Retries a RuneScape API request exponentially backing-off on failure
     * @param maxRetryAttempts How many retries to attempt
     * @param scalingDuration Exponential backoff factor
     * @param excludedStatusCodes HTTP error codes to abort on
     * @param excludedMessages Error messages to abort on
     * @category RuneScape API
     * @ignore
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
            Utils.logger.debug(
                `Attempt ${retryAttempt}: retrying in ${retryAttempt * scalingDuration + jitter}ms`
            );
            return timer(retryAttempt * scalingDuration + jitter);
        })
    );

    /**
    * Fetches the supplied rsn from RuneScape API hiscores or cache.
    * Cache invalidates every 20 minutes.
    * @param rsn The rsn to lookup on hiscores
    * @param pullNew Forces a cache miss
    * @returns Observable of the RuneScape web API response as [[hiscores.LookupResponse]]
    * @category RuneScape API
    */
    export const hiscores$ = (
        rsn: string,
        pullNew: boolean
    ): Observable<hiscores.LookupResponse> => {
        // eslint-disable-next-line no-control-regex
        const asciiRsn: string = rsn.replace(/[^\x00-\x7F]/g, '');
        Utils.logger.info(`Looking up rsn '${asciiRsn}'`);
        if (hiscoreCache[asciiRsn] !== undefined) {
            const date: Date = new Date(hiscoreCache[asciiRsn].date);
            date.setMinutes(
                date.getMinutes() + 20
            );
            if (Utils.isInPast(date) || pullNew) {
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
                        Utils.logError(error);
                        Utils.logger.error(`Could not find rsn '${asciiRsn}'`);
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
