// TODO:
// 20 min ending warning
// all time hiscores
// list users in a team
// show individual contribution to a team
// move to sql
// allow guild admins to use admin commands
// exponential backoff for messages?
// implement long running events
// unit tests

// ------------------------------//
// OSRS discord bot by n0trout   //
// See LICENSE                   //
// ------------------------------//

import * as discord from 'discord.js';

import {
    fromEvent, Observable, of, forkJoin, merge, Subject,
} from 'rxjs';
import {
    take, skip, filter, switchMap, tap, map, share,
} from 'rxjs/operators';
import {
    hiscores,
} from 'osrs-json-api';
import { EventEmitter, } from 'events';
import uuid from 'uuidv4';
import { Event, } from './event';
import { Bot, } from './bot';
import { Utils, } from './utils';
import auth from './auth.json';

//----------
// Constants
//
//----------

/**
 * @ignore
 */
const TWO_HOUR_WARN_STR = 'will begin within 2 hours.';
/**
 * @ignore
 */
const START_STR = 'has begun.';
/**
 * @ignore
 */
const END_STR = 'has ended.';

/**
* Contract containing mapped input data for consumption
* @category Helper
*/
interface Input extends Record<string, unknown> {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    input: string
}

/**
 * Contract helper for subjects since they only take one parameter
 * @category Helper
 */
interface GuildDataAndEvent {
    guildData: Bot.GuildContext
    event: Event.Event
}

/**
 * Contract helper for subjects since they only take one parameter
 * @category Helper
 */
interface GuildDataIdEventIdAndParticipants {
    guildId: string
    eventId: string
    participants: Event.Participant[]
}

/**
 * Contract helper for timers
 * @category Helper
 */
interface TimerInfo {
    autoUpdate: NodeJS.Timeout
    twoHoursBeforeEventTimer: NodeJS.Timeout
    eventStartedTimer: NodeJS.Timeout
    eventEndedTimer: NodeJS.Timeout
}

//-------------
// Global state
//
//-------------

/**
 * Global discord client
 * @category Global
 */
const gClient: discord.Client = new discord.Client();

/**
 * Global timer handles
 * @category Global
 */
const timers: Record<string, TimerInfo> = {};

//--------
// Helpers
//--------

/**
 * Modifies an event and saves the Guild Context
 * @param context The Guild Context to update
 * @param newEvent The updated Event
 * @returns The new Guild Context
 * @category Helper
 */
const saveModifiedEvent = (
    context: Bot.GuildContext,
    newEvent: Event.Event
): Bot.GuildContext => {
    const newEvents: Event.Event[] = Event.modifyEventArray(
        context.events,
        newEvent
    );
    const newContext: Bot.GuildContext = { ...context, };
    newContext.events = newEvents;
    return Bot.save(
        newContext
    );
};

/**
 * Gets the user's [[discord.Guild]] display name from a Discord id
 * @param guildId The Guild id to use for display name lookup
 * @param discordId The Discord id to lookup
 * @returns The user's display name
 * @category Helper
 */
const getDisplayNameFromDiscordId = (
    guildId: string,
    discordId: string
): string => {
    const guild: discord.Guild = gClient.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return '(guild unavailable)';
    const foundMember: discord.GuildMember = guild.members.find(
        (member: discord.GuildMember):
        boolean => member.id === discordId
    );
    if (foundMember === null) return '(unknown)';
    return foundMember.displayName;
};

/**
 * Helps send regular and long messages to a [[discord.TextChannel]]
 * @param textChannel The text channel to send to
 * @param concat Whether we should send multiple messages for a long message case
 * @param message The message to send
 * @param options The message options to use
 * @returns A promise containing the sent message for short or non-concatenated messages or null
 * @category Send Guild Message
 */
const sendChannelMessageHelper = (
    textChannel: discord.TextChannel,
    concat: boolean,
    message: string,
    options?: discord.MessageOptions,
): Promise<discord.Message | discord.Message[]> => {
    if (message.length > 1989) {
        if (concat) {
            const messagesToSend: string[] = message.match(/[\s\S]{1,1989}/g) || [];
            const messagesSize: number = messagesToSend.length;
            messagesToSend.forEach(
                (msg: string, idx: number):
                void => {
                    Utils.logger.debug(msg.length);
                    if (idx === messagesSize - 1) {
                        textChannel.send(
                            msg,
                            options,
                        );
                    } else {
                        textChannel.send(
                            msg.concat('...'),
                            options,
                        );
                    }
                }
            );
            return null;
        }
        const msg: string = message.slice(0, 1989);
        return textChannel.send(
            msg.concat('...'),
            options,
        );
    }
    return textChannel.send(
        message,
        options,
    );
};

/**
 * Sends a [[discord.Attachment]] to a [[discord.TextChannel]]
 * @param guildId The Guild id to send the attachment to
 * @param channelId The channel id to send the message to
 * @param text The attachment text to send
 * @param attachmentToSend The attachment path to send
 * @category Send Guild Message
 */
const sendChannelAttachment = (
    guildId: string,
    channelId: string,
    text: string,
    attachmentToSend: string,
): void => {
    const guild: discord.Guild = gClient.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return;
    const channel: discord.TextChannel = guild.channels.get(
        channelId
    ) as discord.TextChannel;
    if (channel === undefined || channel.type !== 'text') return;
    Utils.logger.debug('Sending message to Guild');

    if (attachmentToSend !== null) {
        channel.send(
            text,
            {
                file: attachmentToSend,
            }
        );
    }
};

/**
 * Sends a [[discord.TextChannel]] a message
 * @param guildId The guild id send the message to
 * @param channelId The channel id to send the message to
 * @param content The message content to send
 * @param options The Discord message options to use
 * @param concat Breaks messages into multiple for long messages if set
 * @returns The message response
 * @category Send Guild Message
 */
const sendChannelMessage = async (
    guildId: string,
    channelId: string,
    content: string,
    options: discord.MessageOptions = null,
    concat: boolean = false,
): Promise<discord.Message> => {
    if (content === undefined) return Promise.reject();
    if (guildId === undefined) return Promise.reject();
    const guild: discord.Guild = gClient.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return Promise.reject();
    const channel: discord.TextChannel = guild.channels.get(
        channelId
    ) as discord.TextChannel;
    if (channel === undefined || channel.type !== 'text') return Promise.reject();
    Utils.logger.debug('Sending message to Guild');
    const message: discord.Message = await sendChannelMessageHelper(
        channel,
        concat,
        content,
        options
    ) as discord.Message;
    return message;
};

/**
 * Edits a [[discord.Message]] with new content
 * @param guildId The guild id containing the message
 * @param channelId The channel id containing the message
 * @param messageId The message id to edit
 * @param content The new message content
 * @param options The Discord message options to use
 * @returns The message response
 * @category Send Guild Message
 */
const editChannelMessage = async (
    guildId: string,
    channelId: string,
    messageId: string,
    content: string,
    options: discord.MessageOptions = null,
): Promise<discord.Message> => {
    if (content === undefined) return Promise.reject();
    if (guildId === undefined) return Promise.reject();
    const guild: discord.Guild = gClient.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return Promise.reject();
    const channel: discord.TextChannel = guild.channels.get(
        channelId
    ) as discord.TextChannel;
    if (channel === undefined || channel.type !== 'text') return Promise.reject();

    Utils.logger.debug('Editing message');
    const message: discord.Message = await channel.fetchMessage(messageId);

    if (content.length > 1989) {
        const newContent: string = content.slice(
            0,
            1989
        ).concat('...');
        return message.edit(
            newContent,
            options
        );
    }
    return message.edit(
        content,
        options
    );
};

/**
 * @param data The Guild Data to process
 * @param event The Event containing the participants to notify
 * @param message The message content to send
 * @category Send Guild Message
 */
const notifyParticipantsInEvent = (
    data: Bot.GuildContext,
    event: Event.Event,
    message: string,
): void => {
    const participants: string[] = event.participants.map(
        (participant: Event.Participant): string => participant.discordId
    );
    const mentions: string = participants.map(
        (participant: string): string => `<@${participant}>`
    ).join(', ');
    sendChannelMessage(
        data.guildId,
        data.settings.notificationChannelId,
        `event '${event.name}' ${message} ${mentions}`,
        null
    );
};

/**
 * See [[Event.Tracking]] structure
 * @param participant The Participant to calculate gains
 * @param event The Event to calculate gains
 * @param tracking The tracking enum
 * @returns Total gain (in xp, clues, etc.)
 * @category Stats
 */
const getParticipantScore = (
    participant: Event.Participant,
    event: Event.Event,
    tracking: Event.Tracking,
): number => {
    switch (tracking) {
        case 'skills': {
            if (Event.getEventTracking(event) !== Event.Tracking.SKILLS) return 0;
            const xps: number[] = participant.runescapeAccounts.map(
                (account: Event.CompetitiveAccount): number => {
                    if (account.starting === undefined || account.ending === undefined) return NaN;
                    const skillsComponents:
                    hiscores.SkillComponent[][] = event.tracking[tracking].map(
                        (key: string):
                        hiscores.SkillComponent[] => [
                            account.starting[tracking][key],
                            account.ending[tracking][key],
                        ]
                    );
                    const xpDiff = skillsComponents.map(
                        (startEnd: hiscores.SkillComponent[]):
                        number => startEnd[1].xp - startEnd[0].xp
                    );
                    const xpGain = xpDiff.reduce(
                        (acc, x): number => acc + x
                    );
                    return xpGain;
                }
            );
            const xp = xps.reduce(
                (acc: number, x: number): number => acc + x
            );
            return xp;
        }

        case 'bh': {
            if (Event.getEventTracking(event) !== Event.Tracking.BH) return 0;
            const gains: number[] = participant.runescapeAccounts.map(
                (account: Event.CompetitiveAccount): number => {
                    if (account.starting === undefined
                            || account.ending === undefined) return NaN;
                    const rankAndScoreComponents:
                    hiscores.RankAndScoreComponent[][] = (
                        event.tracking.bh
                    ).map(
                        (key: string):
                        hiscores.RankAndScoreComponent[] => [
                            account.starting.bh[key],
                            account.ending.bh[key],
                        ]
                    );
                    const bhDiff = rankAndScoreComponents.map(
                        (startEnd: hiscores.RankAndScoreComponent[]):
                        number => startEnd[1].score - startEnd[0].score
                    );
                    const bhGain = bhDiff.reduce(
                        (acc: number, x: number): number => acc + x
                    );
                    return bhGain;
                }
            );
            const gain = gains.reduce(
                (acc: number, x: number): number => acc + x
            );
            return gain;
        }

        case 'clues': {
            if (Event.getEventTracking(event) !== Event.Tracking.CLUES) return 0;
            const gains: number[] = participant.runescapeAccounts.map(
                (account: Event.CompetitiveAccount): number => {
                    if (account.starting === undefined
                        || account.ending === undefined) return NaN;
                    const rankAndScoreComponents:
                    hiscores.RankAndScoreComponent[][] = (
                        event.tracking.clues
                    ).map(
                        (key: string):
                        hiscores.RankAndScoreComponent[] => [
                            account.starting.clues[key],
                            account.ending.clues[key],
                        ]
                    );
                    const clueDiff = rankAndScoreComponents.map(
                        (startEnd: hiscores.RankAndScoreComponent[]):
                        number => startEnd[1].score - startEnd[0].score
                    );
                    const clueGain = clueDiff.reduce(
                        (acc: number, x: number): number => acc + x
                    );
                    return clueGain;
                }
            );
            const gain = gains.reduce(
                (acc: number, x: number): number => acc + x
            );
            return gain;
        }

        case 'lms': {
            if (Event.getEventTracking(event) !== Event.Tracking.LMS) return 0;
            const gains: number[] = participant.runescapeAccounts.map(
                (account: Event.CompetitiveAccount): number => {
                    if (account.starting === undefined
                        || account.ending === undefined) return NaN;
                    return account.ending.lms.score - account.starting.lms.score;
                }
            );
            const gain = gains.reduce(
                (acc: number, x: number): number => acc + x
            );
            return gain;
        }

        default:
            return participant.customScore;
    }
};

/**
 * @param participants The source participants to update with new hiscores
 * @param pullNew If we should ignore the cache and update hiscores
 * @returns A new updated Data object
 * @category Runescape API Observable
 */
const updateParticipantsHiscores$ = (
    participants: Event.Participant[],
    pullNew: boolean = true
): Observable<Event.Participant[]> => {
    if (participants.length === 0) return of([]);
    const update$: Observable<Event.Participant>[] = participants.map(
        (participant: Event.Participant):
        Observable<Event.Participant> => of(participant)
            .pipe(
                switchMap(
                    (p: Event.Participant):
                    Observable<[
                        hiscores.LookupResponse[],
                        Event.Participant
                    ]> => {
                        const responseObs:
                        Observable<hiscores.LookupResponse>[] = p.runescapeAccounts.map(
                            (account: Event.CompetitiveAccount):
                            Observable<hiscores.LookupResponse> => Bot.hiscores$(
                                account.rsn,
                                pullNew
                            )
                        );
                        const responseArr:
                        Observable<hiscores.LookupResponse[]> = forkJoin(responseObs);
                        return forkJoin(
                            responseArr,
                            of(p)
                        );
                    }
                ),
                // TODO: add error catch here
                map((respArr: [hiscores.LookupResponse[], Event.Participant]):
                Event.Participant => {
                    const hiscoreArr: hiscores.LookupResponse[] = respArr[0];
                    const p: Event.Participant = respArr[1];
                    const newAccountInfos:
                    Event.CompetitiveAccount[] = p.runescapeAccounts.map(
                        (account: Event.CompetitiveAccount, idx: number):
                        Event.CompetitiveAccount => {
                            // TODO: Change how I work
                            // This is a silent error
                            if (hiscoreArr === null || hiscoreArr[idx] === null) {
                                Utils.logger.error('hiscoreArr === null || hiscoreArr[idx] === null');
                                return account;
                            }
                            if (account.starting === undefined) {
                                const updatedAccount:
                                Event.CompetitiveAccount = { ...account, };
                                updatedAccount.starting = hiscoreArr[idx];
                                updatedAccount.ending = hiscoreArr[idx];
                                return updatedAccount;
                            }
                            const updatedAccount:
                            Event.CompetitiveAccount = { ...account, };
                            updatedAccount.ending = hiscoreArr[idx];
                            return updatedAccount;
                        }
                    );
                    const newParticipant:
                    Event.Participant = { ...p, };
                    newParticipant.runescapeAccounts = newAccountInfos;
                    return newParticipant;
                })
            )
    );
    return forkJoin(update$);
};

/**
 * Finds the first regex match for a given regex and string.
 * @param regexes The array of input Regexes
 * @param search The input string to search for
 * @returns The array of matched strings entries or null entries
 * @category Helper
 */
const findFirstRegexesMatch = (
    regexMap: Record<string, RegExp>,
    search: string
): Record<string, string> => {
    const mapped = Object.keys(regexMap).map(
        (key: string): Record<string, string> => {
            const regex: RegExp = regexMap[key];
            const results: string[] = regex.exec(search);
            if (results === null) return { [key]: null, };
            const trimmedStr = results[1].trim();
            if (trimmedStr.length === 0) return { [key]: null, };
            return { [key]: trimmedStr, };
        }
    ).reduce(
        (dict: Record<string, string>, x: Record<string, string>):
        Record<string, string> => {
            const newDict: Record<string, string> = { ...dict, ...x, };
            return newDict;
        }
    );
    return mapped;
};

/**
 * A contract describing a Team for purposes of calculation.
 * See [[Event.Team]]
 * @category Helper
 */
interface PseudoTeam {
    name: string
    participants: Event.Participant[]
    score: number
    scoreDiff: number
}

/**
 * Sorts PseudoTeams by score.
 * See [[Event.Tracking]] [[Event.Teams]]
 * @param previousEvent The previous version of the Event to calculate score difference
 * @param event The new Event source
 * @param guildId The Guild associated with the Event
 * @param tracking What Tracking types we use to score Teams
 * @returns A sorted list of PseudoTeams by score
 * @category Stats
 */
const getSortedPseudoTeams = (
    previousEvent: Event.Event,
    event: Event.Event,
    guildId: string,
    tracking: Event.Tracking
): PseudoTeam[] => {
    const previousEventCopy: Event.Event = { ...previousEvent, };
    const eventCopy: Event.Event = { ...event, };
    if (!Event.isTeamEvent(eventCopy)) {
        const MakePseudoTeam = (
            gid: string,
            participant: Event.Participant
        ): Event.Team => {
            const name: string = getDisplayNameFromDiscordId(
                gid,
                participant.discordId
            );
            const info: Event.Team = {
                name,
                linkedDiscordIds: [
                    participant.discordId,
                ],
            };
            return info;
        };
        const pseudoTeams: Event.Team[] = eventCopy.participants.map(
            (participant: Event.Participant):
            Event.Team => MakePseudoTeam(
                guildId,
                participant
            )
        );
        const previousPseudoTeams: Event.Team[] = previousEventCopy.participants.map(
            (participant: Event.Participant):
            Event.Team => MakePseudoTeam(
                guildId,
                participant
            )
        );
        eventCopy.teams = pseudoTeams;
        previousEventCopy.teams = previousPseudoTeams;
    }
    const teamNames: string[] = eventCopy.teams.map(
        (info: Event.Team):
        string => info.name
    );
    const teams: PseudoTeam[] = teamNames.map(
        (name: string):
        PseudoTeam => {
            const participants: Event.Participant[] = Event.getTeamParticipants(
                eventCopy, name
            );
            const scores: number[] = participants.map(
                (participant: Event.Participant):
                number => getParticipantScore(
                    participant,
                    eventCopy,
                    tracking
                )
            );
            const score: number = scores.reduce(
                (a: number, b: number):
                number => a + b, 0
            );
            const previousParticipants: Event.Participant[] = Event.getTeamParticipants(
                previousEventCopy,
                name
            );
            const previousScores: number[] = previousParticipants.map(
                (participant: Event.Participant):
                number => getParticipantScore(
                    participant,
                    previousEventCopy,
                    tracking
                )
            );
            const previousScore: number = previousScores.reduce(
                (a: number, b: number):
                number => a + b, 0
            );
            const scoreDiff: number = score - previousScore;
            const team: PseudoTeam = {
                name,
                participants,
                score,
                scoreDiff,
            };
            return team;
        }
    );
    const sortedTeams: PseudoTeam[] = teams.sort(
        (a: PseudoTeam, b: PseudoTeam):
        number => b.score - a.score
    );
    return sortedTeams;
};

/**
 * @param data The Data input to process
 * @param discordId The Discord id to display stats for
 * @returns A string describing a players statistics
 * @category Stats
 */
const getStatsStr = (
    data: Bot.GuildContext,
    discordId: string,
): string => {
    interface Stats {
        firstPlaceFinishes: number
        secondPlaceFinishes: number
        thirdPlaceFinishes: number
        fourthAndFifthPlaceFinishes: number
        sixThroughTenPlaceFinishes: number
        totalCompetitivePlaces: number
        totalCompetitiveParticipants: number
        totalCompetitiveEvents: number
        totalCasualEvents: number
        totalXpGain: number
        totalCluesGain: number
        totalLmsGain: number
        totalBhGain: number
        totalTeamEvents: number
        totalCustomEvents: number
    }

    const participatedEvents = data.events.filter(
        (event: Event.Event): boolean => {
            const didParticipate: boolean = event.participants.some(
                (participant: Event.Participant): boolean => participant.discordId === discordId
            );
            return Event.isEventCustom(event)
                ? event.isFinalized
                    && didParticipate
                : event.hasEnded
                    && didParticipate;
        }
    );
    const mappedStats = participatedEvents.map(
        (event: Event.Event):
        Stats => {
            const tracking: Event.Tracking = Event.getEventTracking(
                event
            );

            // TODO: find a better way to reuse this code
            const sortedTeams: PseudoTeam[] = getSortedPseudoTeams(
                event,
                event,
                data.guildId,
                tracking
            );
            const foundTeam = sortedTeams.find(
                (team: PseudoTeam):
                boolean => team.participants.some(
                    (participant: Event.Participant):
                    boolean => participant.discordId === discordId
                )
            );
            const idx = sortedTeams.indexOf(
                foundTeam
            );
            const foundParticipant = foundTeam.participants.find(
                (participant: Event.Participant):
                boolean => participant.discordId === discordId
            );

            if (Event.isEventCasual(event)) {
                const stats: Stats = {
                    firstPlaceFinishes: 0,
                    secondPlaceFinishes: 0,
                    thirdPlaceFinishes: 0,
                    fourthAndFifthPlaceFinishes: 0,
                    sixThroughTenPlaceFinishes: 0,
                    totalCompetitivePlaces: 0,
                    totalCompetitiveParticipants: 0,
                    totalCompetitiveEvents: 0,
                    totalCasualEvents: 1,
                    totalCluesGain: 0,
                    totalXpGain: 0,
                    totalLmsGain: 0,
                    totalBhGain: 0,
                    totalTeamEvents: 0,
                    totalCustomEvents: 0,
                };
                return stats;
            }
            const stats: Stats = {
                firstPlaceFinishes: idx === 0 ? 1 : 0,
                secondPlaceFinishes: idx === 1 ? 1 : 0,
                thirdPlaceFinishes: idx === 2 ? 1 : 0,
                fourthAndFifthPlaceFinishes: idx >= 3 && idx <= 4 ? 1 : 0,
                sixThroughTenPlaceFinishes: idx >= 5 && idx <= 9 ? 1 : 0,
                totalCompetitivePlaces: idx + 1,
                totalCompetitiveParticipants: event.participants.length,
                totalCompetitiveEvents: 1,
                totalCasualEvents: 0,
                totalCluesGain: getParticipantScore(
                    foundParticipant,
                    event,
                    Event.Tracking.CLUES
                ),
                totalXpGain: getParticipantScore(
                    foundParticipant,
                    event,
                    Event.Tracking.SKILLS
                ),
                totalLmsGain: getParticipantScore(
                    foundParticipant,
                    event,
                    Event.Tracking.LMS
                ),
                totalBhGain: getParticipantScore(
                    foundParticipant,
                    event,
                    Event.Tracking.BH
                ),
                totalTeamEvents: Event.isTeamEvent(event) ? 1 : 0,
                totalCustomEvents: Event.isEventCustom(event) ? 1 : 0,
            };
            return stats;
        }
    );

    const stats: Stats = mappedStats.reduce(
        (acc: Stats, x: Stats): Stats => {
            acc.firstPlaceFinishes += x.firstPlaceFinishes;
            acc.secondPlaceFinishes += x.secondPlaceFinishes;
            acc.thirdPlaceFinishes += x.thirdPlaceFinishes;
            acc.fourthAndFifthPlaceFinishes += x.fourthAndFifthPlaceFinishes;
            acc.sixThroughTenPlaceFinishes += x.sixThroughTenPlaceFinishes;
            acc.totalCompetitivePlaces += x.totalCompetitivePlaces;
            acc.totalCompetitiveParticipants += x.totalCompetitiveParticipants;
            acc.totalCompetitiveEvents += x.totalCompetitiveEvents;
            acc.totalCasualEvents += x.totalCasualEvents;
            acc.totalCluesGain += x.totalCluesGain;
            acc.totalXpGain += x.totalXpGain;
            acc.totalLmsGain += x.totalLmsGain;
            acc.totalBhGain += x.totalBhGain;
            acc.totalTeamEvents += x.totalTeamEvents;
            acc.totalCustomEvents += x.totalCustomEvents;
            return acc;
        },
        {
            firstPlaceFinishes: 0,
            secondPlaceFinishes: 0,
            thirdPlaceFinishes: 0,
            fourthAndFifthPlaceFinishes: 0,
            sixThroughTenPlaceFinishes: 0,
            totalCompetitivePlaces: 0,
            totalCompetitiveParticipants: 0,
            totalCompetitiveEvents: 0,
            totalCasualEvents: 0,
            totalCluesGain: 0,
            totalXpGain: 0,
            totalLmsGain: 0,
            totalBhGain: 0,
            totalTeamEvents: 0,
            totalCustomEvents: 0,
        }
    );

    const displayName: string = getDisplayNameFromDiscordId(
        data.guildId,
        discordId
    );

    const placePadding = 8;
    const statisticsPadding = 4;

    const placingStrs: [
        string,
        string
    ][] = [
        [
            '🥇',
            stats.firstPlaceFinishes.toLocaleString('en-US'),
        ],
        [
            '🥈',
            stats.secondPlaceFinishes.toLocaleString('en-US'),
        ],
        [
            '🥉',
            stats.thirdPlaceFinishes.toLocaleString('en-US'),
        ],
        [
            '4th-5th',
            stats.fourthAndFifthPlaceFinishes.toLocaleString('en-US'),
        ],
        [
            '6th-10th',
            stats.sixThroughTenPlaceFinishes.toLocaleString('en-US'),
        ],
    ];

    const maxPlacingStrLength: number = Math.max(...placingStrs.map(
        (strs: [string, string]): number => strs[0].length + strs[1].length + placePadding
    ));

    const placingOutputStr: string = placingStrs.map(
        (strs: [string, string]): string => {
            const spacesToInsert: string = new Array(
                maxPlacingStrLength - strs[0].length - strs[1].length + 1
            ).join(' ');
            return `${strs[0]}${spacesToInsert}${strs[1]}`;
        }
    ).join('\n');

    const statsStrs: [
        string,
        string
    ][] = [
        [
            'Total XP gain',
            stats.totalXpGain.toLocaleString('en-US'),
        ],
        [
            'Total clues found',
            stats.totalCluesGain.toLocaleString('en-US'),
        ],
        [
            'Total LMS points',
            stats.totalLmsGain.toLocaleString('en-US'),
        ],
        [
            'Total Bounty Hunter points',
            stats.totalBhGain.toLocaleString('en-US'),
        ],
        [
            'Casual events',
            stats.totalCasualEvents.toLocaleString('en-US'),
        ],
        [
            'Competitive events',
            stats.totalCompetitiveEvents.toLocaleString('en-US'),
        ],
        [
            'Team events',
            stats.totalTeamEvents.toLocaleString('en-US'),
        ],
        [
            'Custom events',
            stats.totalCustomEvents.toLocaleString('en-US'),
        ],
        [
            'Total events',
            (stats.totalCasualEvents + stats.totalCompetitiveEvents).toLocaleString('en-US'),
        ],
        [
            'Average placement',
            (stats.totalCompetitivePlaces / stats.totalCompetitiveEvents).toLocaleString(
                'en-US',
                {
                    maximumFractionDigits: 1,
                }
            ),
        ],
        [
            'Participants / competition',
            (stats.totalCompetitiveParticipants / stats.totalCompetitiveEvents).toLocaleString(
                'en-US',
                {
                    maximumFractionDigits: 1,
                }
            ),
        ],
    ];

    const maxStatsStrLength: number = Math.max(...statsStrs.map(
        (strs: [string, string]): number => strs[0].length + strs[1].length + statisticsPadding
    ));

    const statsOutputStr: string = statsStrs.map(
        (strs: [string, string]): string => {
            const spacesToInsert: string = new Array(
                maxStatsStrLength - strs[0].length - strs[1].length + 1
            ).join(' ');
            return `${strs[0]}${spacesToInsert}${strs[1]}`;
        }
    ).join('\n');

    return `${displayName}\n${placingOutputStr}\n\n${statsOutputStr}`;
};

//----------------------
// Observables & helpers
//
//----------------------

/**
 * Observable of Discord message events
 * @category Base Observable
 */
const eventMessage$: Observable<discord.Message> = fromEvent(gClient as unknown as EventEmitter, 'message');

/**
 * Subject of injected discord message events
 * @category Discord Observable
 * @ignore
 */
const injectedMessages$: Subject<discord.Message> = new Subject();

/**
 * A merged Observable of [[eventMessage$]] and [[injectedMessage$]]
 * @category Command Observable
 */
const message$: Observable<discord.Message> = merge(
    eventMessage$,
    injectedMessages$
);

/**
 * Observable of Discord ready events
 * @category Base Observable
 */
const ready$: Observable<void> = fromEvent(gClient as unknown as EventEmitter, 'ready');

/**
 * Observable of ready events other than the first
 * @category Base Observable
 */
const reconnect$: Observable<void> = ready$
    .pipe(
        skip(1)
    );

/**
 * Observable of the bootstrap event
 * @category Base Observable
 */
const connect$: Observable<void> = ready$
    .pipe(
        take(1)
    );

/**
 * Observable of Discord error events
 * @category Base Observable
 */
const error$: Observable<Error> = fromEvent(gClient as unknown as EventEmitter, 'error');

/**
 * @param find The string to filter for
 * @returns Observable of the transformed Input object
 * @category Base Observable
 */
const filteredMessage$ = (
    botCommand: Bot.Command
): Observable<Input> => message$
    .pipe(
        // filter our messages with find
        // and necessary discord checks
        filter((msg: discord.Message): boolean => msg.guild
            && msg.guild.available
            && msg.content.toLowerCase()
                .startsWith(botCommand.command)),

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
                    };
                    return input;
                })
                // we probably want to die on load/save errors
                // keep this commented out
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
            Utils.logger.debug(`message: ${command.message.content}`);
            Utils.logger.debug(`author: ${command.author.username}`);
            Utils.logger.debug(`guild: ${command.guild.name}`);
            Utils.logger.debug(`input: ${command.input}`);
        }),
        filter((command: Input): boolean => botCommand.accessControl.controlFunction(
            Bot.load(command.guild.id), command.author.id
        ))
    );

/**
 * An Observable that handles the Debug Command.
 * See [[Bot.AllCommands.DEBUG]]
 * @category Command Observable
 */
const debug$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.DEBUG
);

/**
 * An Observable that handles the Add Admin Command.
 * See [[Bot.AllCommands.ADD_ADMIN]]
 * @category Command Observable
 */
const addAdmin$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.ADD_ADMIN
)
    .pipe(
        filter(
            (command: Input):
            boolean => command.message.mentions.members.array().length > 0
        ),
    );


/**
 * An Observable that handles the Add Upcoming Command.
 * See [[Bot.AllCommands.ADD_UPCOMING]]
 * @category Command Observable
 */
const addUpcoming$: Observable<[Input, Event.Event]> = filteredMessage$(
    Bot.ALL_COMMANDS.ADD_UPCOMING
)
    .pipe(
        // we need at least a name, starting date and end date, and type
        map(
            (command: Input): [Input, Event.Event] => {
                const oldData: Bot.GuildContext = Bot.load(command.guild.id);

                // let's only allow 10 upcoming events per Guild
                const upcomingEvents: Event.Event[] = Event.getUpcomingEvents(
                    oldData.events
                );
                if (upcomingEvents.length >= 10) {
                    Utils.logger.debug(`Guild ${command.guild.name} added too many events`);
                    command.message.reply('this guild has too many events scheduled');
                    return null;
                }

                const regexes: Record<string, RegExp> = {
                    name: new RegExp('(?<=name)\\s*(.+?)\\s*(?:starting|ending|type|team|$)', 'gim'),
                    starting: new RegExp('(?<=starting)\\s*(.+?)\\s*(?:name|ending|type|team|$)', 'gim'),
                    ending: new RegExp('(?<=ending)\\s*(.+?)\\s*(?:name|starting|type|team|$)', 'gim'),
                    type: new RegExp('(?<=type)\\s*(\\w+).*(?:name|starting|ending|type|team|$)', 'gim'),
                    team: new RegExp('(teams?)\\s*(?:name|starting|ending|type|team|$)', 'gim'),
                };
                const parsedRegexes = findFirstRegexesMatch(
                    regexes,
                    command.input
                );
                const eventName: string = parsedRegexes.name;
                const startingDateStr = parsedRegexes.starting;
                const endingDateStr = parsedRegexes.ending;
                const inputType: string = parsedRegexes.type;

                // require all inputs to be valid
                if (eventName === null) {
                    Utils.logger.debug(`Admin ${command.author.username} entered invalid event name`);
                    command.message.reply(`invalid event name\n${Bot.ALL_COMMANDS.ADD_UPCOMING.usage}`);
                    return null;
                }

                if (startingDateStr === null) {
                    Utils.logger.debug(`Admin ${command.author.username} entered invalid starting date`);
                    command.message.reply(`invalid starting date\n${Bot.ALL_COMMANDS.ADD_UPCOMING.usage}`);
                    return null;
                }

                if (endingDateStr === null) {
                    Utils.logger.debug(`Admin ${command.author.username} entered invalid ending date`);
                    command.message.reply(`invalid ending date\n${Bot.ALL_COMMANDS.ADD_UPCOMING.usage}`);
                    return null;
                }

                if (inputType === null) {
                    Utils.logger.debug(`Admin ${command.author.username} entered invalid type`);
                    command.message.reply(`invalid type\n${Bot.ALL_COMMANDS.ADD_UPCOMING.usage}`);
                    return null;
                }

                // make sure our event name is unique for ongoing events
                const upcomingAndInFlightEvents:
                Event.Event[] = Event.getUpcomingAndInFlightEvents(
                    oldData.events
                );
                const unfinalizedEvents: Event.Event[] = Event.getUnfinalizedEvents(
                    oldData.events
                );
                const upcomingOrInFlightOrUnfinalizedEventWithSameName = [
                    ...upcomingAndInFlightEvents,
                    ...unfinalizedEvents,
                ].find(
                    (event: Event.Event):
                    boolean => event.name.toLowerCase() === eventName.toLowerCase()
                );

                // no duplicate names
                if (upcomingOrInFlightOrUnfinalizedEventWithSameName !== undefined) {
                    Utils.logger.debug(`Admin ${command.author.username} entered event with same name`);
                    command.message.reply(`already an event with the same name scheduled\n${Bot.ALL_COMMANDS.ADD_UPCOMING.usage}`);
                    return null;
                }

                const tracking: Event.Tracking = Object.values(
                    Event.Tracking
                ).find(
                    (value: string): boolean => inputType.toUpperCase() === value.toUpperCase()
                );

                const dateA: Date = new Date(parsedRegexes.starting);
                const dateB: Date = new Date(parsedRegexes.ending);
                const startingDate: Date = dateA <= dateB ? dateA : dateB;
                const endingDate: Date = dateA > dateB ? dateA : dateB;
                const event: Event.Event = {
                    id: uuid(),
                    name: eventName,
                    startingDate,
                    endingDate,
                    participants: [],
                    hasPassedTwoHourWarning: false,
                    hasStarted: false,
                    hasEnded: false,
                };

                if (parsedRegexes.team !== null) {
                    event.teams = [];
                }

                if (tracking !== undefined) {
                    event.tracking = {};
                    switch (tracking) {
                        case Event.Tracking.BH:
                        case Event.Tracking.CLUES:
                        case Event.Tracking.SKILLS:
                            event.tracking[tracking as string] = [];
                            break;
                        case Event.Tracking.CUSTOM:
                        case Event.Tracking.LMS:
                            event.tracking[tracking as string] = true;
                            break;
                        default:
                            Utils.logger.error('Tracking is not undefined but also unknown');
                            break;
                    }
                }

                if (!Utils.isValidDate(dateA) || !Utils.isValidDate(dateB)) {
                    Utils.logger.debug(`Admin ${command.author.username} entered invalid date`);
                    command.message.reply('starting date or ending date is invalid use IS0 8601 standard');
                    return null;
                }
                const now: Date = new Date();
                if (startingDate <= now) {
                    Utils.logger.debug(`Admin ${command.author.username} entered a start date in the past`);
                    command.message.reply('cannot start an event in the past');
                    return null;
                }
                const threeWeeksFromNow: Date = new Date();
                threeWeeksFromNow.setDate(
                    threeWeeksFromNow.getDate() + 21
                );
                if (endingDate > threeWeeksFromNow) {
                    Utils.logger.debug(`Admin ${command.author.username} entered a end date too far in the future`);
                    command.message.reply('event must end within 3 weeks of now');
                    return null;
                }
                if (endingDate.getTime() - startingDate.getTime() < 30 * 60 * 1000) {
                    Utils.logger.debug(`Admin ${command.author.username} entered a start date and end date too close together`);
                    command.message.reply('events must be at least 30 minutes long');
                    return null;
                }
                return [
                    command,
                    event,
                ];
            }
        ),
        filter((commandEventArr: [Input, Event.Event]):
        boolean => commandEventArr !== null),
        tap((commandEventArr: [Input, Event.Event]): void => {
            Utils.logger.debug(`Admin ${commandEventArr[0].author.username} called add event`);
            Utils.logger.debug('Runescape.Event properties: ');
            Utils.logger.debug(`* ${commandEventArr[1].name}`);
            Utils.logger.debug(`* ${commandEventArr[1].startingDate.toDateString()}`);
            Utils.logger.debug(`* ${commandEventArr[1].endingDate.toDateString()}`);
            Utils.logger.debug(`* ${commandEventArr[1].tracking}`);
        }),
        share()
    );

/**
 * An Observable that handles the Add Upcoming Command for Casual Events.
 * See [[Bot.AllCommands.ADD_UPCOMING]] [[Event.Tracking.NONE]]
 * @category Command Observable Intermediate
 */
const filterUpcomingGenericEvent$:
Observable<[Input, Event.Event]> = addUpcoming$
    .pipe(
        filter((commandEventArr: [Input, Event.Event]): boolean => {
            const event: Event.Event = commandEventArr[1];
            return Event.isEventCasual(event);
        }),
    );

/**
 * An Observable that handles the Add Upcoming Command for Competitive Events.
 * See [[Bot.AllCommands.ADD_UPCOMING]] [[Event.Tracking.SKILLS]] [[Event.Tracking.BH]]
 * [[Event.Tracking.LMS]] [[Event.Tracking.CLUES]] [[Event.Tracking.CUSTOM]]
 * @category Command Observable Intermediate
 */
const filterAndPrepareUpcomingCompetitiveEvent$:
Observable<[Input, Event.Event]> = addUpcoming$
    .pipe(
        filter((commandEventArr: [Input, Event.Event]): boolean => {
            const event: Event.Event = commandEventArr[1];
            return !Event.isEventCasual(event);
        }),
        map((commandEventArr: [Input, Event.Event]): [Input, Event.Event] => {
            const command: Input = commandEventArr[0];
            const event: Event.Event = commandEventArr[1]; // TODO: copy?
            const competitiveRegex = {
                params: new RegExp('(?<=type)\\s*\\w+\\s*(.+?)\\s*(?:name|starting|ending|type|$)'),
            };
            const parsedRegexes = findFirstRegexesMatch(
                competitiveRegex,
                command.input
            );
            const params: string = parsedRegexes.params;

            // Skills
            if (event.tracking.skills !== undefined && params !== null) {
                const inputSkillNames: string[] = parsedRegexes.params.split(' ').map(
                    (stringToTrim: string): string => stringToTrim.trim()
                        .toLowerCase()
                );
                const allRunescapeSkills: string[] = Object.values(Event.Skills);
                const skills: string[] = inputSkillNames.filter(
                    (skill: string): boolean => skill.length > 0
                        && allRunescapeSkills.includes(skill)
                );
                if (inputSkillNames.length !== skills.length) {
                    Utils.logger.debug(`Admin ${command.author.id} entered some invalid skill names`);
                    command.message.reply(`some skill names entered are invalid\nchoices are: ${allRunescapeSkills.toString()}`);
                    return null;
                }
                event.tracking.skills = skills as Event.Skills[];
                return [
                    command,
                    event,
                ];
            }

            // Bounty hunter
            if (event.tracking.bh !== undefined) {
                event.tracking.bh = [
                    Event.BountyHunter.HUNTER,
                ];
                return [
                    command,
                    event,
                ];
            }

            // Clues
            if (event.tracking.clues !== undefined && params !== null) {
                const inputClueModeNames: string[] = parsedRegexes.params.split(' ').map(
                    (stringToTrim: string): string => stringToTrim.trim()
                        .toLowerCase()
                );
                const allRunescapeClueModes: string[] = Object.values(Event.Clues);
                const filteredClueModes: string[] = inputClueModeNames.filter(
                    (clueMode: string): boolean => clueMode.length > 0
                        && allRunescapeClueModes.includes(clueMode)
                );
                if (inputClueModeNames.length !== filteredClueModes.length) {
                    Utils.logger.debug(`Admin ${command.author.id} entered some invalid clue names`);
                    command.message.reply(`some clue settings entered are invalid\nchoices are: ${allRunescapeClueModes.toString()}`);
                    return null;
                }
                const clues: string[] = filteredClueModes.includes(
                    Event.Clues.ALL
                )
                || (
                    filteredClueModes.includes(Event.Clues.BEGINNER)
                    && filteredClueModes.includes(Event.Clues.EASY)
                    && filteredClueModes.includes(Event.Clues.MEDIUM)
                    && filteredClueModes.includes(Event.Clues.HARD)
                    && filteredClueModes.includes(Event.Clues.ELITE)
                    && filteredClueModes.includes(Event.Clues.MASTER)
                )
                    ? [
                        Event.Clues.ALL,
                    ]
                    : filteredClueModes;

                // TODO: fix me
                event.tracking = {
                    clues: clues as Event.Clues[],
                };
                return [
                    command,
                    event,
                ];
            }

            // lms
            if (event.tracking.lms !== undefined) {
                return [
                    command,
                    event,
                ];
            }

            // custom
            if (event.tracking.custom !== undefined) {
                event.isFinalized = false;
                return [
                    command,
                    event,
                ];
            }

            Utils.logger.debug(`Admin ${command.author.id} entered invalid competition data`);
            command.message.reply(`some competition settings entered are invalid\n${Bot.ALL_COMMANDS.ADD_UPCOMING.usage}`);
            return null;
        }),
        filter((commandEventArr: [Input, Event.Event]): boolean => commandEventArr !== null)
    );

/**
 * A merged Observable of Regular and Competitive Events.
 * See [[Event.Event]]
 * @category Command Observable
 * @ignore
 */
const saveEvent$ = merge(
    filterUpcomingGenericEvent$,
    filterAndPrepareUpcomingCompetitiveEvent$
);

/**
 * An Observable that handles the List Upcoming Command.
 * See [[Bot.AllCommands.LIST_UPCOMING]]
 * @category Command Observable
 */
const listUpcomingEvent$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.LIST_UPCOMING
);

/**
 * An Observable that handles the Delete Upcoming Command.
 * See [[Bot.AllCommands.DELETE_UPCOMING]]
 * @category Command Observable
 */
const deleteUpcomingEvent$:
Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.DELETE_UPCOMING
);

/**
 * An Observable that handles the Signup Upcoming Command.
 * See [[Bot.AllCommands.SIGNUP_UPCOMING]]
 * @category Command Observable
 */
const signupEvent$: Observable<[
    Bot.GuildContext,
    Event.Event,
    discord.Message,
    hiscores.LookupResponse
]> = filteredMessage$(
    Bot.ALL_COMMANDS.SIGNUP_UPCOMING
)
    .pipe(
        switchMap((command: Input):
        Observable<[
            Bot.GuildContext,
            Event.Event,
            discord.Message,
            hiscores.LookupResponse
        ]> => {
            const signupRegex = {
                eventName: new RegExp('(?<=event)\\s*(.*?)\\s*(?:event|rsn|teamname|$)', 'gim'),
                rsn: new RegExp('(?<=rsn)\\s*(.*?)\\s*(?:event|rsn|teamname|$)', 'gim'),
                teamname: new RegExp('(?<=teamname)\\s*(.*?)\\s*(?:event|rsn|teamname|$)', 'gim'),
            };
            const parsedRegexes = findFirstRegexesMatch(signupRegex, command.input);
            const eventName: string = parsedRegexes.eventName;
            const rsnToAdd: string = parsedRegexes.rsn;
            if (eventName === null) {
                Utils.logger.debug(`${command.author.id} entered invalid event name`);
                command.message.reply(`invalid event name\n${Bot.ALL_COMMANDS.SIGNUP_UPCOMING.usage}`);
                return of(null);
            }
            if (rsnToAdd === null) {
                Utils.logger.debug(`${command.author.id} entered invalid rsn`);
                command.message.reply(`invalid rsn\n${Bot.ALL_COMMANDS.SIGNUP_UPCOMING.usage}`);
                return of(null);
            }

            // get upcoming events
            // if index is out of range return
            const data: Bot.GuildContext = Bot.load(command.guild.id);
            const upcomingAndInFlightEvents:
            Event.Event[] = Event.getUpcomingAndInFlightEvents(
                data.events
            );
            // get event to modify
            const eventToModify: Event.Event = upcomingAndInFlightEvents.find(
                (event: Event.Event):
                boolean => event.name.toLowerCase() === eventName.toLowerCase()
            );
            if (eventToModify === undefined) {
                Utils.logger.debug(`Did not find name (${eventName})`);
                command.message.reply(`Did not find upcoming event with name '${eventName}'\n${Bot.ALL_COMMANDS.SIGNUP_UPCOMING.usage}`);
                return of(null);
            }

            const discordIdToAdd: string = command.author.id;
            const newRsAccount: Event.Account = {
                rsn: rsnToAdd,
            };

            const participantToAdd: Event.Participant = {
                discordId: discordIdToAdd,
                runescapeAccounts: [
                    newRsAccount,
                ],
            };

            if (Event.isEventCustom(eventToModify)) {
                participantToAdd.customScore = 0;
            }

            const newEvent: Event.Event = Event.signupEventParticipant(
                eventToModify,
                participantToAdd,
            );

            // TODO: hackish way?
            if (newEvent === eventToModify) {
                Utils.logger.debug('User already signed up');
                command.message.reply('Your discord id or rsn is already signed up');
                return of(null);
            }

            if (Event.isTeamEvent(newEvent)) {
                const teamname: string = parsedRegexes.teamname;
                if (teamname === null) {
                    Utils.logger.debug(`${command.author.id} entered invalid teamname`);
                    command.message.reply(`invalid teamname\n${Bot.ALL_COMMANDS.SIGNUP_UPCOMING.usage}`);
                    return of(null);
                }

                const team: Event.Team = newEvent.teams.find(
                    (teamInfo: Event.Team):
                    boolean => teamInfo.name.toLowerCase() === teamname.toLowerCase()
                );
                if (team === undefined) {
                    // create new team
                    const newTeam: Event.Team = {
                        name: teamname,
                        linkedDiscordIds: [
                            command.author.id,
                        ],
                    };
                    const newTeams: Event.Team[] = newEvent.teams.concat(newTeam);
                    newEvent.teams = newTeams;
                } else {
                    const newTeam: Event.Team = { ...team, };
                    const newLinkedDiscordIds: string[] = newTeam.linkedDiscordIds.concat(
                        command.author.id
                    );
                    newTeam.linkedDiscordIds = newLinkedDiscordIds;
                    const idx: number = newEvent.teams.indexOf(team);
                    newEvent.teams[idx] = newTeam;
                }
            }

            const newEvents: Event.Event[] = Event.modifyEventArray(
                data.events,
                newEvent
            );
            const newData: Bot.GuildContext = { ...data, };
            newData.events = newEvents;

            return forkJoin(
                of<Bot.GuildContext>(newData),
                of<Event.Event>(newEvent),
                of<discord.Message>(command.message),
                Bot.hiscores$(rsnToAdd, false)
            );
        }),
        filter(
            (dataMsgHiArr: [
                Bot.GuildContext,
                Event.Event,
                discord.Message,
                hiscores.LookupResponse
            ]):
            boolean => dataMsgHiArr !== null
        ),
    );

/**
 * An Observable that handles the Unsignup Upcoming Command.
 * See [[Bot.AllCommands.UNSIGNUP_UPCOMING]]
 * @category Command Observable
 */
const unsignupUpcomingEvent$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.UNSIGNUP_UPCOMING
);

/**
 * An Observable that handles the Am I Signed Up Command.
 * See [[Bot.AllCommands.AMISIGNEDUP_UPCOMING]]
 * @category Command Observable
 */
const amISignedUp$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.AMISIGNEDUP_UPCOMING
);

/**
 * An Observable that handles the List Participants Command.
 * See [[Bot.AllCommands.LIST_PARTICIPANTS_UPCOMING]]
 * @category Command Observable
 */
const listParticipant$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.LIST_PARTICIPANTS_UPCOMING
);

/**
 * An Observable that handles the Set Channel Command.
 * See [[Bot.AllCommands.SET_CHANNEL]]
 * @category Command Observable
 */
const setChannel$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.SET_CHANNEL
)
    .pipe(
        filter((command: Input): boolean => {
            const channel = command.message.mentions.channels.first();
            if (channel === undefined) return false;
            if (!command.guild.available) return false;
            return command.guild.channels.get(channel.id) !== undefined;
        })
    );

/**
 * An Observable that handles the Help Command.
 * See [[Bot.AllCommands.HELP]]
 * @category Command Observable
 */
const help$: Observable<Input> = filteredMessage$(Bot.ALL_COMMANDS.HELP);

/**
 * An Observable that handles the Force Signup Command.
 * See [[Bot.AllCommands.FORCESIGNUP_UPCOMING]]
 * @category Command Observable
 */
const forceSignup$: Observable<Input> = filteredMessage$(Bot.ALL_COMMANDS.FORCESIGNUP_UPCOMING)
    .pipe(
        filter(
            (command: Input):
            boolean => command.message.mentions.members.array().length > 0
        ),
    );

/**
 * An Observable that handles the Force Unsignup Command.
 * See [[Bot.AllCommands.FORCEUNSIGNUP_UPCOMING]]
 * @category Command Observable
 */
const forceUnsignup$: Observable<Input> = filteredMessage$(Bot.ALL_COMMANDS.FORCEUNSIGNUP_UPCOMING)
    .pipe(
        filter(
            (command: Input):
            boolean => command.message.mentions.members.array().length > 0
        ),
    );

/**
 * An Observable that handles the Show Stats Command.
 * See [[Bot.AllCommands.SHOWSTATS]]
 * @category Command Observable
 */
const showStats$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.SHOWSTATS
);

/**
 * An Observable that handles the Finalize Command.
 * See [[Bot.AllCommands.FINALIZE]]
 * @category Command Observable
 */
const finalize$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.FINALIZE
);

/**
 * An Observable that handles the List Custom Command.
 * See [[Bot.AllCommands.LIST_CUSTOM]]
 * @category Command Observable
 */
const listCustom$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.LIST_CUSTOM
);

/**
 * An Observable that handles the Update Score Command.
 * See [[Bot.AllCommands.UPDATESCORE]]
 * @category Command Observable
 */
const updateScore$: Observable<Input> = filteredMessage$(
    Bot.ALL_COMMANDS.UPDATESCORE
)
    .pipe(
        filter(
            (command: Input):
            boolean => command.message.mentions.members.array().length > 0
        ),
    );

/**
 * Subject helper that fires when an Event's Participants updates
 * See [[Event.Event]]
 * @category Event Lifecycle
 */
const eventParticipantsDidUpdate$:
Subject<GuildDataIdEventIdAndParticipants> = new Subject();

/**
 * Subject helper that fires when an event will warn about its upcoming start
 * See [[Event.Event]]
 * @category Event Lifecycle
 */
const eventWillWarnStart$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that fires when an event did warn about its upcoming start
 * See [[Event.Event]]
 * @category Event Lifecycle
 */
const eventDidWarnStart$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that fires when an event will start
 * See [[Event.Event]]
 * @category Event Lifecycle
 */
const eventWillStart$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that fires when an event did start
 * See [[Event.Event]]
 * @category Event Lifecycle
 */
const eventDidStart$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that fires when an event will end
 * See [[Event.Event]]
 * @category Event Lifecycle
 */
const eventWillEnd$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that fires when an event did end
 * See [[Event.Event]]
 * @category Event Lifecycle
 */
const eventDidEnd$:
Subject<GuildDataAndEvent> = new Subject();

//------------------------
// Subscriptions & helpers
//
//------------------------

finalize$.subscribe(
    (command: Input): void => {
        const data: Bot.GuildContext = Bot.load(command.guild.id);
        const unfinalizedEvents: Event.Event[] = Event.getUnfinalizedEvents(
            data.events
        );

        const eventName: string = command.input.trim();
        const eventToFinalize: Event.Event = unfinalizedEvents.find(
            (event: Event.Event):
            boolean => event.name.toLowerCase() === eventName.toLowerCase()
        );
        if (eventToFinalize === undefined) {
            Utils.logger.debug(`Did not find name (${eventName})`);
            command.message.reply(`Did not find upcoming event with name '${eventName}'\n${Bot.ALL_COMMANDS.SIGNUP_UPCOMING.usage}`);
            return;
        }
        if (!eventToFinalize.hasEnded) {
            command.message.reply('cannot finalize an event that has not ended yet');
            return;
        }

        const newEvent: Event.Event = { ...eventToFinalize, };
        newEvent.isFinalized = true;
        saveModifiedEvent(data, newEvent);
        Utils.logger.debug('saved finalized event');
        command.message.reply(`finalized event ${newEvent.name}`);
    }
);

listCustom$.subscribe(
    (command: Input): void => {
        const data: Bot.GuildContext = Bot.load(
            command.guild.id
        );
        const unfinalizedEvents: Event.Event[] = Event.getUnfinalizedEvents(
            data.events
        );
        const eventsStr: string = unfinalizedEvents.length > 0
            ? unfinalizedEvents.map(
                (event: Event.Event, idx: number):
                string => `\n${idx}: unfinalized event ${event.name}`
            ).join('')
            : 'no unfinalized events';
        command.message.reply(eventsStr);
    }
);

updateScore$.subscribe(
    (command: Input): void => {
        const data: Bot.GuildContext = Bot.load(command.guild.id);
        const newInput = command.input.replace(/<@!?[0-9]+>/g, '');
        const updateScore = {
            score: new RegExp('(?<=score)\\s*([\\+|-]?[0-9]+)\\s*(?:event|score|$)', 'gim'),
            event: new RegExp('(?<=event)\\s*(.*?)\\s*(?:event|score|$)', 'gim'),
        };
        const parsedRegexes = findFirstRegexesMatch(updateScore, newInput);
        const scoreStr: string = parsedRegexes.score;
        const eventName: string = parsedRegexes.event;
        if (scoreStr === null) {
            Utils.logger.debug(`${command.author.id} entered invalid score`);
            command.message.reply(`invalid score\n${Bot.ALL_COMMANDS.UPDATESCORE.usage}`);
            return;
        }
        if (eventName === null) {
            Utils.logger.debug(`${command.author.id} entered invalid event`);
            command.message.reply(`invalid event\n${Bot.ALL_COMMANDS.UPDATESCORE.usage}`);
            return;
        }
        const numToAdd: number = parseInt(
            scoreStr,
            10,
        );
        if (Number.isNaN(numToAdd)) {
            Utils.logger.debug(`${command.author.id} entered invalid score`);
            command.message.reply(`invalid score\n${Bot.ALL_COMMANDS.UPDATESCORE.usage}`);
            return;
        }
        const unfinalizedEvents: Event.Event[] = Event.getUnfinalizedEvents(data.events);
        const eventToModify: Event.Event = unfinalizedEvents.find(
            (event: Event.Event):
            boolean => event.name.toLowerCase() === eventName.toLowerCase()
        );
        if (eventToModify === undefined) {
            Utils.logger.debug(`Did not find event '${eventName}'`);
            command.message.reply(`can't find name ${eventName}\n${Bot.ALL_COMMANDS.UPDATESCORE.usage}`);
            return;
        }
        if (!eventToModify.hasStarted) {
            Utils.logger.debug(`Event '${eventName}' has not started`);
            command.message.reply(`event ${eventName} has not started yet\n${Bot.ALL_COMMANDS.UPDATESCORE.usage}`);
            return;
        }
        const mention: discord.User = command.message.mentions.users.array()[0];
        const mentionId: string = mention.id;
        const foundParticipant: Event.Participant = eventToModify.participants.find(
            (participant: Event.Participant):
            boolean => participant.discordId === mentionId
        );
        if (foundParticipant === undefined) {
            Utils.logger.debug(`Did not find participant '${getDisplayNameFromDiscordId(data.guildId, mentionId)}'`);
            command.message.reply(`${getDisplayNameFromDiscordId(data.guildId, mentionId)} is not signed up\n${Bot.ALL_COMMANDS.UPDATESCORE.usage}`);
            return;
        }
        const newParticipant: Event.Participant = { ...foundParticipant, };
        newParticipant.customScore += numToAdd;
        const newEvent: Event.Event = Event.updateEventParticipant(
            eventToModify,
            newParticipant,
        );
        command.message.reply(`${mention} now has ${newParticipant.customScore} points`);
        eventParticipantsDidUpdate$.next(
            {
                guildId: command.guild.id,
                eventId: newEvent.id,
                participants: newEvent.participants,
            }
        );
    }
);

/**
 * Sets the starting timer for an Event
 * See [[Event.Event]]
 * @param guildId The Guild associated with the timer
 * @param eventId The Event associated with the timer
 * @param startDate The Date the Event starts
 * @returns A global timer handle
 * @category Timer
 */
const setTimerStart = (
    guildId: string,
    eventId: string,
    startDate: Date
): NodeJS.Timeout => {
    const now: Date = new Date();
    return setTimeout(
        (): void => {
            const data: Bot.GuildContext = Bot.load(
                guildId
            );
            const newFetchedEvent: Event.Event = Event.findEventById(
                data.events,
                eventId,
            );
            eventWillStart$.next(
                {
                    guildData: data,
                    event: newFetchedEvent,
                }
            );
        }, startDate.getTime() - now.getTime()
    );
};

eventWillStart$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: Bot.GuildContext = obj.guildData;
        const event: Event.Event = obj.event;

        notifyParticipantsInEvent(
            guildData,
            event,
            START_STR
        );

        eventDidStart$.next(
            {
                guildData,
                event,
            }
        );
    }
);

/**
 * Sets the auto updating timer for an auto tracking Event
 * See [[Event.Event]]
 * @param guildId The Guild associated with the timer
 * @param eventId The Event associated with the timer
 * @returns A global timer handle
 * @category Timer
 */
const setTimerAutoUpdate = (
    guildId: string,
    eventId: string,
): NodeJS.Timeout => setInterval(
    (): void => {
        const data: Bot.GuildContext = Bot.load(
            guildId
        );
        const newFetchedEvent: Event.Event = Event.findEventById(
            data.events,
            eventId,
        );
        updateParticipantsHiscores$(
            newFetchedEvent.participants
        ).subscribe(
            (newParticipants: Event.Participant[]):
            void => {
                eventParticipantsDidUpdate$.next(
                    {
                        guildId,
                        eventId,
                        participants: newParticipants,
                    }
                );
            }
        );
    }, 60 * 60 * 1000
);

/**
 * @param obj Object containing the Guild Data and Event that did start
 * @category Event Lifecycle
 */
eventDidStart$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: Bot.GuildContext = obj.guildData;
        const eventThatStarted: Event.Event = obj.event;

        const updatedData: Bot.GuildContext = Bot.load(
            guildData.guildId,
        );
        const fetchedEvent: Event.Event = Event.findEventById(
            updatedData.events,
            eventThatStarted.id,
        );

        const newEvent: Event.Event = {
            ...fetchedEvent,
        };
        newEvent.hasStarted = true;

        saveModifiedEvent(
            updatedData,
            newEvent
        );

        if (Event.isEventCustom(newEvent)) {
            eventParticipantsDidUpdate$.next(
                {
                    guildId: guildData.guildId,
                    eventId: newEvent.id,
                    participants: newEvent.participants,
                }
            );
        }

        if (!Event.isEventCasual(newEvent)
        && !Event.isEventCustom(newEvent)) {
            updateParticipantsHiscores$(
                newEvent.participants
            ).subscribe(
                (newParticipants: Event.Participant[]): void => {
                    eventParticipantsDidUpdate$.next(
                        {
                            guildId: guildData.guildId,
                            eventId: newEvent.id,
                            participants: newParticipants,
                        }
                    );
                }
            );
        }

        if (!Event.isEventCasual(newEvent)
        && !Event.isEventCustom(newEvent)) {
            timers[newEvent.id].autoUpdate = setTimerAutoUpdate(
                guildData.guildId,
                newEvent.id,
            );
        }
    }
);

/**
 * Gets the formatted string representing placement for a Competitive Event.
 * @param guildId The Guild associated with the Event
 * @param previousEvent The previous version of the Event to calculate score difference
 * @param event The new updated version of the Event source
 * @returns The formatted leaderboard string
 * @category Stats
 */
const getLeaderboardStr = (
    guildId: string,
    previousEvent: Event.Event,
    event: Event.Event
): string => {
    // handle teams and singles as pseudo teams
    const tracking: Event.Tracking = Event.getEventTracking(event);


    // make pseudo teams to simplify code
    const sortedTeams: PseudoTeam[] = getSortedPseudoTeams(
        previousEvent,
        event,
        guildId,
        tracking
    );

    const namePadding = 8;
    const plusPadding = 0;
    const diffPadding = 4;

    const nameMaxDisplayLength: number = Math.max(
        ...sortedTeams.map(
            (team: PseudoTeam):
            number => team.name.length + team.score.toLocaleString(
                'en-US'
            ).length
        )
    ) + namePadding;

    const strToPrint: string = sortedTeams.map(
        (team: PseudoTeam, idx: number):
        string => {
            const displayName: string = team.name;
            const eventGain: string = team.score.toLocaleString(
                'en-US'
            );
            const xpDiffStr = team.scoreDiff.toLocaleString('en-US');
            const numNameSpacesToInsert:
            number = nameMaxDisplayLength - displayName.length - eventGain.length;

            const nameSpaces: string = new Array(numNameSpacesToInsert + 1).join(' ');
            const diffSpaces: string = new Array(diffPadding + 1).join(' ');
            const plusSpaces = new Array(plusPadding + 1).join(' ');
            const displayStr = `${displayName}${nameSpaces}${eventGain}${diffSpaces}+${plusSpaces}${xpDiffStr}`;

            switch (idx) {
                case 0:
                    return `🥇\t${displayStr}`;
                case 1:
                    return `🥈\t${displayStr}`;
                case 2:
                    return `🥉\t${displayStr}`;
                default:
                    return `🤡\t${displayStr}`;
            }
        }
    ).join('\n');
    const titleAndPrint = previousEvent.name.concat('\n\n').concat(strToPrint);
    return titleAndPrint;
};

eventParticipantsDidUpdate$.subscribe(
    (obj: GuildDataIdEventIdAndParticipants): void => {
        const eventId: string = obj.eventId;
        const guildId: string = obj.guildId;
        const updatedParticipants: Event.Participant[] = obj.participants;

        const data: Bot.GuildContext = Bot.load(
            guildId
        );
        const fetchedEvent: Event.Event = Event.findEventById(
            data.events,
            eventId,
        );
        if (fetchedEvent === undefined) return;
        const updatedEvent = {
            ...fetchedEvent,
        };
        updatedEvent.participants = updatedParticipants;
        const updatedData = saveModifiedEvent(
            data,
            updatedEvent,
        );

        // update leaderboard
        const strToPrint: string = getLeaderboardStr(
            guildId,
            fetchedEvent,
            updatedEvent,
        );

        if (updatedEvent.scoreboardMessageId !== undefined) {
            editChannelMessage(
                updatedData.guildId,
                updatedData.settings.notificationChannelId,
                updatedEvent.scoreboardMessageId,
                strToPrint,
                { code: true, }
            ).catch(
                (): void => {
                    sendChannelMessage(
                        updatedData.guildId,
                        updatedData.settings.notificationChannelId,
                        strToPrint,
                        { code: true, },
                    ).then(
                        (message: discord.Message): void => {
                            const newUpdatedData: Bot.GuildContext = Bot.load(
                                guildId
                            );
                            const newUpdatedFetchedEvent: Event.Event = Event.findEventById(
                                newUpdatedData.events,
                                eventId,
                            );
                            if (newUpdatedFetchedEvent === undefined) return;
                            const newUpdatedEvent = {
                                ...newUpdatedFetchedEvent,
                            };
                            newUpdatedEvent.scoreboardMessageId = message.id;
                            saveModifiedEvent(
                                newUpdatedData,
                                newUpdatedEvent,
                            );
                        }
                    );
                }
            );
        } else {
            sendChannelMessage(
                updatedData.guildId,
                updatedData.settings.notificationChannelId,
                strToPrint,
                { code: true, },
            ).then(
                (message: discord.Message): void => {
                    const newUpdatedData: Bot.GuildContext = Bot.load(
                        guildId
                    );
                    const newUpdatedFetchedEvent: Event.Event = Event.findEventById(
                        newUpdatedData.events,
                        eventId,
                    );
                    if (newUpdatedFetchedEvent === undefined) return;
                    const newUpdatedEvent = {
                        ...newUpdatedFetchedEvent,
                    };
                    newUpdatedEvent.scoreboardMessageId = message.id;
                    saveModifiedEvent(
                        newUpdatedData,
                        newUpdatedEvent,
                    );
                }
            );
        }
    }
);

/**
 * Sets the ending timer for an Event
 * See [[Event.Event]]
 * @param guildId The Guild associated with the timer
 * @param eventId The Event associated with the timer
 * @param endDate The Date the Event ends
 * @returns A global timer handle
 * @category Timer
 */
const setTimerEnd = (
    guildId: string,
    eventId: string,
    endDate: Date,
): NodeJS.Timeout => {
    const now: Date = new Date();
    return setTimeout(
        (): void => {
            const data: Bot.GuildContext = Bot.load(
                guildId
            );
            const newFetchedEvent: Event.Event = Event.findEventById(
                data.events,
                eventId,
            );
            eventWillEnd$.next(
                {
                    guildData: data,
                    event: newFetchedEvent,
                }
            );
        }, endDate.getTime() - now.getTime()
    );
};

/**
 * Sets the warning timer for an Event
 * See [[Event.Event]]
 * @param guildId The Guild associated with the timer
 * @param eventId The Event associated with the timer
 * @param startDate The Date the Event starts
 * @returns A global timer handle
 * @category Timer
 */
const setTimerTwoHoursBefore = (
    guildId: string,
    eventId: string,
    startDate: Date,
): NodeJS.Timeout => {
    const now: Date = new Date();
    const twoHoursBeforeStart: Date = new Date(
        startDate.getTime()
    );
    twoHoursBeforeStart.setHours(
        twoHoursBeforeStart.getHours() - 2
    );
    return setTimeout(
        (): void => {
            const data: Bot.GuildContext = Bot.load(
                guildId
            );
            const newFetchedEvent: Event.Event = Event.findEventById(
                data.events,
                eventId,
            );
            eventWillWarnStart$.next(
                {
                    guildData: data,
                    event: newFetchedEvent,
                }
            );
        }, twoHoursBeforeStart.getTime() - now.getTime()
    );
};

eventWillWarnStart$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: Bot.GuildContext = obj.guildData;
        const event: Event.Event = obj.event;

        notifyParticipantsInEvent(
            guildData,
            event,
            TWO_HOUR_WARN_STR
        );

        eventDidWarnStart$.next(
            {
                guildData,
                event,
            }
        );
    }
);

eventDidWarnStart$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: Bot.GuildContext = obj.guildData;
        const eventToWarn: Event.Event = obj.event;

        const updatedData: Bot.GuildContext = Bot.load(
            guildData.guildId,
        );
        const fetchedEvent: Event.Event = Event.findEventById(
            updatedData.events,
            eventToWarn.id,
        );

        const newEvent: Event.Event = {
            ...fetchedEvent,
        };
        newEvent.hasPassedTwoHourWarning = true;

        saveModifiedEvent(
            updatedData,
            newEvent
        );
    }
);

eventWillEnd$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: Bot.GuildContext = obj.guildData;
        const event: Event.Event = obj.event;

        notifyParticipantsInEvent(
            guildData,
            event,
            END_STR
        );

        if (!Event.isEventCasual(event)
        && !Event.isEventCustom(event)) {
            updateParticipantsHiscores$(
                event.participants
            ).subscribe(
                (newParticipants: Event.Participant[]): void => {
                    eventParticipantsDidUpdate$.next(
                        {
                            guildId: guildData.guildId,
                            eventId: event.id,
                            participants: newParticipants,
                        }
                    );
                    eventDidEnd$.next(
                        {
                            guildData,
                            event,
                        }
                    );
                }
            );
        } else {
            eventDidEnd$.next(
                {
                    guildData,
                    event,
                }
            );
        }
    }
);

eventDidEnd$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: Bot.GuildContext = obj.guildData;
        const eventThatEnded: Event.Event = obj.event;

        const updatedData: Bot.GuildContext = Bot.load(
            guildData.guildId,
        );
        const fetchedEvent: Event.Event = Event.findEventById(
            updatedData.events,
            eventThatEnded.id,
        );

        const newEvent: Event.Event = {
            ...fetchedEvent,
        };
        newEvent.hasEnded = true;

        saveModifiedEvent(
            updatedData,
            newEvent
        );

        const tracking: Event.Tracking = Event.getEventTracking(
            newEvent
        );
        const sortedParticipants: Event.Participant[] = newEvent.participants.sort(
            (a: Event.Participant, b: Event.Participant):
            number => getParticipantScore(
                b,
                newEvent,
                tracking
            ) - getParticipantScore(
                a,
                newEvent,
                tracking
            )
        );

        if (sortedParticipants.length > 0 && !Event.isEventCustom(newEvent)) {
            const attachment = './attachments/congratulations.mp3';
            sendChannelAttachment(
                updatedData.guildId,
                updatedData.settings.notificationChannelId,
                `<@${sortedParticipants[0].discordId}>`,
                attachment,
            );
        }
    }
);

connect$.subscribe((): void => {
    Utils.logger.info('Connected');
    Utils.logger.info('Logged in as:');
    Utils.logger.info(`* ${gClient.user.username}`);
    Utils.logger.info(`* ${gClient.user.id}`);

    Utils.logger.trace(`In ${gClient.guilds.size} guilds:`);
    gClient.guilds.forEach(
        (guild: discord.Guild): void => {
            Utils.logger.trace(`* ${guild.name} (${guild.id})`);
            Utils.logger.trace('* Loading guild json');

            const data: Bot.GuildContext = Bot.load(
                guild.id,
                true
            );
            data.guildId = guild.id;

            Utils.logger.debug(`Loaded json for guild ${guild.id}`);
            Utils.logger.trace(`${JSON.stringify(data)}`);

            // startup tasks
            // handle generic events here

            const unnotifiedEvents = Event.getUnnotifiedEvents(data.events);
            unnotifiedEvents.forEach(
                (event: Event.Event): void => {
                    const newData: Bot.GuildContext = Bot.load(
                        guild.id,
                    );
                    const now: Date = new Date();
                    const twoHoursBeforeStart: Date = new Date(
                        event.startingDate.getTime()
                    );
                    twoHoursBeforeStart.setHours(
                        twoHoursBeforeStart.getHours() - 2
                    );

                    const toleranceAfterStart: Date = new Date(
                        event.startingDate.getTime()
                    );
                    toleranceAfterStart.setMinutes(
                        toleranceAfterStart.getMinutes() + 30
                    );

                    const toleranceAfterEnd: Date = new Date(
                        event.endingDate.getTime()
                    );
                    toleranceAfterEnd.setMinutes(
                        toleranceAfterEnd.getMinutes() + 30
                    );

                    const toleranceAfterEndTolerance: Date = new Date(
                        event.endingDate.getTime()
                    );
                    toleranceAfterEndTolerance.setHours(
                        toleranceAfterEndTolerance.getHours() + 2
                    );

                    // if we are before 2 hour warning, schedule warnings
                    if (now < twoHoursBeforeStart) {
                        Utils.logger.debug('before 2 hour warning');
                        // schedule 2 hour warning
                        // schedule start date notification
                        // schedule end date notification
                        timers[event.id] = {
                            autoUpdate: undefined,
                            twoHoursBeforeEventTimer: setTimerTwoHoursBefore(
                                newData.guildId,
                                event.id,
                                event.startingDate
                            ),
                            eventStartedTimer: setTimerStart(
                                newData.guildId,
                                event.id,
                                event.startingDate
                            ),
                            eventEndedTimer: setTimerEnd(
                                newData.guildId,
                                event.id,
                                event.endingDate
                            ),
                        };
                    } else if (now >= twoHoursBeforeStart
                        && now < event.startingDate) {
                        Utils.logger.debug('after 2 hour warning');
                        if (!event.hasPassedTwoHourWarning) {
                            Utils.logger.debug('notification had not fired');
                            notifyParticipantsInEvent(
                                newData,
                                event,
                                TWO_HOUR_WARN_STR
                            );
                            // mark 2 hour warning as completed
                            const newEvent: Event.Event = { ...event, };
                            newEvent.hasPassedTwoHourWarning = true;
                            saveModifiedEvent(
                                newData,
                                newEvent,
                            );
                        }
                        // schedule start date notification
                        // schedule end date notification
                        // TODO: change me
                        timers[event.id] = {
                            autoUpdate: undefined,
                            twoHoursBeforeEventTimer: undefined,
                            eventStartedTimer: setTimerStart(
                                newData.guildId,
                                event.id,
                                event.startingDate
                            ),
                            eventEndedTimer: setTimerEnd(
                                newData.guildId,
                                event.id,
                                event.endingDate
                            ),
                        };
                    } else if (now >= event.startingDate
                        && now < toleranceAfterStart) {
                        Utils.logger.debug('after event started');
                        if (!event.hasStarted) {
                            Utils.logger.debug('notification had not fired');
                            // fire start notification
                            // mark 2 hour warning as completed
                            // mark start notification as complete
                            notifyParticipantsInEvent(
                                newData,
                                event,
                                START_STR
                            );
                            const newEvent: Event.Event = { ...event, };
                            newEvent.hasPassedTwoHourWarning = true;
                            newEvent.hasStarted = true;
                            saveModifiedEvent(
                                newData,
                                newEvent,
                            );
                        }
                        timers[event.id] = {
                            autoUpdate: Event.isEventCustom(event)
                                ? undefined
                                : setTimerAutoUpdate(
                                    newData.guildId,
                                    event.id,
                                ),
                            twoHoursBeforeEventTimer: undefined,
                            eventStartedTimer: undefined,
                            eventEndedTimer: setTimerEnd(
                                newData.guildId,
                                event.id,
                                event.endingDate
                            ),
                        };
                    } else if (now >= toleranceAfterStart
                        && now < event.endingDate) {
                        Utils.logger.debug('after 30 min start tolerance');
                        if (!event.hasStarted) {
                            Utils.logger.error('notification had not fired');
                            // fire start notification
                            // mark 2 hour warning as completed
                            // mark start notification as complete
                            // TODO: apologize lol
                            notifyParticipantsInEvent(
                                newData,
                                event,
                                'started more than 30 mins ago, yell at n0trout'
                            );
                            const newEvent: Event.Event = { ...event, };
                            newEvent.hasPassedTwoHourWarning = true;
                            newEvent.hasStarted = true;
                            saveModifiedEvent(
                                newData,
                                newEvent,
                            );
                        }
                        // schedule end date notification
                        timers[event.id] = {
                            autoUpdate: Event.isEventCustom(event)
                                ? undefined
                                : setTimerAutoUpdate(
                                    newData.guildId,
                                    event.id,
                                ),
                            twoHoursBeforeEventTimer: undefined,
                            eventStartedTimer: undefined,
                            eventEndedTimer: setTimerEnd(
                                newData.guildId,
                                event.id,
                                event.endingDate
                            ),
                        };
                    } else if (now >= event.endingDate
                        && now < toleranceAfterEnd) {
                        Utils.logger.debug('after ended');
                        if (!event.hasEnded) {
                            Utils.logger.error('notification had not fired');
                            // fire end notification
                            // mark 2 hour warning as complete (unnecessary)
                            // mark start notification as complete (unnecessary)
                            // mark end notification as complete
                            notifyParticipantsInEvent(
                                newData,
                                event,
                                END_STR
                            );
                            const newEvent: Event.Event = { ...event, };
                            newEvent.hasPassedTwoHourWarning = true;
                            newEvent.hasStarted = true;
                            newEvent.hasEnded = true;
                            saveModifiedEvent(
                                newData,
                                newEvent,
                            );
                        }
                    } else if (now >= toleranceAfterEnd && now < toleranceAfterEndTolerance) {
                        Utils.logger.debug('after 2 hour end tolerance');
                        if (!event.hasEnded) {
                            Utils.logger.error('notification had not fired');
                            // fire end notification
                            // apologize
                            // mark 2 hour warning as complete (unnecessary)
                            // mark start notification as complete (unnecessary)
                            // mark end notification as complete
                            notifyParticipantsInEvent(
                                newData,
                                event,
                                'had ended more than 2 hours ago, yell at n0trout'
                            );
                            const newEvent: Event.Event = { ...event, };
                            newEvent.hasPassedTwoHourWarning = true;
                            newEvent.hasStarted = true;
                            newEvent.hasEnded = true;
                            saveModifiedEvent(
                                newData,
                                newEvent,
                            );
                        }
                    } else {
                        // too late to do anything
                        // just mark it as fired
                        const newEvent: Event.Event = { ...event, };
                        newEvent.hasPassedTwoHourWarning = true;
                        newEvent.hasStarted = true;
                        newEvent.hasEnded = true;
                        saveModifiedEvent(
                            newData,
                            newEvent,
                        );
                    }
                }
            );
        }
    );
});

reconnect$.subscribe(
    (): void => {
        Utils.logger.info('Reconnected');
    }
);

error$.subscribe(
    (error: Error): void => {
        Utils.logger.error(error.message);
    }
);

debug$.subscribe(
    (command: Input): void => {
        Utils.logger.info('Debug called');
        const data: Bot.GuildContext = Bot.load(command.guild.id);
        Utils.logger.debug(
            JSON.stringify(
                data,
                null,
                4
            )
        );
    }
);

addAdmin$.subscribe(
    (command: Input): void => {
        const oldData: Bot.GuildContext = Bot.load(command.guild.id);
        const oldSettings: Bot.Settings = oldData.settings;

        const mentions: string[] = command.message.mentions.members.array()
            .map(
                (member: discord.GuildMember): string => member.id
            );
        const newSettings: Bot.Settings = { ...oldSettings, };
        newSettings.admins = Array.from(
            new Set(
                oldSettings.admins.concat(
                    mentions
                ),
            ),
        );
        const newData: Bot.GuildContext = { ...oldData, };
        newData.settings = newSettings;
        Bot.save(
            newData,
        );
        Utils.logger.debug('Admin added');
        command.message.reply('admin added');
    }
);

saveEvent$.subscribe(
    (inputArr: [Input, Event.Event]): void => {
    // add timers
        const command: Input = inputArr[0];
        const event: Event.Event = inputArr[1];

        const data: Bot.GuildContext = Bot.load(command.guild.id);
        const events: Event.Event[] = data.events.concat(event);
        const upcoming: Event.Event[] = Event.getUpcomingAndInFlightEvents(events);
        const idx: number = upcoming.indexOf(event);

        const guild: discord.Guild = command.guild;
        const newData: Bot.GuildContext = { ...data, };
        newData.events = events;
        Bot.save(
            newData,
        );

        timers[event.id] = {
            autoUpdate: undefined,
            twoHoursBeforeEventTimer: setTimerTwoHoursBefore(
                data.guildId,
                event.id,
                event.startingDate
            ),
            eventStartedTimer: setTimerStart(
                data.guildId,
                event.id,
                event.startingDate
            ),
            eventEndedTimer: setTimerEnd(
                data.guildId,
                event.id,
                event.endingDate
            ),
        };

        Utils.logger.debug('event added');
        command.message.reply(`event '${event.name}' added`);

        sendChannelMessage(
            guild.id,
            newData.settings.notificationChannelId,
            `@everyone clan event '${event.name}' has just been scheduled for ${event.startingDate.toString()}\nto sign-up type: '${Bot.ALL_COMMANDS.SIGNUP_UPCOMING.command}${event.name} rsn (your RuneScape name here)'`,
            null,
        );
    }
);

listUpcomingEvent$.subscribe(
    (command: Input): void => {
        const oldData: Bot.GuildContext = Bot.load(command.guild.id);
        const upcomingAndInFlightEvents: Event.Event[] = Event.getUpcomingAndInFlightEvents(
            oldData.events
        );
        const eventsStr: string[] = upcomingAndInFlightEvents.map(
            (event: Event.Event, idx: number): string => {
                const startingDateStr = event.startingDate.toString();
                const endingDateStr = event.endingDate.toString();
                const retStr = event.startingDate > new Date()
                    ? `\n${idx}: upcoming event ${event.name} starting: ${startingDateStr} ending: ${endingDateStr} type: ${Event.getEventTracking(event)}`
                    : `\n${idx}: in-flight event ${event.name} ending: ${endingDateStr} type: ${Event.getEventTracking(event)}`;

                switch (Event.getEventTracking(event)) {
                    case (Event.Tracking.SKILLS):
                        return retStr.concat(` ${event.tracking.skills.toString()}`);
                    case (Event.Tracking.LMS):
                        return retStr;
                    case (Event.Tracking.CUSTOM):
                        return retStr;
                    case (Event.Tracking.CLUES):
                        return retStr.concat(` ${event.tracking.clues.toString()}`);
                    case (Event.Tracking.BH):
                        return retStr;
                    default:
                        return retStr;
                }
            }
        );
        const reply: string = upcomingAndInFlightEvents.length > 0
            ? `upcoming events: ${eventsStr}`
            : 'no upcoming events';
        command.message.reply(reply);
        Utils.logger.debug('ListUpcomingEvents called');
    }
);

deleteUpcomingEvent$.subscribe(
    (command: Input): void => {
        const oldData: Bot.GuildContext = Bot.load(command.guild.id);
        const upcomingAndInFlightEvents: Event.Event[] = Event.getUpcomingAndInFlightEvents(
            oldData.events
        );
        const eventName: string = command.input.trim();
        const eventToDelete: Event.Event = upcomingAndInFlightEvents.find(
            (event: Event.Event):
            boolean => event.name.toLowerCase() === eventName.toLowerCase()
        );
        if (eventToDelete === undefined) {
            Utils.logger.debug(`Did not find event '${eventName}'`);
            command.message.reply(`can't find name ${eventName}\n${Bot.ALL_COMMANDS.DELETE_UPCOMING.usage}`);
            return;
        }
        const newEvents: Event.Event[] = Event.deleteEvent(
            oldData.events,
            eventToDelete
        );
        const newData: Bot.GuildContext = { ...oldData, };
        newData.events = newEvents;
        Bot.save(
            newData,
        );

        // cancel timers
        // TODO: error here
        Object.keys(timers[eventToDelete.id]).forEach(
            (key: string): void => {
                const timer: NodeJS.Timeout = timers[eventToDelete.id][key];
                if (timer === undefined) return;
                if (timer === timers[eventToDelete.id].autoUpdate) {
                    clearInterval(timer);
                } else {
                    clearTimeout(timer);
                }
            }
        );
        timers[eventToDelete.id] = undefined;
        Utils.logger.debug('Runescape.Event deleted');
        command.message.reply(`'${eventToDelete.name}' deleted`);
    }
);

signupEvent$.subscribe(
    (inputArr: [
        Bot.GuildContext,
        Event.Event,
        discord.Message,
        hiscores.LookupResponse,
    ]): void => {
        const data: Bot.GuildContext = inputArr[0];
        const event: Event.Event = inputArr[1];
        const message: discord.Message = inputArr[2];
        const hiscore: hiscores.LookupResponse = inputArr[3];
        if (hiscore === null) {
            Utils.logger.debug('User entered invalid RSN');
            message.reply('cannot find RSN on hiscores');
            return;
        }
        // corresponding load is in the observable
        Bot.save(
            data
        );
        Utils.logger.debug('Signup called');
        message.reply('signed up for event');

        if (event.hasStarted
            && !event.hasEnded) {
            if (Event.isEventCustom(event)) {
                eventParticipantsDidUpdate$.next(
                    {
                        guildId: message.guild.id,
                        eventId: event.id,
                        participants: event.participants,
                    }
                );
            } else {
                updateParticipantsHiscores$(
                    event.participants
                ).subscribe(
                    (newParticipants: Event.Participant[]):
                    void => {
                        eventParticipantsDidUpdate$.next(
                            {
                                guildId: message.guild.id,
                                eventId: event.id,
                                participants: newParticipants,
                            }
                        );
                    }
                );
            }
        }
    }
);

unsignupUpcomingEvent$.subscribe(
    (command: Input): void => {
    // get upcoming events
    // if index is out of range return
        const data: Bot.GuildContext = Bot.load(command.guild.id);
        const upcomingAndInFlightEvents:
        Event.Event[] = Event.getUpcomingAndInFlightEvents(data.events);

        // does the event to modify contain our user?
        const eventName: string = command.input.trim();
        const eventToModify: Event.Event = upcomingAndInFlightEvents.find(
            (event: Event.Event):
            boolean => event.name.toLowerCase() === eventName.toLowerCase()
        );
        if (eventToModify === undefined) {
            Utils.logger.debug(`Did not find event '${eventName}'`);
            command.message.reply(`can't find name ${eventName}\n${Bot.ALL_COMMANDS.UNSIGNUP_UPCOMING.usage}`);
            return;
        }
        const participantToRemove:
        Event.Participant = eventToModify.participants.find(
            (participant: Event.Participant):
            boolean => participant.discordId === command.author.id
        );
        if (participantToRemove === undefined) return;
        if (Event.isTeamEvent(eventToModify)) {
            // gotta remove them from the team event
            const teamToModify: Event.Team = eventToModify.teams.find(
                (team: Event.Team):
                boolean => team.linkedDiscordIds.find(
                    (discordId: string):
                    boolean => discordId === participantToRemove.discordId
                ) !== undefined
            );
            if (teamToModify === undefined) return;
            const newLinkedDiscordIds: string[] = teamToModify.linkedDiscordIds.filter(
                (discordId: string):
                boolean => participantToRemove.discordId !== discordId
            );
            teamToModify.linkedDiscordIds = newLinkedDiscordIds;
            const filteredTeams: Event.Team[] = eventToModify.teams.filter(
                (teamInfo: Event.Team):
                boolean => teamInfo.name !== teamToModify.name
            );
            if (newLinkedDiscordIds.length === 0) {
                eventToModify.teams = filteredTeams;
            } else {
                const newTeams: Event.Team[] = filteredTeams.concat(teamToModify);
                eventToModify.teams = newTeams;
            }
        }
        const newEvent: Event.Event = Event.unsignupEventParticipant(
            eventToModify,
            participantToRemove,
        );
        saveModifiedEvent(
            data,
            newEvent,
        );

        if (newEvent.hasStarted
            && !newEvent.hasEnded) {
            eventParticipantsDidUpdate$.next(
                {
                    guildId: data.guildId,
                    eventId: newEvent.id,
                    participants: newEvent.participants,
                }
            );
        }

        Utils.logger.debug('Unsignup called');
        command.message.reply('removed from event');
    }
);

amISignedUp$.subscribe(
    (command: Input): void => {
        const oldData: Bot.GuildContext = Bot.load(command.guild.id);
        const upcomingAndInFlightEvents:
        Event.Event[] = Event.getUpcomingAndInFlightEvents(oldData.events);

        const discordIdToCheck: string = command.author.id;
        const eventName: string = command.input.trim();
        const eventToCheck: Event.Event = upcomingAndInFlightEvents.find(
            (event: Event.Event):
            boolean => event.name.toLowerCase() === eventName.toLowerCase()
        );
        if (eventToCheck === undefined) {
            Utils.logger.debug(`Did not find event '${eventName}'`);
            command.message.reply(`can't find name ${eventName}\n${Bot.ALL_COMMANDS.AMISIGNEDUP_UPCOMING.usage}`);
            return;
        }
        const foundEventParticipant: Event.Participant = eventToCheck
            .participants.find(
                (participant: Event.Participant):
                boolean => participant.discordId === discordIdToCheck
            );
        if (foundEventParticipant === undefined) {
            command.message.reply('you are not signed up');
            return;
        }

        const accounts = foundEventParticipant.runescapeAccounts.map(
            (account: Event.Account): string => account.rsn
        ).join(', ');
        command.message.reply(`you are signed up with RSN: ${accounts}`);
        Utils.logger.debug('AmISignedUp Called');
    }
);

listParticipant$.subscribe(
    (command: Input): void => {
        const oldData: Bot.GuildContext = Bot.load(command.guild.id);
        const upcomingAndInFlightEvents:
        Event.Event[] = Event.getUpcomingAndInFlightEvents(oldData.events);
        const unfinalizedEvents:
        Event.Event[] = Event.getUnfinalizedEvents(oldData.events);

        const upcomingAndInflightAndUnfinalizedEvents:
        Event.Event[] = [
            ...upcomingAndInFlightEvents,
            ...unfinalizedEvents,
        ];
        const eventName: string = command.input.trim();
        const eventToList: Event.Event = upcomingAndInflightAndUnfinalizedEvents.find(
            (event: Event.Event):
            boolean => event.name.toLowerCase() === eventName.toLowerCase()
        );
        if (eventToList === undefined) {
            Utils.logger.debug(`Did not find event '${eventName}'`);
            command.message.reply(`can't find name ${eventName}\n${Bot.ALL_COMMANDS.LIST_PARTICIPANTS_UPCOMING.usage}`);
            return;
        }
        const formattedStr: string = eventToList.participants.map(
            (participant: Event.Participant, idx: number): string => {
                const displayName: string = getDisplayNameFromDiscordId(
                    command.guild.id,
                    participant.discordId
                );
                const accounts: string = participant.runescapeAccounts.map(
                    (account: Event.Account): string => account.rsn
                ).join(', ');
                return `\n${idx}: ${displayName} signed up ${accounts}`;
            }
        ).join('');

        const reply: string = eventToList.participants.length > 0
            ? `participants:${formattedStr}`
            : 'no participants';
        command.message.reply(reply);
        Utils.logger.debug('ListParticipants called');
    }
);

setChannel$.subscribe(
    (command: Input): void => {
        const oldData: Bot.GuildContext = Bot.load(command.guild.id);
        const channel: discord.Channel = command.message.mentions.channels.first();
        const newSettings: Bot.Settings = { ...oldData.settings, };
        newSettings.notificationChannelId = channel.id;
        const newData: Bot.GuildContext = { ...oldData, };
        newData.settings = newSettings;
        Bot.save(
            newData,
        );
        Utils.logger.debug('Set channel called');
        command.message.reply(`notification channel set to ${channel}`);
    }
);

help$.subscribe(
    (command: Input): void => {
        const keys: string[] = Object.keys(Bot.ALL_COMMANDS).filter(
            (key: string): boolean => {
                const data: Bot.GuildContext = Bot.load(command.guild.id);
                const admin: boolean = Bot.isAdmin(
                    data,
                    command.author.id,
                );
                const botCommand: Bot.Command = Bot.ALL_COMMANDS[key];
                return (admin && (botCommand.accessControl === Bot.ONLY_ADMIN
                || botCommand.accessControl === Bot.ONLY_UNSET_ADMINS_OR_ADMIN))
                || botCommand.accessControl === Bot.ANY_USER;
            }
        );
        const commandValues: Bot.Command[] = keys.map(
            (key: string): Bot.Command => Bot.ALL_COMMANDS[key] as Bot.Command
        );
        const outerStr: string[] = commandValues.map((commandInfo: Bot.Command): string => {
            const innerStr: string[] = [
                `\n'${commandInfo.command}'`,
                `\ndescription: ${commandInfo.description}`,
                `\nusage: ${commandInfo.usage}`,
            ];
            return innerStr.join('');
        });
        const formattedStr = outerStr.join('\n');
        Utils.logger.debug(formattedStr);
        sendChannelMessage(
            command.guild.id,
            command.message.channel.id,
            formattedStr,
            { code: true, },
            true,
        );
        Utils.logger.debug('Help called');
    }
);

/**
 * Creates a Discord Message fake to send on behalf of a user to our bot for processing.
 * See [[discord.Message]]
 * @param newCommand The new command to swap to
 * @param newContent The new content string
 * @param oldMessage The old message source
 * @param newAuthor The new author
 * @category Send Guild Message
 */
const mockMessage = (
    newCommand: Bot.Command,
    newContent: string,
    oldMessage: discord.Message,
    newAuthor: discord.User
): discord.Message => {
    const content = `${newCommand.command}${newContent}`;
    const message: discord.Message = new discord.Message(
        oldMessage.channel,
        {
            id: oldMessage.id,
            type: oldMessage.type,
            content,
            author: newAuthor,
            pinned: oldMessage.pinned,
            tts: oldMessage.tts,
            nonce: oldMessage.nonce,
            embeds: oldMessage.embeds,
            attachments: oldMessage.attachments,
            timestamp: oldMessage.createdTimestamp,
            // eslint-disable-next-line @typescript-eslint/camelcase
            edited_timestamp: oldMessage.editedTimestamp,
            reactions: oldMessage.reactions,
            mentions: oldMessage.mentions.users.array(),
            // eslint-disable-next-line @typescript-eslint/camelcase
            webhook_id: oldMessage.webhookID,
            hit: oldMessage.hit,
        },
        gClient
    );
    return message;
};

forceSignup$.subscribe(
    (command: Input): void => {
        const newInput = command.input.replace(/<@!?[0-9]+>/g, '');
        const message: discord.Message = mockMessage(
            Bot.ALL_COMMANDS.SIGNUP_UPCOMING,
            newInput,
            command.message,
            command.message.mentions.users.array()[0]
        );
        injectedMessages$.next(message);
    }
);

forceUnsignup$.subscribe(
    (command: Input): void => {
        const newInput = command.input.replace(/<@!?[0-9]+>/g, '');
        const message: discord.Message = mockMessage(
            Bot.ALL_COMMANDS.UNSIGNUP_UPCOMING,
            newInput,
            command.message,
            command.message.mentions.users.array()[0]
        );
        injectedMessages$.next(message);
    }
);

showStats$.subscribe(
    (command: Input): void => {
        const data: Bot.GuildContext = Bot.load(command.guild.id);
        const user: discord.User = command.message.mentions.members.array().length > 0
            ? command.message.mentions.users.array()[0]
            : command.author;

        const statsStr: string = getStatsStr(
            data,
            user.id
        );
        command.message.reply(
            statsStr,
            { code: true, },
        );
    }
);

//--------------
// Global script
//
//--------------

gClient.login(auth.token);
