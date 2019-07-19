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

// interface contracts data structures
// access controls
interface AccessControl {
    controlFunction: (author: discord.User, serverJson: ServerData) => boolean
    description: string
}

// control filter helpers
const hasAdmin = (serverJson: ServerData): boolean => serverJson.settings.admins.length > 0
// eslint-disable-next-line max-len
const isAdmin = (author: discord.User, serverJson: ServerData): boolean => serverJson.settings.admins.includes(author.id)

// no admins or is admin
const ONLY_UNSET_ADMINS_OR_ADMIN: AccessControl = {
    controlFunction: (
        author: discord.User, serverJson: ServerData
    ): boolean => !hasAdmin(serverJson) || isAdmin(author, serverJson),
    description: 'unconfigured server or admin privileges'
}

// only admins
const ONLY_ADMIN: AccessControl = {
    controlFunction: (
        author: discord.User, serverJson: ServerData
    ): boolean => isAdmin(author, serverJson),
    description: 'admin privleges'
}

const ANY_USER: AccessControl = {
    controlFunction: (): boolean => true,
    description: 'all users'
}

interface BotCommand extends Record<string, unknown> {
    description: string
    accessControl: AccessControl
    parameters: string
    command: string
}

interface BotCommands extends Record<string, unknown> {
    DEBUG: BotCommand
    ADD_ADMIN: BotCommand
    ADD_UPCOMING: BotCommand
    LIST_UPCOMING: BotCommand
    DELETE_UPCOMING: BotCommand
    SIGNUP_UPCOMING: BotCommand
    UNSIGNUP_UPCOMING: BotCommand
    AMISIGNEDUP_UPCOMING: BotCommand
    LISTPARTICIPANTS_UPCOMING: BotCommand
    HELP: BotCommand
}

const BOT_COMMANDS: BotCommands = {
    DEBUG: {
        command: '!f debug',
        description: 'logs debug info to console',
        accessControl: ONLY_ADMIN,
        parameters: 'none'
    },

    ADD_ADMIN: {
        command: '!f add admin ',
        description: 'adds administratior for this guild',
        accessControl: ONLY_UNSET_ADMINS_OR_ADMIN,
        parameters: '(@mentions)'
    },

    ADD_UPCOMING: {
        command: '!f add upcoming ',
        description: 'schedules a new event',
        accessControl: ONLY_ADMIN,
        parameters: '(name starting ending type [xp? skills])'
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
        description: 'signs up for a scheduled event with runescape name (use with \'list upcoming\')',
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

    LISTPARTICIPANTS_UPCOMING: {
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

const EVENT_TYPE = {
    XP: 'XP',
    UNKNOWN: 'UNKNOWN'
}

interface EventParticipant extends Record<string, unknown> {
    rsn: string
    id: string
}

interface XpEventComponent extends Record<string, unknown> {
    name: string
    startingXp: number
    endingXp: number
}

interface XpEventParticipant extends EventParticipant {
    skills: XpEventComponent[]
}

interface ClanEvent extends Record<string, unknown> {
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
interface ServerData extends Record<string, unknown> {
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
interface Command extends Record<string, unknown> {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    input: string
    serverJson: ServerData
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
                        throw error
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
            throw error
        })
    )


// event streams
const gClient: discord.Client = new discord.Client()
const ready$ = fromEvent(gClient as unknown as FromEventTarget<void>, 'ready')
const error$ = fromEvent(gClient as unknown as FromEventTarget<Error>, 'error')
const message$ = fromEvent(gClient as unknown as FromEventTarget<discord.Message>, 'message')
const hiscore$ = (rsn: string): Observable<JSON> => from(hiscores.getPlayer(rsn))
    .pipe(
        publishReplay(1, 10 * 60 * 1000),
        refCount(),
        catchError((error: Error): Observable<JSON> => {
            logError(error)
            return of<JSON>(null)
        })
    )


// updates a dictionary entry functionally
// eslint-disable-next-line max-len
const update = (dict: Record<string, unknown>, entry: unknown): Record<string, unknown> => Object.assign({}, dict, entry)
const isValidDate = (date: Date): boolean => date instanceof Date && !Number.isNaN(date.getTime())


// simple stream subs
// log any errors from error stream
error$.subscribe((error: Error): void => {
    logger.error(error.message)
})

// reconnect and notify
const reconnect$: Observable<void> = ready$
    .pipe(
        skip(1)
    )
reconnect$.subscribe(
    logger.info('Reconnected')
)

// connect and print info about server
const connect$: Observable<void> = ready$
    .pipe(
        take(1)
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
        load$(guild.id, true).subscribe((data: ServerData): void => {
            logger.debug(`Loaded json for guild ${guild.id}`)
            logger.silly(`${JSON.stringify(data)}`)
        })
    })
})

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
                        input: of<string>(msg.content.slice(find.length)),
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
                            input: of<string>(msg.content.slice(find.length)),
                            serverJson: of<ServerData>(SERVER_DEFAULT_DATA)
                        }
                    )
                })
            )),
        tap((command: Command): void => {
            logger.debug(`message: ${command.message.content}`)
            logger.debug(`author: ${command.author.username}`)
            logger.debug(`guild: ${command.guild.name}`)
            logger.debug(`input: ${command.input}`)
            logger.silly(`serverJson: ${(JSON.stringify(command.serverJson))}`)
        })
    )

const debug$ = filteredMessage$(BOT_COMMANDS.DEBUG.command)
    .pipe(
        filter((command: Command): boolean => BOT_COMMANDS.DEBUG.accessControl.controlFunction(
            command.author, command.serverJson
        ))
    )
debug$.subscribe((command: Command): void => {
    logger.info('Debug called')
    logger.debug(JSON.stringify(command.serverJson, null, 4))
})

const addAdmin$ = filteredMessage$(BOT_COMMANDS.ADD_ADMIN.command)
    .pipe(
        filter((command: Command): boolean => BOT_COMMANDS.ADD_ADMIN.accessControl.controlFunction(
            command.author, command.serverJson
        )),
        filter((command: Command): boolean => command.message.mentions.members.array().length > 0),
        switchMap((command: Command): Observable<[ServerData, discord.Message]> => {
            const mentions: string[] = command.message.mentions.members.array()
                .map((member: discord.GuildMember): string => member.id)
            const newSettings: Record<string, unknown> = update(command.serverJson.settings, {
                admins: Array.from(new Set(command.serverJson.settings.admins.concat(mentions)))
            })
            const newData: ServerData = update(command.serverJson, {
                settings: newSettings
            }) as ServerData
            return forkJoin(
                save$(command.guild.id, newData),
                of(command.message)
            )
        })
    )
addAdmin$.subscribe((saveMsgArr: [ServerData, discord.Message]): void => {
    logger.debug('Admin added')
    saveMsgArr[1].reply('admin added')
})

const findFirstRegexesMatch = (regexes: RegExp[], search: string): string[] => {
    const foundRegexes: string[][] = regexes.map(
        (regex: RegExp): string[] => regex.exec(search)
    )
    const filteredRegexes: string[][] = foundRegexes.filter(
        (results: string[]): boolean => results !== null && results.length >= 2
    )
    const parsedStrs: string[] = filteredRegexes.map(
        (results: string[]): string => results[1].trim()
    )
    const nonEmptyStrs: string[] = parsedStrs.filter(
        (str: string): boolean => str.length > 0
    )
    return nonEmptyStrs
}

const eventTermRegex = 'type|skills|starting|ending|name|$'
const commandRegex = (term: string): string => `(?:\\s|)+(.*?)(?:\\s|)+(?:${term})`
const addGenericUpcomingEvent$ = filteredMessage$(BOT_COMMANDS.ADD_UPCOMING.command)
    .pipe(
        filter((command: Command):
        boolean => BOT_COMMANDS.ADD_UPCOMING.accessControl.controlFunction(
            command.author, command.serverJson
        )),
        // we need at least a name, starting date and end date
        map((command: Command): [Command, ClanEvent] => {
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
                ? EVENT_TYPE.UNKNOWN
                : EVENT_TYPE[inputType]

            if (type === EVENT_TYPE.UNKNOWN) {
                logger.debug(`Admin ${command.author.username} entered invalid event type`)
                command.message.reply(`unknown event type specified\n${BOT_COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            const clanEvent: ClanEvent = {
                name: parsedRegexes[0],
                startingDate,
                endingDate,
                type,
                participants: []
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
        filter((commandEventArr: [Command, ClanEvent]): boolean => commandEventArr !== null),
        tap((commandEventArr: [Command, ClanEvent]): void => {
            logger.debug(`Admin ${commandEventArr[0].author.username} called add event`)
            logger.debug('Event properties: ')
            logger.debug(`* ${commandEventArr[1].name}`)
            logger.debug(`* ${commandEventArr[1].startingDate.toDateString()}`)
            logger.debug(`* ${commandEventArr[1].endingDate.toDateString()}`)
            logger.debug(`* ${commandEventArr[1].type}`)
        })
    )

const addUpcomingXpEvent$ = addGenericUpcomingEvent$
    .pipe(
        filter((commandEventArr: [Command, ClanEvent]): boolean => commandEventArr[1].type
            === EVENT_TYPE.XP),
        switchMap((commandEventArr: [Command, ClanEvent]):
        Observable<[ServerData, discord.Message]> => {
            const compoundRegex: string = commandRegex(eventTermRegex)
            const skillsRegex = [
                new RegExp(`skills${compoundRegex}`, 'gim')
            ]
            const parsedRegex = findFirstRegexesMatch(skillsRegex, commandEventArr[0].input)
            if (parsedRegex.length !== skillsRegex.length) {
                logger.debug(`Admin ${commandEventArr[0].author.id} entered no skills`)
                commandEventArr[0].message.reply(`no skills specified\n${BOT_COMMANDS.ADD_UPCOMING.parameters}`)
                return of<[ServerData, discord.Message]>(null)
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
                return of<[ServerData, discord.Message]>(null)
            }
            const xpClanEvent: XpClanEvent = update(commandEventArr[1], {
                skills: skillsArr
            }) as XpClanEvent
            const events: ClanEvent[] = commandEventArr[0].serverJson.events.concat(xpClanEvent)
            const sortedEvents: ClanEvent[] = stableSort(
                events, (eventA: ClanEvent, eventB: ClanEvent):
                number => eventA.startingDate.getTime() - eventB.startingDate.getTime()
            ) as ClanEvent[]
            const newServerData: ServerData = update(commandEventArr[0].serverJson, {
                events: sortedEvents
            }) as ServerData
            return forkJoin(
                save$(commandEventArr[0].guild.id, newServerData),
                of<discord.Message>(commandEventArr[0].message)
            )
        }),
        filter((saveMsgArr: [ServerData, discord.Message]): boolean => saveMsgArr !== null)
    )
addUpcomingXpEvent$.subscribe((saveMsgArr: [ServerData, discord.Message]): void => {
    logger.debug('Event added')
    saveMsgArr[1].reply('event added')
})

const getUpcomingEvents = (events: ClanEvent[]): ClanEvent[] => events.filter(
    (event: ClanEvent): boolean => event.startingDate > new Date()
)
const listUpcomingEvent$ = filteredMessage$(BOT_COMMANDS.LIST_UPCOMING.command)
    .pipe(
        filter((command: Command):
        boolean => BOT_COMMANDS.LIST_UPCOMING.accessControl.controlFunction(
            command.author, command.serverJson
        )),
        map((command: Command): void => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.serverJson.events)
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
listUpcomingEvent$.subscribe((): void => {
    logger.debug('List upcoming events called')
})

const deleteUpcomingEvent$ = filteredMessage$(BOT_COMMANDS.DELETE_UPCOMING.command)
    .pipe(
        filter((command: Command):
        boolean => BOT_COMMANDS.DELETE_UPCOMING.accessControl.controlFunction(
            command.author, command.serverJson
        )),
        filter((command: Command): boolean => isAdmin(command.author, command.serverJson)),
        tap((): void => {
            logger.debug('Admin called delete upcoming event')
        }),
        switchMap((command: Command): Observable<[ServerData, discord.Message]> => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.serverJson.events)
            const idxToRemove: number = parseInt(command.input, 10)
            const filteredEvents: ClanEvent[] = upcomingEvents.filter(
                (event: ClanEvent, idx: number): boolean => idx !== idxToRemove
            )
            if (Number.isNaN(idxToRemove) || filteredEvents.length === upcomingEvents.length) {
                logger.debug(`Admin did not specify index (${idxToRemove})`)
                command.message.reply(`invalid index ${idxToRemove}\n${BOT_COMMANDS.DELETE_UPCOMING.parameters}`)
                return of<[ServerData, discord.Message]>(null)
            }
            const newServerData: ServerData = update(command.serverJson, {
                events: filteredEvents
            }) as ServerData
            return forkJoin(
                save$(command.guild.id, newServerData),
                of<discord.Message>(command.message)
            )
        }),
        filter((saveMsgArr: [ServerData, discord.Message]): boolean => saveMsgArr !== null)
    )
deleteUpcomingEvent$.subscribe((saveMsgArr: [ServerData, discord.Message]): void => {
    logger.debug('Event deleted')
    saveMsgArr[1].reply('event deleted')
})

const userIdToName = (guild: discord.Guild, userId: string): string => {
    const members: discord.Collection<string, discord.GuildMember> = guild.members.filter(
        (member: discord.GuildMember): boolean => member.id === userId
    )
    const name: string = members.size > 0 ? members.first().nickname : null
    return name
}
const signupTermRegex = 'event|rsn|$'
const signupUpcomingEvent$ = filteredMessage$(BOT_COMMANDS.SIGNUP_UPCOMING.command)
    .pipe(
        filter((command: Command):
        boolean => BOT_COMMANDS.SIGNUP_UPCOMING.accessControl.controlFunction(
            command.author, command.serverJson
        )),
        switchMap((command: Command): Observable<[ServerData, discord.Message, JSON]> => {
            const compoundRegex: string = commandRegex(signupTermRegex)
            const skillsRegex = [
                new RegExp(`event${compoundRegex}`, 'gim'),
                new RegExp(`rsn${compoundRegex}`, 'gim')
            ]
            const parsedRegex = findFirstRegexesMatch(skillsRegex, command.input)
            if (parsedRegex.length !== skillsRegex.length) {
                logger.debug(`${command.author.id} entered invalid signup data`)
                command.message.reply(`invalid input\n${BOT_COMMANDS.SIGNUP_UPCOMING.parameters}`)
                return of<[ServerData, discord.Message, JSON]>(null)
            }

            // get upcoming events
            // if index is out of range return
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.serverJson.events)
            const idxToModify: number = Number.parseInt(parsedRegex[0], 10)
            const userIdToAdd: string = command.author.id
            const rsnToAdd: string = parsedRegex[1]
            if (Number.isNaN(idxToModify) || idxToModify >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToModify})`)
                command.message.reply(`invalid index ${idxToModify}\n${BOT_COMMANDS.SIGNUP_UPCOMING.parameters}`)
                return of<[ServerData, discord.Message, JSON]>(null)
            }

            // get event to modify and its type
            const eventToModify: ClanEvent = upcomingEvents[idxToModify]
            const eventToModifyType: string = eventToModify.type

            // is the player already added?
            const filteredParticipants: EventParticipant[] = eventToModify.participants.filter(
                (participant: EventParticipant): boolean => participant.rsn === rsnToAdd
                    || participant.id === userIdToAdd
            )
            if (filteredParticipants.length > 0) {
                logger.debug('Player already exists')
                const idSignedup: string = filteredParticipants[0].id
                const playerSignedup: string = filteredParticipants[0].rsn
                command.message.reply(`<@${idSignedup}> already signed up ${playerSignedup}`)
                return of<[ServerData, discord.Message, JSON]>(null)
            }

            // get the participant to modify and return
            // or create a new one and continue
            const participantToAdd = {
                rsn: rsnToAdd,
                id: command.author.id
            }

            if (eventToModifyType === EVENT_TYPE.XP) {
                // TODO: refactor this to a function
                // add skills to user
                const skills: XpEventComponent[] = (eventToModify as XpClanEvent).skills.map(
                    (skillName: string): XpEventComponent => ({
                        name: skillName,
                        startingXp: -1,
                        endingXp: -1
                    })
                )
                const xpParticipant: XpEventParticipant = update(participantToAdd, {
                    skills
                }) as XpEventParticipant

                // add participant to event array
                const newEventParticipants: EventParticipant[] = eventToModify.participants.concat(
                    [xpParticipant]
                )

                // create a new event
                // create new event list
                // create new server data
                const newEvent: ClanEvent = update(eventToModify, {
                    participants: newEventParticipants
                }) as ClanEvent
                const newEvents: ClanEvent[] = command.serverJson.events.map(
                    (event: ClanEvent, idx: number): ClanEvent => {
                        if (idx === idxToModify) {
                            return newEvent
                        }
                        return event
                    }
                )
                const newData: ServerData = update(command.serverJson, {
                    events: newEvents
                }) as ServerData

                return forkJoin(
                    of<ServerData>(newData),
                    of<discord.Message>(command.message),
                    hiscore$(rsnToAdd)
                )
            }
            return of<[ServerData, discord.Message, JSON]>(null)
        }),
        filter((dataMsgHiArr: [ServerData, discord.Message, JSON]):
        boolean => dataMsgHiArr !== null),

        switchMap((dataMsgHiArr: [ServerData, discord.Message, JSON]):
        Observable<[ServerData, discord.Message]> => {
            if (dataMsgHiArr[2] === null) {
                logger.debug('User entered invalid RSN')
                dataMsgHiArr[1].reply('cannot find RSN on hiscores')
                return of<[ServerData, discord.Message]>(null)
            }
            return forkJoin(
                save$(dataMsgHiArr[1].guild.id, dataMsgHiArr[0]),
                of<discord.Message>(dataMsgHiArr[1])
            )
        }),
        filter((saveMsgArr: [ServerData, discord.Message]): boolean => saveMsgArr !== null)
    )
signupUpcomingEvent$.subscribe((saveMsgArr: [ServerData, discord.Message]): void => {
    logger.debug('Signup called')
    saveMsgArr[1].reply('signed up for event')
})

const unsignupUpcomingEvent$ = filteredMessage$(BOT_COMMANDS.UNSIGNUP_UPCOMING.command)
    .pipe(
        filter((command: Command):
        boolean => BOT_COMMANDS.UNSIGNUP_UPCOMING.accessControl.controlFunction(
            command.author, command.serverJson
        )),
        switchMap((command: Command): Observable<[ServerData, discord.Message]> => {
            // get upcoming events
            // if index is out of range return
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.serverJson.events)
            const idxToModify: number = Number.parseInt(command.input, 10)
            if (Number.isNaN(idxToModify) || idxToModify >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToModify})`)
                command.message.reply(`invalid index ${idxToModify}\n${BOT_COMMANDS.UNSIGNUP_UPCOMING.parameters}`)
                return of<[ServerData, discord.Message]>(null)
            }

            // does the event to modify contain our user?
            const eventToModify: ClanEvent = upcomingEvents[idxToModify]
            const participantCount: number = eventToModify.participants.length
            const newEventParticipants: EventParticipant[] = eventToModify.participants.filter(
                (participant: EventParticipant): boolean => participant.id !== command.author.id
            )

            // user was not signed up
            if (participantCount === newEventParticipants.length) {
                logger.debug('User was not signed up')
                command.message.reply('you were not signed up for this event')
                return of<[ServerData, discord.Message]>(null)
            }

            // create a new event
            // create new event list
            // create new server data
            const newEvent: ClanEvent = update(eventToModify, {
                participants: newEventParticipants
            }) as ClanEvent
            const newEvents: ClanEvent[] = command.serverJson.events.map(
                (event: ClanEvent, idx: number): ClanEvent => {
                    if (idx === idxToModify) {
                        return newEvent
                    }
                    return event
                }
            )
            const newData: ServerData = update(command.serverJson, {
                events: newEvents
            }) as ServerData

            return forkJoin(
                save$(command.guild.id, newData),
                of<discord.Message>(command.message)
            )
        }),
        filter((saveMsgArr: [ServerData, discord.Message]): boolean => saveMsgArr !== null)
    )
unsignupUpcomingEvent$.subscribe((saveMsgArr: [ServerData, discord.Message]): void => {
    logger.debug('Unsignup called')
    saveMsgArr[1].reply('removed from event')
})

const amISignedUp$ = filteredMessage$(BOT_COMMANDS.AMISIGNEDUP_UPCOMING.command)
    .pipe(
        filter((command: Command):
        boolean => BOT_COMMANDS.AMISIGNEDUP_UPCOMING.accessControl.controlFunction(
            command.author, command.serverJson
        )),
        map((command: Command): void => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.serverJson.events)
            const idxToCheck: number = Number.parseInt(command.input, 10)
            if (Number.isNaN(idxToCheck) || idxToCheck >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToCheck})`)
                command.message.reply(`invalid index ${idxToCheck}\n${BOT_COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`)
                return
            }

            // does the event to modify contain our user?
            const eventToCheck: ClanEvent = upcomingEvents[idxToCheck]
            const filteredEventParticipants: EventParticipant[] = eventToCheck.participants.filter(
                (participant: EventParticipant): boolean => participant.id === command.author.id
            )

            const filteredParticipant: EventParticipant = filteredEventParticipants.length > 0
                ? filteredEventParticipants[0] : null
            const reply: string = filteredParticipant !== null
                ? `you are signed up with RSN: ${filteredParticipant.rsn}`
                : 'you are not signed up'
            command.message.reply(reply)
        })
    )
amISignedUp$.subscribe((): void => {
    logger.debug('AmISignedUp Called')
})

const listParticipant$ = filteredMessage$(BOT_COMMANDS.LISTPARTICIPANTS_UPCOMING.command)
    .pipe(
        filter((command: Command):
        boolean => BOT_COMMANDS.LISTPARTICIPANTS_UPCOMING.accessControl.controlFunction(
            command.author, command.serverJson
        )),
        map((command: Command): void => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.serverJson.events)
            const idxToCheck: number = Number.parseInt(command.input, 10)
            if (Number.isNaN(idxToCheck) || idxToCheck >= upcomingEvents.length) {
                logger.debug(`User did not specify index (${idxToCheck})`)
                command.message.reply(`invalid index ${idxToCheck}\n${BOT_COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`)
                return
            }

            const eventToList: ClanEvent = upcomingEvents[idxToCheck]
            const formattedStr: string = eventToList.participants.map(
                (participant: EventParticipant, idx: number): string => {
                    const nickname: string = userIdToName(command.guild, participant.id)
                    return `\n${idx}: ${nickname} signed up ${participant.rsn}`
                }
            ).join('')

            const reply: string = eventToList.participants.length > 0
                ? `participants:${formattedStr}`
                : 'no participants'
            command.message.reply(reply)
        })
    )
listParticipant$.subscribe((): void => {
    logger.debug('ListParticipants called')
})

const help$ = filteredMessage$(BOT_COMMANDS.HELP.command)
    .pipe(
        filter((command: Command): boolean => BOT_COMMANDS.HELP.accessControl.controlFunction(
            command.author, command.serverJson
        )),
        map((command: Command): void => {
            const commandValues: BotCommand[] = Object.keys(BOT_COMMANDS).map(
                (key: string): BotCommand => BOT_COMMANDS[key] as BotCommand
            )
            const outterStrs: string[] = commandValues.map((commandInfo: BotCommand): string => {
                const innerStrs: string[] = [
                    `\n'${commandInfo.command}'`,
                    `\ndescription: ${commandInfo.description}`,
                    `\naccess control: ${commandInfo.accessControl.description}`,
                    `\nparameters: ${commandInfo.parameters}`
                ]
                return innerStrs.join('')
            })
            const formattedStr = outterStrs.join('\n')
            logger.debug(formattedStr)
            command.message.reply(formattedStr, {
                code: true
            })
        })
    )
help$.subscribe((): void => {
    logger.debug('Help called')
})

// log in
this.data = {}
gClient.login(auth.token)
