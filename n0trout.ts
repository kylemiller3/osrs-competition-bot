// ------------------------------//
// OSRS discord bot by n0trout   //
// See LICENSE                   //
// ------------------------------//

import * as discord from 'discord.js'
import * as winston from 'winston'
import * as jsonfile from 'jsonfile'
import {
    fromEvent, from, Observable, of, forkJoin, pipe, observable
} from 'rxjs'
import {
    FromEventTarget
} from 'rxjs/internal/observable/fromEvent'
import {
    publishReplay, refCount, take, skip, filter, switchMap, catchError, tap, mergeMap, map
} from 'rxjs/operators'
import {
    hiscores
} from 'osrs-json-api'
import auth from './auth.json'


// interface contracts data structures
interface EventParticipant {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    command: string
    serverJson: ServerData
    ign: string
    id: string
}

interface ClanEvent {
    name: string
    startDate: Date
    endDate: Date
    type: string
    participants: EventParticipant[]
}

// top level data structure
class ServerData {
    settings: {
        admins: string[]
    }

    events: ClanEvent[]
}
const serverDataDefault: ServerData = {
    settings: {
        admins: []
    },
    events: []
}

// command interface
interface Command {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    parsed: string
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
        this.data = of<Observable<ServerData>>(null)
            .pipe(
                switchMap((): Observable<ServerData> => of<ServerData>(null)
                    .pipe(
                        switchMap((): Observable<ServerData> => from(jsonfile.readFile(`./servers/${id}.json`) as unknown as Observable<ServerData>)),
                        catchError((error: SystemError): Observable<ServerData> => {
                            if (error.errno === -2) logger.info('Server has no configuration')
                            else logError(error)
                            return of<ServerData>(serverDataDefault)
                        })
                    )),
                publishReplay(1),
                refCount()
            )
    }
    return this.data
}

// saves settings and trigger a load
const save$ = (id: string, json: ServerData): Observable<ServerData> => {
    try {
        return from(jsonfile.writeFile(`./servers/${id}.json`, json))
            .pipe(
                switchMap((): Observable<ServerData> => load$(id, true))
            )
    } catch (error) {
        logError(error)
        throw error
    }
}


// event streams
const gClient: discord.Client = new discord.Client()
const ready$ = fromEvent(gClient as unknown as FromEventTarget<void>, 'ready')
const error$ = fromEvent(gClient as unknown as FromEventTarget<Error>, 'error')
const message$ = fromEvent(gClient as unknown as FromEventTarget<discord.Message>, 'message')
const hiscore$ = (ign: string): Observable<JSON> => from(hiscores.getPlayer(ign))

// updates a dictionary entry functionally
const update = (dict: Record<string, unknown>, entry: unknown): Record<string, unknown> => Object.assign({}, dict, entry)
// control filters
const hasAdmin = (command: Command): boolean => command.serverJson.settings.admins.length > 0
const isAdmin = (command: Command): boolean => command.serverJson.settings.admins.includes(command.author.id)

// reconnect and notify
const reconnect$: Observable<void> = ready$
    .pipe(
        skip(5)
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
                            serverJson: of<ServerData>(serverDataDefault)
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
    logger.debug(JSON.stringify(command, null, 4))
})

const addAdmin$ = filteredMessage$('!f add admin')
    .pipe(
        filter((command: Command): boolean => isAdmin(command) || !hasAdmin(command)),
        switchMap((command: Command): Observable<ServerData> => {
            const mentions = command.message.mentions.members.array().map((member: discord.GuildMember): string => member.id)
            const newSettings = update(command.serverJson.settings, {
                admins: Array.from(new Set(command.serverJson.settings.admins.concat(mentions)))
            })
            const newData: object = update(command.serverJson as Record<string, any>, {
                settings: newSettings
            })
            logger.debug(`Writing settings to ${command.guild.id}`)
            return save$(command.guild.id, newData as ServerData)
        })
    )

const addAdminSub = addAdmin$.subscribe((data: ServerData): void => {
    logger.debug('Server data written')
    logger.silly(JSON.stringify(data))
})

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
gClient.login(auth.token)
