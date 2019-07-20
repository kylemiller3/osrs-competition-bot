// ------------------------------//
// OSRS discord bot by n0trout   //
// See LICENSE                   //
// ------------------------------//

import * as discord from 'discord.js'
import * as winston from 'winston'
import * as jsonfile from 'jsonfile'
import {
    fromEvent, from, Observable, of, forkJoin
} from 'rxjs'
import {
    publishReplay, refCount, take, skip, filter, switchMap, catchError, tap, map, retry, share
} from 'rxjs/operators'
import {
    hiscores
} from 'osrs-json-api'
import { EventEmitter } from 'events'
import auth from './auth.json'

//-------------
// Global state
//
//-------------
const loadCache: Record<string, Observable<JSON>> = {}
const hiscoreCache: Record<string, Observable<hiscores.HiscoreResponse>> = {}

/**
 * @function
 * @description Wraps an array of javascript objects and sorts it in a stable manner
 * @param {T[]} array Array of same typed javascript objects
 * @param {Function} cmpFunc Comparison function for array
 * @return {T[]} The stable sorted array
 */
// refactor this out later
// we don't want our underlying structure order to change from us
const stableSort = <T>(array: T[], cmpFunc: {(elementA: T, elementB: T): number}): T[] => {
    // wrap our elements in an array with index property
    const arrayWrapper = array.map((element, idx): Record<string, T | number> => ({
        element,
        idx
    }))

    // sort the wrappers, breaking sorting ties by using their elements orig index position
    arrayWrapper.sort((
        wrapperA: Record<string, T | number>,
        wrapperB: Record<string, T | number>
    ): number => {
        const cmpDiff = cmpFunc(wrapperA.element as T, wrapperB.element as T)
        return cmpDiff === 0
            ? (wrapperA.idx as number) - (wrapperB.idx as number)
            : cmpDiff
    })

    // unwrap and return the elements
    return arrayWrapper.map((wrapper: Record<string, T>): T => wrapper.element)
}

//-----------------------------------------
// Interface contracts & objects extensions
//
//-----------------------------------------

/**
 * @description Contract for access controls which applies to each BotCommand
 * @interface
 */
interface AccessControl {
    controlFunction: (author: discord.User, guildData: GuildData) => boolean
    description: string
}

/**
 * @description Contract describing each user input commands
 * @interface
 */
interface BotCommand extends Record<string, unknown> {
    description: string
    accessControl: AccessControl
    parameters: string
    command: string
}

/**
 * @description Contract containing all BotCommands
 * @interface
 */
interface BotCommands extends Record<string, BotCommand> {
    DEBUG: BotCommand
    ADD_ADMIN: BotCommand
    ADD_UPCOMING: BotCommand
    LIST_UPCOMING: BotCommand
    DELETE_UPCOMING: BotCommand
    SIGNUP_UPCOMING: BotCommand
    UNSIGNUP_UPCOMING: BotCommand
    AMISIGNEDUP_UPCOMING: BotCommand
    LIST_PARTICIPANTS_UPCOMING: BotCommand
    HELP: BotCommand
}

/**
 * @description Contract containing information about clan event participants
 * @interface
 */
interface ClanEventParticipant extends Record<string, unknown> {
    rsn: string
    id: string
}

/**
 * @description Contract extending ClanEventParticipant to include XpClanEventParticipantComponents
 */
interface XpClanEventParticipant extends ClanEventParticipant {
    skills: XpClanEventParticipantSkillsComponent[]
}

/**
 * @description Contract component containing the tracking information
 * a clan event participant needs for XP clan events
 * @interface
 */
interface XpClanEventParticipantSkillsComponent extends Record<string, unknown> {
    name: string
    startingXp: number
    endingXp: number
}

/**
 * @description Contract containing information about a specific clan event
 * @interface
 */
interface ClanEvent extends Record<string, unknown> {
    name: string
    startingDate: Date
    endingDate: Date
    type: string
    participants: ClanEventParticipant[]
    hasNotifiedTwoHourWarning: boolean
    hasNotifiedStarted: boolean
    hasNotifiedEnded: boolean
}

/**
 * @description Contract extending a ClanEvent with the skills tracked by a XP clan event
 * @interface
 */
interface XpClanEvent extends ClanEvent {
    skills: string[]
}

/**
 * @description Contract for each Guild's configuration
 * @interface
 */
interface GuildSettings extends Record<string, unknown> {
    admins: string[]
}

/**
 * @description Top level contract for each Guild's configuration
 * @interface
 */
interface GuildData extends Record<string, unknown> {
    settings: GuildSettings
    events: ClanEvent[]
}

/**
 * @description Contract containing the parsed information of a input command
 * including the originating Guild's configuration data
 * @interface
 */
interface InputCommand extends Record<string, unknown> {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    input: string
    guildData: GuildData
}

/**
 * @description Error class extension for OS level system errors
 * @class
 */
class SystemError extends Error {
    errno: number
}


//---------------
// OSRS constants
//
//---------------

/**
 * @description Record of all OSRS skills
 * @type {Record<string, string>}
 * @constant
 * @default
 */
const OSRS_SKILLS: Record<string, string> = {
    ATT: 'attack',
    STR: 'strength',
    DEF: 'defense',
    RANG: 'ranged',
    PRAY: 'prayer',
    MAG: 'magic',
    RC: 'runecraft',
    CON: 'construction',
    HP: 'hitpoints',
    AGI: 'agility',
    HERB: 'herblore',
    THV: 'thieving',
    CRAFT: 'crafting',
    FLE: 'fletching',
    SLAY: 'slayer',
    HNT: 'hunter',
    MINE: 'mining',
    SMITH: 'smithing',
    FSH: 'fishing',
    COOK: 'cooking',
    FIRE: 'firemaking',
    WC: 'woodcutting',
    FARM: 'farming'
}

/**
 * @function
 * @description Checks the Guild configuration for any administrators
 * @param {GuildData} guildData Guild data to check
 * @returns {boolean} If the Guild has the administrator array set
 */
const hasAdmin = (guildData: GuildData): boolean => guildData.settings.admins.length > 0

/**
 * @function
 * @description Checks if the author of a discord message is on
 * the administrator list for that Guild
 * @param {discord.User} author The author of the message
 * @param {GuildData} guildData The Guild configuration of the message's
 * Guild from where it was received
 * @returns {boolean} True if the author is an administrator
 */
// eslint-disable-next-line max-len
const isAdmin = (author: discord.User, guildData: GuildData): boolean => guildData.settings.admins.includes(author.id)

/**
 * @description Implementation of AccessControl for unset
 * Guild configuration or admin users only access
 * @type {AccessControl}
 * @constant
 */
const ONLY_UNSET_ADMINS_OR_ADMIN: AccessControl = {
    controlFunction: (
        author: discord.User, guildData: GuildData
    ): boolean => !hasAdmin(guildData) || isAdmin(author, guildData),
    description: 'unset guild configuration or have admin privileges'
}

/**
 * @description Implementation of AccessControl for admin users only access
 * @type {AccessControl}
 * @constant
 */
const ONLY_ADMIN: AccessControl = {
    controlFunction: (
        author: discord.User, guildData: GuildData
    ): boolean => isAdmin(author, guildData),
    description: 'have admin privileges'
}

/**
 * @description Implementation of AccessControl for any user access
 * @type {AccessControl}
 * @constant
 */
const ANY_USER: AccessControl = {
    controlFunction: (): boolean => true,
    description: 'any user'
}

/**
 * @description Implementation of all recognized BotCommands
 * @constant
 * @type {BotCommands}
 * @default
 */
const BOT_COMMANDS: BotCommands = {
    DEBUG: {
        command: '!f debug',
        description: 'logs debug info to console',
        accessControl: ONLY_ADMIN,
        parameters: 'none'
    },

    ADD_ADMIN: {
        command: '!f add admin ',
        description: 'adds administration for this guild',
        accessControl: ONLY_UNSET_ADMINS_OR_ADMIN,
        parameters: '(@mentions)'
    },

    ADD_UPCOMING: {
        command: '!f add upcoming ',
        description: 'schedules a new event',
        accessControl: ONLY_ADMIN,
        // parameters: '(name starting ending type [xp? skills])'
        parameters: '(name starting ending)'
    },

    LIST_UPCOMING: {
        command: '!f list upcoming',
        description: 'lists scheduled events along with scheduled index',
        accessControl: ANY_USER,
        parameters: 'none'
    },

    DELETE_UPCOMING: {
        command: '!f delete upcoming ',
        description: 'deletes an event by index (use with \'list upcoming\')',
        accessControl: ONLY_ADMIN,
        parameters: '(index)'
    },

    SIGNUP_UPCOMING: {
        command: '!f signup ',
        description: 'signs up for a scheduled event with RuneScape name (use with \'list upcoming\')',
        accessControl: ANY_USER,
        parameters: '(RSN event)'
    },

    UNSIGNUP_UPCOMING: {
        command: '!f unsignup ',
        description: 'un-signs up for a scheduled event (use with \'list upcoming\')',
        accessControl: ANY_USER,
        parameters: '(index)'
    },

    AMISIGNEDUP_UPCOMING: {
        command: '!f amisignedup ',
        description: 'checks to see if you are signed up for a scheduled event (use with \'list upcoming\')',
        accessControl: ANY_USER,
        parameters: '(index)'
    },

    LIST_PARTICIPANTS_UPCOMING: {
        command: '!f list participants ',
        description: 'lists all participants in an event',
        accessControl: ANY_USER,
        parameters: '(index)'
    },

    HELP: {
        command: '!f help',
        description: 'prints this help',
        accessControl: ANY_USER,
        parameters: 'none'
    }
}

/**
 * @description List of all ClanEvent types
 * @constant
 * @type {Record<string, string>}
 * @todo Implement all the logic needed for XP events
 * @default
 */
const EVENT_TYPE: Record<string, string> = {
    // XP: 'XP',
    GENERIC: 'GENERIC'
}

/**
 * @description Empty GuildData default
 * @constant
 * @type {GuildData}
 * @default
 */
const GUILD_DATA_DEFAULT: GuildData = {
    settings: {
        admins: []
    },

    events: []
}

/**
 * @description Instance of global winston logger
 * @type {winston.Logger}
 * @constant
 */
// create our winston logger
const logger: winston.Logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({
            filename: 'log'
        }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
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
 * @description Loads the Guild configuration using cache or GUILD_DEFAULT_DATA if none
 * @param {string} id Guild id configuration to load
 * @param {boolean} dirty Loads configuration from disk if set
 * @returns {Observable<GuildData>} Observable of the load
 * @throws If the OS rejects our load
 */
const load$ = (id: string, dirty: boolean): Observable<GuildData> => {
    if (dirty) {
        loadCache[id] = from(jsonfile.readFile(`./guilds/${id}.json`, {
            // this is very fragile but works for our data structures
            reviver: ((key: string, value: unknown): unknown => {
                if (key.toLowerCase().includes('date')) { return new Date(value as string) }
                return value
            })
        }))
            .pipe(
                catchError((error: SystemError): Observable<GuildData> => {
                    if (error.errno === -2) logger.info('Guild has no configuration')
                    else {
                        logError(error)
                        logger.error(`Error loading ${id} from disk`)
                        throw error
                    }
                    return of<GuildData>(GUILD_DATA_DEFAULT)
                }),
                publishReplay(1),
                refCount()
            )
    }

    const cached: Observable<GuildData> = loadCache[id] as unknown as Observable<GuildData>
    const keys = Object.keys(loadCache)
    if (keys.length >= 10000) {
        const idxToRemove: number = Math.floor((Math.random() * 10000))
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
 * @param {GuildData} guildData The GuildData to save to disk
 * @returns {Observable<GuildData>} Observable of the load
 * @throws If the OS rejects our save
 */
const save$ = (id: string, guildData: GuildData): Observable<GuildData> => of<GuildData>(null)
    .pipe(
        switchMap((): Observable<GuildData> => from(jsonfile.writeFile(`./guilds/${id}.json`, guildData))
            .pipe(
                switchMap((): Observable<GuildData> => load$(id, true))
            )),
        tap((): void => {
            logger.debug(`Wrote settings to ${id}`)
        }),
        catchError((error: SystemError): Observable<GuildData> => {
            logError(error)
            logger.error(`Error writing ${id} to disk`)
            throw error
        })
    )

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
 */
const hiscores$ = (rsn: string): Observable<hiscores.HiscoreResponse> => {
    if (hiscoreCache[rsn] === undefined) {
        hiscoreCache[rsn] = from(hiscores.getPlayer(rsn))
            .pipe(
                retry(100),
                publishReplay(1, 10 * 60 * 1000),
                refCount(), catchError((error: Error): Observable<JSON> => {
                    logError(error)
                    throw error
                })
            ) as unknown as Observable<hiscores.HiscoreResponse>
    }

    const cached: Observable<hiscores.HiscoreResponse> = hiscoreCache[rsn]
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
 * @description Returns a new Record with an updated entry
 * @param {Record<string, T>} record The Record to edit
 * @param {T} entry The new entry
 * @returns {Record<string, T>} The new Record object
 */
// eslint-disable-next-line max-len
const update = <T>(record: Record<string, T>, entry: T): Record<string, T> => Object.assign({}, record, entry)

/**
 * @function
 * @description Checks to see if a Date is valid
 * @param {Date} date The date to check
 * @returns {boolean} Whether the date is valid
 */
const isValidDate = (date: Date): boolean => date instanceof Date && !Number.isNaN(date.getTime())


/**
 * @function
 * @description A new Observable of messages containing find
 * @param {string} find The excitation string
 * @returns {Observable<InputCommand>} Observable of the transformed InputCommand object
 */
const filteredMessage$ = (find: string): Observable<InputCommand> => message$
    .pipe(
        // filter our messages with find
        // and necessary discord checks
        filter((msg: discord.Message): boolean => msg.guild
            && msg.guild.available
            && msg.content.toLowerCase().startsWith(find)),

        // create new observable stream
        // containing the original message
        // the command and the Guild json
        // for error handling of load
        switchMap((msg: discord.Message): Observable<InputCommand> => of<discord.Message>(msg)
            .pipe(
                switchMap((): Observable<InputCommand> => forkJoin(
                    {
                        message: of<discord.Message>(msg),
                        author: of<discord.User>(msg.author),
                        guild: of<discord.Guild>(msg.guild),
                        input: of<string>(msg.content.slice(find.length)),
                        guildData: load$(msg.guild.id, false)
                    }
                )),
                catchError((error: Error): Observable<InputCommand> => {
                    logError(error)
                    return forkJoin(
                        {
                            message: of<discord.Message>(msg),
                            author: of<discord.User>(msg.author),
                            guild: of<discord.Guild>(msg.guild),
                            input: of<string>(msg.content.slice(find.length)),
                            guildData: of<GuildData>(GUILD_DATA_DEFAULT)
                        }
                    )
                })
            )),
        tap((command: InputCommand): void => {
            logger.debug(`message: ${command.message.content}`)
            logger.debug(`author: ${command.author.username}`)
            logger.debug(`guild: ${command.guild.name}`)
            logger.debug(`input: ${command.input}`)
            logger.silly(`guildData: ${(JSON.stringify(command.guildData))}`)
        })
    )

/**
 * @description An Observable that handles the DEBUG command
 * @type {Observable<InputCommand>}
 * @constant
 */
const debug$: Observable<InputCommand> = filteredMessage$(BOT_COMMANDS.DEBUG.command)
    .pipe(
        filter((command: InputCommand): boolean => BOT_COMMANDS.DEBUG.accessControl.controlFunction(
            command.author, command.guildData
        ))
    )

/**
 * @description An Observable that handles the ADD_ADMIN command
 * @type {Observable<any>}
 * @constant
 */
const addAdmin$: Observable<[GuildData, discord.Message]> = filteredMessage$(
    BOT_COMMANDS.ADD_ADMIN.command
)
    .pipe(
        filter((command: InputCommand):
        boolean => BOT_COMMANDS.ADD_ADMIN.accessControl.controlFunction(
            command.author, command.guildData
        )),
        filter((command: InputCommand):
        boolean => command.message.mentions.members.array().length > 0),
        switchMap((command: InputCommand): Observable<[GuildData, discord.Message]> => {
            const mentions: string[] = command.message.mentions.members.array()
                .map((member: discord.GuildMember): string => member.id)
            const newSettings: GuildSettings = update(command.guildData.settings, {
                admins: Array.from(new Set(command.guildData.settings.admins.concat(mentions)))
            }) as GuildSettings
            const newData: GuildData = update(command.guildData, {
                settings: newSettings
            }) as GuildData
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
    const filteredRegexes: string[][] = foundRegexes.filter(
        (results: string[]): boolean => results !== null && results.length >= 2
    )
    const parsed: string[] = filteredRegexes.map(
        (results: string[]): string => results[1].trim()
    )
    const nonEmpty: string[] = parsed.filter(
        (str: string): boolean => str.length > 0
    )
    return nonEmpty
}

/**
 * @description Ending regex terminators for command ADD_EVENT
 * @type {string}
 * @constant
 */
const eventTermRegex = 'type|skills|starting|ending|name|$'

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
const prepareGenericUpcomingEvent$: Observable<[InputCommand, ClanEvent]> = filteredMessage$(
    BOT_COMMANDS.ADD_UPCOMING.command
)
    .pipe(
        filter((command: InputCommand):
        boolean => BOT_COMMANDS.ADD_UPCOMING.accessControl.controlFunction(
            command.author, command.guildData
        )),
        // we need at least a name, starting date and end date
        map((command: InputCommand): [InputCommand, ClanEvent] => {
            const compoundRegex: string = commandRegex(eventTermRegex)
            const regexes: RegExp[] = [
                new RegExp(`name${compoundRegex}`, 'gim'),
                new RegExp(`starting${compoundRegex}`, 'gim'),
                new RegExp(`ending${compoundRegex}`, 'gim'),
                new RegExp(`type${compoundRegex}`, 'gim')
            ]
            const parsedRegexes = findFirstRegexesMatch(regexes, command.input)
            if (parsedRegexes.length !== regexes.length) {
                logger.debug(`Admin ${command.author.username} entered invalid parameters`)
                command.message.reply(`blank parameters\n${BOT_COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }
            const dateA: Date = new Date(parsedRegexes[1])
            const dateB: Date = new Date(parsedRegexes[2])
            const startingDate: Date = dateA <= dateB ? dateA : dateB
            const endingDate: Date = dateA > dateB ? dateA : dateB

            const inputType: string = parsedRegexes[3].toUpperCase()
            const type = EVENT_TYPE[inputType] === undefined
                ? EVENT_TYPE.GENERIC
                : EVENT_TYPE[inputType]

            const clanEvent: ClanEvent = {
                name: parsedRegexes[0],
                startingDate,
                endingDate,
                type,
                participants: [],
                hasNotifiedTwoHourWarning: false,
                hasNotifiedStarted: false,
                hasNotifiedEnded: false
            }
            if (!isValidDate(dateA) || !isValidDate(dateB)) {
                logger.debug(`Admin ${command.author.username} entered invalid date`)
                command.message.reply('starting date or ending date is invalid use IS0 8601 standard')
                return null
            }
            if (startingDate <= new Date()) {
                logger.debug(`Admin ${command.author.username} entered a start date in the past`)
                command.message.reply('cannot start an event in the past')
                return null
            }
            return [command, clanEvent]
        }),
        filter((commandEventArr: [InputCommand, ClanEvent]): boolean => commandEventArr !== null),
        tap((commandEventArr: [InputCommand, ClanEvent]): void => {
            logger.debug(`Admin ${commandEventArr[0].author.username} called add event`)
            logger.debug('Event properties: ')
            logger.debug(`* ${commandEventArr[1].name}`)
            logger.debug(`* ${commandEventArr[1].startingDate.toDateString()}`)
            logger.debug(`* ${commandEventArr[1].endingDate.toDateString()}`)
            logger.debug(`* ${commandEventArr[1].type}`)
        }),
        share()
    )

/**
 * @description An Observable that handles the ADD_UPCOMING command for GENERIC events
 * @type {Observable<any>}
 * @constant
 */
const addUpcomingGenericEvent$: Observable<[GuildData, discord.Message]> = prepareGenericUpcomingEvent$
    .pipe(
        filter((commandEventArr: [InputCommand, ClanEvent]): boolean => commandEventArr[1].type
        === EVENT_TYPE.GENERIC),
        switchMap((commandEventArr: [InputCommand, ClanEvent]):
        Observable<[GuildData, discord.Message]> => {
            const events: ClanEvent[] = commandEventArr[0].guildData.events.concat(
                commandEventArr[1]
            )
            const sortedEvents: ClanEvent[] = stableSort(
                events, (eventA: ClanEvent, eventB: ClanEvent):
                number => eventA.startingDate.getTime() - eventB.startingDate.getTime()
            ) as ClanEvent[]
            const newGuildData: GuildData = update(commandEventArr[0].guildData, {
                events: sortedEvents
            }) as GuildData
            return forkJoin(
                save$(commandEventArr[0].guild.id, newGuildData),
                of<discord.Message>(commandEventArr[0].message)
            )
        })
    )

/**
 * @description An Observable that handles the ADD_UPCOMING command for XP events
 * @type {Observable<any>}
 * @constant
 */
const addUpcomingXpEvent$: Observable<[GuildData, discord.Message]> = prepareGenericUpcomingEvent$
    .pipe(
        filter((commandEventArr: [InputCommand, ClanEvent]): boolean => commandEventArr[1].type
            === EVENT_TYPE.XP),
        switchMap((commandEventArr: [InputCommand, ClanEvent]):
        Observable<[GuildData, discord.Message]> => {
            const compoundRegex: string = commandRegex(eventTermRegex)
            const skillsRegex = [
                new RegExp(`skills${compoundRegex}`, 'gim')
            ]
            const parsedRegex = findFirstRegexesMatch(skillsRegex, commandEventArr[0].input)
            if (parsedRegex.length !== skillsRegex.length) {
                logger.debug(`Admin ${commandEventArr[0].author.id} entered no skills`)
                commandEventArr[0].message.reply(`no skills specified\n${BOT_COMMANDS.ADD_UPCOMING.parameters}`)
                return of<[GuildData, discord.Message]>(null)
            }
            const skills = parsedRegex[0]
            const skillsArr: string[] = skills.split(' ').map(
                (skill: string): string => skill.trim()
            )
            const OSRS_SKILLS_VALUES: string[] = Object.keys(OSRS_SKILLS).map(
                (key: string): string => OSRS_SKILLS[key]
            )
            const filteredSkills: string[] = skillsArr.filter(
                (skill: string): boolean => OSRS_SKILLS_VALUES.includes(skill)
            )
            if (skillsArr.length !== filteredSkills.length) {
                logger.debug(`Admin ${commandEventArr[0].author.id} entered some invalid skill names`)
                commandEventArr[0].message.reply(`some skill names entered are invalid\nchoices are: [${OSRS_SKILLS.toString}]`)
                return of<[GuildData, discord.Message]>(null)
            }
            const xpClanEvent: XpClanEvent = update(commandEventArr[1], {
                skills: skillsArr
            }) as XpClanEvent
            const events: ClanEvent[] = commandEventArr[0].guildData.events.concat(xpClanEvent)
            const sortedEvents: ClanEvent[] = stableSort(
                events, (eventA: ClanEvent, eventB: ClanEvent):
                number => eventA.startingDate.getTime() - eventB.startingDate.getTime()
            ) as ClanEvent[]
            const newGuildData: GuildData = update(commandEventArr[0].guildData, {
                events: sortedEvents
            }) as GuildData
            return forkJoin(
                save$(commandEventArr[0].guild.id, newGuildData),
                of<discord.Message>(commandEventArr[0].message)
            )
        }),
        filter((saveMsgArr: [GuildData, discord.Message]): boolean => saveMsgArr !== null)
    )

/**
 * @function
 * @description Gets all scheduled events
 * @param {ClanEvent[]} events ClanEvents source
 * @returns {ClanEvent[]} The array of upcoming events
 */
const getUpcomingEvents = (events: ClanEvent[]): ClanEvent[] => events.filter(
    (event: ClanEvent): boolean => event.startingDate > new Date()
)

/**
 * @description An Observable that handles the LIST_UPCOMING command
 * @type {Observable<void>}
 * @constant
 */
const listUpcomingEvent$: Observable<void> = filteredMessage$(BOT_COMMANDS.LIST_UPCOMING.command)
    .pipe(
        filter((command: InputCommand):
        boolean => BOT_COMMANDS.LIST_UPCOMING.accessControl.controlFunction(
            command.author, command.guildData
        )),
        map((command: InputCommand): void => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.guildData.events)
            const eventsStr = upcomingEvents.map(
                (event: ClanEvent, idx: number): string => {
                    const { name } = event
                    const startingDateStr = event.startingDate.toDateString()
                    const endingDateStr = event.endingDate.toDateString()
                    const { type } = event
                    const retStr = `\n${idx}: ${name} starting: ${startingDateStr} ending: ${endingDateStr} type: ${type}`
                    if (event.skills !== undefined) {
                        const xpEvent: XpClanEvent = event as XpClanEvent
                        const skills: string = xpEvent.skills.join(' ')
                        return retStr.concat(` skills: ${skills}`)
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
const deleteUpcomingEvent$: Observable<[GuildData, discord.Message]> = filteredMessage$(
    BOT_COMMANDS.DELETE_UPCOMING.command
)
    .pipe(
        filter((command: InputCommand):
        boolean => BOT_COMMANDS.DELETE_UPCOMING.accessControl.controlFunction(
            command.author, command.guildData
        )),
        filter((command: InputCommand): boolean => isAdmin(command.author, command.guildData)),
        tap((): void => {
            logger.debug('Admin called delete upcoming event')
        }),
        switchMap((command: InputCommand): Observable<[GuildData, discord.Message]> => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.guildData.events)
            const idxToRemove: number = parseInt(command.input, 10)
            const filteredEvents: ClanEvent[] = upcomingEvents.filter(
                (event: ClanEvent, idx: number): boolean => idx !== idxToRemove
            )
            if (Number.isNaN(idxToRemove) || filteredEvents.length === upcomingEvents.length) {
                logger.debug(`Admin did not specify index (${idxToRemove})`)
                command.message.reply(`invalid index ${idxToRemove}\n${BOT_COMMANDS.DELETE_UPCOMING.parameters}`)
                return of<[GuildData, discord.Message]>(null)
            }
            const newGuildData: GuildData = update(command.guildData, {
                events: filteredEvents
            }) as GuildData
            return forkJoin(
                save$(command.guild.id, newGuildData),
                of<discord.Message>(command.message)
            )
        }),
        filter((saveMsgArr: [GuildData, discord.Message]): boolean => saveMsgArr !== null)
    )


/**
 * @function
 * @description Converts a users Discord Id to Guild nickname
 * @param {discord.Guild} guild  The guild to use for user's nickname
 * @param {string} userId The Discord Id to lookup
 * @returns {string} The user's Guild nickname
 */
const userIdToNickname = (guild: discord.Guild, userId: string): string => {
    const members: discord.Collection<string, discord.GuildMember> = guild.members.filter(
        (member: discord.GuildMember): boolean => member.id === userId
    )
    const name: string = members.size > 0 ? members.first().nickname : null
    return name
}

/**
 * @description Ending regex terminator for command SIGNUP_UPCOMING
 * @type {string}
 * @constant
 */
const signupTermRegex = 'event|rsn|$'

/**
 * @description An Observable that handles the SIGNUP_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const signupUpcomingEvent$: Observable<[GuildData, discord.Message]> = filteredMessage$(
    BOT_COMMANDS.SIGNUP_UPCOMING.command
)
    .pipe(
        filter((command: InputCommand):
        boolean => BOT_COMMANDS.SIGNUP_UPCOMING.accessControl.controlFunction(
            command.author, command.guildData
        )),
        switchMap((command: InputCommand):
        Observable<[GuildData, discord.Message, hiscores.HiscoreResponse]> => {
            const compoundRegex: string = commandRegex(signupTermRegex)
            const skillsRegex = [
                new RegExp(`event${compoundRegex}`, 'gim'),
                new RegExp(`rsn${compoundRegex}`, 'gim')
            ]
            const parsedRegex = findFirstRegexesMatch(skillsRegex, command.input)
            if (parsedRegex.length !== skillsRegex.length) {
                logger.debug(`${command.author.id} entered invalid signup data`)
                command.message.reply(`invalid input\n${BOT_COMMANDS.SIGNUP_UPCOMING.parameters}`)
                return of<[GuildData, discord.Message, hiscores.HiscoreResponse]>(null)
            }

            // get upcoming events
            // if index is out of range return
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.guildData.events)
            const idxToModify: number = Number.parseInt(parsedRegex[0], 10)
            const userIdToAdd: string = command.author.id
            const rsnToAdd: string = parsedRegex[1]
            if (Number.isNaN(idxToModify) || idxToModify >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToModify})`)
                command.message.reply(`invalid index ${idxToModify}\n${BOT_COMMANDS.SIGNUP_UPCOMING.parameters}`)
                return of<[GuildData, discord.Message, hiscores.HiscoreResponse]>(null)
            }

            // get event to modify and its type
            const eventToModify: ClanEvent = upcomingEvents[idxToModify]
            const eventToModifyType: string = eventToModify.type

            // is the player already added?
            const filteredParticipants: ClanEventParticipant[] = eventToModify.participants.filter(
                (participant: ClanEventParticipant): boolean => participant.rsn === rsnToAdd
                    || participant.id === userIdToAdd
            )
            if (filteredParticipants.length > 0) {
                logger.debug('Player already exists')
                const idSignedUp: string = filteredParticipants[0].id
                const playerSignedUp: string = filteredParticipants[0].rsn
                command.message.reply(`<@${idSignedUp}> already signed up ${playerSignedUp}`)
                return of<[GuildData, discord.Message, hiscores.HiscoreResponse]>(null)
            }

            // get the participant to modify and return
            // or create a new one and continue
            const participantToAdd = {
                rsn: rsnToAdd,
                id: command.author.id
            }

            if (eventToModifyType) {
                // add participant to event array
                const newEventParticipants: ClanEventParticipant[] = eventToModify
                    .participants.concat(
                        [participantToAdd]
                    )

                // create a new event
                // create new event list
                // create new Guild data
                const newEvent: ClanEvent = update(eventToModify, {
                    participants: newEventParticipants
                }) as ClanEvent
                const newEvents: ClanEvent[] = command.guildData.events.map(
                    (event: ClanEvent, idx: number): ClanEvent => {
                        if (idx === idxToModify) {
                            return newEvent
                        }
                        return event
                    }
                )
                const newData: GuildData = update(command.guildData, {
                    events: newEvents
                }) as GuildData

                return forkJoin(
                    of<GuildData>(newData),
                    of<discord.Message>(command.message),
                    hiscores$(rsnToAdd)
                )
            }

            if (eventToModifyType === EVENT_TYPE.XP) {
                // TODO: refactor this to a function
                // add skills to user
                const skills:
                XpClanEventParticipantSkillsComponent[] = (eventToModify as XpClanEvent)
                    .skills.map(
                        (skillName: string): XpClanEventParticipantSkillsComponent => ({
                            name: skillName,
                            startingXp: -1,
                            endingXp: -1
                        })
                    )

                const xpEventParticipant = update(participantToAdd as XpClanEventParticipant, {
                    skills
                }) as XpClanEventParticipant

                // add participant to event array
                const newEventParticipants: ClanEventParticipant[] = eventToModify
                    .participants.concat(
                        [xpEventParticipant]
                    )

                // create a new event
                // create new event list
                // create new Guild data
                const newEvent: ClanEvent = update(eventToModify, {
                    participants: newEventParticipants
                }) as ClanEvent
                const newEvents: ClanEvent[] = command.guildData.events.map(
                    (event: ClanEvent, idx: number): ClanEvent => {
                        if (idx === idxToModify) {
                            return newEvent
                        }
                        return event
                    }
                )
                const newData: GuildData = update(command.guildData, {
                    events: newEvents
                }) as GuildData

                return forkJoin(
                    of<GuildData>(newData),
                    of<discord.Message>(command.message),
                    hiscores$(rsnToAdd)
                )
            }
            return of<[GuildData, discord.Message, hiscores.HiscoreResponse]>(null)
        }),
        filter((dataMsgHiArr: [GuildData, discord.Message, hiscores.HiscoreResponse]):
        boolean => dataMsgHiArr !== null),

        switchMap((dataMsgHiArr: [GuildData, discord.Message, hiscores.HiscoreResponse]):
        Observable<[GuildData, discord.Message]> => {
            if (dataMsgHiArr[2] === null) {
                logger.debug('User entered invalid RSN')
                dataMsgHiArr[1].reply('cannot find RSN on hiscores')
                return of<[GuildData, discord.Message]>(null)
            }
            return forkJoin(
                save$(dataMsgHiArr[1].guild.id, dataMsgHiArr[0]),
                of<discord.Message>(dataMsgHiArr[1])
            )
        }),
        filter((saveMsgArr: [GuildData, discord.Message]): boolean => saveMsgArr !== null)
    )

/**
 * @description An Observable that handles the UNSIGNUP_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const unsignupUpcomingEvent$: Observable<[GuildData, discord.Message]> = filteredMessage$(
    BOT_COMMANDS.UNSIGNUP_UPCOMING.command
)
    .pipe(
        filter((command: InputCommand):
        boolean => BOT_COMMANDS.UNSIGNUP_UPCOMING.accessControl.controlFunction(
            command.author, command.guildData
        )),
        switchMap((command: InputCommand): Observable<[GuildData, discord.Message]> => {
            // get upcoming events
            // if index is out of range return
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.guildData.events)
            const idxToModify: number = Number.parseInt(command.input, 10)
            if (Number.isNaN(idxToModify) || idxToModify >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToModify})`)
                command.message.reply(`invalid index ${idxToModify}\n${BOT_COMMANDS.UNSIGNUP_UPCOMING.parameters}`)
                return of<[GuildData, discord.Message]>(null)
            }

            // does the event to modify contain our user?
            const eventToModify: ClanEvent = upcomingEvents[idxToModify]
            const participantCount: number = eventToModify.participants.length
            const newEventParticipants: ClanEventParticipant[] = eventToModify.participants.filter(
                (participant: ClanEventParticipant): boolean => participant.id !== command.author.id
            )

            // user was not signed up
            if (participantCount === newEventParticipants.length) {
                logger.debug('User was not signed up')
                command.message.reply('you were not signed up for this event')
                return of<[GuildData, discord.Message]>(null)
            }

            // create a new event
            // create new event list
            // create new Guild data
            const newEvent: ClanEvent = update(eventToModify, {
                participants: newEventParticipants
            }) as ClanEvent
            const newEvents: ClanEvent[] = command.guildData.events.map(
                (event: ClanEvent, idx: number): ClanEvent => {
                    if (idx === idxToModify) {
                        return newEvent
                    }
                    return event
                }
            )
            const newData: GuildData = update(command.guildData, {
                events: newEvents
            }) as GuildData

            return forkJoin(
                save$(command.guild.id, newData),
                of<discord.Message>(command.message)
            )
        }),
        filter((saveMsgArr: [GuildData, discord.Message]): boolean => saveMsgArr !== null)
    )

/**
 * @description An Observable that handles the AMISIGNEDUP_UPCOMING command
 * @type {Observable<void>}
 * @constant
 */
const amISignedUp$: Observable<void> = filteredMessage$(BOT_COMMANDS.AMISIGNEDUP_UPCOMING.command)
    .pipe(
        filter((command: InputCommand):
        boolean => BOT_COMMANDS.AMISIGNEDUP_UPCOMING.accessControl.controlFunction(
            command.author, command.guildData
        )),
        map((command: InputCommand): void => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.guildData.events)
            const idxToCheck: number = Number.parseInt(command.input, 10)
            if (Number.isNaN(idxToCheck) || idxToCheck >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToCheck})`)
                command.message.reply(`invalid index ${idxToCheck}\n${BOT_COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`)
                return
            }

            // does the event to modify contain our user?
            const eventToCheck: ClanEvent = upcomingEvents[idxToCheck]
            const filteredEventParticipants: ClanEventParticipant[] = eventToCheck
                .participants.filter(
                    (participant: ClanEventParticipant):
                    boolean => participant.id === command.author.id
                )

            const filteredParticipant: ClanEventParticipant = filteredEventParticipants.length > 0
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
    BOT_COMMANDS.LIST_PARTICIPANTS_UPCOMING.command
)
    .pipe(
        filter((command: InputCommand):
        boolean => BOT_COMMANDS.LIST_PARTICIPANTS_UPCOMING.accessControl.controlFunction(
            command.author, command.guildData
        )),
        map((command: InputCommand): void => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.guildData.events)
            const idxToCheck: number = Number.parseInt(command.input, 10)
            if (Number.isNaN(idxToCheck) || idxToCheck >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToCheck})`)
                command.message.reply(`invalid index ${idxToCheck}\n${BOT_COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`)
                return
            }

            const eventToList: ClanEvent = upcomingEvents[idxToCheck]
            const formattedStr: string = eventToList.participants.map(
                (participant: ClanEventParticipant, idx: number): string => {
                    const nickname: string = userIdToNickname(command.guild, participant.id)
                    return `\n${idx}: ${nickname} signed up ${participant.rsn}`
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
const help$: Observable<void> = filteredMessage$(BOT_COMMANDS.HELP.command)
    .pipe(
        filter((command: InputCommand): boolean => BOT_COMMANDS.HELP.accessControl.controlFunction(
            command.author, command.guildData
        )),
        map((command: InputCommand): void => {
            const commandValues: BotCommand[] = Object.keys(BOT_COMMANDS).map(
                (key: string): BotCommand => BOT_COMMANDS[key] as BotCommand
            )
            const outerStr: string[] = commandValues.map((commandInfo: BotCommand): string => {
                const innerStr: string[] = [
                    `\n'${commandInfo.command}'`,
                    `\ndescription: ${commandInfo.description}`,
                    `\naccess control: ${commandInfo.accessControl.description}`,
                    `\nparameters: ${commandInfo.parameters}`
                ]
                return innerStr.join('')
            })
            const formattedStr = outerStr.join('\n')
            logger.debug(formattedStr)
            command.message.reply(formattedStr, {
                code: true
            })
        })
    )


//--------------
// Subscriptions
//
//--------------

/**
 * @function
 * @description Gets currently running events
 * @param {GuildData} guildData The GuildData to check
 * @returns {ClanEvent[]} The array of ongoing clan events for Guild id
 */
const getInFlightEvents = (guildData: GuildData): ClanEvent[] => guildData.events.filter(
    (event: ClanEvent): boolean => {
        const now: Date = new Date()
        return event.startingDate < now && event.endingDate > now
    }
)


/**
 * @function
 * @description Gets events that have not yet started or warned about
 * @param {GuildData} guildData The GuildData to check
 * @returns {ClanEvent[]} The array of ongoing clan events for Guild id
 */
const getUnnotifiedEvents = (guildData: GuildData):
ClanEvent[] => guildData.events.filter(
    (event: ClanEvent): boolean => !event.hasNotifiedTwoHourWarning
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
        load$(guild.id, true).subscribe((data: GuildData): void => {
            logger.debug(`Loaded json for guild ${guild.id}`)
            logger.silly(`${JSON.stringify(data)}`)

            // startup tasks
            // handle generic events here

            const unnotifiedEvents = getUnnotifiedEvents(data)
            unnotifiedEvents.forEach((event: ClanEvent): void => {
                // we should probably notify in flight events but not so much of ended events
                // TODO: find events within 2 hours of start date
                // if we are within tolerance, notify if we haven't already
                // if we are not within tolerance, write an apology if we haven't notified
                const now: Date = new Date()
                const twoHoursBeforeStart: Date = new Date(event.startingDate.getTime())
                twoHoursBeforeStart.setHours(twoHoursBeforeStart.getHours() - 2)

                const toleranceAfterStart: Date = new Date(event.startingDate.getTime())
                toleranceAfterStart.setMinutes(toleranceAfterStart.getMinutes() + 30)

                const toleranceAfterEnd: Date = new Date(event.endingDate.getTime())
                toleranceAfterEnd.setMinutes(toleranceAfterEnd.getMinutes() + 30)

                const toleranceAfterEndTolerance: Date = new Date(event.endingDate.getTime())
                toleranceAfterEndTolerance.setHours(toleranceAfterEndTolerance.getHours() + 2)

                // if we are before 2 hour warning, schedule warnings
                if (now < twoHoursBeforeStart) {
                    logger.debug('before 2 hour warning')
                    // schedule 2 hour warning
                    // schedule start date notification
                    // schedule end date notification
                } else if (now >= twoHoursBeforeStart && now < event.startingDate) {
                    logger.debug('after 2 hour warning')
                    if (!event.hasNotifiedTwoHourWarning) {
                        logger.debug('notification had not fired')
                        // fire 2 hour notification
                        // mark 2 hour warning as completed
                    }
                    // schedule start date notification
                    // schedule end date notification
                } else if (now >= event.startingDate && now < toleranceAfterStart) {
                    logger.debug('after event started')
                    if (!event.hasNotifiedStarted) {
                        logger.debug('notification had not fired')
                        // fire start notification
                        // mark 2 hour warning as completed (unnecessary)
                        // mark start notification as complete
                    }
                    // schedule end date notification
                } else if (now >= toleranceAfterStart && now < event.endingDate) {
                    logger.debug('after 30 min start tolerance')
                    if (!event.hasNotifiedStarted) {
                        logger.error('notification had not fired')
                        // fire start notification
                        // apologize lol
                        // mark 2 hour warning as completed (unnecessary)
                        // mark start notification as complete
                    }
                    // schedule end date notification
                } else if (now >= event.endingDate && now < toleranceAfterEnd) {
                    logger.debug('after event ended')
                    if (!event.hasNotifiedEnded) {
                        logger.debug('notification had not fired')
                        // fire end notification
                        // mark 2 hour warning as complete (unnecessary)
                        // mark start notification as complete (unnecessary)
                        // mark end notification as complete
                    }
                } else if (now >= toleranceAfterEnd && now < toleranceAfterEndTolerance) {
                    logger.debug('after 2 hour end tolerance')
                    if (!event.hasNotifiedEnded) {
                        logger.error('notification had not fired')
                        // fire end notification
                        // apologize
                        // mark 2 hour warning as complete (unnecessary)
                        // mark start notification as complete (unnecessary)
                        // mark end notification as complete
                    }
                } else {
                    // too late to do anything
                    // just mark it as fired
                }
            })


            // are we in flight for an event?
            // make sure they are properly setup
            const inFlightEvents: ClanEvent[] = getInFlightEvents(data)
            inFlightEvents.forEach((event: ClanEvent): void => {
                switch (event.type) {
                    // TODO: incomplete - implement ended logic
                    case EVENT_TYPE.XP: {
                        event.participants.forEach((xpParticipant: XpClanEventParticipant): void => {
                            xpParticipant.skills.forEach((xpComponent: XpClanEventParticipantSkillsComponent): void => {
                                if (xpComponent.startingXp < 0) {
                                    hiscores$(xpParticipant.rsn)
                                        .pipe(
                                            switchMap((hiscore: hiscores.HiscoreResponse): Observable<GuildData> => {
                                                const newXpComponent: XpClanEventParticipantSkillsComponent = update(xpComponent, {
                                                    startingXp: hiscore.skills[xpComponent.name].xp
                                                }) as XpClanEventParticipantSkillsComponent
                                                const newXpParticipant: XpClanEventParticipant = update(xpParticipant, {
                                                    skills: newXpComponent
                                                }) as XpClanEventParticipant
                                                const newXpParticipants: ClanEventParticipant[] = event.participants.filter((participant: ClanEventParticipant): boolean => participant.rsn !== xpParticipant.rsn).concat([newXpParticipant])
                                                const newEvent: ClanEvent = update(event, {
                                                    participants: newXpParticipants
                                                }) as ClanEvent
                                                // TODO: this doesn't work for non unique event names and dates
                                                const newEvents: ClanEvent[] = inFlightEvents.filter((clanEvent: ClanEvent): boolean => clanEvent.name !== event.name && clanEvent.startingDate !== event.startingDate && clanEvent.endingDate !== event.endingDate).concat([newEvent])
                                                const newData: GuildData = update(data, {
                                                    events: newEvents
                                                }) as GuildData
                                                // TODO: very inefficient - implement a flag to trigger automatic load or manual
                                                return save$(guild.id, newData)
                                            })
                                        )
                                        .subscribe((guildData: GuildData): void => {
                                            logger.debug('updated user that did not have starting xp data')
                                        })
                                }
                                /* Incorrect logic, we need to find already ended events instead
                                if (xpComponent.endingXp < 0) {
                                    hiscores$(xpParticipant.rsn)
                                        .pipe(
                                            switchMap((hiscore: hiscores.HiscoreResponse): Observable<GuildData> => {
                                                const newXpComponent: XpClanEventParticipantSkillsComponent = update(xpComponent, {
                                                    endingXp: hiscore.skills[xpComponent.name].xp
                                                }) as XpClanEventParticipantSkillsComponent
                                                const newXpParticipant: XpClanEventParticipant = update(xpParticipant, {
                                                    skills: newXpComponent
                                                }) as XpClanEventParticipant
                                                const newXpParticipants: ClanEventParticipant[] = event.participants.filter((participant: ClanEventParticipant): boolean => participant.rsn !== xpParticipant.rsn).concat([newXpParticipant])
                                                const newEvent: ClanEvent = update(event, {
                                                    participants: newXpParticipants
                                                }) as ClanEvent
                                                // TODO: this doesn't work for non unique event names and dates
                                                const newEvents: ClanEvent[] = inFlightEvents.filter((clanEvent: ClanEvent): boolean => clanEvent.name !== event.name && clanEvent.startingDate !== event.startingDate && clanEvent.endingDate !== event.endingDate).concat([newEvent])
                                                const newData: GuildData = update(data, {
                                                    events: newEvents
                                                }) as GuildData
                                                return save$(guild.id, newData)
                                            })
                                        )
                                        .subscribe((guildData: GuildData): void => {
                                            logger.debug('updated user that did not have ending xp data')
                                        })
                                }
                                */
                            })
                        })
                        break
                    }
                    default:
                }
            })
        })
    })
})

reconnect$.subscribe(
    logger.info('Reconnected')
)

error$.subscribe((error: Error): void => {
    logger.error(error.message)
})

debug$.subscribe((command: InputCommand): void => {
    logger.info('Debug called')
    logger.debug(JSON.stringify(command.guildData, null, 4))
})

addAdmin$.subscribe((saveMsgArr: [GuildData, discord.Message]): void => {
    logger.debug('Admin added')
    saveMsgArr[1].reply('admin added')
})

addUpcomingGenericEvent$.subscribe((saveMsgArr: [GuildData, discord.Message]): void => {
    logger.debug('GENERIC event added')
    saveMsgArr[1].reply('generic event added')
})

addUpcomingXpEvent$.subscribe((saveMsgArr: [GuildData, discord.Message]): void => {
    logger.debug('XP event added')
    saveMsgArr[1].reply('xp event added')
})

listUpcomingEvent$.subscribe((): void => {
    logger.debug('List upcoming events called')
})

deleteUpcomingEvent$.subscribe((saveMsgArr: [GuildData, discord.Message]): void => {
    logger.debug('Event deleted')
    saveMsgArr[1].reply('event deleted')
})

signupUpcomingEvent$.subscribe((saveMsgArr: [GuildData, discord.Message]): void => {
    logger.debug('Signup called')
    saveMsgArr[1].reply('signed up for event')
})

unsignupUpcomingEvent$.subscribe((saveMsgArr: [GuildData, discord.Message]): void => {
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


//--------------
// Global script
//
//--------------

gClient.login(auth.token)
