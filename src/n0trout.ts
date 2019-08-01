// ------------------------------//
// OSRS discord bot by n0trout   //
// See LICENSE                   //
// ------------------------------//

import * as discord from 'discord.js'

import {
    fromEvent, Observable, of, forkJoin, merge,
} from 'rxjs'
import {
    take, skip, filter, switchMap, catchError, tap, map, share,
} from 'rxjs/operators'
import {
    hiscores,
} from 'osrs-json-api'
import { EventEmitter } from 'events'
import uuid from 'uuidv4'
import { runescape } from './runescape'
import { bot } from './bot'
import { utils } from './utils'
import auth from './auth.json'

/**
* @description Contract containing mapped input data
*/
interface Input extends Record<string, unknown> {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    input: string
}

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

//--------
// Helpers
//--------

/**
 * @function
 * @description Gets all upcoming events and in flight events
 * @param {runescape.Event[]} events ClanEvents source
 * @returns {runescape.Event[]} The array of upcoming ClanEvents
 */
const getUpcomingAndInFlightEvents = (events: runescape.Event[]):
runescape.Event[] => events.filter(
    (event: runescape.Event):
    boolean => utils.isInPast(event.endingDate)
)

/**
     * @function
     * @description Gets all upcoming events
     * @param {runescape.Event[]} events ClanEvents source
     * @returns {runescape.Event[]} The array of upcoming ClanEvents
     */
const getUpcomingEvents = (events: runescape.Event[]):
runescape.Event[] => events.filter(
    (event: runescape.Event):
    boolean => utils.isInPast(event.startingDate)
)

const updateSettings = (
    oldData: bot.Data,
    updatedSettings: bot.Settings
): bot.Data => utils.update(oldData, {
    settings: updatedSettings,
}) as bot.Data

const updateEvent = (
    oldData: bot.Data,
    updatedEvent: runescape.Event
): bot.Data => {
    const newEvents: runescape.Event[] = oldData.events.map(
        (event: runescape.Event): runescape.Event => {
            if (event.id === updatedEvent.id) return updatedEvent
            return event
        }
    )
    const newData: bot.Data = utils.update(oldData, {
        events: newEvents,
    }) as bot.Data
    return newData
}

const deleteEvent = (
    oldData: bot.Data,
    eventToDelete: runescape.Event
): bot.Data => {
    const newEvents: runescape.Event[] = oldData.events.filter(
        (event: runescape.Event):
        boolean => event.id !== eventToDelete.id
    )
    const newData: bot.Data = utils.update(oldData, {
        events: newEvents,
    }) as bot.Data
    return newData
}

const updateParticipant = (
    oldData: bot.Data,
    oldEvent: runescape.Event,
    updatedParticipant: runescape.Participant
): bot.Data => {
    const newParticipants: runescape.Participant[] = oldEvent.participants.map(
        (participant: runescape.Participant):
        runescape.Participant => {
            if (participant.discordId === updatedParticipant.discordId) return updatedParticipant
            return participant
        }
    )
    const newEvent: runescape.Event = utils.update(oldEvent, {
        participants: newParticipants,
    }) as runescape.Event
    return updateEvent(oldData, newEvent)
}

const signupParticipant = (
    oldData: bot.Data,
    oldEvent: runescape.Event,
    newParticipant: runescape.Participant
): bot.Data => {
    const foundParticipant: runescape.Participant = oldEvent.participants.find(
        (participant: runescape.Participant):
        boolean => participant.discordId === newParticipant.discordId
    )
    if (foundParticipant !== undefined) return oldData
    const newParticipants: runescape.Participant[] = oldEvent.participants.concat(newParticipant)
    const newEvent: runescape.Event = utils.update(oldEvent, {
        participants: newParticipants,
    }) as runescape.Event
    return updateEvent(oldData, newEvent)
}

const unsignupParticipant = (
    oldData: bot.Data,
    oldEvent: runescape.Event,
    participantToRemove: runescape.Participant
): bot.Data => {
    const newParticipants: runescape.Participant[] = oldEvent.participants.filter(
        (participant: runescape.Participant):
        boolean => participant.discordId !== participantToRemove.discordId
    )
    const newEvent: runescape.Event = utils.update(oldEvent, {
        participants: newParticipants,
    }) as runescape.Event
    return updateEvent(oldData, newEvent)
}

const setRunescapeAccountCompetitionInfo = (
    oldData: bot.Data,
    oldEvent: runescape.Event,
    oldParticipant: runescape.Participant,
    oldAccountInfo: runescape.CompetitiveAccountInfo,
    hiscore: hiscores.LookupResponse,
    starting: boolean
): bot.Data => {
    const newAccountInfo: runescape.CompetitiveAccountInfo = starting
        ? utils.update(oldAccountInfo, {
            starting: hiscore,
        }) as runescape.CompetitiveAccountInfo
        : utils.update(oldAccountInfo, {
            ending: hiscore,
        }) as runescape.CompetitiveAccountInfo
    const newAccountInfos:
    runescape.CompetitiveAccountInfo[] = oldParticipant.runescapeAccounts.map(
        (accountInfo: runescape.CompetitiveAccountInfo):
        runescape.CompetitiveAccountInfo => {
            if (accountInfo.rsn === oldAccountInfo.rsn) return newAccountInfo
            return accountInfo
        }
    )
    const newParticipant = utils.update(oldParticipant, {
        runescapeAccounts: newAccountInfos,
    }) as runescape.Participant
    return updateParticipant(oldData, oldEvent, newParticipant)
}

/**
* @function
* @description Converts a users Discord Id to Guild nickname
* @param {discord.Guild} guild  The guild to use for user's nickname
* @param {string} userId The Discord Id to lookup
* @returns {string} The user's Guild nickname
*/
const userIdToDisplayName = (guild: discord.Guild, userId: string):
string => {
    if (!guild.available) return '(guild unavailable)'
    const member: discord.GuildMember = guild.members.find(
        (m: discord.GuildMember):
        boolean => m.id === userId
    )
    if (member === undefined) return '(unknown)'
    return member.displayName
}

const sendChannelMessage = (
    guild: discord.Guild,
    channelId: string,
    message: string,
    options: discord.MessageOptions
): void => {
    if (!guild.available) return
    const channel: discord.TextChannel = guild.channels.get(channelId) as discord.TextChannel
    if (channel === undefined || channel.type !== 'text') return
    utils.logger.debug('Sending message to Guild')
    channel.send(message, options)
}

/**
 * @function
 * @description Notifies the users of a Guild signed up for a specific event
 * @param {runescape.Event} event The event to notify participants of
 * @param {discord.Guild} guild The guild to notify
 * @param {string} channelId The channel to send the notification
 * @param {string} message The message to send
 */
const notifyClanEvent = (
    clanEvent: runescape.Event,
    guild: discord.Guild,
    channelId: string,
    message: string
): void => {
    const participants: string[] = clanEvent.participants.map(
        (participant: runescape.Participant): string => participant.discordId
    )
    const mentions: string = participants.map(
        (participant: string): string => `<@${participant}>`
    ).join(', ')
    sendChannelMessage(guild, channelId, `event '${clanEvent.name}' ${message} ${mentions}`, null)
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
const setTimerTwoHoursBefore = (oldEvent: runescape.Event, guild: discord.Guild):
NodeJS.Timeout => {
    const now: Date = new Date()
    const twoHoursBeforeStart: Date = new Date(oldEvent.startingDate.getTime())
    twoHoursBeforeStart.setHours(twoHoursBeforeStart.getHours() - 2)
    return setTimeout((): void => {
        const data: bot.Data = bot.load(guild.id, false)
        const foundEvent: runescape.Event = data.events.find(
            (event: runescape.Event): boolean => event.id === oldEvent.id
        )
        if (foundEvent === undefined) return
        notifyClanEvent(foundEvent, guild, data.settings.notificationChannelId, 'will begin within 2 hours')
        // mark 2 hour warning as completed
        const newEvent: runescape.Event = utils.update(foundEvent, {
            hasNotifiedTwoHourWarning: true,
        }) as runescape.Event
        const newData: bot.Data = updateEvent(data, newEvent)
        bot.save(guild.id, newData)
    }, twoHoursBeforeStart.getTime() - now.getTime())
}

const updateHiscores = (event: runescape.Event, guild: discord.Guild, starting: boolean): void => {
    event.participants.forEach((participant: runescape.Participant): void => {
        const account$ = participant.runescapeAccounts.map(
            (account: runescape.CompetitiveAccountInfo):
            Observable<[
                hiscores.LookupResponse,
                runescape.CompetitiveAccountInfo
            ]> => forkJoin([
                runescape.hiscores$(account.rsn),
                of(account),
            ]).pipe(
                catchError(
                    (error: Error):
                    Observable<[
                        hiscores.LookupResponse,
                        runescape.CompetitiveAccountInfo
                    ]> => {
                        utils.logError(error)
                        return forkJoin([
                            of(null),
                            of(account),
                        ])
                    }
                )
            )
        )
        forkJoin(account$).subscribe(
            (responses: [
                hiscores.LookupResponse,
                runescape.CompetitiveAccountInfo
            ][]): void => {
                responses.forEach(
                    (response: [
                        hiscores.LookupResponse,
                        runescape.CompetitiveAccountInfo
                    ]): void => {
                        const hiscore: hiscores.LookupResponse = response[0]
                        const account: runescape.CompetitiveAccountInfo = response[1]
                        const data: bot.Data = bot.load(guild.id, false)
                        const events: runescape.Event[] = data.events
                        const foundEvent: runescape.Event = events.find(
                            (e: runescape.Event): boolean => e.id === event.id
                        )
                        const newData = setRunescapeAccountCompetitionInfo(
                            data,
                            foundEvent,
                            participant,
                            account,
                            hiscore,
                            starting
                        )
                        bot.save(guild.id, newData)
                    }
                )
            }
        )
    })
}

/**
 * @function
 * @description Adds a global ClanEvent start timer and notifies the Guild of the event on fire
 * @param clanEvent The ClanEvent to add timers for
 * @param guild The Guild to notify
 * @returns {NodeJS.Timeout} The global timer handle
 */
const setTimerStart = (oldEvent: runescape.Event, guild: discord.Guild):
NodeJS.Timeout => {
    const now: Date = new Date()
    return setTimeout((): void => {
        const data: bot.Data = bot.load(guild.id, false)
        const foundEvent: runescape.Event = data.events.find(
            (event: runescape.Event): boolean => event.id === oldEvent.id
        )
        if (foundEvent === undefined) return
        notifyClanEvent(foundEvent, guild, data.settings.notificationChannelId, 'has started')
        // mark start date as completed
        const newEvent: runescape.Event = utils.update(foundEvent, {
            hasNotifiedStarted: true,
        }) as runescape.Event
        const newData: bot.Data = updateEvent(data, newEvent)
        bot.save(guild.id, newData)

        if (foundEvent.type === EVENT_TYPE.COMPETITIVE) {
            // pull new hiscores
            updateHiscores(foundEvent, guild, true)
        }
    }, oldEvent.startingDate.getTime() - now.getTime())
}

/**
 * @function
 * @description Adds a global ClanEvent end timer and notifies the Guild of the event on fire
 * @param clanEvent The ClanEvent to add timers for
 * @param guild The Guild to notify
 * @param guildData The Bot.Database to update on notification
 * @returns {NodeJS.Timeout} The global timer handle
 */
function setTimerEnd(oldEvent: runescape.Event, guild: discord.Guild):
NodeJS.Timeout {
    const now: Date = new Date()
    return setTimeout((): void => {
        const data: bot.Data = bot.load(guild.id, false)
        const foundEvent: runescape.Event = data.events.find(
            (event: runescape.Event): boolean => event.id === oldEvent.id
        )
        if (foundEvent === undefined) return

        notifyClanEvent(foundEvent, guild, data.settings.notificationChannelId, 'has ended')
        // mark end date as completed
        const newEvent: runescape.Event = utils.update(foundEvent, {
            hasNotifiedEnded: true,
        }) as runescape.Event
        const newData: bot.Data = updateEvent(data, newEvent)
        bot.save(guild.id, newData)

        if (foundEvent.type === EVENT_TYPE.COMPETITIVE) {
            // pull new hiscores
            updateHiscores(foundEvent, guild, false)
        }
    }, oldEvent.endingDate.getTime() - now.getTime())
}


/**
 * @function
 * @description Gets events that have not yet started or warned about
 * @param {bot.Data} guildData The Bot.Database to check
 * @returns {runescape.Event[]} The array of ongoing clan events for Guild id
 */
const getUnnotifiedEvents = (guildData: bot.Data):
runescape.Event[] => guildData.events.filter(
    (event: runescape.Event): boolean => !event.hasNotifiedTwoHourWarning
    || !event.hasNotifiedStarted
    || !event.hasNotifiedEnded
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

const getTotalEventGain = (
    participant: runescape.Participant,
    event: runescape.Event,
    tracking: runescape.TrackingEnum,
): number => {
    switch (tracking) {
        case 'skills': {
            if (event.tracking.skills === null) return 0
            const xps: number[] = participant.runescapeAccounts.map(
                (account: runescape.CompetitiveAccountInfo):
                number => {
                    const skillsComponents:
                    hiscores.SkillComponent[][] = event.tracking[tracking].map(
                        (key: string):
                        hiscores.SkillComponent[] => [
                            account.starting[tracking][key],
                            account.ending[tracking][key],
                        ]
                    )
                    const xpDiff = skillsComponents.map(
                        (startEnd: hiscores.SkillComponent[]):
                        number => startEnd[1].xp - startEnd[0].xp
                    )
                    const xpGain = xpDiff.reduce((acc, x): number => acc + x)
                    return xpGain
                }
            )
            const xp = xps.reduce((acc: number, x: number): number => acc + x)
            return xp
        }

        case 'bh':
        case 'clues':
        case 'lms': {
            if (event.tracking.bh === null
                && event.tracking.clues === null
                && event.tracking.lms === null) return 0
            const gains: number[] = participant.runescapeAccounts.map(
                (account: runescape.CompetitiveAccountInfo): number => {
                    const rankAndScoreComponents:
                    hiscores.RankAndScoreComponent[][] = (
                        event.tracking[tracking] as unknown[]
                    ).map(
                        (key: string):
                        hiscores.RankAndScoreComponent[] => [
                            account.starting[tracking][key],
                            account.ending[tracking][key],
                        ]
                    )
                    const clueDiff = rankAndScoreComponents.map(
                        (startEnd: hiscores.RankAndScoreComponent[]):
                        number => startEnd[1].score - startEnd[0].score
                    )
                    const clueGain = clueDiff.reduce((acc, x): number => acc + x)
                    return clueGain
                }
            )
            const gain = gains.reduce((acc: number, x: number): number => acc + x)
            return gain
        }
        default:
            return 0
    }
}

//-------------
// Global state
//
//-------------

/**
 * @description Global discord client
 * @type {discord.Client}
 * @constant
 */
const gClient: discord.Client = new discord.Client()

const timers: Record<string, NodeJS.Timeout[]> = {}

/**
 * @description Ending regex terminator for command SIGNUP_UPCOMING
 * @type {string}
 * @constant
 */
const signupTermRegex = 'rsn|$'

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

//----------------------
// Observables & helpers
//
//----------------------

/**
 * @description Observable of discord message events
 * @type {Observable<discord.Message>}
 * @constant
 */
const message$: Observable<discord.Message> = fromEvent(gClient as unknown as EventEmitter, 'message')

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
 * @function
 * @description A new Observable of messages containing find
 * @param {string} find The excitation string
 * @returns {Observable<Input>} Observable of the transformed Input object
 */
const filteredMessage$ = (botCommand: bot.Command): Observable<Input> => message$
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
        switchMap((msg: discord.Message): Observable<Input> => of<discord.Message>(msg)
            .pipe(
                map((): Input => {
                    const input: Input = {
                        message: msg,
                        author: msg.author,
                        guild: msg.guild,
                        input: msg.content.slice(botCommand.command.length),
                    }
                    return input
                })
                // we probably want to die on load/save errors
                // catchError((error: Error): Observable<Input> => {
                //     utils.logError(error)
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
        tap((command: Input): void => {
            utils.logger.debug(`message: ${command.message.content}`)
            utils.logger.debug(`author: ${command.author.username}`)
            utils.logger.debug(`guild: ${command.guild.name}`)
            utils.logger.debug(`input: ${command.input}`)
        }),
        filter((command: Input): boolean => botCommand.accessControl.controlFunction(
            command.author.id, bot.load(command.guild.id, false)
        ))
    )

/**
 * @description An Observable that handles the DEBUG command
 * @type {Observable<Input>}
 * @constant
 */
const debug$: Observable<Input> = filteredMessage$(bot.COMMANDS.DEBUG)

/**
 * @description An Observable that handles the ADD_ADMIN command
 * @type {Observable<any>}
 * @constant
 */
const addAdmin$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.ADD_ADMIN
)
    .pipe(
        filter(
            (command: Input):
            boolean => command.message.mentions.members.array().length > 0
        ),
    )


/**
 * @description An Observable that handles the ADD_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const prepareUpcomingGenericEvent$: Observable<[Input, runescape.Event]> = filteredMessage$(
    bot.COMMANDS.ADD_UPCOMING
)
    .pipe(
        // we need at least a name, starting date and end date, and type
        map((command: Input): [Input, runescape.Event] => {
            const oldData: bot.Data = bot.load(command.guild.id, false)

            // let's only allow 10 upcoming events per Guild
            const upcomingEvents: runescape.Event[] = getUpcomingEvents(oldData.events)
            if (upcomingEvents.length >= 10) {
                utils.logger.debug(`Guild ${command.guild.name} added too many events`)
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
                utils.logger.debug(`Admin ${command.author.username} entered invalid event name`)
                command.message.reply(`invalid event name\n${bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            if (parsedRegexes[1] === null) {
                utils.logger.debug(`Admin ${command.author.username} entered invalid starting date`)
                command.message.reply(`invalid starting date\n${bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            if (parsedRegexes[2] === null) {
                utils.logger.debug(`Admin ${command.author.username} entered invalid ending date`)
                command.message.reply(`invalid ending date\n${bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            if (parsedRegexes[3] === null) {
                utils.logger.debug(`Admin ${command.author.username} entered invalid type`)
                command.message.reply(`invalid type\n${bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }

            const dateA: Date = new Date(parsedRegexes[1])
            const dateB: Date = new Date(parsedRegexes[2])
            const startingDate: Date = dateA <= dateB ? dateA : dateB
            const endingDate: Date = dateA > dateB ? dateA : dateB

            const inputType: string = parsedRegexes[3].toUpperCase()
            if (EVENT_TYPE[inputType] === undefined) {
                utils.logger.debug(`Admin ${command.author.username} entered invalid event type`)
                command.message.reply(`invalid event type\n${bot.COMMANDS.ADD_UPCOMING.parameters}`)
                return null
            }
            const tracking: runescape.Tracking = {
                skills: null,
                bh: null,
                clues: null,
            }
            const type = EVENT_TYPE[inputType]
            const clanEvent: runescape.Event = {
                id: uuid(),
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
            if (!utils.isValidDate(dateA) || !utils.isValidDate(dateB)) {
                utils.logger.debug(`Admin ${command.author.username} entered invalid date`)
                command.message.reply('starting date or ending date is invalid use IS0 8601 standard')
                return null
            }
            const now: Date = new Date()
            if (startingDate <= now) {
                utils.logger.debug(`Admin ${command.author.username} entered a start date in the past`)
                command.message.reply('cannot start an event in the past')
                return null
            }
            const threeWeeksFromNow: Date = new Date()
            threeWeeksFromNow.setDate(threeWeeksFromNow.getDate() + 21)
            if (endingDate > threeWeeksFromNow) {
                utils.logger.debug(`Admin ${command.author.username} entered a end date too far in the future`)
                command.message.reply('event must end within 3 weeks of now')
                return null
            }
            if (endingDate.getTime() - startingDate.getTime() < 30 * 60 * 1000) {
                utils.logger.debug(`Admin ${command.author.username} entered a start date and end date too close together`)
                command.message.reply('events must be at least 30 minutes long')
                return null
            }
            return [command, clanEvent]
        }),
        filter((commandEventArr: [Input, runescape.Event]):
        boolean => commandEventArr !== null),
        tap((commandEventArr: [Input, runescape.Event]): void => {
            utils.logger.debug(`Admin ${commandEventArr[0].author.username} called add event`)
            utils.logger.debug('Runescape.Event properties: ')
            utils.logger.debug(`* ${commandEventArr[1].name}`)
            utils.logger.debug(`* ${commandEventArr[1].startingDate.toDateString()}`)
            utils.logger.debug(`* ${commandEventArr[1].endingDate.toDateString()}`)
            utils.logger.debug(`* ${commandEventArr[1].type}`)
        }),
        share()
    )

/**
 * @description An Observable that handles the ADD_UPCOMING command for REGULAR events
 * @type {Observable<any>}
 * @constant
 */
const filterUpcomingGenericEvent$:
Observable<[Input, runescape.Event]> = prepareUpcomingGenericEvent$
    .pipe(
        filter((commandEventArr: [Input, runescape.Event]): boolean => {
            const clanEvent: runescape.Event = commandEventArr[1]
            return clanEvent.type === EVENT_TYPE.REGULAR
        }),
    )

/**
 * @description An Observable that handles the ADD_UPCOMING command for competitive events
 * @type {Observable<any>}
 * @constant
 */
const filterAndPrepareUpcomingCompetitiveEvent$:
Observable<[Input, runescape.Event]> = prepareUpcomingGenericEvent$
    .pipe(
        filter((commandEventArr: [Input, runescape.Event]): boolean => {
            const clanEvent: runescape.Event = commandEventArr[1]
            return clanEvent.type === EVENT_TYPE.COMPETITIVE
        }),
        map((commandEventArr: [Input, runescape.Event]): [Input, runescape.Event] => {
            const inputCommand: Input = commandEventArr[0]
            const clanEvent: runescape.Event = commandEventArr[1]
            const compoundRegex: string = commandRegex(EVENT_TERM_REGEX)
            const competitiveRegex = [
                new RegExp(`skills${compoundRegex}`, 'gim'),
                new RegExp(`bh${compoundRegex}`, 'gim'),
                new RegExp(`clues${compoundRegex}`, 'gim'),
            ]
            const parsedRegex = findFirstRegexesMatch(competitiveRegex, inputCommand.input)
            if (parsedRegex.length === 0) {
                utils.logger.debug(`Admin ${inputCommand.author.id} did not specify what to track`)
                inputCommand.message.reply(`no skills specified\n${bot.COMMANDS.ADD_UPCOMING.parameters}`)
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
                Object.keys(runescape.SkillsEnum),
                Object.keys(runescape.BountyHunterEnum),
                Object.keys(runescape.CluesEnum),
            ]

            const allValues: string[][] = [
                allKeys[0].map(
                    (key: string): runescape.SkillsEnum => runescape.SkillsEnum[key]
                ),
                allKeys[1].map(
                    (key: string): runescape.BountyHunterEnum => runescape.BountyHunterEnum[key]
                ),
                allKeys[2].map(
                    (key: string): runescape.CluesEnum => runescape.CluesEnum[key]
                ),
            ]
            // Skills
            if (processedRegex[0] !== null) {
                const skillsArr:
                runescape.SkillsEnum[] = processedRegex[0] as runescape.SkillsEnum[]
                const filteredSkills: runescape.SkillsEnum[] = skillsArr.filter(
                    (skill: runescape.SkillsEnum): boolean => allValues[0].includes(skill)
                )
                if (skillsArr.length !== filteredSkills.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid skill names`)
                    inputCommand.message.reply(`some skill names entered are invalid\nchoices are: ${allValues[0].toString()}`)
                    return null
                }
                const newTracking: runescape.Tracking = utils.update(clanEvent.tracking, {
                    skills: setRegex[0],
                }) as runescape.Tracking
                const xpEvent: runescape.Event = utils.update(clanEvent, {
                    tracking: newTracking,
                }) as runescape.Event
                return [inputCommand, xpEvent]
            }
            // Bounty hunter
            if (processedRegex[1] !== null) {
                const bhArr:
                runescape.BountyHunterEnum[] = processedRegex[1] as runescape.BountyHunterEnum[]
                const filteredBh: runescape.BountyHunterEnum[] = bhArr.filter(
                    (bh: runescape.BountyHunterEnum): boolean => allValues[1].includes(bh)
                )
                if (bhArr.length !== filteredBh.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid bounty hunter names`)
                    inputCommand.message.reply(`some bounty hunter settings entered are invalid\nchoices are: ${allValues[1].toString()}`)
                    return null
                }
                const newTracking: runescape.Tracking = utils.update(clanEvent.tracking, {
                    bh: setRegex[1],
                }) as runescape.Tracking
                const bhEvent: runescape.Event = utils.update(clanEvent, {
                    tracking: newTracking,
                }) as runescape.Event
                return [inputCommand, bhEvent]
            }
            // Clues
            if (processedRegex[2] !== null) {
                const clueArr:
                runescape.CluesEnum[] = processedRegex[2] as runescape.CluesEnum[]
                const filteredClues: runescape.CluesEnum[] = clueArr.filter(
                    (clue: runescape.CluesEnum): boolean => allValues[2].includes(clue)
                )
                if (clueArr.length !== filteredClues.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid clue names`)
                    inputCommand.message.reply(`some clue settings entered are invalid\nchoices are: ${allValues[2].toString()}`)
                    return null
                }
                const clues: string[] = setRegex[2].includes(runescape.CluesEnum.ALL)
                || (
                    setRegex[2].includes(runescape.CluesEnum.BEGINNER)
                    && setRegex[2].includes(runescape.CluesEnum.EASY)
                    && setRegex[2].includes(runescape.CluesEnum.MEDIUM)
                    && setRegex[2].includes(runescape.CluesEnum.HARD)
                    && setRegex[2].includes(runescape.CluesEnum.ELITE)
                    && setRegex[2].includes(runescape.CluesEnum.MASTER)
                )
                    ? [runescape.CluesEnum.ALL] : setRegex[2]
                const newTracking: runescape.Tracking = utils.update(clanEvent.tracking, {
                    clues,
                }) as runescape.Tracking
                const clueEvent: runescape.Event = utils.update(clanEvent, {
                    tracking: newTracking,
                }) as runescape.Event
                return [inputCommand, clueEvent]
            }

            utils.logger.debug(`Admin ${inputCommand.author.id} entered invalid competition data`)
            inputCommand.message.reply(`some competition settings entered are invalid\n${bot.COMMANDS.ADD_UPCOMING.parameters}`)
            return null
        }),
        filter((commandEventArr: [Input, runescape.Event]): boolean => commandEventArr !== null)
    )

const saveEvent$ = merge(filterUpcomingGenericEvent$, filterAndPrepareUpcomingCompetitiveEvent$)

/**
 * @description An Observable that handles the LIST_UPCOMING command
 * @type {Observable<void>}
 * @constant
 */
const listUpcomingEvent$: Observable<Input> = filteredMessage$(bot.COMMANDS.LIST_UPCOMING)

/**
 * @description An Observable that handles the DELETE_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const deleteUpcomingEvent$:
Observable<Input> = filteredMessage$(
    bot.COMMANDS.DELETE_UPCOMING
)

/**
 * @description An Observable that handles the SIGNUP_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const signupEvent$: Observable<[bot.Data, discord.Message, hiscores.LookupResponse]> = filteredMessage$(
    bot.COMMANDS.SIGNUP_UPCOMING
)
    .pipe(
        switchMap((command: Input):
        Observable<[bot.Data, discord.Message, hiscores.LookupResponse]> => {
            const compoundRegex: string = commandRegex(signupTermRegex)
            const skillsRegex = [
                new RegExp(`${compoundRegex}`, 'gim'),
                new RegExp(`rsn${compoundRegex}`, 'gim'),
            ]
            const parsedRegex = findFirstRegexesMatch(skillsRegex, command.input)
            if (parsedRegex.length !== skillsRegex.length) {
                utils.logger.debug(`${command.author.id} entered invalid signup data`)
                command.message.reply(`invalid input\n${bot.COMMANDS.SIGNUP_UPCOMING.parameters}`)
                return of<[bot.Data, discord.Message, hiscores.LookupResponse]>(null)
            }

            // get upcoming events
            // if index is out of range return
            const oldData: bot.Data = bot.load(command.guild.id, false)
            const upcomingAndInFlightEvents: runescape.Event[] = getUpcomingAndInFlightEvents(
                oldData.events
            )
            const idxToModify: number = Number.parseInt(parsedRegex[0], 10)
            if (Number.isNaN(idxToModify) || idxToModify >= upcomingAndInFlightEvents.length) {
                utils.logger.debug(`User did not specify index (${idxToModify})`)
                command.message.reply(`invalid index ${idxToModify}\n${bot.COMMANDS.SIGNUP_UPCOMING.parameters}`)
                return of<[bot.Data, discord.Message, hiscores.LookupResponse]>(null)
            }

            const discordIdToAdd: string = command.author.id
            const rsnToAdd: string = parsedRegex[1]

            // get event to modify and its type
            const eventToModify: runescape.Event = upcomingAndInFlightEvents[idxToModify]

            const newRsAccount: runescape.AccountInfo = {
                rsn: rsnToAdd,
            }

            const participantToAdd: runescape.Participant = {
                discordId: discordIdToAdd,
                runescapeAccounts: [newRsAccount],
            }

            const newData: bot.Data = signupParticipant(
                oldData,
                eventToModify,
                participantToAdd,
            )

            return forkJoin(
                of<bot.Data>(newData),
                of<discord.Message>(command.message),
                runescape.hiscores$(rsnToAdd)
            )
        }),
        filter((dataMsgHiArr: [bot.Data, discord.Message, hiscores.LookupResponse]):
        boolean => dataMsgHiArr !== null),
    )

/**
 * @description An Observable that handles the UNSIGNUP_UPCOMING command
 * @type {Observable<any>}
 * @constant
 */
const unsignupUpcomingEvent$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.UNSIGNUP_UPCOMING
)

/**
 * @description An Observable that handles the AMISIGNEDUP_UPCOMING command
 * @type {Observable<void>}
 * @constant
 */
const amISignedUp$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.AMISIGNEDUP_UPCOMING
)

/**
 * @description An Observable that handles the LIST_PARTICIPANTS_UPCOMING command
 * @type {Observable<void>}
 * @constant
 */
const listParticipant$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.LIST_PARTICIPANTS_UPCOMING
)

const setChannel$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.SET_CHANNEL
)
    .pipe(
        filter((command: Input): boolean => {
            const channel = command.message.mentions.channels.first()
            if (channel === undefined) return false
            return command.guild.channels.get(channel.id) !== undefined
        })
    )

/**
 * @description An Observable that handles the HELP command
 * @type {Observable<void>}
 * @constant
 */
const help$: Observable<Input> = filteredMessage$(bot.COMMANDS.HELP)

//------------------------
// Subscriptions & helpers
//
//------------------------

connect$.subscribe((): void => {
    utils.logger.info('Connected')
    utils.logger.info('Logged in as:')
    utils.logger.info(`* ${gClient.user.username}`)
    utils.logger.info(`* ${gClient.user.id}`)

    utils.logger.verbose(`In ${gClient.guilds.size} guilds:`)
    gClient.guilds.forEach((guild): void => {
        utils.logger.verbose(`* ${guild.name} (${guild.id})`)
        utils.logger.verbose('* Loading guild json')

        const guildData: bot.Data = bot.load(guild.id, true)
        utils.logger.debug(`Loaded json for guild ${guild.id}`)
        utils.logger.silly(`${JSON.stringify(guildData)}`)

        // startup tasks
        // handle generic events here

        const unnotifiedEvents = getUnnotifiedEvents(guildData)
        unnotifiedEvents.forEach((clanEvent: runescape.Event): void => {
            const now: Date = new Date()
            const twoHoursBeforeStart: Date = new Date(clanEvent.startingDate.getTime())
            twoHoursBeforeStart.setHours(twoHoursBeforeStart.getHours() - 2)

            const toleranceAfterStart: Date = new Date(clanEvent.startingDate.getTime())
            toleranceAfterStart.setMinutes(toleranceAfterStart.getMinutes() + 30)

            const toleranceAfterEnd: Date = new Date(clanEvent.endingDate.getTime())
            toleranceAfterEnd.setMinutes(toleranceAfterEnd.getMinutes() + 30)

            const toleranceAfterEndTolerance: Date = new Date(clanEvent.endingDate.getTime())
            toleranceAfterEndTolerance.setHours(toleranceAfterEndTolerance.getHours() + 2)

            // if we are before 2 hour warning, schedule warnings
            if (now < twoHoursBeforeStart) {
                utils.logger.debug('before 2 hour warning')
                // schedule 2 hour warning
                // schedule start date notification
                // schedule end date notification
                // TODO: change me
                timers[clanEvent.id] = [
                    setTimerTwoHoursBefore(clanEvent, guild),
                    setTimerStart(clanEvent, guild),
                    setTimerEnd(clanEvent, guild),
                ]
            } else if (now >= twoHoursBeforeStart && now < clanEvent.startingDate) {
                utils.logger.debug('after 2 hour warning')
                if (!clanEvent.hasNotifiedTwoHourWarning) {
                    utils.logger.debug('notification had not fired')
                    notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'will begin within 2 hours')
                    // mark 2 hour warning as completed
                    const newEvent: runescape.Event = utils.update(clanEvent, {
                        hasNotifiedTwoHourWarning: true,
                    }) as runescape.Event
                    const newData: bot.Data = updateEvent(guildData, newEvent)
                    bot.save(guild.id, newData)
                }
                // schedule start date notification
                // schedule end date notification
                // TODO: change me
                timers[clanEvent.id] = [
                    setTimerStart(clanEvent, guild),
                    setTimerEnd(clanEvent, guild),
                ]
            } else if (now >= clanEvent.startingDate && now < toleranceAfterStart) {
                utils.logger.debug('after event started')
                if (!clanEvent.hasNotifiedStarted) {
                    utils.logger.debug('notification had not fired')
                    // fire start notification
                    // mark 2 hour warning as completed
                    // mark start notification as complete
                    notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'has begun')
                    const newEvent: runescape.Event = utils.update(clanEvent, {
                        hasNotifiedTwoHourWarning: true,
                        hasNotifiedStarted: true,
                    }) as runescape.Event
                    const newData: bot.Data = updateEvent(guildData, newEvent)
                    bot.save(guild.id, newData)
                }
                // TODO: change me
                timers[clanEvent.id] = [
                    setTimerEnd(clanEvent, guild),
                ]
            } else if (now >= toleranceAfterStart && now < clanEvent.endingDate) {
                utils.logger.debug('after 30 min start tolerance')
                if (!clanEvent.hasNotifiedStarted) {
                    utils.logger.error('notification had not fired')
                    // fire start notification
                    // mark 2 hour warning as completed
                    // mark start notification as complete
                    // TODO: apologize lol
                    notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'started more than 30 mins ago, yell at n0trout')
                    const newEvent: runescape.Event = utils.update(clanEvent, {
                        hasNotifiedTwoHourWarning: true,
                        hasNotifiedStarted: true,
                    }) as runescape.Event
                    const newData: bot.Data = updateEvent(guildData, newEvent)
                    bot.save(guild.id, newData)
                }
                // schedule end date notification
                // TODO: change me
                timers[clanEvent.id] = [
                    setTimerEnd(clanEvent, guild),
                ]
            } else if (now >= clanEvent.endingDate && now < toleranceAfterEnd) {
                utils.logger.debug('after ended')
                if (!clanEvent.hasNotifiedEnded) {
                    utils.logger.error('notification had not fired')
                    // fire end notification
                    // mark 2 hour warning as complete (unnecessary)
                    // mark start notification as complete (unnecessary)
                    // mark end notification as complete
                    notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'has ended')
                    const newEvent: runescape.Event = utils.update(clanEvent, {
                        hasNotifiedTwoHourWarning: true,
                        hasNotifiedStarted: true,
                        hasNotifiedEnded: true,
                    }) as runescape.Event
                    const newData: bot.Data = updateEvent(guildData, newEvent)
                    bot.save(guild.id, newData)
                }
            } else if (now >= toleranceAfterEnd && now < toleranceAfterEndTolerance) {
                utils.logger.debug('after 2 hour end tolerance')
                if (!clanEvent.hasNotifiedEnded) {
                    utils.logger.error('notification had not fired')
                    // fire end notification
                    // apologize
                    // mark 2 hour warning as complete (unnecessary)
                    // mark start notification as complete (unnecessary)
                    // mark end notification as complete
                    notifyClanEvent(clanEvent, guild, guildData.settings.notificationChannelId, 'had ended more than 2 hours ago, yell at n0trout')
                    const newEvent: runescape.Event = utils.update(clanEvent, {
                        hasNotifiedTwoHourWarning: true,
                        hasNotifiedStarted: true,
                        hasNotifiedEnded: true,
                    }) as runescape.Event
                    const newData: bot.Data = updateEvent(guildData, newEvent)
                    bot.save(guild.id, newData)
                }
            } else {
                // too late to do anything
                // just mark it as fired
                const newEvent: runescape.Event = utils.update(clanEvent, {
                    hasNotifiedTwoHourWarning: true,
                    hasNotifiedStarted: true,
                    hasNotifiedEnded: true,
                }) as runescape.Event
                const newData: bot.Data = updateEvent(guildData, newEvent)
                bot.save(guild.id, newData)
            }
        })


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
        //                                 const newXpComponent: XpClanEventParticipantSkillsComponent = utils.update(xpComponent, {
        //                                     startingXp: hiscore.skills[xpComponent.name].xp
        //                                 }) as XpClanEventParticipantSkillsComponent
        //                                 const newXpParticipant: XpClanEventParticipant = utils.update(xpParticipant, {
        //                                     skills: newXpComponent
        //                                 }) as XpClanEventParticipant
        //                                 const newXpParticipants: ClanEventParticipant[] = event.participants.filter((participant: ClanEventParticipant): boolean => participant.rsn !== xpParticipant.rsn).concat([newXpParticipant])
        //                                 const newEvent: ClanEvent = utils.update(event, {
        //                                     participants: newXpParticipants
        //                                 }) as ClanEvent
        //                                 // TODO: this doesn't work for non unique event names and dates
        //                                 const newEvents: ClanEvent[] = inFlightEvents.filter((clanEvent: ClanEvent): boolean => clanEvent.name !== event.name && clanEvent.startingDate !== event.startingDate && clanEvent.endingDate !== event.endingDate).concat([newEvent])
        //                                 const newData: Bot.Database = utils.update(guildData, {
        //                                     events: newEvents
        //                                 }) as Bot.Database
        //                                 // TODO: very inefficient - implement a flag to trigger automatic load or manual
        //                                 return save$(guild.id, newData)
        //                             })
        //                         )
        //                         .subscribe((data: Bot.Database): void => {
        //                             utils.logger.debug('updated user that did not have starting xp data')
        //                         })
        //                 }
        //                 /* Incorrect logic, we need to find already ended events instead
        //                 if (xpComponent.endingXp < 0) {
        //                     hiscores$(xpParticipant.rsn)
        //                         .pipe(
        //                             switchMap((hiscore: hiscores.HiscoreResponse): Observable<Bot.Database> => {
        //                                 const newXpComponent: XpClanEventParticipantSkillsComponent = utils.update(xpComponent, {
        //                                     endingXp: hiscore.skills[xpComponent.name].xp
        //                                 }) as XpClanEventParticipantSkillsComponent
        //                                 const newXpParticipant: XpClanEventParticipant = utils.update(xpParticipant, {
        //                                     skills: newXpComponent
        //                                 }) as XpClanEventParticipant
        //                                 const newXpParticipants: ClanEventParticipant[] = event.participants.filter((participant: ClanEventParticipant): boolean => participant.rsn !== xpParticipant.rsn).concat([newXpParticipant])
        //                                 const newEvent: ClanEvent = utils.update(event, {
        //                                     participants: newXpParticipants
        //                                 }) as ClanEvent
        //                                 // TODO: this doesn't work for non unique event names and dates
        //                                 const newEvents: ClanEvent[] = inFlightEvents.filter((clanEvent: ClanEvent): boolean => clanEvent.name !== event.name && clanEvent.startingDate !== event.startingDate && clanEvent.endingDate !== event.endingDate).concat([newEvent])
        //                                 const newData: Bot.Database = utils.update(data, {
        //                                     events: newEvents
        //                                 }) as Bot.Database
        //                                 return save$(guild.id, newData)
        //                             })
        //                         )
        //                         .subscribe((guildData: Bot.Database): void => {
        //                             utils.logger.debug('updated user that did not have ending xp data')
        //                         })
        //                 }
        //                 */
        //             })
        //         })
        //     }
        // })
    })
})

reconnect$.subscribe(
    utils.logger.info('Reconnected')
)

error$.subscribe((error: Error): void => {
    utils.logger.error(error.message)
})

debug$.subscribe((command: Input): void => {
    utils.logger.info('Debug called')
    const data: bot.Data = bot.load(command.guild.id, false)
    utils.logger.debug(JSON.stringify(data, null, 4))
})

addAdmin$.subscribe((command: Input): void => {
    const oldData: bot.Data = bot.load(command.guild.id, false)
    const oldSettings: bot.Settings = oldData.settings

    const mentions: string[] = command.message.mentions.members.array()
        .map((member: discord.GuildMember): string => member.id)
    const newSettings: bot.Settings = utils.update(oldSettings, {
        admins: Array.from(new Set(oldSettings.admins.concat(mentions))),
    }) as bot.Settings
    const newData: bot.Data = updateSettings(oldData, newSettings)
    bot.save(command.guild.id, newData)

    utils.logger.debug('Admin added')
    command.message.reply('admin added')
})

saveEvent$.subscribe((inputArr: [Input, runescape.Event]): void => {
    // add timers
    const command: Input = inputArr[0]
    const event: runescape.Event = inputArr[1]

    const oldData: bot.Data = bot.load(command.guild.id, false)
    const events: runescape.Event[] = oldData.events.concat(event)
    const upcoming: runescape.Event[] = getUpcomingAndInFlightEvents(events)
    const idx: number = upcoming.indexOf(event)

    const guild: discord.Guild = command.guild
    const newData: bot.Data = utils.update(oldData, {
        events,
    }) as bot.Data
    bot.save(guild.id, newData)

    timers[event.id] = [
        setTimerTwoHoursBefore(event, guild),
        setTimerStart(event, guild),
        setTimerEnd(event, guild),
    ]

    utils.logger.debug('event added')
    command.message.reply(`event '${event.name}' added`)

    sendChannelMessage(
        guild,
        newData.settings.notificationChannelId,
        `@everyone clan event '${event.name}' has just been scheduled for ${event.startingDate.toString()}\nto sign-up type: '${bot.COMMANDS.SIGNUP_UPCOMING.command}${idx} rsn (your RuneScape name)'`,
        null,
    )
})

listUpcomingEvent$.subscribe((command: Input): void => {
    const oldData: bot.Data = bot.load(command.guild.id, false)
    const upcomingAndInFlightEvents: runescape.Event[] = getUpcomingAndInFlightEvents(
        oldData.events
    )
    const eventsStr = upcomingAndInFlightEvents.map(
        (event: runescape.Event, idx: number): string => {
            const startingDateStr = event.startingDate.toString()
            const endingDateStr = event.endingDate.toString()
            const retStr = event.startingDate > new Date()
                ? `\n${idx}: upcoming event ${event.name} starting: ${startingDateStr} ending: ${endingDateStr} type: ${event.type}`
                : `\n${idx}: in-flight event ${event.name} ending: ${endingDateStr} type: ${event.type}`
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
    const reply: string = upcomingAndInFlightEvents.length > 0
        ? `upcoming events: ${eventsStr}`
        : 'no upcoming events'
    command.message.reply(reply)
    utils.logger.debug('ListUpcomingEvents called')
})

deleteUpcomingEvent$.subscribe(
    (command: Input): void => {
        const oldData: bot.Data = bot.load(command.guild.id, false)
        const upcomingAndInFlightEvents: runescape.Event[] = getUpcomingAndInFlightEvents(
            oldData.events
        )
        const idxToRemove: number = parseInt(command.input, 10)
        if (Number.isNaN(idxToRemove) || idxToRemove >= upcomingAndInFlightEvents.length) {
            utils.logger.debug(`Admin did not specify index (${idxToRemove})`)
            command.message.reply(`invalid index ${idxToRemove}\n${bot.COMMANDS.DELETE_UPCOMING.parameters}`)
            return
        }

        const eventToDelete: runescape.Event = upcomingAndInFlightEvents[idxToRemove]
        const newData: bot.Data = deleteEvent(oldData, eventToDelete)
        bot.save(command.guild.id, newData)

        // cancel timers
        timers[eventToDelete.id].forEach((timerHnd: NodeJS.Timeout): void => {
            clearTimeout(timerHnd)
        })
        timers[eventToDelete.id] = undefined
        utils.logger.debug('Runescape.Event deleted')
        command.message.reply(`'${eventToDelete.name}' deleted`)
    }
)

signupEvent$.subscribe((inputArr: [bot.Data, discord.Message, hiscores.LookupResponse]): void => {
    const data: bot.Data = inputArr[0]
    const message: discord.Message = inputArr[1]
    const hiscore: hiscores.LookupResponse = inputArr[2]
    if (hiscore === null) {
        utils.logger.debug('User entered invalid RSN')
        message.reply('cannot find RSN on hiscores')
        return
    }
    bot.save(message.guild.id, data)
    utils.logger.debug('Signup called')
    message.reply('signed up for event')
})

unsignupUpcomingEvent$.subscribe((command: Input): void => {
    // get upcoming events
    // if index is out of range return
    const oldData: bot.Data = bot.load(command.guild.id, false)
    const upcomingAndInFlightEvents:
    runescape.Event[] = getUpcomingAndInFlightEvents(oldData.events)
    const idxToModify: number = Number.parseInt(command.input, 10)
    if (Number.isNaN(idxToModify) || idxToModify >= upcomingAndInFlightEvents.length) {
        utils.logger.debug(`User did not specify index (${idxToModify})`)
        command.message.reply(`invalid index ${idxToModify}\n${bot.COMMANDS.UNSIGNUP_UPCOMING.parameters}`)
        return
    }

    // does the event to modify contain our user?
    const eventToModify: runescape.Event = upcomingAndInFlightEvents[idxToModify]
    const participantToRemove:
    runescape.Participant = eventToModify.participants.find(
        (participant: runescape.Participant):
        boolean => participant.discordId === command.author.id
    )
    if (participantToRemove === undefined) return
    const newData: bot.Data = unsignupParticipant(
        oldData,
        eventToModify,
        participantToRemove,
    )
    bot.save(command.guild.id, newData)

    utils.logger.debug('Unsignup called')
    command.message.reply('removed from event')
})

amISignedUp$.subscribe((command: Input): void => {
    const oldData: bot.Data = bot.load(command.guild.id, false)
    const upcomingAndInFlightEvents:
    runescape.Event[] = getUpcomingAndInFlightEvents(oldData.events)
    const idxToCheck: number = Number.parseInt(command.input, 10)
    if (Number.isNaN(idxToCheck) || idxToCheck >= upcomingAndInFlightEvents.length) {
        utils.logger.debug(`User did not specify index (${idxToCheck})`)
        command.message.reply(`invalid index ${idxToCheck}\n${bot.COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`)
        return
    }

    const discordIdToCheck: string = command.author.id

    // does the event to modify contain our user?
    const eventToCheck: runescape.Event = upcomingAndInFlightEvents[idxToCheck]
    const foundEventParticipant: runescape.Participant = eventToCheck
        .participants.find(
            (participant: runescape.Participant):
            boolean => participant.discordId === discordIdToCheck
        )
    if (foundEventParticipant === undefined) {
        command.message.reply('you are not signed up')
        return
    }

    const accounts = foundEventParticipant.runescapeAccounts.map(
        (account: runescape.AccountInfo): string => account.rsn
    ).join(', ')
    command.message.reply(`you are signed up with RSN: ${accounts}`)
    utils.logger.debug('AmISignedUp Called')
})

listParticipant$.subscribe((command: Input): void => {
    const oldData: bot.Data = bot.load(command.guild.id, false)
    const upcomingAndInFlightEvents:
    runescape.Event[] = getUpcomingAndInFlightEvents(oldData.events)
    const idxToCheck: number = Number.parseInt(command.input, 10)
    if (Number.isNaN(idxToCheck) || idxToCheck >= upcomingAndInFlightEvents.length) {
        utils.logger.debug(`User did not specify index (${idxToCheck})`)
        command.message.reply(`invalid index ${idxToCheck}\n${bot.COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`)
        return
    }

    const eventToList: runescape.Event = upcomingAndInFlightEvents[idxToCheck]
    const formattedStr: string = eventToList.participants.map(
        (participant: runescape.Participant, idx: number): string => {
            const displayName: string = userIdToDisplayName(
                command.guild,
                participant.discordId
            )
            const accounts: string = participant.runescapeAccounts.map(
                (account: runescape.AccountInfo): string => account.rsn
            ).join(', ')
            return `\n${idx}: ${displayName} signed up ${accounts}`
        }
    ).join('')

    const reply: string = eventToList.participants.length > 0
        ? `participants:${formattedStr}`
        : 'no participants'
    command.message.reply(reply)
    utils.logger.debug('ListParticipants called')
})

setChannel$.subscribe((command: Input): void => {
    const oldData: bot.Data = bot.load(command.guild.id, false)
    const channel: discord.Channel = command.message.mentions.channels.first()
    const newSettings: bot.Settings = utils.update(oldData.settings, {
        notificationChannelId: channel.id,
    }) as bot.Settings
    const newData: bot.Data = updateSettings(oldData, newSettings)
    bot.save(command.guild.id, newData)
    utils.logger.debug('Set channel called')
    command.message.reply(`notification channel set to ${channel}`)
})

help$.subscribe((command: Input): void => {
    const keys: string[] = Object.keys(bot.COMMANDS).filter(
        (key: string): boolean => {
            const data: bot.Data = bot.load(command.guild.id, false)
            const admin: boolean = bot.isAdmin(command.author.id, data)
            const botCommand: bot.Command = bot.COMMANDS[key]
            return (admin && (botCommand.accessControl === bot.ONLY_ADMIN
                || botCommand.accessControl === bot.ONLY_UNSET_ADMINS_OR_ADMIN))
                || botCommand.accessControl === bot.ANY_USER
        }
    )
    const commandValues: bot.Command[] = keys.map(
        (key: string): bot.Command => bot.COMMANDS[key] as bot.Command
    )
    const outerStr: string[] = commandValues.map((commandInfo: bot.Command): string => {
        const innerStr: string[] = [
            `\n'${commandInfo.command}${commandInfo.parameters}'`,
            `\ndescription: ${commandInfo.description}`,
        ]
        return innerStr.join('')
    })
    const formattedStr = outerStr.join('\n')
    utils.logger.debug(formattedStr)
    command.message.reply(formattedStr, {
        code: true,
    })

    utils.logger.debug('Help called')
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

// utils.logger.debug(JSON.stringify(botDatabase1))

// hiscores.getPlayer('n0trout').then((json: JSON): void => {
//     const response: hiscores.LookupResponse = json as unknown as hiscores.LookupResponse
//     const skillsEventParticipantComponent: Runescape.SkillsEventParticipantComponent = {
//         starting: response.skills,
//         ending: null,
//     }

//     const bhEventParticipantComponent: Runescape.BhEventParticipantComponent = {
//         starting: response.bh,
//         ending: null,
//     }

//     const cluesEventParticipantComponent: Runescape.CluesEventParticipantComponent = {
//         starting: response.clues,
//         ending: null,
//     }

//     const competitiveEventAccountInfo: Runescape.CompetitiveEventAccountInfo = {
//         rsn: 'n0trout',
//         skills: skillsEventParticipantComponent,
//         bh: bhEventParticipantComponent,
//         clues: cluesEventParticipantComponent,
//     }

//     const eventParticipant2: Runescape.DiscordParticipant = {
//         discordId: '123489710234',
//         runescapeAccounts: [competitiveEventAccountInfo],
//     }

//     const tracking: Runescape.Tracking = {
//         skills: [Runescape.SkillsEnum.AGILITY, Runescape.SkillsEnum.RUNECRAFT],
//         bh: [Runescape.BountyHunterEnum.HUNTER],
//         clues: [Runescape.CluesEnum.HARD, Runescape.CluesEnum.MASTER, Runescape.CluesEnum.ELITE],
//     }

//     const event2: Runescape.Event = {
//         name: 'Competitive Test',
//         startingDate: new Date(),
//         endingDate: new Date(),
//         type: EVENT_TYPE.COMPETITIVE,
//         tracking,
//         participants: [eventParticipant2],
//         hasNotifiedTwoHourWarning: false,
//         hasNotifiedStarted: false,
//         hasNotifiedEnded: false,
//     }

//     const botSettings2: Bot.Settings = {
//         admins: ['242323592035'],
//         notificationChannelId: '124970105256',
//     }

//     const botDatabase2: Bot.Database = {
//         settings: botSettings2,
//         events: [event2],
//     }

//     utils.logger.debug(JSON.stringify(botDatabase2))
// })
