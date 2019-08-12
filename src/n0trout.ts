// TODO:
// Fix hackish late signup
// 20 min ending warning
// custom competitive events
// all time hiscores

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
import { runescape, } from './runescape';
import { bot, } from './bot';
import { utils, } from './utils';
import auth from './auth.json';

//----------
// Constants
//
//----------

const TWO_HOUR_WARN_STR = 'will begin within 2 hours.';
const START_STR = 'has begun.';
const END_STR = 'has ended.';

/**
* Interface containing transformed input data for consumption by the code
*/
interface Input extends Record<string, unknown> {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    input: string
}

/**
 * Type helper for subjects since they only take one parameter
 */
interface GuildDataAndEvent {
    guildData: bot.Data
    event: runescape.Event
}

/**
 * Type helper for subjects since they only take one parameter
 */
interface GuildDataIdEventIdAndParticipants {
    guildId: string
    eventId: string
    participants: runescape.Participant[]
}

//-------------
// Global state
//
//-------------

/**
 * Global discord client
 * @category Global
 */
const client: discord.Client = new discord.Client();

/**
 * Global timer handles
 * @category Global
 */
const timers: Record<
string,
{
    autoUpdate: NodeJS.Timeout
    twoHoursBeforeEventTimer: NodeJS.Timeout
    eventStartedTimer: NodeJS.Timeout
    eventEndedTimer: NodeJS.Timeout
}
> = {};

//--------
// Helpers
//--------

/**
 *
 * @param updatedData The updated data object to search
 * @param eventIdToFetch The event id to fetch
 */
const fetchUpdatedEvent = (
    updatedData: bot.Data,
    eventIdToFetch: string
): runescape.Event => {
    const foundEvent: runescape.Event = updatedData.events.find(
        (event: runescape.Event):
        boolean => event.id === eventIdToFetch
    );
    return foundEvent;
};

/**
 * @param data The source Data object
 * @param updatedEvent The new Event object to insert
 * @returns A new updated Event array
 * @category Object Manipulator Helper
 */
const modifyEventArray = (
    data: bot.Data,
    updatedEvent: runescape.Event
): runescape.Event[] => {
    const newEvents: runescape.Event[] = data.events.map(
        (event: runescape.Event): runescape.Event => {
            if (event.id === updatedEvent.id) return updatedEvent;
            return event;
        }
    );
    return newEvents;
};

/**
 * @param data The source Data object
 * @param newEvents The new Events array to insert
 * @returns A new updated Data object
 * @category Object Manipulator Helper
 */
const modifyDataEventsArray = (
    data: bot.Data,
    newEvents: runescape.Event[]
): bot.Data => utils.update(data, {
    events: newEvents,
});

/**
 * @param data The source Data object
 * @param newEvents The new Event object to save
 * @param guildId The id of the guild to modify
 * @returns A new updated Data object
 * @category Object Manipulator Helper
 */
const saveNewEvents = (
    data: bot.Data,
    newEvents: runescape.Event[],
): bot.Data => {
    const newData: bot.Data = modifyDataEventsArray(
        data,
        newEvents
    );
    return bot.save(
        data.guildId,
        newData
    );
};

/**
 * @param data The source Data object
 * @param newEvent The new Event object to save
 * @returns A new updated Data object
 * @category Object Manipulator Helper
 */
const saveNewEvent = (
    data: bot.Data,
    newEvent: runescape.Event,
): bot.Data => {
    const newEvents: runescape.Event[] = modifyEventArray(
        data,
        newEvent
    );
    return saveNewEvents(
        data,
        newEvents
    );
};

/**
 * @param data The source Data object
 * @param updatedSettings The new Settings object to insert
 * @returns A new updated Data object
 * @category Object Manipulator Helper
 */
const updateSettings = (
    data: bot.Data,
    updatedSettings: bot.Settings
): bot.Data => utils.update(data, {
    settings: updatedSettings,
});

/**
 * @param data The source Data object
 * @param updatedSettings The new Settings object to save
 * @returns A new updated Data object
 * @category Object Manipulator Helper
 */
const saveNewSettings = (
    data: bot.Data,
    newSettings: bot.Settings,
    guildId: string
): bot.Data => {
    const newData: bot.Data = updateSettings(
        data,
        newSettings
    );
    return bot.save(
        guildId,
        newData
    );
};

/**
 * @param events The list of all Events to filter
 * @returns A new array of upcoming and in-flight Events
 * @category Event
 */
const getUpcomingAndInFlightEvents = (
    events: runescape.Event[]
): runescape.Event[] => events.filter(
    (event: runescape.Event):
    boolean => utils.isInFuture(event.endingDate)
);

/**
 * @param events The list of all Events to filter
 * @returns A new array of upcoming and in-flight Events
 * @category Event
 */
const getUpcomingEvents = (
    events: runescape.Event[]
): runescape.Event[] => events.filter(
    (event: runescape.Event):
    boolean => utils.isInFuture(event.startingDate)
);

/**
 * @param data The source Data object
 * @param eventToDelete The Event object to remove
 * @returns A new updated Event array
 * @category Event
 */
const deleteEvent = (
    data: bot.Data,
    eventToDelete: runescape.Event
): runescape.Event[] => {
    const newEvents: runescape.Event[] = data.events.filter(
        (event: runescape.Event):
        boolean => event.id !== eventToDelete.id
    );
    return newEvents;
};

/**
 * @param data The source Data object
 * @param oldEvent The source Event object
 * @param updatedParticipant The new Participant object to insert
 * @returns A new updated Event object
 * @category Helper
 */
const updateParticipant = (
    oldEvent: runescape.Event,
    updatedParticipant: runescape.Participant
): runescape.Event => {
    const newParticipants: runescape.Participant[] = oldEvent.participants.map(
        (participant: runescape.Participant):
        runescape.Participant => {
            if (participant.discordId === updatedParticipant.discordId) return updatedParticipant;
            return participant;
        }
    );
    const newEvent: runescape.Event = utils.update(oldEvent, {
        participants: newParticipants,
    });
    return newEvent;
};

/**
 * @param data The source Data object
 * @param oldEvent The source Event object
 * @param updatedParticipant The new Participant object to insert
 * @returns A new updated Event object
 * @category Event
 * @todo Possible refactor to use [[updateParticipant]]
 */
const signupParticipant = (
    oldEvent: runescape.Event,
    newParticipant: runescape.Participant
): runescape.Event => {
    const foundParticipant: runescape.Participant = oldEvent.participants.find(
        (participant: runescape.Participant):
        boolean => participant.discordId === newParticipant.discordId
    );
    if (foundParticipant !== undefined) return oldEvent;
    const allRsn: string[] = oldEvent.participants.map(
        (participant: runescape.Participant):
        runescape.AccountInfo[] => participant.runescapeAccounts
    ).reduce(
        (acc: runescape.AccountInfo[], x: runescape.AccountInfo[]):
        runescape.AccountInfo[] => acc.concat(x), []
    ).map(
        (account: runescape.AccountInfo): string => account.rsn
    );
    const newRsn: string[] = newParticipant.runescapeAccounts.map(
        (account: runescape.AccountInfo): string => account.rsn
    );
    const foundRsn: boolean = allRsn.some(
        (rsn: string): boolean => newRsn.includes(rsn)
    );
    if (foundRsn) return oldEvent;
    const newParticipants: runescape.Participant[] = oldEvent.participants.concat(newParticipant);
    const newEvent: runescape.Event = utils.update(
        oldEvent,
        { participants: newParticipants, }
    );
    return newEvent;
};

/**
 * @param oldData The source Data object
 * @param oldEvent The source Event object
 * @param participantToRemove The Participant object to remove
 * @returns A new updated Event object
 * @category Event
 */
const unsignupParticipant = (
    oldEvent: runescape.Event,
    participantToRemove: runescape.Participant
): runescape.Event => {
    const newParticipants: runescape.Participant[] = oldEvent.participants.filter(
        (participant: runescape.Participant):
        boolean => participant.discordId !== participantToRemove.discordId
    );
    const newEvent: runescape.Event = utils.update(oldEvent, {
        participants: newParticipants,
    });
    return newEvent;
};

/**
 * @param guildId The Guild id to use for display name lookup
 * @param discordId The Discord id to lookup
 * @returns The user's display name
 * @category Helper
 */
const discordIdToDisplayName = (guildId: string, discordId: string):
string => {
    const guild: discord.Guild = client.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return '(guild unavailable)';
    const member: discord.GuildMember = guild.members.find(
        (m: discord.GuildMember):
        boolean => m.id === discordId
    );
    if (member === null) return '(unknown)';
    return member.displayName;
};

/**
 * @param guildId The Guild id to send the attachment to
 * @param channelId The channel id to send the message to
 * @param attachmentToSend The attachment path to send
 * @param text The attachment text to send
 * @category Send Guild Message
 */
const sendChannelAttachment = (
    guildId: string,
    channelId: string,
    attachmentToSend: string,
    text?: string
): void => {
    const guild: discord.Guild = client.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return;
    const channel: discord.TextChannel = guild.channels.get(
        channelId
    ) as discord.TextChannel;
    if (channel === undefined || channel.type !== 'text') return;
    utils.logger.debug('Sending message to Guild');

    if (attachmentToSend !== null) {
        channel.send(text, {
            files: [
                {
                    attachment: attachmentToSend,
                },
            ],
        });
    }
};

/**
 * @function
 * @param guildId The guild id send the message to
 * @param channelId The channel id to send the message to
 * @param content The message content to send
 * @param options The Discord message options to use
 * @category Send Guild Message
 */
const sendChannelMessage = async (
    guildId: string,
    channelId: string,
    content: string,
    options: discord.MessageOptions = null,
): Promise<discord.Message> => {
    if (content === undefined) return Promise.reject();
    if (guildId === undefined) return Promise.reject();
    const guild: discord.Guild = client.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return Promise.reject();
    const channel: discord.TextChannel = guild.channels.get(
        channelId
    ) as discord.TextChannel;
    if (channel === undefined || channel.type !== 'text') return Promise.reject();
    utils.logger.debug('Sending message to Guild');
    const message: discord.Message = await channel.send(
        content,
        options
    ) as discord.Message;
    return message;
};

const editChannelMessage = async (
    guildId: string,
    channelId: string,
    messageId: string,
    content: string,
    options: discord.MessageOptions = null,
): Promise<discord.Message> => {
    if (content === undefined) return Promise.reject();
    if (guildId === undefined) return Promise.reject();
    const guild: discord.Guild = client.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return Promise.reject();
    const channel: discord.TextChannel = guild.channels.get(
        channelId
    ) as discord.TextChannel;
    if (channel === undefined || channel.type !== 'text') return Promise.reject();

    utils.logger.debug('Editing message');
    const message: discord.Message = await channel.fetchMessage(messageId);
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
    data: bot.Data,
    event: runescape.Event,
    message: string,
): void => {
    const participants: string[] = event.participants.map(
        (participant: runescape.Participant): string => participant.discordId
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
 * @param event The Event to check what we tracked
 * @returns The enum that represents what we tracked
 * @category Helper
 */
const getEventTracking = (event: runescape.Event):
runescape.TrackingEnum => runescape.TrackingEnum[event.type.toLocaleUpperCase()];

/**
 * See [[runescape.Tracking]] structure
 * @param participant The Participant to calculate gains
 * @param event The Event to calculate gains
 * @param tracking The tracking enum
 * @returns Total gain (in xp, clues, etc.)
 * @category Calculation
 */
const getTotalEventGain = (
    participant: runescape.Participant,
    event: runescape.Event,
    tracking: runescape.TrackingEnum,
): number => {
    switch (tracking) {
        case 'skills': {
            if (event.tracking.skills === undefined) return 0;
            const xps: number[] = participant.runescapeAccounts.map(
                (account: runescape.CompetitiveAccountInfo): number => {
                    if (account.starting === undefined
                        || account.ending === undefined) return NaN;
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

        case 'bh':
        case 'clues':
        case 'lms': {
            if (event.tracking.bh === undefined
                && event.tracking.clues === undefined
                && event.tracking.lms === undefined) return 0;
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
                    );
                    const clueDiff = rankAndScoreComponents.map(
                        (startEnd: hiscores.RankAndScoreComponent[]):
                        number => startEnd[1].score - startEnd[0].score
                    );
                    const clueGain = clueDiff.reduce(
                        (acc, x): number => acc + x
                    );
                    return clueGain;
                }
            );
            const gain = gains.reduce(
                (acc: number, x: number): number => acc + x
            );
            return gain;
        }
        default:
            return 0;
    }
};

/**
 * @param participants The source participants to update with new hiscores
 * @param pullNew If we should ignore the cache and update hiscores
 * @returns A new updated Data object
 * @category Runescape API Observable
 */
const updateParticipantsHiscores$ = (
    participants: runescape.Participant[],
    pullNew: boolean = true
): Observable<runescape.Participant[]> => {
    if (participants.length === 0) return of([]);
    const update$: Observable<runescape.Participant>[] = participants.map(
        (participant: runescape.Participant):
        Observable<runescape.Participant> => of(participant)
            .pipe(
                switchMap(
                    (p: runescape.Participant):
                    Observable<[
                        hiscores.LookupResponse[],
                        runescape.Participant
                    ]> => {
                        const responseObs:
                        Observable<hiscores.LookupResponse>[] = p.runescapeAccounts.map(
                            (account: runescape.CompetitiveAccountInfo):
                            Observable<hiscores.LookupResponse> => runescape.hiscores$(
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
                map((respArr: [hiscores.LookupResponse[], runescape.Participant]):
                runescape.Participant => {
                    const hiscoreArr: hiscores.LookupResponse[] = respArr[0];
                    const p: runescape.Participant = respArr[1];
                    const newAccountInfos:
                    runescape.CompetitiveAccountInfo[] = p.runescapeAccounts.map(
                        (account: runescape.CompetitiveAccountInfo, idx: number):
                        runescape.CompetitiveAccountInfo => {
                            // TODO: Change how I work
                            // This is a silent error
                            if (hiscoreArr === null || hiscoreArr[idx] === null) {
                                utils.logger.error('hiscoreArr === null || hiscoreArr[idx] === null');
                                return account;
                            }
                            if (account.starting === undefined) {
                                const updated = utils.update(
                                    account,
                                    {
                                        starting: hiscoreArr[idx],
                                        ending: hiscoreArr[idx],
                                    }
                                );
                                return updated;
                            }
                            const updated = utils.update(
                                account,
                                {
                                    ending: hiscoreArr[idx],
                                }
                            );
                            return updated;
                        }
                    );
                    const newParticipant:
                    runescape.Participant = utils.update(
                        p,
                        { runescapeAccounts: newAccountInfos, }
                    );
                    return newParticipant;
                })
            )
    );
    return forkJoin(update$);
};


/**
 * @param data The Data to check
 * @returns A new array of events that have not been marked as notified
 * @category Event
 */
const getUnnotifiedEvents = (
    data: bot.Data
): runescape.Event[] => data.events.filter(
    (event: runescape.Event): boolean => !event.hasPassedTwoHourWarning
    || !event.hasStarted
    || !event.hasEnded
);

/**
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
            const newDict: Record<string, string> = utils.update(dict, x);
            return newDict;
        }
    );
    return mapped;
};

/**
 * @param data The Data input to process
 * @param discordId The Discord id to display stats for
 * @returns A string describing a players statistics
 * @category Helper
 */
const getStatsStr = (
    data: bot.Data,
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
        (event: runescape.Event): boolean => event.participants.some(
            (participant: runescape.Participant): boolean => participant.discordId === discordId
        )
    );
    const mappedStats = participatedEvents.map(
        (event: runescape.Event):
        Stats => {
            const tracking: runescape.TrackingEnum = getEventTracking(
                event
            );
            const sortedParticipants: runescape.Participant[] = event.participants.sort(
                (a: runescape.Participant, b: runescape.Participant):
                number => getTotalEventGain(
                    b,
                    event,
                    tracking
                ) - getTotalEventGain(
                    a,
                    event,
                    tracking
                )
            );
            const foundParticipant = sortedParticipants.find(
                (participant: runescape.Participant):
                boolean => participant.discordId === discordId
            );
            const idx = event.participants.indexOf(
                foundParticipant
            );

            if (runescape.isEventCasual(event)) {
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
                totalCluesGain: getTotalEventGain(
                    foundParticipant,
                    event,
                    runescape.TrackingEnum.CLUES
                ),
                totalXpGain: getTotalEventGain(
                    foundParticipant,
                    event,
                    runescape.TrackingEnum.SKILLS
                ),
                totalLmsGain: getTotalEventGain(
                    foundParticipant,
                    event,
                    runescape.TrackingEnum.LMS
                ),
                totalBhGain: getTotalEventGain(
                    foundParticipant,
                    event,
                    runescape.TrackingEnum.BH
                ),
                totalTeamEvents: runescape.isTeamEvent(event) ? 1 : 0,
                totalCustomEvents: runescape.isEventCustom(event) ? 1 : 0,
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

    const displayName: string = discordIdToDisplayName(
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
 * Observable of discord message events
 * @category Base Discord Observable
 */
const eventMessage$: Observable<discord.Message> = fromEvent(client as unknown as EventEmitter, 'message');

/**
 * Subject of injected discord message events
 * @category Discord Observable
 * @ignore
 */
const injectedMessages$: Subject<discord.Message> = new Subject();

/**
 * Merged observable of eventMessage$ and injectedMessage$
 * @category Command Observable
 */
const message$: Observable<discord.Message> = merge(
    eventMessage$,
    injectedMessages$
);

/**
 * Observable of discord ready events
 * @category Base Discord Observable
 */
const ready$: Observable<void> = fromEvent(client as unknown as EventEmitter, 'ready');

/**
 * Observable of ready events other than the first
 * @category Base Discord Observable
 */
const reconnect$: Observable<void> = ready$
    .pipe(
        skip(1)
    );

/**
 * Observable of the ready event that bootstraps the bot
 * @category Base Discord Observable
 */
const connect$: Observable<void> = ready$
    .pipe(
        take(1)
    );

/**
 * Observable of discord error events
 * @category Base Discord Observable
 */
const error$: Observable<Error> = fromEvent(client as unknown as EventEmitter, 'error');

/**
 * @param find The string to filter for
 * @returns Observable of the transformed Input object
 * @category Read Message
 */
const filteredMessage$ = (
    botCommand: bot.Command
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
            utils.logger.debug(`message: ${command.message.content}`);
            utils.logger.debug(`author: ${command.author.username}`);
            utils.logger.debug(`guild: ${command.guild.name}`);
            utils.logger.debug(`input: ${command.input}`);
        }),
        filter((command: Input): boolean => botCommand.accessControl.controlFunction(
            command.author.id, bot.load(command.guild.id)
        ))
    );

/**
 * An Observable that handles the [[bot.COMMANDS.DEBUG]] command
 * @category Command Observable
 */
const debug$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.DEBUG
);

/**
 * An Observable that handles the [[bot.COMMANDS.ADD_ADMIN]] command
 * @category Command Observable
 */
const addAdmin$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.ADD_ADMIN
)
    .pipe(
        filter(
            (command: Input):
            boolean => command.message.mentions.members.array().length > 0
        ),
    );


/**
 * An Observable that handles the [[bot.COMMANDS.ADD_UPCOMING]] command
 * @category Command Observable
 */
const addUpcoming$: Observable<[Input, runescape.Event]> = filteredMessage$(
    bot.COMMANDS.ADD_UPCOMING
)
    .pipe(
        // we need at least a name, starting date and end date, and type
        map(
            (command: Input): [Input, runescape.Event] => {
                const oldData: bot.Data = bot.load(command.guild.id);

                // let's only allow 10 upcoming events per Guild
                const upcomingEvents: runescape.Event[] = getUpcomingEvents(oldData.events);
                if (upcomingEvents.length >= 10) {
                    utils.logger.debug(`Guild ${command.guild.name} added too many events`);
                    command.message.reply('this guild has too many events scheduled');
                    return null;
                }

                const regexes: Record<string, RegExp> = {
                    name: new RegExp('(?<=name)\\s*(.+?)\\s*(?:starting|ending|type|$)', 'gim'),
                    starting: new RegExp('(?<=starting)\\s*(.+?)\\s*(?:name|ending|type|$)', 'gim'),
                    ending: new RegExp('(?<=ending)\\s*(.+?)\\s*(?:name|starting|type|$)', 'gim'),
                    type: new RegExp('(?<=type)\\s*(\\w+)\\s*.+?\\s*(?:name|starting|ending|type|$)', 'gim'),
                };
                const parsedRegexes = findFirstRegexesMatch(
                    regexes,
                    command.input
                );
                // require all inputs to be valid
                if (parsedRegexes.name === null) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid event name`);
                    command.message.reply(`invalid event name\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }

                if (parsedRegexes.starting === null) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid starting date`);
                    command.message.reply(`invalid starting date\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }

                if (parsedRegexes.ending === null) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid ending date`);
                    command.message.reply(`invalid ending date\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }

                if (parsedRegexes.type === null) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid type`);
                    command.message.reply(`invalid type\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }

                const dateA: Date = new Date(parsedRegexes.starting);
                const dateB: Date = new Date(parsedRegexes.ending);
                const startingDate: Date = dateA <= dateB ? dateA : dateB;
                const endingDate: Date = dateA > dateB ? dateA : dateB;

                const inputType: string = parsedRegexes.type.toUpperCase();
                if (runescape.EVENT_TYPE[inputType] === undefined) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid event type`);
                    command.message.reply(`invalid event type\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }

                const type = runescape.EVENT_TYPE[inputType];
                const event: runescape.Event = {
                    id: uuid(),
                    name: parsedRegexes.name,
                    startingDate,
                    endingDate,
                    type,
                    participants: [],
                    hasPassedTwoHourWarning: false,
                    hasStarted: false,
                    hasEnded: false,
                };
                if (!utils.isValidDate(dateA) || !utils.isValidDate(dateB)) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid date`);
                    command.message.reply('starting date or ending date is invalid use IS0 8601 standard');
                    return null;
                }
                const now: Date = new Date();
                if (startingDate <= now) {
                    utils.logger.debug(`Admin ${command.author.username} entered a start date in the past`);
                    command.message.reply('cannot start an event in the past');
                    return null;
                }
                const threeWeeksFromNow: Date = new Date();
                threeWeeksFromNow.setDate(
                    threeWeeksFromNow.getDate() + 21
                );
                if (endingDate > threeWeeksFromNow) {
                    utils.logger.debug(`Admin ${command.author.username} entered a end date too far in the future`);
                    command.message.reply('event must end within 3 weeks of now');
                    return null;
                }
                if (endingDate.getTime() - startingDate.getTime() < 30 * 60 * 1000) {
                    utils.logger.debug(`Admin ${command.author.username} entered a start date and end date too close together`);
                    command.message.reply('events must be at least 30 minutes long');
                    return null;
                }
                return [
                    command,
                    event,
                ];
            }
        ),
        filter((commandEventArr: [Input, runescape.Event]):
        boolean => commandEventArr !== null),
        tap((commandEventArr: [Input, runescape.Event]): void => {
            utils.logger.debug(`Admin ${commandEventArr[0].author.username} called add event`);
            utils.logger.debug('Runescape.Event properties: ');
            utils.logger.debug(`* ${commandEventArr[1].name}`);
            utils.logger.debug(`* ${commandEventArr[1].startingDate.toDateString()}`);
            utils.logger.debug(`* ${commandEventArr[1].endingDate.toDateString()}`);
            utils.logger.debug(`* ${commandEventArr[1].type}`);
        }),
        share()
    );

/**
 * An Observable that handles the [[bot.COMMANDS.ADD_UPCOMING]] command for
 * [[runescape.EVENT_TYPE.CASUAL]] events
 * @category Command Observable
 * @ignore
 */
const filterUpcomingGenericEvent$:
Observable<[Input, runescape.Event]> = addUpcoming$
    .pipe(
        filter((commandEventArr: [Input, runescape.Event]): boolean => {
            const event: runescape.Event = commandEventArr[1];
            return runescape.isEventCasual(event);
        }),
    );

/**
 * An Observable that handles the [[bot.COMMANDS.ADD_UPCOMING]] command for
 * [[runescape.EVENT_TYPE.SKILLS_COMPETITIVE]] [[runescape.EVENT_TYPE.CLUES_COMPETITIVE]]
 * [[runescape.EVENT_TYPE.BH_COMPETITIVE]] [[runescape.EVENT_TYPE.LMS_COMPETITIVE]]
 * [[runescape.EVENT_TYPE.CUSTOM_COMPETITIVE]] events
 * @category Command Observable
 * @ignore
 */
const filterAndPrepareUpcomingCompetitiveEvent$:
Observable<[Input, runescape.Event]> = addUpcoming$
    .pipe(
        filter((commandEventArr: [Input, runescape.Event]): boolean => {
            const clanEvent: runescape.Event = commandEventArr[1];
            return !runescape.isEventCasual(clanEvent);
        }),
        map((commandEventArr: [Input, runescape.Event]): [Input, runescape.Event] => {
            const inputCommand: Input = commandEventArr[0];
            const event: runescape.Event = commandEventArr[1];
            const competitiveRegex = {
                params: new RegExp('(?<=type)\\s*\\w+\\s*(.+?)\\s*(?:name|starting|ending|type|$)'),
            };
            const parsedRegexes = findFirstRegexesMatch(
                competitiveRegex,
                inputCommand.input
            );

            // Skills
            if (event.type === runescape.EVENT_TYPE.SKILLS
                && parsedRegexes.params !== null) {
                const inputSkillNames: string[] = parsedRegexes.params.split(' ').map(
                    (stringToTrim: string): string => stringToTrim.trim()
                        .toLowerCase()
                );
                const allRunescapeSkills: string[] = Object.values(runescape.SkillsEnum);
                const filteredSkillNames: string[] = inputSkillNames.filter(
                    (skill: string): boolean => skill.length > 0
                        && allRunescapeSkills.includes(skill)
                );
                if (inputSkillNames.length !== filteredSkillNames.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid skill names`);
                    inputCommand.message.reply(`some skill names entered are invalid\nchoices are: ${allRunescapeSkills.toString()}`);
                    return null;
                }
                const newTracking: runescape.Tracking = utils.update(
                    event.tracking,
                    { skills: filteredSkillNames, }
                );
                const skillsEvent: runescape.Event = utils.update(
                    event,
                    { tracking: newTracking, }
                );
                return [
                    inputCommand,
                    skillsEvent,
                ];
            }
            // Bounty hunter
            if (event.type === runescape.EVENT_TYPE.BH
                && parsedRegexes.params !== null) {
                const inputBhInputModeNames: string[] = parsedRegexes.params.split(' ').map(
                    (stringToTrim: string): string => stringToTrim.trim()
                        .toLowerCase()
                );
                const allRunescapeBhModeNames: string[] = Object.values(runescape.BountyHunterEnum);
                const filteredBhModeNames: string[] = inputBhInputModeNames.filter(
                    (bhMode: string): boolean => bhMode.length > 0
                        && allRunescapeBhModeNames.includes(bhMode)
                );
                if (inputBhInputModeNames.length !== filteredBhModeNames.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid bounty hunter names`);
                    inputCommand.message.reply(`some bounty hunter settings entered are invalid\nchoices are: ${allRunescapeBhModeNames.toString()}`);
                    return null;
                }
                const newTracking: runescape.Tracking = utils.update(
                    event.tracking,
                    { bh: filteredBhModeNames, }
                );
                const bhEvent: runescape.Event = utils.update(
                    event,
                    { tracking: newTracking, }
                );
                return [
                    inputCommand,
                    bhEvent,
                ];
            }
            // Clues
            if (event.type === runescape.EVENT_TYPE.CLUES
                && parsedRegexes.params !== null) {
                const inputClueModeNames: string[] = parsedRegexes.params.split(' ').map(
                    (stringToTrim: string): string => stringToTrim.trim()
                        .toLowerCase()
                );
                const allRunescapeClueModes: string[] = Object.values(runescape.CluesEnum);
                const filteredClueModes: string[] = inputClueModeNames.filter(
                    (clueMode: string): boolean => clueMode.length > 0
                        && allRunescapeClueModes.includes(clueMode)
                );
                if (inputClueModeNames.length !== filteredClueModes.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid clue names`);
                    inputCommand.message.reply(`some clue settings entered are invalid\nchoices are: ${allRunescapeClueModes.toString()}`);
                    return null;
                }
                const clues: string[] = filteredClueModes.includes(
                    runescape.CluesEnum.ALL
                )
                || (
                    filteredClueModes.includes(runescape.CluesEnum.BEGINNER)
                    && filteredClueModes.includes(runescape.CluesEnum.EASY)
                    && filteredClueModes.includes(runescape.CluesEnum.MEDIUM)
                    && filteredClueModes.includes(runescape.CluesEnum.HARD)
                    && filteredClueModes.includes(runescape.CluesEnum.ELITE)
                    && filteredClueModes.includes(runescape.CluesEnum.MASTER)
                )
                    ? [
                        runescape.CluesEnum.ALL,
                    ]
                    : filteredClueModes;
                const newTracking: runescape.Tracking = utils.update(
                    event.tracking,
                    { clues, }
                );
                const clueEvent: runescape.Event = utils.update(
                    event,
                    { tracking: newTracking, }
                );
                return [
                    inputCommand,
                    clueEvent,
                ];
            }
            // lms
            if (event.type === runescape.EVENT_TYPE.LMS
                && parsedRegexes.params !== null) {
                const inputLmsModeNames: string[] = parsedRegexes.params.split(' ').map(
                    (stringToTrim: string): string => stringToTrim.trim()
                        .toLowerCase()
                );
                const allRunescapeLmsModes: string[] = Object.values(runescape.LmsEnum);
                const filteredLmsModes: string[] = inputLmsModeNames.filter(
                    (lmsMode: string): boolean => lmsMode.length > 0
                        && allRunescapeLmsModes.includes(lmsMode)
                );
                if (inputLmsModeNames.length !== filteredLmsModes.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid clue names`);
                    inputCommand.message.reply(`some lms settings entered are invalid\nchoices are: ${allRunescapeLmsModes.toString()}`);
                    return null;
                }

                const newTracking: runescape.Tracking = utils.update(
                    event.tracking,
                    { lms: filteredLmsModes, }
                );
                const lmsEvent: runescape.Event = utils.update(
                    event,
                    { tracking: newTracking, }
                );
                return [
                    inputCommand,
                    lmsEvent,
                ];
            }

            // custom
            // TODO: figure out what to do with custom events
            if (event.type === runescape.EVENT_TYPE.CUSTOM) {
                return [
                    inputCommand,
                    event,
                ];
            }

            utils.logger.debug(`Admin ${inputCommand.author.id} entered invalid competition data`);
            inputCommand.message.reply(`some competition settings entered are invalid\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
            return null;
        }),
        filter((commandEventArr: [Input, runescape.Event]): boolean => commandEventArr !== null)
    );

/**
 * A merged Observable of Regular and Competitive events
 * @category Command Observable
 * @ignore
 */
const saveEvent$ = merge(
    filterUpcomingGenericEvent$,
    filterAndPrepareUpcomingCompetitiveEvent$
);

/**
 * An Observable that handles the [[bot.COMMANDS.LIST_UPCOMING]] command
 * @category Command Observable
 */
const listUpcomingEvent$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.LIST_UPCOMING
);

/**
 * An Observable that handles the [[bot.COMMANDS.DELETE_UPCOMING]] command
 * @category Command Observable
 */
const deleteUpcomingEvent$:
Observable<Input> = filteredMessage$(
    bot.COMMANDS.DELETE_UPCOMING
);

/**
 * An Observable that handles the [[bot.COMMANDS.SIGNUP_UPCOMING]] command
 * @category Command Observable
 */
const signupEvent$: Observable<[
    bot.Data,
    discord.Message,
    hiscores.LookupResponse
]> = filteredMessage$(
    bot.COMMANDS.SIGNUP_UPCOMING
)
    .pipe(
        switchMap((command: Input):
        Observable<[bot.Data, discord.Message, hiscores.LookupResponse]> => {
            const signupRegex = {
                eventIdx: new RegExp('.*?([0-9]+).*?$', 'gim'),
                rsn: new RegExp('\\s*[0-9]+\\s*(.+?)\\s*$', 'gim'),
            };
            const parsedRegexes = findFirstRegexesMatch(signupRegex, command.input);
            if (parsedRegexes.eventIdx === null) {
                utils.logger.debug(`${command.author.id} entered invalid index`);
                command.message.reply(`invalid index\n${bot.COMMANDS.SIGNUP_UPCOMING.parameters}`);
                return of(null);
            }
            if (parsedRegexes.rsn === null) {
                utils.logger.debug(`${command.author.id} entered invalid rsn`);
                command.message.reply(`invalid rsn\n${bot.COMMANDS.SIGNUP_UPCOMING.parameters}`);
                return of(null);
            }

            // get upcoming events
            // if index is out of range return
            const data: bot.Data = bot.load(command.guild.id);
            const upcomingAndInFlightEvents: runescape.Event[] = getUpcomingAndInFlightEvents(
                data.events
            );
            const idxToModify: number = Number.parseInt(
                parsedRegexes.eventIdx,
                10
            );
            if (Number.isNaN(idxToModify) || idxToModify >= upcomingAndInFlightEvents.length) {
                utils.logger.debug(`User did not specify index (${idxToModify})`);
                command.message.reply(`invalid index ${idxToModify}\n${bot.COMMANDS.SIGNUP_UPCOMING.parameters}`);
                return of<[bot.Data, discord.Message, hiscores.LookupResponse]>(null);
            }

            const discordIdToAdd: string = command.author.id;
            const rsnToAdd: string = parsedRegexes.rsn;

            // get event to modify and its type
            const eventToModify: runescape.Event = upcomingAndInFlightEvents[idxToModify];

            const newRsAccount: runescape.AccountInfo = {
                rsn: rsnToAdd,
            };

            const participantToAdd: runescape.Participant = {
                discordId: discordIdToAdd,
                runescapeAccounts: [
                    newRsAccount,
                ],
            };

            const newEvent: runescape.Event = signupParticipant(
                eventToModify,
                participantToAdd,
            );

            const newEvents: runescape.Event[] = modifyEventArray(
                data,
                newEvent
            );

            const newData: bot.Data = modifyDataEventsArray(
                data,
                newEvents
            );

            // TODO: hackish way?
            if (newData === data) {
                utils.logger.debug('User already signed up');
                command.message.reply('Your discord id or rsn is already signed up');
                return of(null);
            }

            return forkJoin(
                of<bot.Data>(newData),
                of<discord.Message>(command.message),
                runescape.hiscores$(rsnToAdd, false)
            );
        }),
        filter((dataMsgHiArr: [bot.Data, discord.Message, hiscores.LookupResponse]):
        boolean => dataMsgHiArr !== null),
    );

/**
 * An Observable that handles the [[bot.COMMANDS.UNSIGNUP_UPCOMING]] command
 * @category Command Observable
 */
const unsignupUpcomingEvent$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.UNSIGNUP_UPCOMING
);

/**
 * An Observable that handles the [[bot.COMMANDS.AMISIGNEDUP_UPCOMING]] command
 * @category Command Observable
 */
const amISignedUp$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.AMISIGNEDUP_UPCOMING
);

/**
 * An Observable that handles the [[bot.COMMANDS.LIST_PARTICIPANTS_UPCOMING]] command
 * @category Command Observable
 */
const listParticipant$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.LIST_PARTICIPANTS_UPCOMING
);

/**
 * An Observable that handles the [[bot.COMMANDS.SET_CHANNEL]] command
 * @category Command Observable
 */
const setChannel$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.SET_CHANNEL
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
 * An Observable that handles the [[bot.COMMANDS.HELP]] command
 * @category Command Observable
 */
const help$: Observable<Input> = filteredMessage$(bot.COMMANDS.HELP);

/**
 * An Observable that handles the [[bot.COMMANDS.FORCESIGNUP_UPCOMING]] command
 * @category Command Observable
 */
const forceSignup$: Observable<Input> = filteredMessage$(bot.COMMANDS.FORCESIGNUP_UPCOMING)
    .pipe(
        filter(
            (command: Input):
            boolean => command.message.mentions.members.array().length > 0
        ),
    );

/**
 * An Observable that handles the [[bot.COMMANDS.FORCEUNSIGNUP_UPCOMING]] command
 * @category Command Observable
 */
const forceUnsignup$: Observable<Input> = filteredMessage$(bot.COMMANDS.FORCEUNSIGNUP_UPCOMING)
    .pipe(
        filter(
            (command: Input):
            boolean => command.message.mentions.members.array().length > 0
        ),
    );

/**
 * An Observable that handles the [[bot.COMMANDS.SHOWSTATS]] command
 * @category Command Observable
 */
const showStats$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.SHOWSTATS
);

/**
 * Subject helper that helps an event lifecycle
 */
const eventParticipantsDidUpdate$:
Subject<GuildDataIdEventIdAndParticipants> = new Subject();

/**
 * Subject helper that helps an event lifecycle
 */
const eventWillWarnStart$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that helps an event lifecycle
 */
const eventDidWarnStart$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that helps an event lifecycle
 */
const eventWillStart$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that helps an event lifecycle
 */
const eventDidStart$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that helps an event lifecycle
 */
const eventWillEnd$:
Subject<GuildDataAndEvent> = new Subject();

/**
 * Subject helper that helps an event lifecycle
 */
const eventDidEnd$:
Subject<GuildDataAndEvent> = new Subject();

//------------------------
// Subscriptions & helpers
//
//------------------------

/**
 * @param eventToSetTimers The Event to set timers for
 * @param guildData The Guild Data to process on timer completion
 * @returns The global timer handle for potential cancellation
 * @category Timer
 */
const setTimerStart = (
    eventToSetTimers: runescape.Event,
    guildData: bot.Data,
): NodeJS.Timeout => {
    const now: Date = new Date();
    return setTimeout(
        (): void => {
            eventWillStart$.next(
                {
                    guildData,
                    event: eventToSetTimers,
                }
            );
        }, eventToSetTimers.startingDate.getTime() - now.getTime()
    );
};

/**
 * @param obj Object containing the Guild Data and Event that will start
 * @category Event Lifecycle
 */
eventWillStart$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: bot.Data = obj.guildData;
        const event: runescape.Event = obj.event;

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
 *
 * @param eventId The event to set the timer for
 * @param guildId The source input data
 */
const setTimerAutoUpdate = (
    eventId: string,
    guildId: string,
): NodeJS.Timeout => setInterval(
    (): void => {
        const data: bot.Data = bot.load(
            guildId
        );
        const newFetchedEvent: runescape.Event = fetchUpdatedEvent(
            data,
            eventId,
        );
        updateParticipantsHiscores$(
            newFetchedEvent.participants
        ).subscribe(
            (newParticipants: runescape.Participant[]):
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
        const guildData: bot.Data = obj.guildData;
        const eventThatStarted: runescape.Event = obj.event;

        const updatedData: bot.Data = bot.load(
            guildData.guildId,
        );
        const fetchedEvent: runescape.Event = fetchUpdatedEvent(
            updatedData,
            eventThatStarted.id,
        );

        const newEvent: runescape.Event = {
            ...fetchedEvent,
        };
        newEvent.hasStarted = true;

        saveNewEvent(
            guildData,
            newEvent
        );

        if (!runescape.isEventCasual(newEvent)
        && !runescape.isEventCustom(newEvent)) {
            updateParticipantsHiscores$(
                newEvent.participants
            ).subscribe(
                (newParticipants: runescape.Participant[]): void => {
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

        if (!runescape.isEventCasual(newEvent)
        && !runescape.isEventCustom(newEvent)) {
            timers[newEvent.id].autoUpdate = setTimerAutoUpdate(
                newEvent.id,
                guildData.guildId
            );
        }
    }
);

const getLeaderboardStr = (
    guildIdToPrint: string,
    event: runescape.Event,
    updatedEvent: runescape.Event
): string => {
    const tracking: runescape.TrackingEnum = getEventTracking(updatedEvent);
    const sortedParticipants: runescape.Participant[] = updatedEvent.participants.sort(
        (a: runescape.Participant, b: runescape.Participant):
        number => getTotalEventGain(
            b,
            updatedEvent,
            tracking
        ) - getTotalEventGain(
            a,
            updatedEvent,
            tracking
        )
    );

    const xpDiff: number[] = updatedEvent.participants.map(
        (updatedParticipant: runescape.Participant): number => {
            const foundParticipant = event.participants.find(
                (participant: runescape.Participant):
                boolean => participant.discordId === updatedParticipant.discordId
            );
            if (foundParticipant === undefined) return 0;
            const diff: number = getTotalEventGain(
                updatedParticipant,
                updatedEvent,
                tracking
            ) - getTotalEventGain(
                foundParticipant,
                event,
                tracking
            );
            return diff;
        }
    );

    const namePadding = 8;
    const plusPadding = 0;
    const diffPadding = 4;
    const nameMaxDisplayLength: number = Math.max(...sortedParticipants.map(
        (participant: runescape.Participant):
        number => discordIdToDisplayName(
            guildIdToPrint,
            participant.discordId
        ).length + getTotalEventGain(
            participant,
            updatedEvent,
            tracking
        ).toLocaleString('en-US').length
    )) + namePadding;

    const strToPrint: string = sortedParticipants.map(
        (participant: runescape.Participant, idx: number): string => {
            const displayName: string = discordIdToDisplayName(
                guildIdToPrint,
                participant.discordId
            );
            const eventGain: string = getTotalEventGain(
                participant,
                updatedEvent,
                tracking
            ).toLocaleString('en-US');
            const xpDiffStr = xpDiff[idx].toLocaleString('en-US');

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
    const titleAndPrint = event.name.concat('\n\n').concat(strToPrint);
    return titleAndPrint;
};

/**
 * @param obj Object containing the Guild Data, Event and Participants that updated participants
 * @category Event Lifecycle
 */
eventParticipantsDidUpdate$.subscribe(
    (obj: GuildDataIdEventIdAndParticipants): void => {
        const eventId: string = obj.eventId;
        const guildId: string = obj.guildId;
        const updatedParticipants: runescape.Participant[] = obj.participants;

        const data: bot.Data = bot.load(
            guildId
        );
        const fetchedEvent: runescape.Event = fetchUpdatedEvent(
            data,
            eventId,
        );
        if (fetchedEvent === undefined) return;
        const updatedEvent = {
            ...fetchedEvent,
        };
        updatedEvent.participants = updatedParticipants;
        const updatedData = saveNewEvent(
            data,
            updatedEvent,
        );

        // update leaderboard
        const strToPrint: string = getLeaderboardStr(
            updatedData.guildId,
            fetchedEvent,
            updatedEvent,
        );

        // TODO: make observable?
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
                            const newUpdatedData: bot.Data = bot.load(
                                guildId
                            );
                            const newUpdatedFetchedEvent: runescape.Event = fetchUpdatedEvent(
                                newUpdatedData,
                                eventId,
                            );
                            if (newUpdatedFetchedEvent === undefined) return;
                            const newUpdatedEvent = {
                                ...newUpdatedFetchedEvent,
                            };
                            newUpdatedEvent.scoreboardMessageId = message.id;
                            saveNewEvent(
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
                    const newUpdatedData: bot.Data = bot.load(
                        guildId
                    );
                    const newUpdatedFetchedEvent: runescape.Event = fetchUpdatedEvent(
                        newUpdatedData,
                        eventId,
                    );
                    if (newUpdatedFetchedEvent === undefined) return;
                    const newUpdatedEvent = {
                        ...newUpdatedFetchedEvent,
                    };
                    newUpdatedEvent.scoreboardMessageId = message.id;
                    saveNewEvent(
                        newUpdatedData,
                        newUpdatedEvent,
                    );
                }
            );
        }
    }
);

/**
 * @param eventToSetTimers The Event to set timers for
 * @param guildData The Guild Data to update on timer completion
 * @returns The global timer handle for potential cancellation
 * @category Timer
 */
const setTimerEnd = (
    eventToSetTimers: runescape.Event,
    guildData: bot.Data,
): NodeJS.Timeout => {
    const now: Date = new Date();
    return setTimeout(
        (): void => {
            eventWillEnd$.next(
                {
                    guildData,
                    event: eventToSetTimers,
                }
            );
        }, eventToSetTimers.endingDate.getTime() - now.getTime()
    );
};

/**
 * @param eventToSetTimers The Event to set timers for
 * @param guildData The Guild Data to notify on timer completion
 * @returns The global timer handle for potential cancellation
 * @category Timer
 */
const setTimerTwoHoursBefore = (
    eventToSetTimers: runescape.Event,
    guildData: bot.Data
): NodeJS.Timeout => {
    const now: Date = new Date();
    const twoHoursBeforeStart: Date = new Date(
        eventToSetTimers.startingDate.getTime()
    );
    twoHoursBeforeStart.setHours(
        twoHoursBeforeStart.getHours() - 2
    );
    return setTimeout(
        (): void => {
            eventWillWarnStart$.next(
                {
                    guildData,
                    event: eventToSetTimers,
                }
            );
        }, twoHoursBeforeStart.getTime() - now.getTime()
    );
};

eventWillWarnStart$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: bot.Data = obj.guildData;
        const event: runescape.Event = obj.event;

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
        const guildData: bot.Data = obj.guildData;
        const eventThatStarted: runescape.Event = obj.event;

        const updatedData: bot.Data = bot.load(
            guildData.guildId,
        );
        const fetchedEvent: runescape.Event = fetchUpdatedEvent(
            updatedData,
            eventThatStarted.id,
        );

        const newEvent: runescape.Event = {
            ...fetchedEvent,
        };
        newEvent.hasPassedTwoHourWarning = true;

        saveNewEvent(
            updatedData,
            newEvent,
        );
    }
);

eventWillEnd$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: bot.Data = obj.guildData;
        const event: runescape.Event = obj.event;

        notifyParticipantsInEvent(
            guildData,
            event,
            END_STR
        );

        if (!runescape.isEventCasual(event)
        && !runescape.isEventCustom(event)) {
            updateParticipantsHiscores$(
                event.participants
            ).subscribe(
                (newParticipants: runescape.Participant[]): void => {
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
        }
    }
);

eventDidEnd$.subscribe(
    (obj: GuildDataAndEvent): void => {
        const guildData: bot.Data = obj.guildData;
        const event: runescape.Event = obj.event;

        const data: bot.Data = bot.load(
            guildData.guildId
        );
        const fetchedEvent: runescape.Event = fetchUpdatedEvent(
            data,
            event.id,
        );
        if (fetchedEvent === undefined) return;
        const updatedEvent = {
            ...fetchedEvent,
        };
        updatedEvent.hasEnded = true;

        const updatedData = saveNewEvent(
            data,
            updatedEvent,
        );

        const tracking: runescape.TrackingEnum = getEventTracking(
            updatedEvent
        );
        const sortedParticipants: runescape.Participant[] = updatedEvent.participants.sort(
            (a: runescape.Participant, b: runescape.Participant):
            number => getTotalEventGain(
                b,
                updatedEvent,
                tracking
            ) - getTotalEventGain(
                a,
                updatedEvent,
                tracking
            )
        );

        if (sortedParticipants.length > 0) {
            const attachment = './attachments/congratulations.mp3';
            sendChannelAttachment(
                updatedData.guildId,
                updatedData.settings.notificationChannelId,
                attachment,
                `<@${sortedParticipants[0].discordId}>`
            );
        }
    }
);

/**
 * @param eventToSetTimers The Event to initialize
 * @param guild The guild associated with the event
 * @category Event Lifecycle
 */
// const initializeEvent = (
//     eventToInitialize: runescape.Event,
//     guild: discord.Guild,
// ): void => {
//     const startTimer: NodeJS.Timeout = setTimerStart(
//         eventToInitialize,
//         guild
//     );
//     const autoUpdateTimer: NodeJS.Timeout =
// }

connect$.subscribe((): void => {
    utils.logger.info('Connected');
    utils.logger.info('Logged in as:');
    utils.logger.info(`* ${client.user.username}`);
    utils.logger.info(`* ${client.user.id}`);

    utils.logger.verbose(`In ${client.guilds.size} guilds:`);
    client.guilds.forEach(
        (guild: discord.Guild): void => {
            utils.logger.verbose(`* ${guild.name} (${guild.id})`);
            utils.logger.verbose('* Loading guild json');

            const data: bot.Data = bot.load(
                guild.id,
                true
            );

            if (data.guildId === undefined) {
                data.guildId = guild.id;
                bot.save(
                    guild.id,
                    data
                );
            }

            utils.logger.debug(`Loaded json for guild ${guild.id}`);
            utils.logger.silly(`${JSON.stringify(data)}`);

            // startup tasks
            // handle generic events here

            const unnotifiedEvents = getUnnotifiedEvents(data);
            unnotifiedEvents.forEach(
                (event: runescape.Event): void => {
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
                        utils.logger.debug('before 2 hour warning');
                        // schedule 2 hour warning
                        // schedule start date notification
                        // schedule end date notification
                        timers[event.id] = {
                            autoUpdate: undefined,
                            twoHoursBeforeEventTimer: setTimerTwoHoursBefore(
                                event,
                                data,
                            ),
                            eventStartedTimer: setTimerStart(
                                event,
                                data,
                            ),
                            eventEndedTimer: setTimerEnd(
                                event,
                                data,
                            ),
                        };
                    } else if (now >= twoHoursBeforeStart
                        && now < event.startingDate) {
                        utils.logger.debug('after 2 hour warning');
                        if (!event.hasPassedTwoHourWarning) {
                            utils.logger.debug('notification had not fired');
                            notifyParticipantsInEvent(
                                data,
                                event,
                                TWO_HOUR_WARN_STR
                            );
                            // mark 2 hour warning as completed
                            const newEvent: runescape.Event = utils.update(
                                event,
                                { hasPassedTwoHourWarning: true, }
                            );
                            saveNewEvent(
                                data,
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
                                event,
                                data
                            ),
                            eventEndedTimer: setTimerEnd(
                                event,
                                data
                            ),
                        };
                    } else if (now >= event.startingDate
                        && now < toleranceAfterStart) {
                        utils.logger.debug('after event started');
                        if (!event.hasStarted) {
                            utils.logger.debug('notification had not fired');
                            // fire start notification
                            // mark 2 hour warning as completed
                            // mark start notification as complete
                            notifyParticipantsInEvent(
                                data,
                                event,
                                START_STR
                            );
                            const newEvent: runescape.Event = utils.update(
                                event,
                                {
                                    hasPassedTwoHourWarning: true,
                                    hasStarted: true,
                                }
                            );
                            saveNewEvent(
                                data,
                                newEvent,
                            );
                        }
                        // TODO: change me
                        timers[event.id] = {
                            autoUpdate: setTimerAutoUpdate(
                                event.id,
                                data.guildId,
                            ),
                            twoHoursBeforeEventTimer: undefined,
                            eventStartedTimer: undefined,
                            eventEndedTimer: setTimerEnd(
                                event,
                                data
                            ),
                        };
                    } else if (now >= toleranceAfterStart
                        && now < event.endingDate) {
                        utils.logger.debug('after 30 min start tolerance');
                        if (!event.hasStarted) {
                            utils.logger.error('notification had not fired');
                            // fire start notification
                            // mark 2 hour warning as completed
                            // mark start notification as complete
                            // TODO: apologize lol
                            notifyParticipantsInEvent(
                                data,
                                event,
                                'started more than 30 mins ago, yell at n0trout'
                            );
                            const newEvent: runescape.Event = utils.update(
                                event,
                                {
                                    hasPassedTwoHourWarning: true,
                                    hasStarted: true,
                                }
                            );
                            saveNewEvent(
                                data,
                                newEvent,
                            );
                        }
                        // schedule end date notification
                        // TODO: change me
                        timers[event.id] = {
                            autoUpdate: setTimerAutoUpdate(
                                event.id,
                                data.guildId,
                            ),
                            twoHoursBeforeEventTimer: undefined,
                            eventStartedTimer: undefined,
                            eventEndedTimer: setTimerEnd(
                                event,
                                data,
                            ),
                        };
                    } else if (now >= event.endingDate
                        && now < toleranceAfterEnd) {
                        utils.logger.debug('after ended');
                        if (!event.hasEnded) {
                            utils.logger.error('notification had not fired');
                            // fire end notification
                            // mark 2 hour warning as complete (unnecessary)
                            // mark start notification as complete (unnecessary)
                            // mark end notification as complete
                            notifyParticipantsInEvent(
                                data,
                                event,
                                END_STR
                            );
                            const newEvent: runescape.Event = utils.update(
                                event,
                                {
                                    hasPassedTwoHourWarning: true,
                                    hasStarted: true,
                                    hasEnded: true,
                                }
                            );
                            saveNewEvent(
                                data,
                                newEvent,
                            );
                        }
                    } else if (now >= toleranceAfterEnd && now < toleranceAfterEndTolerance) {
                        utils.logger.debug('after 2 hour end tolerance');
                        if (!event.hasEnded) {
                            utils.logger.error('notification had not fired');
                            // fire end notification
                            // apologize
                            // mark 2 hour warning as complete (unnecessary)
                            // mark start notification as complete (unnecessary)
                            // mark end notification as complete
                            notifyParticipantsInEvent(
                                data,
                                event,
                                'had ended more than 2 hours ago, yell at n0trout'
                            );
                            const newEvent: runescape.Event = utils.update(
                                event,
                                {
                                    hasPassedTwoHourWarning: true,
                                    hasStarted: true,
                                    hasEnded: true,
                                }
                            );
                            saveNewEvent(
                                data,
                                newEvent,
                            );
                        }
                    } else {
                        // too late to do anything
                        // just mark it as fired
                        const newEvent: runescape.Event = utils.update(
                            event,
                            {
                                hasPassedTwoHourWarning: true,
                                hasStarted: true,
                                hasEnded: true,
                            }
                        );
                        saveNewEvent(
                            data,
                            newEvent,
                        );
                    }
                }
            );

            // are we in flight for an event?
            // make sure they are properly setup
            // TODO: full implementation
            // const inFlightEvents: ClanEvent[] = getInFlightEvents()
            // const inFlightXpEvents: ClanEvent[] = inFlightEvents.filter(
            //     (event: ClanEvent): boolean => event.type === runescape.EVENT_TYPE.COMPETITIVE
            // )
            // const endedEvents: ClanEvent[] = getEndedEvents()
            // const endedXpEvents: ClanEvent[] = endedEvents.filter(
            //     (event: ClanEvent): boolean => event.type === runescape.EVENT_TYPE.COMPETITIVE
            // )

        // inFlightEvents.forEach((event: ClanEvent): void => {
        //     if (event.type === runescape.EVENT_TYPE.COMPETITIVE) {
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
        }
    );
});

reconnect$.subscribe(
    utils.logger.info('Reconnected')
);

error$.subscribe(
    (error: Error): void => {
        utils.logger.error(error.message);
    }
);

debug$.subscribe(
    (command: Input): void => {
        utils.logger.info('Debug called');
        const data: bot.Data = bot.load(command.guild.id);
        utils.logger.debug(
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
        const oldData: bot.Data = bot.load(command.guild.id);
        const oldSettings: bot.Settings = oldData.settings;

        const mentions: string[] = command.message.mentions.members.array()
            .map(
                (member: discord.GuildMember): string => member.id
            );
        const newSettings: bot.Settings = utils.update(
            oldSettings,
            {
                admins: Array.from(
                    new Set(
                        oldSettings.admins.concat(mentions)
                    )
                ),
            }
        );
        saveNewSettings(
            oldData,
            newSettings,
            command.guild.id
        );
        utils.logger.debug('Admin added');
        command.message.reply('admin added');
    }
);

saveEvent$.subscribe(
    (inputArr: [Input, runescape.Event]): void => {
    // add timers
        const command: Input = inputArr[0];
        const event: runescape.Event = inputArr[1];

        const data: bot.Data = bot.load(command.guild.id);
        const events: runescape.Event[] = data.events.concat(event);
        const upcoming: runescape.Event[] = getUpcomingAndInFlightEvents(events);
        const idx: number = upcoming.indexOf(event);

        const guild: discord.Guild = command.guild;
        const newData = saveNewEvents(
            data,
            events,
        );

        timers[event.id] = {
            autoUpdate: undefined,
            twoHoursBeforeEventTimer: setTimerTwoHoursBefore(
                event,
                newData,
            ),
            eventStartedTimer: setTimerStart(
                event,
                newData,
            ),
            eventEndedTimer: setTimerEnd(
                event,
                newData,
            ),
        };

        utils.logger.debug('event added');
        command.message.reply(`event '${event.name}' added`);

        sendChannelMessage(
            guild.id,
            newData.settings.notificationChannelId,
            `@everyone clan event '${event.name}' has just been scheduled for ${event.startingDate.toString()}\nto sign-up type: '${bot.COMMANDS.SIGNUP_UPCOMING.command}${idx} (your RuneScape name here)'`,
            null,
        );
    }
);

listUpcomingEvent$.subscribe(
    (command: Input): void => {
        const oldData: bot.Data = bot.load(command.guild.id);
        const upcomingAndInFlightEvents: runescape.Event[] = getUpcomingAndInFlightEvents(
            oldData.events
        );
        const eventsStr = upcomingAndInFlightEvents.map(
            (event: runescape.Event, idx: number): string => {
                const startingDateStr = event.startingDate.toString();
                const endingDateStr = event.endingDate.toString();
                const retStr = event.startingDate > new Date()
                    ? `\n${idx}: upcoming event ${event.name} starting: ${startingDateStr} ending: ${endingDateStr} type: ${event.type}`
                    : `\n${idx}: in-flight event ${event.name} ending: ${endingDateStr} type: ${event.type}`;

                switch (event.type) {
                    case (runescape.EVENT_TYPE.SKILLS):
                        return retStr.concat(` ${event.tracking.skills.toString()}`);
                    case (runescape.EVENT_TYPE.LMS):
                        return retStr.concat(` mode: ${event.tracking.lms.toString()}`);
                    case (runescape.EVENT_TYPE.CUSTOM):
                        return retStr;
                    case (runescape.EVENT_TYPE.CLUES):
                        return retStr.concat(` ${event.tracking.clues.toString()}`);
                    case (runescape.EVENT_TYPE.CASUAL):
                        return retStr;
                    case (runescape.EVENT_TYPE.BH):
                        return retStr.concat(` mode: ${event.tracking.bh.toString()}`);
                    default:
                        throw new Error('we shouldn\'t get here');
                }
            }
        );
        const reply: string = upcomingAndInFlightEvents.length > 0
            ? `upcoming events: ${eventsStr}`
            : 'no upcoming events';
        command.message.reply(reply);
        utils.logger.debug('ListUpcomingEvents called');
    }
);

deleteUpcomingEvent$.subscribe(
    (command: Input): void => {
        const oldData: bot.Data = bot.load(command.guild.id);
        const upcomingAndInFlightEvents: runescape.Event[] = getUpcomingAndInFlightEvents(
            oldData.events
        );
        const idxToRemove: number = parseInt(
            command.input,
            10
        );
        if (Number.isNaN(idxToRemove)
        || idxToRemove >= upcomingAndInFlightEvents.length) {
            utils.logger.debug(`Admin did not specify index (${idxToRemove})`);
            command.message.reply(`invalid index ${idxToRemove}\n${bot.COMMANDS.DELETE_UPCOMING.parameters}`);
            return;
        }

        const eventToDelete: runescape.Event = upcomingAndInFlightEvents[idxToRemove];
        const newEvents: runescape.Event[] = deleteEvent(
            oldData,
            eventToDelete
        );
        saveNewEvents(
            oldData,
            newEvents,
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
        utils.logger.debug('Runescape.Event deleted');
        command.message.reply(`'${eventToDelete.name}' deleted`);
    }
);

signupEvent$.subscribe(
    (inputArr: [
        bot.Data,
        discord.Message,
        hiscores.LookupResponse
    ]): void => {
        const data: bot.Data = inputArr[0];
        const message: discord.Message = inputArr[1];
        const hiscore: hiscores.LookupResponse = inputArr[2];
        if (hiscore === null) {
            utils.logger.debug('User entered invalid RSN');
            message.reply('cannot find RSN on hiscores');
            return;
        }
        bot.save(
            message.guild.id,
            data
        );
        utils.logger.debug('Signup called');
        message.reply('signed up for event');
    }
);

unsignupUpcomingEvent$.subscribe(
    (command: Input): void => {
    // get upcoming events
    // if index is out of range return
        const data: bot.Data = bot.load(command.guild.id);
        const upcomingAndInFlightEvents:
        runescape.Event[] = getUpcomingAndInFlightEvents(data.events);
        const idxToModify: number = Number.parseInt(
            command.input,
            10
        );
        if (Number.isNaN(idxToModify)
        || idxToModify >= upcomingAndInFlightEvents.length) {
            utils.logger.debug(`User did not specify index (${idxToModify})`);
            command.message.reply(`invalid index ${idxToModify}\n${bot.COMMANDS.UNSIGNUP_UPCOMING.parameters}`);
            return;
        }

        // does the event to modify contain our user?
        const eventToModify: runescape.Event = upcomingAndInFlightEvents[idxToModify];
        const participantToRemove:
        runescape.Participant = eventToModify.participants.find(
            (participant: runescape.Participant):
            boolean => participant.discordId === command.author.id
        );
        if (participantToRemove === undefined) return;
        const newEvent: runescape.Event = unsignupParticipant(
            eventToModify,
            participantToRemove,
        );
        saveNewEvent(
            data,
            newEvent,
        );

        utils.logger.debug('Unsignup called');
        command.message.reply('removed from event');
    }
);

amISignedUp$.subscribe(
    (command: Input): void => {
        const oldData: bot.Data = bot.load(command.guild.id);
        const upcomingAndInFlightEvents:
        runescape.Event[] = getUpcomingAndInFlightEvents(oldData.events);
        const idxToCheck: number = Number.parseInt(
            command.input,
            10
        );
        if (Number.isNaN(idxToCheck)
        || idxToCheck >= upcomingAndInFlightEvents.length) {
            utils.logger.debug(`User did not specify index (${idxToCheck})`);
            command.message.reply(`invalid index ${idxToCheck}\n${bot.COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`);
            return;
        }

        const discordIdToCheck: string = command.author.id;

        // does the event to modify contain our user?
        const eventToCheck: runescape.Event = upcomingAndInFlightEvents[idxToCheck];
        const foundEventParticipant: runescape.Participant = eventToCheck
            .participants.find(
                (participant: runescape.Participant):
                boolean => participant.discordId === discordIdToCheck
            );
        if (foundEventParticipant === undefined) {
            command.message.reply('you are not signed up');
            return;
        }

        const accounts = foundEventParticipant.runescapeAccounts.map(
            (account: runescape.AccountInfo): string => account.rsn
        ).join(', ');
        command.message.reply(`you are signed up with RSN: ${accounts}`);
        utils.logger.debug('AmISignedUp Called');
    }
);

listParticipant$.subscribe(
    (command: Input): void => {
        const oldData: bot.Data = bot.load(command.guild.id);
        const upcomingAndInFlightEvents:
        runescape.Event[] = getUpcomingAndInFlightEvents(oldData.events);
        const idxToCheck: number = Number.parseInt(
            command.input,
            10
        );
        if (Number.isNaN(idxToCheck)
        || idxToCheck >= upcomingAndInFlightEvents.length) {
            utils.logger.debug(`User did not specify index (${idxToCheck})`);
            command.message.reply(`invalid index ${idxToCheck}\n${bot.COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`);
            return;
        }

        const eventToList: runescape.Event = upcomingAndInFlightEvents[idxToCheck];
        const formattedStr: string = eventToList.participants.map(
            (participant: runescape.Participant, idx: number): string => {
                const displayName: string = discordIdToDisplayName(
                    command.guild.id,
                    participant.discordId
                );
                const accounts: string = participant.runescapeAccounts.map(
                    (account: runescape.AccountInfo): string => account.rsn
                ).join(', ');
                return `\n${idx}: ${displayName} signed up ${accounts}`;
            }
        ).join('');

        const reply: string = eventToList.participants.length > 0
            ? `participants:${formattedStr}`
            : 'no participants';
        command.message.reply(reply);
        utils.logger.debug('ListParticipants called');
    }
);

setChannel$.subscribe(
    (command: Input): void => {
        const oldData: bot.Data = bot.load(command.guild.id);
        const channel: discord.Channel = command.message.mentions.channels.first();
        const newSettings: bot.Settings = utils.update(
            oldData.settings,
            {
                notificationChannelId: channel.id,
            }
        );
        saveNewSettings(
            oldData,
            newSettings,
            command.guild.id
        );
        utils.logger.debug('Set channel called');
        command.message.reply(`notification channel set to ${channel}`);
    }
);

help$.subscribe(
    (command: Input): void => {
        const keys: string[] = Object.keys(bot.COMMANDS).filter(
            (key: string): boolean => {
                const data: bot.Data = bot.load(command.guild.id);
                const admin: boolean = bot.isAdmin(
                    command.author.id,
                    data
                );
                const botCommand: bot.Command = bot.COMMANDS[key];
                return (admin && (botCommand.accessControl === bot.ONLY_ADMIN
                || botCommand.accessControl === bot.ONLY_UNSET_ADMINS_OR_ADMIN))
                || botCommand.accessControl === bot.ANY_USER;
            }
        );
        const commandValues: bot.Command[] = keys.map(
            (key: string): bot.Command => bot.COMMANDS[key] as bot.Command
        );
        const outerStr: string[] = commandValues.map((commandInfo: bot.Command): string => {
            const innerStr: string[] = [
                `\n'${commandInfo.command}${commandInfo.parameters}'`,
                `\ndescription: ${commandInfo.description}`,
            ];
            return innerStr.join('');
        });
        const formattedStr = outerStr.join('\n');
        utils.logger.debug(formattedStr);
        command.message.reply(
            formattedStr,
            { code: true, }
        );
        utils.logger.debug('Help called');
    }
);

/**
 *
 * @param newCommand The new command to swap to
 * @param newContent The new content string
 * @param oldMessage The old message source
 * @param newAuthor The new author
 * @category Send Message
 */
const mockMessage = (
    newCommand: bot.Command,
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
        client
    );
    return message;
};

forceSignup$.subscribe(
    (command: Input): void => {
        const newInput = command.input.replace(/\s*<@[0-9]+>/g, '');
        const message: discord.Message = mockMessage(
            bot.COMMANDS.SIGNUP_UPCOMING,
            newInput,
            command.message,
            command.message.mentions.users.array()[0]
        );
        injectedMessages$.next(message);
    }
);

forceUnsignup$.subscribe(
    (command: Input): void => {
        const newInput = command.input.replace(/\s*<@[0-9]+>/g, '');
        const message: discord.Message = mockMessage(
            bot.COMMANDS.UNSIGNUP_UPCOMING,
            newInput,
            command.message,
            command.message.mentions.users.array()[0]
        );
        injectedMessages$.next(message);
    }
);

showStats$.subscribe(
    (command: Input): void => {
        const data: bot.Data = bot.load(command.guild.id);
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

client.login(auth.token);

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
//     type: runescape.EVENT_TYPE.REGULAR,
//     tracking: null,
//     participants: [eventParticipant1],
//     hasPassedTwoHourWarning: false,
//     hasStarted: false,
//     hasEnded: false
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
//         type: runescape.EVENT_TYPE.COMPETITIVE,
//         tracking,
//         participants: [eventParticipant2],
//         hasPassedTwoHourWarning: false,
//         hasStarted: false,
//         hasEnded: false,
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
