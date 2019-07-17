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
    FromEventTarget
} from 'rxjs/internal/observable/fromEvent'
import {
    publishReplay, refCount, take, skip, filter, switchMap, catchError, tap, map
} from 'rxjs/operators'
import {
    hiscores
} from 'osrs-json-api'
import auth from './auth.json'

// pull this out later
const stableSort = (array: unknown[], cmpFunc: Function): unknown[] => {
    const arrayWrapper = array.map((element, idx): Record<string, unknown> => ({
        element,
        idx
    }))

    // sort the wrappers, breaking sorting ties by using their elements orig index position
    arrayWrapper.sort((
        wrapperA: Record<string, unknown>,
        wrapperB: Record<string, unknown>
    ): number => {
        const cmpDiff = cmpFunc(wrapperA.element, wrapperB.element)
        return cmpDiff === 0
            ? (wrapperA.idx as number) - (wrapperB.idx as number)
            : cmpDiff
    })

    // unwrap and return the elements
    return arrayWrapper.map((wrapper: Record<string, unknown>): unknown => wrapper.element)
}

// osrs constants
const OSRS_SKILLS = {
    ATT: 'attack',
    STR: 'strength',
    DEF: 'defense',
    RANG: 'ranged',
    PRAY: 'prayer',
    MAG: 'magic',
    RC: 'runecrafting',
    CON: 'construction',
    HP: 'hitpoints',
    AGI: 'agility',
    HERB: 'herblore',
    THV: 'thieving',
    CRFT: 'crafting',
    FLE: 'fletching',
    SLAY: 'slayer',
    HNT: 'hunter',
    MINE: 'mining',
    SMTH: 'smithing',
    FSH: 'fishing',
    COOK: 'cooking',
    FIRE: 'firemaking',
    WC: 'woodcutting',
    FARM: 'farming'
}

/* const OSRS_SKILLS = [
    'attack',
    'strength',
    'defense',
    'ranged',
    'prayer',
    'magic',
    'runecrafting',
    'construction',
    'hitpoints',
    'agility',
    'herblore',
    'thieving',
    'crafting',
    'fletching',
    'slayer',
    'hunter',
    'mining',
    'smithing',
    'fishing',
    'cooking',
    'firemaking',
    'woodcutting',
    'farming'
] */

// interface contracts data structures
const EVENT_TYPE = {
    XP: 'XP',
    UNKNOWN: 'UNKNOWN'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EventParticipant extends Record<string, any> {
    ign: string
    id: string
}

interface XpEventParticipant extends EventParticipant {
    skills: XpSkillComponent[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface XpSkillComponent extends Record<string, any> {
    startingXp: number
    endingXp: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ClanEvent extends Record<string, any> {
    name: string
    startingDate: Date
    endingDate: Date
    type: string
    participants: EventParticipant[]
}

interface XpClanEvent extends ClanEvent {
    skills: string[]
}

// top level data structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ServerData extends Record<string, any> {
    settings: {
        admins: string[]
    }

    events: ClanEvent[]
}
const SERVER_DEFAULT_DATA: ServerData = {
    settings: {
        admins: []
    },

    events: []
}

// command interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Command extends Record<string, any> {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    parsed: string
    serverJson: ServerData
}

interface AddEventCommand extends Command {
    name: string
    startingDate: Date
    endingDate: Date
}

// system error
class SystemError extends Error {
    errno: number
}

// create our winston logger
const logger = winston.createLogger({
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

// log any unexpected errors
const logError = (error: Error): void => {
    logger.error('Unexpected error')
    logger.error(error.message)
}

// loads settings json file of server id
// we want to cache our loads
const load$ = (id: string, dirty: boolean): Observable<ServerData> => {
    if (dirty) {
        this.data[id] = from(jsonfile.readFile(`./servers/${id}.json`, {
            reviver: ((key: string, value: unknown): unknown => {
                if (key.toLowerCase().includes('date')) { return new Date(value as string) }
                return value
            })
        }))
            .pipe(
                catchError((error: SystemError): Observable<ServerData> => {
                    if (error.errno === -2) logger.info('Server has no configuration')
                    else {
                        logError(error)
                        logger.error(`Error loading ${id} from disk`)
                    }
                    return of<ServerData>(SERVER_DEFAULT_DATA)
                }),
                publishReplay(1),
                refCount()
            )
    }
    return this.data[id]
}

// saves settings and trigger a load
const save$ = (id: string, json: ServerData): Observable<ServerData> => of<ServerData>(null)
    .pipe(
        switchMap((): Observable<ServerData> => from(jsonfile.writeFile(`./servers/${id}.json`, json))
            .pipe(
                switchMap((): Observable<ServerData> => load$(id, true))
            )),
        tap((): void => {
            logger.debug(`Wrote settings to ${id}`)
        }),
        catchError((error: SystemError): Observable<ServerData> => {
            logError(error)
            logger.error(`Error writing ${id} to disk`)
            return of(SERVER_DEFAULT_DATA)
        })
    )


// event streams
const gClient: discord.Client = new discord.Client()
const ready$ = fromEvent(gClient as unknown as FromEventTarget<void>, 'ready')
const error$ = fromEvent(gClient as unknown as FromEventTarget<Error>, 'error')
const message$ = fromEvent(gClient as unknown as FromEventTarget<discord.Message>, 'message')
const hiscore$ = (ign: string): Observable<JSON> => from(hiscores.getPlayer(ign))

// updates a dictionary entry functionally
// eslint-disable-next-line max-len
const update = (dict: Record<string, unknown>, entry: unknown): Record<string, unknown> => Object.assign({}, dict, entry)
// control filters
const hasAdmin = (command: Command): boolean => command.serverJson.settings.admins.length > 0
// eslint-disable-next-line max-len
const isAdmin = (command: Command): boolean => command.serverJson.settings.admins.includes(command.author.id)
const isValidDate = (date: Date): boolean => date instanceof Date && !Number.isNaN(date.getTime())


// reconnect and notify
const reconnect$: Observable<void> = ready$
    .pipe(
        skip(1)
    )
// connect and print info about server
const connect$: Observable<void> = ready$
    .pipe(
        take(1)
    )

// generic message handler
const filteredMessage$ = (find: string): Observable<Command> => message$
    .pipe(
        // filter our messages with find
        // and necessary discord checks
        filter((msg: discord.Message): boolean => msg.guild
            && msg.guild.available
            && msg.content.toLowerCase().startsWith(find)),

        // create new observable stream
        // containing the original message
        // the command and the server json
        // for error handling of load
        switchMap((msg: discord.Message): Observable<Command> => of<discord.Message>(msg)
            .pipe(
                switchMap((): Observable<Command> => forkJoin(
                    {
                        message: of<discord.Message>(msg),
                        author: of<discord.User>(msg.author),
                        guild: of<discord.Guild>(msg.guild),
                        parsed: of<string>(msg.content.slice(find.length)),
                        serverJson: load$(msg.guild.id, false)
                    }
                )),
                catchError((error: Error): Observable<Command> => {
                    logError(error)
                    return forkJoin(
                        {
                            message: of<discord.Message>(msg),
                            author: of<discord.User>(msg.author),
                            guild: of<discord.Guild>(msg.guild),
                            parsed: of<string>(msg.content.slice(find.length)),
                            serverJson: of<ServerData>(SERVER_DEFAULT_DATA)
                        }
                    )
                })
            )),
        tap((command: Command): void => {
            logger.debug(`message: ${command.message.content}`)
            logger.debug(`author: ${command.author.username}`)
            logger.debug(`guild: ${command.guild.name}`)
            logger.debug(`parsed: ${command.parsed}`)
            logger.silly(`serverJson: ${(JSON.stringify(command.serverJson))}`)
        })
    )

const debug$ = filteredMessage$('!f debug')
    .pipe(
        filter((command: Command): boolean => isAdmin(command))
    )

const debugSub = debug$.subscribe((command: Command): void => {
    logger.info('Debug called')
    logger.debug(JSON.stringify(command.serverJson, null, 4))
})

const addAdmin$ = filteredMessage$('!f add admin')
    .pipe(
        filter((command: Command): boolean => isAdmin(command) || !hasAdmin(command)),
        switchMap((command: Command): Observable<ServerData> => {
            const mentions: string[] = command.message.mentions.members.array()
                .map((member: discord.GuildMember): string => member.id)
            const newSettings: Record<string, unknown> = update(command.serverJson.settings, {
                admins: Array.from(new Set(command.serverJson.settings.admins.concat(mentions)))
            })
            const newData: Record<string, unknown> = update(command.serverJson, {
                settings: newSettings
            })
            logger.debug(`Writing settings to ${command.guild.id}`)
            return save$(command.guild.id, newData as ServerData)
        })
    )

const addAdminSub = addAdmin$.subscribe((data: ServerData): void => {})

const addGenericEvent$ = filteredMessage$('!f add event ')
    .pipe(
        // admins only
        filter((command: Command): boolean => isAdmin(command)),

        // we need at least a name, starting date and end date
        map((command: Command): AddEventCommand => {
            const regexes: RegExp[] = [
                new RegExp('name(?:\\s|)+(.*?)(?:\\s|)+(?:skills|starting|ending|name|$)', 'gim'),
                new RegExp('starting(?:\\s|)+(.*?)(?:\\s|)+(?:skills|starting|ending|name|$)', 'gim'),
                new RegExp('ending(?:\\s|)+(.*?)(?:\\s|)+(?:skills|starting|ending|name|$)', 'gim')
            ]
            const foundRegexes: string[][] = regexes.map(
                (regex: RegExp): string[] => regex.exec(command.parsed)
            )
            const filteredRegexes: string[][] = foundRegexes.filter(
                (results: string[]): boolean => results.length >= 2
            )
            if (filteredRegexes.length !== 3) {
                logger.debug(`Admin ${command.author.username} entered invalid parameters`)
                command.message.reply('Invalid input: requires [name, starting, ending] inputs')
                return null
            }
            const parsedRegexes: string[] = filteredRegexes.map(
                (results: string[]): string => results[1]
            )
            const name: string = parsedRegexes[0]
            const dateA: Date = new Date(parsedRegexes[1])
            const dateB: Date = new Date(parsedRegexes[2])
            const startingDate: Date = dateA <= dateB ? dateA : dateB
            const endingDate: Date = dateA > dateB ? dateA : dateB
            const eventCommand: AddEventCommand = update(command, {
                name,
                startingDate,
                endingDate
            }) as AddEventCommand
            if (!isValidDate(eventCommand.startingDate) || !isValidDate(eventCommand.endingDate)) {
                logger.debug(`Admin ${command.author.username} entered invalid date`)
                command.message.reply('Invalid input: starting date or ending date is invalid')
                return null
            }
            return eventCommand
        }),
        filter((eventCommand: AddEventCommand): boolean => eventCommand !== null),
        tap((eventCommand: AddEventCommand): void => {
            logger.debug(`Admin ${eventCommand.author.username} called add event`)
            logger.debug('Event properties: ')
            logger.debug(`* ${eventCommand.name}`)
            logger.debug(`* ${eventCommand.startingDate.toDateString()}`)
            logger.debug(`* ${eventCommand.endingDate.toDateString()}`)
        })
    )

const addXpEvent$ = addGenericEvent$
    .pipe(
        switchMap((eventCommand: AddEventCommand): Observable<ServerData> => {
            const skillsRegex = new RegExp('skills(?:\\s|)+(.*?)(?:\\s|)+(?:skills|starting|ending|name|$)', 'gim')
            const foundSkills: string[] = skillsRegex.exec(eventCommand.parsed)
            const skills: string = foundSkills.length >= 2 ? foundSkills[1] : null
            if (skills === null) {
                logger.debug(`Admin ${eventCommand.author.id} entered no skills`)
                eventCommand.message.reply('Invalid input: starting date or ending date is invalid')
                return null
            }
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
                logger.debug(`Admin ${eventCommand.author.id} entered some invalid skill names`)
                eventCommand.message.reply(`Invalid input: some skill names entered are invalid\n choices are: [${OSRS_SKILLS.toString}]`)
                return null
            }
            const xpClanEvent: XpClanEvent = {
                name: eventCommand.name,
                startingDate: eventCommand.startingDate,
                endingDate: eventCommand.endingDate,
                type: EVENT_TYPE.XP,
                skills: skillsArr,
                participants: []
            }
            const events: ClanEvent[] = eventCommand.serverJson.events.concat(xpClanEvent)
            const sortedEvents: ClanEvent[] = stableSort(
                events, (eventA: ClanEvent, eventB: ClanEvent): number => eventA.startingDate.getTime() - eventB.startingDate.getTime()
            ) as ClanEvent[]
            const newServerData = update(eventCommand.serverJson, {
                events: sortedEvents
            })
            return save$(eventCommand.guild.id, newServerData as ServerData)
        })
    )

const addXpEventSub = addXpEvent$.subscribe((): void => {})

// log any errors from error stream
const errorSub = error$.subscribe((error: Error): void => {
    logger.error(error.message)
})

const connectSub = connect$.subscribe((): void => {
    logger.info('Connected')
    logger.info('Logged in as:')
    logger.info(`* ${gClient.user.username}`)
    logger.info(`* ${gClient.user.id}`)

    logger.verbose(`In ${gClient.guilds.size} guilds:`)
    gClient.guilds.forEach((guild): void => {
        logger.verbose(`* ${guild.name} (${guild.id})`)
        logger.verbose('* Loading guild json')
        load$(guild.id, true).subscribe((data: ServerData): void => {
            logger.debug(`Loaded json for guild ${guild.id}`)
            logger.silly(`${JSON.stringify(data)}`)
        })
    })
})

const reconnectSub = reconnect$.subscribe(
    logger.info('Reconnected')
)

// log in
this.data = {}
gClient.login(auth.token)
