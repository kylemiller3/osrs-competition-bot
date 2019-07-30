// ------------------------------//
// OSRS discord bot by n0trout   //
// See LICENSE                   //
// ------------------------------//

import * as discord from 'discord.js'
import * as winston from 'winston'
import * as jsonfile from 'jsonfile'

import {
    fromEvent, from, Observable, of, forkJoin, merge,
} from 'rxjs'
import {
    publishReplay, refCount, take, skip, filter, switchMap, catchError, tap, map, retry, share,
} from 'rxjs/operators'
import {
    hiscores,
} from 'osrs-json-api'
import { EventEmitter } from 'events'
import auth from './auth.json'

/**
 * @description Error class extension for OS level system errors
 * @class
 */
class SystemError extends Error {
    errno: number
}

/**
    * @function
    * @description Checks the Guild configuration for any administrators
    * @param {Bot.Database} guildData Guild data to check
    * @returns {boolean} If the Guild has the administrator array set
    */
const hasAdmin = (guildData: Bot.Database): boolean => guildData.settings.admins.length > 0

/**
   * @function
   * @description Checks if the author of a discord message is on
   * the administrator list for that Guild
   * @param {discord.User} author The author of the message
   * @param {Bot.Database} guildData The Guild configuration of the message's
   * Guild from where it was received
   * @returns {boolean} True if the author is an administrator
   */
const isAdmin = (author: discord.User, guildData: Bot.Database):
boolean => guildData.settings.admins.includes(author.id)

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Bot {
    /**
    * @description Contract for describing access controls for each command
    * @interface
    */
    export interface AccessControl {
        controlFunction: (author: discord.User, guildData: Database) => boolean
        description: string
    }

    /**
    * @description Contract describing each possible command
    * @interface
    */
    export interface Command extends Record<string, unknown> {
        description: string
        accessControl: AccessControl
        parameters: string
        command: string
    }

    /**
    * @description Contract containing all known commands
    * @interface
    */
    export interface Commands extends Record<string, Command> {
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
    }

    /**
     * @description Contract containing mapped input data
     */
    export interface Input extends Record<string, unknown> {
        message: discord.Message
        author: discord.User
        guild: discord.Guild
        input: string
        guildData: Database
    }

    /**
    * @description Contract for each Guild's configuration
    * @interface
    */
    export interface Settings extends Record<string, unknown> {
        admins: string[]
        notificationChannelId: string
    }

    /**
    * @description Top level contract for each Guild's configuration
    * @interface
    */
    export interface Database extends Record<string, unknown> {
        settings: Settings
        events: Runescape.Event[]
    }

    /**
    * @description Implementation of Bot.AccessControl for unset
    * Guild configuration or admin users only access
    * @type {Bot.AccessControl}
    * @constant
    */
    export const ONLY_UNSET_ADMINS_OR_ADMIN: Bot.AccessControl = {
        controlFunction: (
            author: discord.User, guildData: Bot.Database
        ): boolean => !hasAdmin(guildData) || isAdmin(author, guildData),
        description: 'unset guild configuration or have admin privileges',
    }

    /**
    * @description Implementation of Bot.AccessControl for admin users only access
    * @type {Bot.AccessControl}
    * @constant
    */
    export const ONLY_ADMIN: Bot.AccessControl = {
        controlFunction: (
            author: discord.User, guildData: Bot.Database
        ): boolean => isAdmin(author, guildData),
        description: 'have admin privileges',
    }

    /**
    * @description Implementation of Bot.AccessControl for any user access
    * @type {Bot.AccessControl}
    * @constant
    */
    export const ANY_USER: Bot.AccessControl = {
        controlFunction: (): boolean => true,
        description: 'any user',
    }

    /**
     * @description Implementation of all recognized Bot.Commands
    * @constant
    * @type {Bot.Commands}
    * @default
    */
    export const COMMANDS: Bot.Commands = {
        DEBUG: {
            command: '!f debug',
            description: 'logs debug info to console',
            accessControl: ONLY_ADMIN,
            parameters: '',
        },

        ADD_ADMIN: {
            command: '!f add admin ',
            description: 'adds administration for this guild',
            accessControl: ONLY_UNSET_ADMINS_OR_ADMIN,
            parameters: '(mentions)',
        },

        ADD_UPCOMING: {
            command: '!f add event ',
            description: 'schedules a new event',
            accessControl: ONLY_ADMIN,
            parameters: '(name, starting, ending, type (competition (skills (list of skills) | bh (bounty hunter mode) | clues (clue difficulties)) | regular ))',
        },

        LIST_UPCOMING: {
            command: '!f events',
            description: 'lists scheduled events along and event number',
            accessControl: ANY_USER,
            parameters: '',
        },

        DELETE_UPCOMING: {
            command: '!f delete ',
            description: 'deletes an event by event number (use with \'!f events\')',
            accessControl: ONLY_ADMIN,
            parameters: '(event number)',
        },

        SIGNUP_UPCOMING: {
            command: '!f signup ',
            description: 'signs up for a scheduled event number with RuneScape name (use with \'!f events\')',
            accessControl: ANY_USER,
            parameters: '(RSN, event number)',
        },

        UNSIGNUP_UPCOMING: {
            command: '!f unsignup ',
            description: 'un-signs up for a scheduled event number (use with \'!f events\')',
            accessControl: ANY_USER,
            parameters: '(event number)',
        },

        AMISIGNEDUP_UPCOMING: {
            command: '!f amisignedup ',
            description: 'checks to see if you are signed up for a scheduled event number (use with \'!f events\')',
            accessControl: ANY_USER,
            parameters: '(event number)',
        },

        LIST_PARTICIPANTS_UPCOMING: {
            command: '!f list ',
            description: 'lists all participants in an event number (use with \'!f events\')',
            accessControl: ANY_USER,
            parameters: '(event number)',
        },

        HELP: {
            command: '!f help',
            description: 'prints this help',
            accessControl: ANY_USER,
            parameters: '',
        },

        SET_CHANNEL: {
            command: '!f set channel ',
            description: 'sets the channel for notifications - must be set or there will be no notifications',
            accessControl: ONLY_ADMIN,
            parameters: '(channel mention)',
        },
    }
}
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Runescape {
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

    /**
     * @description Contract containing information about Runescape event participants
     * @interface
     */
    export interface DiscordParticipant extends Record<string, unknown> {
        discordId: string
        runescapeAccounts: RegularAccountInfo[]
    }

    /**
     * @description Contract containing information about a Runescape account
     * @interface
     */
    export interface RegularAccountInfo extends Record<string, unknown> {
        rsn: string
    }

    /**
     * @description Contract extending information about a Runescape account for competitive events
     * @interface
     */
    export interface CompetitiveEventAccountInfo extends RegularAccountInfo {
        skills: SkillsEventParticipantComponent
        bh: BhEventParticipantComponent
        clues: CluesEventParticipantComponent
    }

    /**
     * @description Contract component containing the tracking information for skills
     * @interface
     */
    export interface SkillsEventParticipantComponent extends Record<string, hiscores.SkillsInfo> {
        starting: hiscores.SkillsInfo
        ending: hiscores.SkillsInfo
    }

    /**
     * @description Contract component containing the tracking information for bounty hunter
     * @interface
     */
    export interface BhEventParticipantComponent extends Record<string, hiscores.BountyHunterInfo> {
        starting: hiscores.BountyHunterInfo
        ending: hiscores.BountyHunterInfo
    }

    /**
     * @description Contract component containing the tracking information for clues
     * @interface
     */
    export interface CluesEventParticipantComponent extends Record<string, hiscores.CluesInfo> {
        starting: hiscores.CluesInfo
        ending: hiscores.CluesInfo
    }

    /**
     * @description Contract of all possible things to track
     * @interface
     * @default
     */
    export interface Tracking extends Record<string, unknown> {
        skills: SkillsEnum[]
        bh: BountyHunterEnum[]
        clues: CluesEnum[]
    }

    /**
     * @description Contract containing information about a Runescape event
     * @interface
     */
    export interface Event extends Record<string, unknown> {
        name: string
        startingDate: Date
        endingDate: Date
        type: string
        tracking: Tracking
        participants: DiscordParticipant[]
        hasNotifiedTwoHourWarning: boolean
        hasNotifiedStarted: boolean
        hasNotifiedEnded: boolean
    }
}


//-------------
// Global state
//
//-------------
const loadCache: Record<string, Observable<JSON>> = {}
const hiscoreCache: Record<string, Observable<hiscores.LookupResponse>> = {}
const timers: Record<string, NodeJS.Timeout[]> = {}

//---------------
// OSRS constants
//
//---------------

/**
 * @description List of all ClanEvent types
 * @constant
 * @type {Record<string, string>}
 * @todo Implement all the logic needed for XP events
 * @default
 */
const EVENT_TYPE: Record<string, string> = {
    COMPETITIVE: 'COMPETITIVE',
    REGULAR: 'REGULAR',
}

/**
 * @description Empty Bot.Database default
 * @constant
 * @type {Bot.Database}
 * @default
 */
const GUILD_DATA_DEFAULT: Bot.Database = {
    settings: {
        admins: [],
        notificationChannelId: undefined,
    },

    events: [],
}

/**
 * @description Instance of global winston logger
 * @type {winston.Logger}
 * @constant
 */
// create our winston logger
const logger: winston.Logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.json(),
        winston.format.colorize(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        })
    ),
    transports: [
        new winston.transports.File({
            filename: 'log',
        }),
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
})

/**
 * @function
 * @description Error logger helper function
 * @param {Error} error The error
 */
const logError = (error: Error): void => {
    logger.error('Unexpected error')
    logger.error(error.message)
}

/**
 * @description Global discord client
 * @type {discord.Client}
 * @constant
 */
const gClient: discord.Client = new discord.Client()

//----------------------
// Observables & helpers
//
//----------------------

/**
 * @function
 * @description Returns a new Record with an updated entry
 * @param {Record<string, T>} record The Record to edit
 * @param {T} entry The new entry
 * @returns {Record<string, T>} The new Record object
 */
const update = <T>(record: Record<string, T>, entry: T):
Record<string, T> => Object.assign({}, record, entry)

/**
 * @function
 * @description Checks to see if a Date is valid
 * @param {Date} date The date to check
 * @returns {boolean} Whether the date is valid
 */
const isValidDate = (date: Date): boolean => date instanceof Date && !Number.isNaN(date.getTime())

/**
 * @function
 * @description Loads the Guild configuration using cache or GUILD_DEFAULT_DATA if none
 * @param {string} id Guild id configuration to load
 * @param {boolean} dirty Loads configuration from disk if set
 * @returns {Observable<Bot.Database>} Observable of the load
 * @throws If the OS rejects our load
 */
const load$ = (id: string, dirty: boolean): Observable<Bot.Database> => {
    if (dirty) {
        loadCache[id] = from(jsonfile.readFile(`./guilds/${id}.json`, {
            // this is very fragile but works for our data structures
            reviver: ((key: string, value: unknown): unknown => {
                if (key.toLowerCase().includes('date')) { return new Date(value as string) }
                return value
            }),
        }))
            .pipe(
                catchError((error: SystemError): Observable<Bot.Database> => {
                    if (error.errno === -2) logger.info('Guild has no configuration')
                    else {
                        logError(error)
                        logger.error(`Error loading ${id} from disk`)
                        throw error
                    }
                    return of<Bot.Database>(GUILD_DATA_DEFAULT)
                }),
                publishReplay(1),
                refCount()
            )
    }

    const cached: Observable<Bot.Database> = loadCache[id] as unknown as Observable<Bot.Database>
    const keys = Object.keys(loadCache)
    if (keys.length >= 10) {
        const idxToRemove: number = Math.floor((Math.random() * 10))
        const keyToRemove: string = keys[idxToRemove]
        loadCache[keyToRemove] = undefined
        return cached
    }
    return cached
}

/**
 * @function
 * @description Saves the Guild configuration and then triggers a dirty load$
 * @param {string} id Guild id configuration to save
 * @param {Bot.Database} guildData The Bot.Database to save to disk
 * @returns {Observable<Bot.Database>} Observable of the load
 * @throws If the OS rejects our save
 */
const save$ = (id: string, guildData: Bot.Database):
Observable<Bot.Database> => of<Bot.Database>(null)
    .pipe(
        switchMap((): Observable<Bot.Database> => from(jsonfile.writeFile(`./guilds/${id}.json`, guildData))
            .pipe(
                switchMap((): Observable<Bot.Database> => load$(id, true))
            )),
        tap((): void => {
            logger.debug(`Wrote settings to ${id}`)
        }),
        catchError((error: SystemError): Observable<Bot.Database> => {
            logError(error)
            logger.error(`Error writing ${id} to disk`)
            throw error
        })
    )

/**
 * @function
 * @description Notifies the users of a Guild signed up for a specific event
 * @param {Runescape.Event} event The event to notify participants of
 * @param {discord.Guild} guild The guild to notify
 * @param {string} channelId The channel to send the notification
 * @param {string} message The message to send
 */
const notifyClanEvent = (
    clanEvent: Runescape.Event,
    guild: discord.Guild,
    channelId: string,
    message: string
): void => {
    const participants: string[] = clanEvent.participants.map(
        (participant: Runescape.DiscordParticipant): string => participant.discordId
    )
    const mentions: string = participants.map(
        (participant: string): string => `<@${participant}>`
    ).join(', ')
    const channel: discord.TextChannel = guild.channels.get(channelId) as discord.TextChannel
    if (channel === undefined || channel.type !== 'text') return
    logger.debug('Sending notification to Guild')
    channel.send(`event '${clanEvent.name}' ${message} ${mentions}`)
}

/**
 * @function
 * @description Adds a global ClanEvent 2 hour start warning timer
 * and notifies the Guild of the event on fire
 * @param clanEvent The ClanEvent to add timers for
 * @param guild The Guild to notify
 * @param guildData The Bot.Database to update on notification
 * @returns {NodeJS.Timeout} The global timer handle
 */
const setTimerTwoHoursBefore = (
    clanEvent: Runescape.Event,
    guild: discord.Guild,
    guildData: Bot.Database
): NodeJS.Timeout => {
    const now: Date = new Date()
    const twoHoursBeforeStart: Date = new Date(clanEvent.startingDate.getTime())
    twoHoursBeforeStart.setHours(twoHoursBeforeStart.getHours() - 2)
    // TODO:
    // broken code need to refresh
    return setTimeout((): void => {
        notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'will begin within 2 hours')
        // mark 2 hour warning as completed
        // const newEvent: Runescape.Event = update(clanEvent, {
        //     hasNotifiedTwoHourWarning: true,
        // }) as Runescape.Event
        // const newEvents: Runescape.Event[] = guildData.events.map((event: Runescape.Event):
        // Runescape.Event => {
        //     if (newEvent.uuid === event.uuid) {
        //         return newEvent
        //     }
        //     return event
        // })
        // const newData: Bot.Database = update(guildData, {
        //     events: newEvents,
        // }) as Bot.Database
        // save$(guild.id, newData).subscribe((): void => {})
    }, twoHoursBeforeStart.getTime() - now.getTime())
}

/**
 * @function
 * @description Adds a global ClanEvent start timer and notifies the Guild of the event on fire
 * @param clanEvent The ClanEvent to add timers for
 * @param guild The Guild to notify
 * @param guildData The Bot.Database to update on notification
 * @returns {NodeJS.Timeout} The global timer handle
 */
const setTimerStart = (clanEvent: Runescape.Event, guild: discord.Guild, guildData: Bot.Database):
NodeJS.Timeout => {
    const now: Date = new Date()
    // TODO:
    // broken code need to refresh
    return setTimeout((): void => {
        notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'has started')
        // mark start date as completed
        // const newEvent: Runescape.Event = update(clanEvent, {
        //     hasNotifiedStarted: true,
        // }) as Runescape.Event
        // const newEvents: Runescape.Event[] = guildData.events.map(
        //     (event: Runescape.Event): Runescape.Event => {
        //         if (newEvent.uuid === event.uuid) {
        //             return newEvent
        //         }
        //         return event
        //     }
        // )
        // const newData: Bot.Database = update(guildData, {
        //     events: newEvents,
        // }) as Bot.Database
        // save$(guild.id, newData).subscribe((): void => {})
    }, clanEvent.startingDate.getTime() - now.getTime())
}

/**
 * @function
 * @description Adds a global ClanEvent end timer and notifies the Guild of the event on fire
 * @param clanEvent The ClanEvent to add timers for
 * @param guild The Guild to notify
 * @param guildData The Bot.Database to update on notification
 * @returns {NodeJS.Timeout} The global timer handle
 */
function setTimerEnd(clanEvent: Runescape.Event, guild: discord.Guild, guildData: Bot.Database):
NodeJS.Timeout {
    const now: Date = new Date()
    // TODO:
    // broken code need to refresh
    return setTimeout((): void => {
        notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'has ended')
        // mark end date as completed
        // const newEvent: Runescape.Event = update(clanEvent, {
        //     hasNotifiedEnded: true,
        // }) as Runescape.Event
        // const newEvents: Runescape.Event[] = guildData.events.map(
        //     (event: Runescape.Event): Runescape.Event => {
        //         if (newEvent.uuid === event.uuid) {
        //             return newEvent
        //         }
        //         return event
        //     }
        // )
        // const newData: Bot.Database = update(guildData, {
        //     events: newEvents,
        // }) as Bot.Database
        // save$(guild.id, newData).subscribe((): void => {})
    }, clanEvent.endingDate.getTime() - now.getTime())
}

/**
 * @description Observable of discord ready events
 * @type {Observable<void>}
 * @constant
 */
const ready$: Observable<void> = fromEvent(gClient as unknown as EventEmitter, 'ready')

/**
 * @description Observable of ready events other than the first
 * @type {Observable<void>}
 * @todo Find out why skip does not work and fix it
 * @constant
 */
const reconnect$: Observable<void> = ready$
    .pipe(
        skip(1)
    )

/**
 * @description Observable of the ready event that prints debug information
 * @type {Observable<void>}
 * @constant
 */
const connect$: Observable<void> = ready$
    .pipe(
        take(1)
    )

/**
 * @description Observable of discord error events
 * @type {Observable<Error>}
 * @constant
 */
const error$: Observable<Error> = fromEvent(gClient as unknown as EventEmitter, 'error')


/**
 * @description Observable of discord message events
 * @type {Observable<discord.Message>}
 * @constant
 */
const message$: Observable<discord.Message> = fromEvent(gClient as unknown as EventEmitter, 'message')

/**
 * @function
 * @description Fetches the supplied RSN from hiscores or cache
 * @param {string} rsn RSN to lookup
 * @returns {Observable<JSON>} Observable of the JSON response or Observable of null
 * @todo handle the error properly
 */
const hiscores$ = (rsn: string): Observable<hiscores.LookupResponse> => {
    if (hiscoreCache[rsn] === undefined) {
        hiscoreCache[rsn] = from(hiscores.getPlayer(rsn))
            .pipe(
                retry(5),
                publishReplay(1, 10 * 60 * 1000),
                refCount(), catchError((error: Error): Observable<JSON> => {
                    logError(error)
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

/**
 * @function
 * @description A new Observable of messages containing find
 * @param {string} find The excitation string
 * @returns {Observable<Bot.Input>} Observable of the transformed Bot.Input object
 */
const filteredMessage$ = (botCommand: Bot.Command): Observable<Bot.Input> => message$
    .pipe(
        // filter our messages with find
        // and necessary discord checks
        filter((msg: discord.Message): boolean => msg.guild
            && msg.guild.available
            && msg.content.toLowerCase().startsWith(botCommand.command)),

        // create new observable stream
        // containing the original message
        // the command and the Guild json
        // for error handling of load
        switchMap((msg: discord.Message): Observable<Bot.Input> => of<discord.Message>(msg)
            .pipe(
                switchMap((): Observable<Bot.Input> => forkJoin(
                    {
                        message: of<discord.Message>(msg),
                        author: of<discord.User>(msg.author),
                        guild: of<discord.Guild>(msg.guild),
                        input: of<string>(msg.content.slice(botCommand.command.length)),
                        guildData: load$(msg.guild.id, false),
                    }
                ))
                // catchError((error: Error): Observable<Bot.Input> => {
                //     logError(error)
                //     return forkJoin(
                //         {
                //             message: of<discord.Message>(msg),
                //             author: of<discord.User>(msg.author),
                //             guild: of<discord.Guild>(msg.guild),
                //             input: of<string>(msg.content.slice(find.length)),
                //             guildData: of<Bot.Database>(GUILD_DATA_DEFAULT)
                //         }
                //     )
                // })
            )),
        tap((command: Bot.Input): void => {
            logger.debug(`message: ${command.message.content}`)
            logger.debug(`author: ${command.author.username}`)
            logger.debug(`guild: ${command.guild.name}`)
            logger.debug(`input: ${command.input}`)
            logger.silly(`guildData: ${(JSON.stringify(command.guildData))}`)
        }),
        filter((command: Bot.Input): boolean => botCommand.accessControl.controlFunction(
            command.author, command.guildData
        ))
    )

/**
 * @description An Observable that handles the DEBUG command
 * @type {Observable<Bot.Input>}
 * @constant
 */
const debug$: Observable<Bot.Input> = filteredMessage$(Bot.COMMANDS.DEBUG)

/**
 * @description An Observable that handles the ADD_ADMIN command
 * @type {Observable<any>}
 * @constant
 */
const addAdmin$: Observable<[Bot.Database, discord.Message]> = filteredMessage$(
    Bot.COMMANDS.ADD_ADMIN
)
    .pipe(
        filter((command: Bot.Input):
        boolean => command.message.mentions.members.array().length > 0),
        switchMap((command: Bot.Input): Observable<[Bot.Database, discord.Message]> => {
            const mentions: string[] = command.message.mentions.members.array()
                .map((member: discord.GuildMember): string => member.id)
            const newSettings: Bot.Settings = update(command.guildData.settings, {
                admins: Array.from(new Set(command.guildData.settings.admins.concat(mentions))),
            }) as Bot.Settings
            const newData: Bot.Database = update(command.guildData, {
                settings: newSettings,
            }) as Bot.Database
            return forkJoin(
                save$(command.guild.id, newData),
                of(command.message)
            )
        })
    )


/**
 * @function
 * @description Finds the first string that matches the RegExps
 * @param {RegExp[]} regexes The array of Regexes
 * @param {string} search The input string to search for
 * @returns {string[]} The array of matched strings
 */
const findFirstRegexesMatch = (regexes: RegExp[], search: string): string[] => {
    const foundRegexes: string[][] = regexes.map(
        (regex: RegExp): string[] => regex.exec(search)
    )
    const parsed: string[] = foundRegexes.map(
        (results: string[]): string => (results !== null ? results[1].trim() : null)
    )
    const nonEmpty: string[] = parsed.map(
        (str: string): string => (str !== null && str.length > 0 ? str : null)
    )
    return nonEmpty
}

/**
 * @description Ending regex terminators for command ADD_EVENT
 * @type {string}
 * @constant
 */
const EVENT_TERM_REGEX = 'type|skills|starting|ending|name|bh|clues|$'

/**
 * @function
 * @description Compound regex creator
 * @param {string} term The string insert into RegExp string
 * @returns {string} The compound RegExp string
 */
const commandRegex = (term: string): string => `(?:\\s|)+(.*?)(?:\\s|)+(?:${term})`

/**
 * @description An Observable that handles the ADD_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const prepareUpcomingGenericEvent$: Observable<[Bot.Input, Runescape.Event]> = filteredMessage$(
    Bot.COMMANDS.ADD_UPCOMING
)
    .pipe(
        // we need at least a name, starting date and end date, and type
        map((command: Bot.Input): [Bot.Input, Runescape.Event] => {
            // let's only allow 10 events per Guild
            if (command.guildData.events.length >= 10) {
                logger.debug(`Guild ${command.guild.name} added too many events`)
                command.message.reply('this guild has too many events scheduled')
                return null
            }

            const compoundRegex: string = commandRegex(EVENT_TERM_REGEX)
            const regexes: RegExp[] = [
                new RegExp(`name${compoundRegex}`, 'gim'),
                new RegExp(`starting${compoundRegex}`, 'gim'),
                new RegExp(`ending${compoundRegex}`, 'gim'),
                new RegExp(`type${compoundRegex}`, 'gim'),
            ]
            const parsedRegexes = findFirstRegexesMatch(regexes, command.input)
            // require all inputs to be valid
            if (parsedRegexes[0] === null) {
                logger.debug(`Admin ${command.author.username} entered invalid event name`)
                command.message.reply(`invalid event name\n${Bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            if (parsedRegexes[1] === null) {
                logger.debug(`Admin ${command.author.username} entered invalid starting date`)
                command.message.reply(`invalid starting date\n${Bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            if (parsedRegexes[2] === null) {
                logger.debug(`Admin ${command.author.username} entered invalid ending date`)
                command.message.reply(`invalid ending date\n${Bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            if (parsedRegexes[3] === null) {
                logger.debug(`Admin ${command.author.username} entered invalid type`)
                command.message.reply(`invalid type\n${Bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            const dateA: Date = new Date(parsedRegexes[1])
            const dateB: Date = new Date(parsedRegexes[2])
            const startingDate: Date = dateA <= dateB ? dateA : dateB
            const endingDate: Date = dateA > dateB ? dateA : dateB

            const inputType: string = parsedRegexes[3].toUpperCase()
            if (EVENT_TYPE[inputType] === undefined) {
                logger.debug(`Admin ${command.author.username} entered invalid event type`)
                command.message.reply(`invalid event type\n${Bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }
            const tracking: Runescape.Tracking = {
                skills: null,
                bh: null,
                clues: null,
            }
            const type = EVENT_TYPE[inputType]
            const clanEvent: Runescape.Event = {
                name: parsedRegexes[0],
                startingDate,
                endingDate,
                type,
                tracking,
                participants: [],
                hasNotifiedTwoHourWarning: false,
                hasNotifiedStarted: false,
                hasNotifiedEnded: false,
            }
            if (!isValidDate(dateA) || !isValidDate(dateB)) {
                logger.debug(`Admin ${command.author.username} entered invalid date`)
                command.message.reply('starting date or ending date is invalid use IS0 8601 standard')
                return null
            }
            const now: Date = new Date()
            if (startingDate <= now) {
                logger.debug(`Admin ${command.author.username} entered a start date in the past`)
                command.message.reply('cannot start an event in the past')
                return null
            }
            const threeWeeksFromNow: Date = new Date()
            threeWeeksFromNow.setDate(threeWeeksFromNow.getDate() + 21)
            if (endingDate > threeWeeksFromNow) {
                logger.debug(`Admin ${command.author.username} entered a end date too far in the future`)
                command.message.reply('event must end within 3 weeks of now')
                return null
            }
            if (endingDate.getTime() - startingDate.getTime() < 30 * 60 * 1000) {
                logger.debug(`Admin ${command.author.username} entered a start date and end date too close together`)
                command.message.reply('events must be at least 30 minutes long')
                return null
            }
            return [command, clanEvent]
        }),
        filter((commandEventArr: [Bot.Input, Runescape.Event]):
        boolean => commandEventArr !== null),
        tap((commandEventArr: [Bot.Input, Runescape.Event]): void => {
            logger.debug(`Admin ${commandEventArr[0].author.username} called add event`)
            logger.debug('Runescape.Event properties: ')
            logger.debug(`* ${commandEventArr[1].name}`)
            logger.debug(`* ${commandEventArr[1].startingDate.toDateString()}`)
            logger.debug(`* ${commandEventArr[1].endingDate.toDateString()}`)
            logger.debug(`* ${commandEventArr[1].type}`)
        }),
        share()
    )

/**
 * @description An Observable that handles the ADD_UPCOMING command for REGULAR events
 * @type {Observable<any>}
 * @constant
 */
const filterUpcomingGenericEvent$:
Observable<[Bot.Input, Runescape.Event]> = prepareUpcomingGenericEvent$
    .pipe(
        filter((commandEventArr: [Bot.Input, Runescape.Event]): boolean => {
            const clanEvent: Runescape.Event = commandEventArr[1]
            return clanEvent.type === EVENT_TYPE.REGULAR
        }),
    )

/**
 * @description An Observable that handles the ADD_UPCOMING command for competitive events
 * @type {Observable<any>}
 * @constant
 */
const filterAndPrepareUpcomingCompetitiveEvent$:
Observable<[Bot.Input, Runescape.Event]> = prepareUpcomingGenericEvent$
    .pipe(
        filter((commandEventArr: [Bot.Input, Runescape.Event]): boolean => {
            const clanEvent: Runescape.Event = commandEventArr[1]
            return clanEvent.type === EVENT_TYPE.COMPETITIVE
        }),
        map((commandEventArr: [Bot.Input, Runescape.Event]): [Bot.Input, Runescape.Event] => {
            const inputCommand: Bot.Input = commandEventArr[0]
            const clanEvent: Runescape.Event = commandEventArr[1]
            const compoundRegex: string = commandRegex(EVENT_TERM_REGEX)
            const competitiveRegex = [
                new RegExp(`skills${compoundRegex}`, 'gim'),
                new RegExp(`bh${compoundRegex}`, 'gim'),
                new RegExp(`clues${compoundRegex}`, 'gim'),
            ]
            const parsedRegex = findFirstRegexesMatch(competitiveRegex, inputCommand.input)
            if (parsedRegex.length === 0) {
                logger.debug(`Admin ${inputCommand.author.id} did not specify what to track`)
                inputCommand.message.reply(`no skills specified\n${Bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            const processedRegex: string[][] = parsedRegex.map(
                (regexToProcess: string): string[] => {
                    if (regexToProcess === null) return null
                    const split = regexToProcess.split(' ')
                    const trimmed = split.map(
                        (strToTrim: string): string => strToTrim.trim()
                    )
                    const filtered = trimmed.filter(
                        (strToCheck: string): boolean => strToCheck.length > 0
                    )
                    return filtered
                }
            )
            const setRegex: string[][] = processedRegex.map(
                (regex: string[]): string[] => Array.from(
                    new Set(regex)
                )
            )
            const allKeys: string[][] = [
                Object.keys(Runescape.SkillsEnum),
                Object.keys(Runescape.BountyHunterEnum),
                Object.keys(Runescape.CluesEnum),
            ]

            const allValues: string[][] = [
                allKeys[0].map(
                    (key: string): Runescape.SkillsEnum => Runescape.SkillsEnum[key]
                ),
                allKeys[1].map(
                    (key: string): Runescape.BountyHunterEnum => Runescape.BountyHunterEnum[key]
                ),
                allKeys[2].map(
                    (key: string): Runescape.CluesEnum => Runescape.CluesEnum[key]
                ),
            ]
            // Skills
            if (processedRegex[0] !== null) {
                const skillsArr:
                Runescape.SkillsEnum[] = processedRegex[0] as Runescape.SkillsEnum[]
                const filteredSkills: Runescape.SkillsEnum[] = skillsArr.filter(
                    (skill: Runescape.SkillsEnum): boolean => allValues[0].includes(skill)
                )
                if (skillsArr.length !== filteredSkills.length) {
                    logger.debug(`Admin ${inputCommand.author.id} entered some invalid skill names`)
                    inputCommand.message.reply(`some skill names entered are invalid\nchoices are: ${allValues[0].toString()}`)
                    return null
                }
                const newTracking: Runescape.Tracking = update(clanEvent.tracking, {
                    skills: setRegex[0],
                }) as Runescape.Tracking
                const xpEvent: Runescape.Event = update(clanEvent, {
                    tracking: newTracking,
                }) as Runescape.Event
                return [inputCommand, xpEvent]
            }
            // Bounty hunter
            if (processedRegex[1] !== null) {
                const bhArr:
                Runescape.BountyHunterEnum[] = processedRegex[1] as Runescape.BountyHunterEnum[]
                const filteredBh: Runescape.BountyHunterEnum[] = bhArr.filter(
                    (bh: Runescape.BountyHunterEnum): boolean => allValues[1].includes(bh)
                )
                if (bhArr.length !== filteredBh.length) {
                    logger.debug(`Admin ${inputCommand.author.id} entered some invalid bounty hunter names`)
                    inputCommand.message.reply(`some bounty hunter settings entered are invalid\nchoices are: ${allValues[1].toString()}`)
                    return null
                }
                const newTracking: Runescape.Tracking = update(clanEvent.tracking, {
                    bh: setRegex[1],
                }) as Runescape.Tracking
                const bhEvent: Runescape.Event = update(clanEvent, {
                    tracking: newTracking,
                }) as Runescape.Event
                return [inputCommand, bhEvent]
            }
            // Clues
            if (processedRegex[2] !== null) {
                const clueArr:
                Runescape.CluesEnum[] = processedRegex[2] as Runescape.CluesEnum[]
                const filteredClues: Runescape.CluesEnum[] = clueArr.filter(
                    (clue: Runescape.CluesEnum): boolean => allValues[2].includes(clue)
                )
                if (clueArr.length !== filteredClues.length) {
                    logger.debug(`Admin ${inputCommand.author.id} entered some invalid clue names`)
                    inputCommand.message.reply(`some clue settings entered are invalid\nchoices are: ${allValues[2].toString()}`)
                    return null
                }
                const clues: string[] = setRegex[2].includes(Runescape.CluesEnum.ALL)
                || (
                    setRegex[2].includes(Runescape.CluesEnum.BEGINNER)
                    && setRegex[2].includes(Runescape.CluesEnum.EASY)
                    && setRegex[2].includes(Runescape.CluesEnum.MEDIUM)
                    && setRegex[2].includes(Runescape.CluesEnum.HARD)
                    && setRegex[2].includes(Runescape.CluesEnum.ELITE)
                    && setRegex[2].includes(Runescape.CluesEnum.MASTER)
                )
                    ? [Runescape.CluesEnum.ALL] : setRegex[2]
                const newTracking: Runescape.Tracking = update(clanEvent.tracking, {
                    clues,
                }) as Runescape.Tracking
                const clueEvent: Runescape.Event = update(clanEvent, {
                    tracking: newTracking,
                }) as Runescape.Event
                return [inputCommand, clueEvent]
            }

            logger.debug(`Admin ${inputCommand.author.id} entered invalid competition data`)
            inputCommand.message.reply(`some competition settings entered are invalid\n${Bot.COMMANDS.ADD_UPCOMING.parameters}`)
            return null
        }),
        filter((commandEventArr: [Bot.Input, Runescape.Event]): boolean => commandEventArr !== null)
    )

// observe event creation and set timers

/**
 * @function
 * @description Gets all scheduled events
 * @param {Runescape.Event[]} events ClanEvents source
 * @returns {Runescape.Event[]} The array of upcoming ClanEvents
 */
const getUpcomingEvents = (events: Runescape.Event[]): Runescape.Event[] => events.filter(
    (event: Runescape.Event): boolean => event.startingDate > new Date()
)

/**
 * @function
 * @description Gets currently running events
 * @param {Bot.Database} guildData The Bot.Database to check
 * @returns {Runescape.Event[]} The array of ongoing ClanEvents for Guild id
 */

const getInFlightEvents = (clanEvents: Runescape.Event[]): Runescape.Event[] => clanEvents.filter(
    (event: Runescape.Event): boolean => {
        const now: Date = new Date()
        return event.startingDate <= now && event.endingDate > now
    }
)

/**
 * @function
 * @description Get all completed events
 * @param {Runescape.Event[]} events ClanEvents source
 * @returns {Runescape.Event[]} The array of ended ClanEvents for Guild id
 */
const getEndedEvents = (clanEvents: Runescape.Event[]): Runescape.Event[] => clanEvents.filter(
    (event: Runescape.Event): boolean => {
        const now: Date = new Date()
        return event.endingDate <= now
    }
)

const saveEvent$ = merge(filterUpcomingGenericEvent$, filterAndPrepareUpcomingCompetitiveEvent$)
    .pipe(
        switchMap((commandEventArr: [Bot.Input, Runescape.Event]):
        Observable<[Bot.Input, Runescape.Event, number, Bot.Database]> => {
            const inputCommand: Bot.Input = commandEventArr[0]
            const clanEvent: Runescape.Event = commandEventArr[1]
            const events: Runescape.Event[] = inputCommand.guildData.events.concat(clanEvent)
            const upcoming: Runescape.Event[] = getUpcomingEvents(events)
            // const sortedEvents: ClanEvent[] = stableSort(
            //     events, (eventA: ClanEvent, eventB: ClanEvent):
            //     number => eventA.startingDate.getTime() - eventB.startingDate.getTime()
            // ) as ClanEvent[]
            const newGuildData: Bot.Database = update(commandEventArr[0].guildData, {
                events,
            }) as Bot.Database
            return forkJoin(
                of<Bot.Input>(inputCommand),
                of<Runescape.Event>(clanEvent),
                of<number>(upcoming.length - 1),
                save$(commandEventArr[0].guild.id, newGuildData)
            )
        }),
        filter((saveArr: [Bot.Input, Runescape.Event, number, Bot.Database]):
        boolean => saveArr !== null)
    )

/**
 * @description An Observable that handles the LIST_UPCOMING command
 * @type {Observable<void>}
 * @constant
 */
const listUpcomingEvent$: Observable<void> = filteredMessage$(Bot.COMMANDS.LIST_UPCOMING)
    .pipe(
        map((command: Bot.Input): void => {
            const upcomingEvents: Runescape.Event[] = getUpcomingEvents(command.guildData.events)
            const eventsStr = upcomingEvents.map(
                (event: Runescape.Event, idx: number): string => {
                    const { name } = event
                    const startingDateStr = event.startingDate.toString()
                    const endingDateStr = event.endingDate.toString()
                    const { type } = event
                    const retStr = `\n${idx}: ${name} starting: ${startingDateStr} ending: ${endingDateStr} type: ${type}`
                    if (event.tracking.skills !== null) {
                        return retStr.concat(` skills: ${event.tracking.skills.toString()}`)
                    }
                    if (event.tracking.bh !== null) {
                        return retStr.concat(` bh: ${event.tracking.bh.toString()}`)
                    }
                    if (event.tracking.clues !== null) {
                        return retStr.concat(` clues: ${event.tracking.clues.toString()}`)
                    }
                    return retStr
                }
            )
            const reply: string = upcomingEvents.length > 0
                ? `upcoming events: ${eventsStr}`
                : 'no upcoming events'
            command.message.reply(reply)
        })
    )

/**
 * @description An Observable that handles the DELETE_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const deleteUpcomingEvent$:
Observable<[Bot.Database, discord.Message, Runescape.Event]> = filteredMessage$(
    Bot.COMMANDS.DELETE_UPCOMING
)
    .pipe(
        switchMap((command: Bot.Input):
        Observable<[Bot.Database, discord.Message, Runescape.Event]> => {
            const upcomingEvents: Runescape.Event[] = getUpcomingEvents(command.guildData.events)
            const idxToRemove: number = parseInt(command.input, 10)
            const removedEvent: Runescape.Event = upcomingEvents[idxToRemove]
            const filteredEvents: Runescape.Event[] = upcomingEvents.filter(
                (event: Runescape.Event, idx: number): boolean => idx !== idxToRemove
            )
            if (Number.isNaN(idxToRemove) || filteredEvents.length === upcomingEvents.length) {
                logger.debug(`Admin did not specify index (${idxToRemove})`)
                command.message.reply(`invalid index ${idxToRemove}\n${Bot.COMMANDS.DELETE_UPCOMING.parameters}`)
                return of<[Bot.Database, discord.Message, Runescape.Event]>(null)
            }
            const newGuildData: Bot.Database = update(command.guildData, {
                events: filteredEvents,
            }) as Bot.Database
            return forkJoin(
                save$(command.guild.id, newGuildData),
                of<discord.Message>(command.message),
                of<Runescape.Event>(removedEvent)
            )
        }),
        filter((saveMsgArr: [Bot.Database, discord.Message, Runescape.Event]):
        boolean => saveMsgArr !== null)
    )


/**
 * @function
 * @description Converts a users Discord Id to Guild nickname
 * @param {discord.Guild} guild  The guild to use for user's nickname
 * @param {string} userId The Discord Id to lookup
 * @returns {string} The user's Guild nickname
 */
const userIdToDisplayName = (guild: discord.Guild, userId: string): string => {
    if (!guild.available) return 'unknown (guild unavailable)'
    const members: discord.Collection<string, discord.GuildMember> = guild.members.filter(
        (member: discord.GuildMember): boolean => member.id === userId
    )
    const name: string = members.size > 0 ? members.first().displayName : null
    return name
}

/**
 * @description Ending regex terminator for command SIGNUP_UPCOMING
 * @type {string}
 * @constant
 */
const signupTermRegex = 'rsn|$'

/**
 * @description An Observable that handles the SIGNUP_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const signupEvent$: Observable<[Bot.Database, discord.Message]> = filteredMessage$(
    Bot.COMMANDS.SIGNUP_UPCOMING
)
    .pipe(
        switchMap((command: Bot.Input):
        Observable<[Bot.Database, discord.Message, hiscores.LookupResponse]> => {
            const compoundRegex: string = commandRegex(signupTermRegex)
            const skillsRegex = [
                new RegExp(`${compoundRegex}`, 'gim'),
                new RegExp(`rsn${compoundRegex}`, 'gim'),
            ]
            const parsedRegex = findFirstRegexesMatch(skillsRegex, command.input)
            if (parsedRegex.length !== skillsRegex.length) {
                logger.debug(`${command.author.id} entered invalid signup data`)
                command.message.reply(`invalid input\n${Bot.COMMANDS.SIGNUP_UPCOMING.parameters}`)
                return of<[Bot.Database, discord.Message, hiscores.LookupResponse]>(null)
            }

            // get upcoming events
            // if index is out of range return
            const upcomingEvents: Runescape.Event[] = getUpcomingEvents(command.guildData.events)
            const idxToModify: number = Number.parseInt(parsedRegex[0], 10)
            const userIdToAdd: string = command.author.id
            const rsnToAdd: string = parsedRegex[1]
            if (Number.isNaN(idxToModify) || idxToModify >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToModify})`)
                command.message.reply(`invalid index ${idxToModify}\n${Bot.COMMANDS.SIGNUP_UPCOMING.parameters}`)
                return of<[Bot.Database, discord.Message, hiscores.LookupResponse]>(null)
            }

            // get event to modify and its type
            const eventToModify: Runescape.Event = upcomingEvents[idxToModify]

            // is the player already added?
            const foundDiscordArr:
            Runescape.DiscordParticipant[] = eventToModify.participants.filter(
                (participant: Runescape.DiscordParticipant):
                boolean => participant.discordId === userIdToAdd
            )
            const firstFoundDiscord: Runescape.DiscordParticipant = foundDiscordArr.length > 0
                ? foundDiscordArr[0] : null

            const foundRsnArr: Runescape.RegularAccountInfo[] = eventToModify.participants.map(
                (participant: Runescape.DiscordParticipant):
                Runescape.RegularAccountInfo[] => participant.runescapeAccounts
            ).reduce(
                (acc: Runescape.RegularAccountInfo[], x: Runescape.RegularAccountInfo[]):
                Runescape.RegularAccountInfo[] => acc.concat(x, []),
                []
            ).filter(
                (account: Runescape.RegularAccountInfo): boolean => account.rsn === rsnToAdd
            )
            const firstFoundRsn: Runescape.RegularAccountInfo = foundRsnArr.length > 0
                ? foundRsnArr[0] : null

            if (firstFoundDiscord !== null) {
                // discord id is already signed up
                // in the future we may use this index
                // to add rsn but for now just return
                logger.debug(`<@${firstFoundDiscord.discordId}> already signed up`)
                const accounts: string = firstFoundDiscord.runescapeAccounts.map(
                    (account: Runescape.RegularAccountInfo): string => account.rsn
                ).join(', ')
                command.message.reply(`<@${firstFoundDiscord.discordId}> already signed up ${accounts} re-signup to change this`)
                return of(null)
            }
            if (firstFoundRsn !== null) {
                // someone already signed up rsn
                // find that discord user
                const foundDiscordRsn:
                Runescape.DiscordParticipant[] = eventToModify.participants.filter(
                    (participant: Runescape.DiscordParticipant):
                    boolean => participant.runescapeAccounts.includes(firstFoundRsn)
                )
                const accounts: string = firstFoundDiscord.runescapeAccounts.map(
                    (account: Runescape.RegularAccountInfo): string => account.rsn
                ).join(', ')
                logger.debug(`<@${firstFoundDiscord.discordId}> already signed up`)
                command.message.reply(`<@${foundDiscordRsn[0].discordId}> already signed up ${accounts} re-signup or ask an admin to delete this`)
                return of(null)
            }

            const newRsAccount: Runescape.RegularAccountInfo = {
                rsn: rsnToAdd,
            }

            const participantToAdd: Runescape.DiscordParticipant = {
                discordId: command.author.id,
                runescapeAccounts: [newRsAccount],
            }

            // add participant to event array
            const newEventParticipants: Runescape.DiscordParticipant[] = eventToModify
                .participants.concat(
                    [participantToAdd]
                )

            // create a new event
            // create new event list
            // create new Guild data
            const newEvent: Runescape.Event = update(eventToModify, {
                participants: newEventParticipants,
            }) as Runescape.Event
            const idxToModifyAllEvents: number = command.guildData.events.indexOf(eventToModify)
            const newEvents: Runescape.Event[] = command.guildData.events.map(
                (event: Runescape.Event, idx: number): Runescape.Event => {
                    if (idx === idxToModifyAllEvents) {
                        return newEvent
                    }
                    return event
                }
            )
            const newData: Bot.Database = update(command.guildData, {
                events: newEvents,
            }) as Bot.Database

            return forkJoin(
                of<Bot.Database>(newData),
                of<discord.Message>(command.message),
                hiscores$(rsnToAdd)
            )
        }),
        filter((dataMsgHiArr: [Bot.Database, discord.Message, hiscores.LookupResponse]):
        boolean => dataMsgHiArr !== null),
        switchMap((dataMsgHiArr: [Bot.Database, discord.Message, hiscores.LookupResponse]):
        Observable<[Bot.Database, discord.Message]> => {
            if (dataMsgHiArr[2] === null) {
                logger.debug('User entered invalid RSN')
                dataMsgHiArr[1].reply('cannot find RSN on hiscores')
                return of<[Bot.Database, discord.Message]>(null)
            }
            return forkJoin(
                save$(dataMsgHiArr[1].guild.id, dataMsgHiArr[0]),
                of<discord.Message>(dataMsgHiArr[1])
            )
        }),
        filter((saveMsgArr: [Bot.Database, discord.Message]): boolean => saveMsgArr !== null)
    )

/**
 * @description An Observable that handles the UNSIGNUP_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const unsignupUpcomingEvent$: Observable<[Bot.Database, discord.Message]> = filteredMessage$(
    Bot.COMMANDS.UNSIGNUP_UPCOMING
)
    .pipe(
        switchMap((command: Bot.Input): Observable<[Bot.Database, discord.Message]> => {
            // get upcoming events
            // if index is out of range return
            const upcomingEvents: Runescape.Event[] = getUpcomingEvents(command.guildData.events)
            const idxToModify: number = Number.parseInt(command.input, 10)
            if (Number.isNaN(idxToModify) || idxToModify >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToModify})`)
                command.message.reply(`invalid index ${idxToModify}\n${Bot.COMMANDS.UNSIGNUP_UPCOMING.parameters}`)
                return of<[Bot.Database, discord.Message]>(null)
            }

            // does the event to modify contain our user?
            const eventToModify: Runescape.Event = upcomingEvents[idxToModify]
            const participantCount: number = eventToModify.participants.length
            const newEventParticipants:
            Runescape.DiscordParticipant[] = eventToModify.participants.filter(
                (participant: Runescape.DiscordParticipant):
                boolean => participant.discordId !== command.author.id
            )

            // user was not signed up
            if (participantCount === newEventParticipants.length) {
                logger.debug('User was not signed up')
                command.message.reply('you were not signed up for this event')
                return of<[Bot.Database, discord.Message]>(null)
            }

            // create a new event
            // create new event list
            // create new Guild data
            const newEvent: Runescape.Event = update(eventToModify, {
                participants: newEventParticipants,
            }) as Runescape.Event
            const newEvents: Runescape.Event[] = command.guildData.events.map(
                (event: Runescape.Event, idx: number): Runescape.Event => {
                    if (idx === idxToModify) {
                        return newEvent
                    }
                    return event
                }
            )
            const newData: Bot.Database = update(command.guildData, {
                events: newEvents,
            }) as Bot.Database

            return forkJoin(
                save$(command.guild.id, newData),
                of<discord.Message>(command.message)
            )
        }),
        filter((saveMsgArr: [Bot.Database, discord.Message]): boolean => saveMsgArr !== null)
    )

/**
 * @description An Observable that handles the AMISIGNEDUP_UPCOMING command
 * @type {Observable<void>}
 * @constant
 */
const amISignedUp$: Observable<void> = filteredMessage$(Bot.COMMANDS.AMISIGNEDUP_UPCOMING)
    .pipe(
        map((command: Bot.Input): void => {
            const upcomingEvents: Runescape.Event[] = getUpcomingEvents(command.guildData.events)
            const idxToCheck: number = Number.parseInt(command.input, 10)
            if (Number.isNaN(idxToCheck) || idxToCheck >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToCheck})`)
                command.message.reply(`invalid index ${idxToCheck}\n${Bot.COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`)
                return
            }

            // does the event to modify contain our user?
            const eventToCheck: Runescape.Event = upcomingEvents[idxToCheck]
            const filteredEventParticipants: Runescape.DiscordParticipant[] = eventToCheck
                .participants.filter(
                    (participant: Runescape.DiscordParticipant):
                    boolean => participant.discordId === command.author.id
                )

            const filteredParticipant:
            Runescape.DiscordParticipant = filteredEventParticipants.length > 0
                ? filteredEventParticipants[0] : null
            const reply: string = filteredParticipant !== null
                ? `you are signed up with RSN: ${filteredParticipant.rsn}`
                : 'you are not signed up'
            command.message.reply(reply)
        })
    )

/**
 * @description An Observable that handles the LIST_PARTICIPANTS_UPCOMING command
 * @type {Observable<void>}
 * @constant
 */
const listParticipant$: Observable<void> = filteredMessage$(
    Bot.COMMANDS.LIST_PARTICIPANTS_UPCOMING
)
    .pipe(
        map((command: Bot.Input): void => {
            const upcomingEvents: Runescape.Event[] = getUpcomingEvents(command.guildData.events)
            const idxToCheck: number = Number.parseInt(command.input, 10)
            if (Number.isNaN(idxToCheck) || idxToCheck >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToCheck})`)
                command.message.reply(`invalid index ${idxToCheck}\n${Bot.COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`)
                return
            }

            const eventToList: Runescape.Event = upcomingEvents[idxToCheck]
            const formattedStr: string = eventToList.participants.map(
                (participant: Runescape.DiscordParticipant, idx: number): string => {
                    const displayName: string = userIdToDisplayName(
                        command.guild,
                        participant.discordId
                    )
                    const accounts: string = participant.runescapeAccounts.map(
                        (account: Runescape.RegularAccountInfo): string => account.rsn
                    ).join(', ')
                    return `\n${idx}: ${displayName} signed up ${accounts}`
                }
            ).join('')

            const reply: string = eventToList.participants.length > 0
                ? `participants:${formattedStr}`
                : 'no participants'
            command.message.reply(reply)
        })
    )

/**
 * @description An Observable that handles the HELP command
 * @type {Observable<void>}
 * @constant
 */
const help$: Observable<void> = filteredMessage$(Bot.COMMANDS.HELP)
    .pipe(
        map((command: Bot.Input): void => {
            const keys: string[] = Object.keys(Bot.COMMANDS).filter(
                (key: string): boolean => {
                    const admin: boolean = isAdmin(command.author, command.guildData)
                    const botCommand: Bot.Command = Bot.COMMANDS[key]
                    return (admin && (botCommand.accessControl === Bot.ONLY_ADMIN
                        || botCommand.accessControl === Bot.ONLY_UNSET_ADMINS_OR_ADMIN))
                        || botCommand.accessControl === Bot.ANY_USER
                }
            )
            const commandValues: Bot.Command[] = keys.map(
                (key: string): Bot.Command => Bot.COMMANDS[key] as Bot.Command
            )
            const outerStr: string[] = commandValues.map((commandInfo: Bot.Command): string => {
                const innerStr: string[] = [
                    `\n'${commandInfo.command}${commandInfo.parameters}'`,
                    `\ndescription: ${commandInfo.description}`,
                    `\naccess control: ${commandInfo.accessControl.description}`,
                ]
                return innerStr.join('')
            })
            const formattedStr = outerStr.join('\n')
            logger.debug(formattedStr)
            command.message.reply(formattedStr, {
                code: true,
            })
        })
    )

const setChannel$: Observable<[Bot.Database, discord.Message, discord.Channel]> = filteredMessage$(
    Bot.COMMANDS.SET_CHANNEL
)
    .pipe(
        filter((command: Bot.Input): boolean => {
            const channel = command.message.mentions.channels.first()
            if (channel === undefined) return false
            return command.guild.channels.get(channel.id) !== undefined
        }),
        switchMap((command: Bot.Input):
        Observable<[Bot.Database, discord.Message, discord.Channel]> => {
            const channel: discord.Channel = command.message.mentions.channels.first()
            const newSettings: Bot.Settings = update(command.guildData.settings, {
                notificationChannelId: channel.id,
            }) as Bot.Settings
            const newData: Bot.Database = update(command.guildData, {
                settings: newSettings,
            }) as Bot.Database
            return forkJoin(
                save$(command.guild.id, newData),
                of<discord.Message>(command.message),
                of<discord.Channel>(channel)
            )
        })
    )

//------------------------
// Subscriptions & helpers
//
//------------------------

/**
 * @function
 * @description Gets events that have not yet started or warned about
 * @param {Bot.Database} guildData The Bot.Database to check
 * @returns {Runescape.Event[]} The array of ongoing clan events for Guild id
 */
const getUnnotifiedEvents = (guildData: Bot.Database):
Runescape.Event[] => guildData.events.filter(
    (event: Runescape.Event): boolean => !event.hasNotifiedTwoHourWarning
    || !event.hasNotifiedStarted
    || !event.hasNotifiedEnded
)

connect$.subscribe((): void => {
    logger.info('Connected')
    logger.info('Logged in as:')
    logger.info(`* ${gClient.user.username}`)
    logger.info(`* ${gClient.user.id}`)

    logger.verbose(`In ${gClient.guilds.size} guilds:`)
    gClient.guilds.forEach((guild): void => {
        logger.verbose(`* ${guild.name} (${guild.id})`)
        logger.verbose('* Loading guild json')
        // TODO: Fix this code!
        // race condition between saving and loading data!
        // refactor this into a switch map and call save there!
        load$(guild.id, true).subscribe((guildData: Bot.Database): void => {
            logger.debug(`Loaded json for guild ${guild.id}`)
            logger.silly(`${JSON.stringify(guildData)}`)

            // startup tasks
            // handle generic events here

            // const unnotifiedEvents = getUnnotifiedEvents(guildData)
            // unnotifiedEvents.forEach((clanEvent: Runescape.Event): void => {
            //     // TODO: change me
            //     const uuidToCheck: string = clanEvent.name
            //     // we should probably notify in flight events but not so much of ended events
            //     // if we are within tolerance, notify if we haven't already
            //     // if we are not within tolerance, write an apology if we haven't notified
            //     const now: Date = new Date()
            //     const twoHoursBeforeStart: Date = new Date(clanEvent.startingDate.getTime())
            //     twoHoursBeforeStart.setHours(twoHoursBeforeStart.getHours() - 2)

            //     const toleranceAfterStart: Date = new Date(clanEvent.startingDate.getTime())
            //     toleranceAfterStart.setMinutes(toleranceAfterStart.getMinutes() + 30)

            //     const toleranceAfterEnd: Date = new Date(clanEvent.endingDate.getTime())
            //     toleranceAfterEnd.setMinutes(toleranceAfterEnd.getMinutes() + 30)

            //     const toleranceAfterEndTolerance: Date = new Date(clanEvent.endingDate.getTime())
            //     toleranceAfterEndTolerance.setHours(toleranceAfterEndTolerance.getHours() + 2)

            //     // if we are before 2 hour warning, schedule warnings
            //     if (now < twoHoursBeforeStart) {
            //         logger.debug('before 2 hour warning')
            //         // schedule 2 hour warning
            //         // schedule start date notification
            //         // schedule end date notification
            //         // TODO: change me
            //         timers[clanEvent.name] = [
            //             setTimerTwoHoursBefore(clanEvent, guild, guildData),
            //             setTimerStart(clanEvent, guild, guildData),
            //             setTimerEnd(clanEvent, guild, guildData),
            //         ]
            //     } else if (now >= twoHoursBeforeStart && now < clanEvent.startingDate) {
            //         logger.debug('after 2 hour warning')
            //         if (!clanEvent.hasNotifiedTwoHourWarning) {
            //             logger.debug('notification had not fired')
            //             notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'will begin within 2 hours')
            //             // mark 2 hour warning as completed
            //             const newEvent: Runescape.Event = update(clanEvent, {
            //                 hasNotifiedTwoHourWarning: true,
            //             }) as Runescape.Event
            //             const newEvents: Runescape.Event[] = guildData.events.map(
            //                 (event: Runescape.Event): Runescape.Event => {
            //                     if (event.uuid === uuidToCheck) {
            //                         return newEvent
            //                     }
            //                     return event
            //                 }
            //             )
            //             const newData: Bot.Database = update(guildData, {
            //                 events: newEvents,
            //             }) as Bot.Database
            //             save$(guild.id, newData).subscribe((): void => {})
            //         }
            //         // schedule start date notification
            //         // schedule end date notification
            //         // TODO: change me
            //         timers[clanEvent.name] = [
            //             setTimerStart(clanEvent, guild, guildData),
            //             setTimerEnd(clanEvent, guild, guildData),
            //         ]
            //     } else if (now >= clanEvent.startingDate && now < toleranceAfterStart) {
            //         logger.debug('after event started')
            //         if (!clanEvent.hasNotifiedStarted) {
            //             logger.debug('notification had not fired')
            //             // fire start notification
            //             // mark 2 hour warning as completed
            //             // mark start notification as complete
            //             notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'has begun')
            //             const newEvent: Runescape.Event = update(clanEvent, {
            //                 hasNotifiedTwoHourWarning: true,
            //                 hasNotifiedStarted: true,
            //             }) as Runescape.Event
            //             const newEvents: Runescape.Event[] = guildData.events.map(
            //                 (event: Runescape.Event): Runescape.Event => {
            //                     if (event.uuid === uuidToCheck) {
            //                         return newEvent
            //                     }
            //                     return event
            //                 }
            //             )
            //             const newData: Bot.Database = update(guildData, {
            //                 events: newEvents,
            //             }) as Bot.Database
            //             save$(guild.id, newData).subscribe((): void => {})
            //         }
            //         // TODO: change me
            //         timers[clanEvent.name] = [
            //             setTimerEnd(clanEvent, guild, guildData),
            //         ]
            //     } else if (now >= toleranceAfterStart && now < clanEvent.endingDate) {
            //         logger.debug('after 30 min start tolerance')
            //         if (!clanEvent.hasNotifiedStarted) {
            //             logger.error('notification had not fired')
            //             // fire start notification
            //             // mark 2 hour warning as completed
            //             // mark start notification as complete
            //             // TODO: apologize lol
            //             notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'started more than 30 mins ago, yell at n0trout')
            //             const newEvent: Runescape.Event = update(clanEvent, {
            //                 hasNotifiedTwoHourWarning: true,
            //                 hasNotifiedStarted: true,
            //             }) as Runescape.Event
            //             const newEvents: Runescape.Event[] = guildData.events.map(
            //                 (event: Runescape.Event): Runescape.Event => {
            //                     if (event.uuid === uuidToCheck) {
            //                         return newEvent
            //                     }
            //                     return event
            //                 }
            //             )
            //             const newData: Bot.Database = update(guildData, {
            //                 events: newEvents,
            //             }) as Bot.Database
            //             save$(guild.id, newData).subscribe((): void => {})
            //         }
            //         // schedule end date notification
            //         // TODO: change me
            //         timers[clanEvent.name] = [
            //             setTimerEnd(clanEvent, guild, guildData),
            //         ]
            //     } else if (now >= clanEvent.endingDate && now < toleranceAfterEnd) {
            //         logger.debug('after ended')
            //         if (!clanEvent.hasNotifiedEnded) {
            //             logger.error('notification had not fired')
            //             // fire end notification
            //             // mark 2 hour warning as complete (unnecessary)
            //             // mark start notification as complete (unnecessary)
            //             // mark end notification as complete
            //             notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'has ended')
            //             const newEvent: Runescape.Event = update(clanEvent, {
            //                 hasNotifiedTwoHourWarning: true,
            //                 hasNotifiedStarted: true,
            //                 hasNotifiedEnded: true,
            //             }) as Runescape.Event
            //             const newEvents: Runescape.Event[] = guildData.events.map(
            //                 (event: Runescape.Event): Runescape.Event => {
            //                     if (event.uuid === uuidToCheck) {
            //                         return newEvent
            //                     }
            //                     return event
            //                 }
            //             )
            //             const newData: Bot.Database = update(guildData, {
            //                 events: newEvents,
            //             }) as Bot.Database
            //             save$(guild.id, newData).subscribe((): void => {})
            //         }
            //     } else if (now >= toleranceAfterEnd && now < toleranceAfterEndTolerance) {
            //         logger.debug('after 2 hour end tolerance')
            //         if (!clanEvent.hasNotifiedEnded) {
            //             logger.error('notification had not fired')
            //             // fire end notification
            //             // apologize
            //             // mark 2 hour warning as complete (unnecessary)
            //             // mark start notification as complete (unnecessary)
            //             // mark end notification as complete
            //             notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'has ended more than 2 hours ago, yell at n0trout')
            //             const newEvent: Runescape.Event = update(clanEvent, {
            //                 hasNotifiedTwoHourWarning: true,
            //                 hasNotifiedStarted: true,
            //                 hasNotifiedEnded: true,
            //             }) as Runescape.Event
            //             const newEvents: Runescape.Event[] = guildData.events.map(
            //                 (event: Runescape.Event): Runescape.Event => {
            //                     if (event.uuid === uuidToCheck) {
            //                         return newEvent
            //                     }
            //                     return event
            //                 }
            //             )
            //             const newData: Bot.Database = update(guildData, {
            //                 events: newEvents,
            //             }) as Bot.Database
            //             save$(guild.id, newData).subscribe((): void => {})
            //         }
            //     } else {
            //         // too late to do anything
            //         // just mark it as fired
            //         const newEvent: Runescape.Event = update(clanEvent, {
            //             hasNotifiedTwoHourWarning: true,
            //             hasNotifiedStarted: true,
            //             hasNotifiedEnded: true,
            //         }) as Runescape.Event
            //         const newEvents: Runescape.Event[] = guildData.events.map(
            //             (event: Runescape.Event): Runescape.Event => {
            //                 if (event.uuid === uuidToCheck) {
            //                     return newEvent
            //                 }
            //                 return event
            //             }
            //         )
            //         const newData: Bot.Database = update(guildData, {
            //             events: newEvents,
            //         }) as Bot.Database
            //         save$(guild.id, newData).subscribe((): void => {})
            //     }
            // })


            // are we in flight for an event?
            // make sure they are properly setup
            // TODO: full implementation
            // const inFlightEvents: ClanEvent[] = getInFlightEvents()
            // const inFlightXpEvents: ClanEvent[] = inFlightEvents.filter(
            //     (event: ClanEvent): boolean => event.type === EVENT_TYPE.COMPETITIVE
            // )
            // const endedEvents: ClanEvent[] = getEndedEvents()
            // const endedXpEvents: ClanEvent[] = endedEvents.filter(
            //     (event: ClanEvent): boolean => event.type === EVENT_TYPE.COMPETITIVE
            // )

            // inFlightEvents.forEach((event: ClanEvent): void => {
            //     if (event.type === EVENT_TYPE.COMPETITIVE) {
            //         event.participants.forEach((xpParticipant: XpClanEventParticipant): void => {
            //             xpParticipant.skills.forEach((xpComponent:
            //             XpClanEventParticipantSkillsComponent): void => {
            //                 if (xpComponent.startingXp < 0) {
            //                     hiscores$(xpParticipant.rsn)
            //                         .pipe(
            //                             switchMap((hiscore: hiscores.HiscoreResponse): Observable<Bot.Database> => {
            //                                 const newXpComponent: XpClanEventParticipantSkillsComponent = update(xpComponent, {
            //                                     startingXp: hiscore.skills[xpComponent.name].xp
            //                                 }) as XpClanEventParticipantSkillsComponent
            //                                 const newXpParticipant: XpClanEventParticipant = update(xpParticipant, {
            //                                     skills: newXpComponent
            //                                 }) as XpClanEventParticipant
            //                                 const newXpParticipants: ClanEventParticipant[] = event.participants.filter((participant: ClanEventParticipant): boolean => participant.rsn !== xpParticipant.rsn).concat([newXpParticipant])
            //                                 const newEvent: ClanEvent = update(event, {
            //                                     participants: newXpParticipants
            //                                 }) as ClanEvent
            //                                 // TODO: this doesn't work for non unique event names and dates
            //                                 const newEvents: ClanEvent[] = inFlightEvents.filter((clanEvent: ClanEvent): boolean => clanEvent.name !== event.name && clanEvent.startingDate !== event.startingDate && clanEvent.endingDate !== event.endingDate).concat([newEvent])
            //                                 const newData: Bot.Database = update(guildData, {
            //                                     events: newEvents
            //                                 }) as Bot.Database
            //                                 // TODO: very inefficient - implement a flag to trigger automatic load or manual
            //                                 return save$(guild.id, newData)
            //                             })
            //                         )
            //                         .subscribe((data: Bot.Database): void => {
            //                             logger.debug('updated user that did not have starting xp data')
            //                         })
            //                 }
            //                 /* Incorrect logic, we need to find already ended events instead
            //                 if (xpComponent.endingXp < 0) {
            //                     hiscores$(xpParticipant.rsn)
            //                         .pipe(
            //                             switchMap((hiscore: hiscores.HiscoreResponse): Observable<Bot.Database> => {
            //                                 const newXpComponent: XpClanEventParticipantSkillsComponent = update(xpComponent, {
            //                                     endingXp: hiscore.skills[xpComponent.name].xp
            //                                 }) as XpClanEventParticipantSkillsComponent
            //                                 const newXpParticipant: XpClanEventParticipant = update(xpParticipant, {
            //                                     skills: newXpComponent
            //                                 }) as XpClanEventParticipant
            //                                 const newXpParticipants: ClanEventParticipant[] = event.participants.filter((participant: ClanEventParticipant): boolean => participant.rsn !== xpParticipant.rsn).concat([newXpParticipant])
            //                                 const newEvent: ClanEvent = update(event, {
            //                                     participants: newXpParticipants
            //                                 }) as ClanEvent
            //                                 // TODO: this doesn't work for non unique event names and dates
            //                                 const newEvents: ClanEvent[] = inFlightEvents.filter((clanEvent: ClanEvent): boolean => clanEvent.name !== event.name && clanEvent.startingDate !== event.startingDate && clanEvent.endingDate !== event.endingDate).concat([newEvent])
            //                                 const newData: Bot.Database = update(data, {
            //                                     events: newEvents
            //                                 }) as Bot.Database
            //                                 return save$(guild.id, newData)
            //                             })
            //                         )
            //                         .subscribe((guildData: Bot.Database): void => {
            //                             logger.debug('updated user that did not have ending xp data')
            //                         })
            //                 }
            //                 */
            //             })
            //         })
            //     }
            // })
        })
    })
})

reconnect$.subscribe(
    logger.info('Reconnected')
)

error$.subscribe((error: Error): void => {
    logger.error(error.message)
})

debug$.subscribe((command: Bot.Input): void => {
    logger.info('Debug called')
    logger.debug(JSON.stringify(command.guildData, null, 4))
})

addAdmin$.subscribe((saveMsgArr: [Bot.Database, discord.Message]): void => {
    logger.debug('Admin added')
    saveMsgArr[1].reply('admin added')
})

saveEvent$.subscribe((saveArr: [Bot.Input, Runescape.Event, number, Bot.Database]): void => {
    // add timers
    const inputCommand: Bot.Input = saveArr[0]
    const guild: discord.Guild = inputCommand.guild
    const clanEvent: Runescape.Event = saveArr[1]
    const idx: number = saveArr[2]
    const guildData: Bot.Database = saveArr[3]
    // TODO: change me
    timers[clanEvent.name] = [
        setTimerTwoHoursBefore(clanEvent, guild, guildData),
        setTimerStart(clanEvent, guild, guildData),
        setTimerEnd(clanEvent, guild, guildData),
    ]
    logger.debug('event added')
    inputCommand.message.reply(`event '${clanEvent.name}' added`)
    const channel: discord.TextChannel = guild.channels.get(
        guildData.settings.notificationChannelId
    ) as discord.TextChannel
    if (channel === undefined || channel.type !== 'text') return
    logger.debug('Mentioned general of new generic event')
    channel.send(`@everyone clan event '${clanEvent.name}' has just been scheduled for ${clanEvent.startingDate.toString()}\nto sign-up type: '${Bot.COMMANDS.SIGNUP_UPCOMING.command}${idx} rsn (your RuneScape name)'`, { disableEveryone: false })
})

listUpcomingEvent$.subscribe((): void => {
    logger.debug('ListUpcomingEvents called')
})

deleteUpcomingEvent$.subscribe(
    (saveMsgArr: [Bot.Database, discord.Message, Runescape.Event]): void => {
    // cancel timers
    // TODO: change me
    // if we properly set up starting timers
    // timers will never be undefined
    // if they are its a crash we need to fix
    // but for now I am disabling startup
        if (timers[saveMsgArr[2].name] !== undefined) {
            timers[saveMsgArr[2].name].forEach((timerHnd: NodeJS.Timeout): void => {
                clearTimeout(timerHnd)
            })
            // TODO: change me
            timers[saveMsgArr[2].name] = undefined
            logger.debug('Runescape.Event deleted')
            saveMsgArr[1].reply(`'${saveMsgArr[2].name}' deleted`)
        }
    }
)

signupEvent$.subscribe((saveMsgArr: [Bot.Database, discord.Message]): void => {
    logger.debug('Signup called')
    saveMsgArr[1].reply('signed up for event')
})

unsignupUpcomingEvent$.subscribe((saveMsgArr: [Bot.Database, discord.Message]): void => {
    logger.debug('Unsignup called')
    saveMsgArr[1].reply('removed from event')
})

amISignedUp$.subscribe((): void => {
    logger.debug('AmISignedUp Called')
})

listParticipant$.subscribe((): void => {
    logger.debug('ListParticipants called')
})

help$.subscribe((): void => {
    logger.debug('Help called')
})

setChannel$.subscribe((saveMsgArr: [Bot.Database, discord.Message, discord.Channel]): void => {
    logger.debug('Set channel called')
    saveMsgArr[1].reply(`notification channel set to ${saveMsgArr[2]}`)
})

//--------------
// Global script
//
//--------------

gClient.login(auth.token)

// const regularEventParticipant: Runescape.RegularEventAccountInfo = {
//     rsn: 'n0trout'
// }
// const eventParticipant1: Runescape.EventParticipant = {
//     discordId: '12452345',
//     runescapeAccounts: [regularEventParticipant]
// }

// const event1: Runescape.Event = {
//     name: 'Regular Test',
//     startingDate: new Date(),
//     endingDate: new Date(),
//     type: EVENT_TYPE.REGULAR,
//     tracking: null,
//     participants: [eventParticipant1],
//     hasNotifiedTwoHourWarning: false,
//     hasNotifiedStarted: false,
//     hasNotifiedEnded: false
// }

// const botSettings1: Bot.Settings = {
//     admins: ['242323592035'],
//     notificationChannelId: '124970105256'
// }

// const botDatabase1: Bot.Database = {
//     settings: botSettings1,
//     events: [event1]
// }

// logger.debug(JSON.stringify(botDatabase1))

hiscores.getPlayer('n0trout').then((json: JSON): void => {
    const response: hiscores.LookupResponse = json as unknown as hiscores.LookupResponse
    const skillsEventParticipantComponent: Runescape.SkillsEventParticipantComponent = {
        starting: response.skills,
        ending: null,
    }

    const bhEventParticipantComponent: Runescape.BhEventParticipantComponent = {
        starting: response.bh,
        ending: null,
    }

    const cluesEventParticipantComponent: Runescape.CluesEventParticipantComponent = {
        starting: response.clues,
        ending: null,
    }

    const competitiveEventAccountInfo: Runescape.CompetitiveEventAccountInfo = {
        rsn: 'n0trout',
        skills: skillsEventParticipantComponent,
        bh: bhEventParticipantComponent,
        clues: cluesEventParticipantComponent,
    }

    const eventParticipant2: Runescape.DiscordParticipant = {
        discordId: '123489710234',
        runescapeAccounts: [competitiveEventAccountInfo],
    }

    const tracking: Runescape.Tracking = {
        skills: [Runescape.SkillsEnum.AGILITY, Runescape.SkillsEnum.RUNECRAFT],
        bh: [Runescape.BountyHunterEnum.HUNTER],
        clues: [Runescape.CluesEnum.HARD, Runescape.CluesEnum.MASTER, Runescape.CluesEnum.ELITE],
    }

    const event2: Runescape.Event = {
        name: 'Competitive Test',
        startingDate: new Date(),
        endingDate: new Date(),
        type: EVENT_TYPE.COMPETITIVE,
        tracking,
        participants: [eventParticipant2],
        hasNotifiedTwoHourWarning: false,
        hasNotifiedStarted: false,
        hasNotifiedEnded: false,
    }

    const botSettings2: Bot.Settings = {
        admins: ['242323592035'],
        notificationChannelId: '124970105256',
    }

    const botDatabase2: Bot.Database = {
        settings: botSettings2,
        events: [event2],
    }

    logger.debug(JSON.stringify(botDatabase2))
})
