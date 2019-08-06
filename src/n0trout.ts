// TODO: Auto updating scoreboard
// Fix hackish late signup
// 20 min ending warning
// custom competitive events
// all time hiscores
// fun attachments

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
import { EventEmitter } from 'events';
import uuid from 'uuidv4';
import { runescape } from './runescape';
import { bot } from './bot';
import { utils } from './utils';
import auth from './auth.json';

/**
* @description Interface containing transformed input data for consumption by the code
*/
interface Input extends Record<string, unknown> {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    input: string
}

/**
 * @description Enum of all Event types
 */
enum EVENT_TYPE {
    COMPETITIVE = 'COMPETITIVE',
    REGULAR = 'REGULAR',
}

//--------
// Helpers
//--------

/**
 * @param displayName The display name of the user to print
 * @param stats The Stats object to display
 * @returns A string describing the Stats object
 * @category Helper
 */
const getStatsStr = (
    displayName: string,
    stats: bot.Stats
): string => {
    const averagePlace: number = Math.floor(
        stats.totalPlaces / stats.totalCompetitiveEvents
    );
    const averageParticipants: number = Math.floor(
        stats.totalParticipants / stats.totalCompetitiveEvents
    );
    return `\n${displayName}\n🥇: ${stats.firstPlaceFinishes}\n🥈: ${stats.secondPlaceFinishes}\n🥉: ${stats.thirdPlaceFinishes}\n4-10: ${stats.fourThroughTenFinishes}\n\nTotal events: ${stats.totalCompetitiveEvents + stats.totalRegularEvents}\nAverage placement: ${averagePlace}/${averageParticipants}`;
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
 * @param oldData The source Data object
 * @param updatedSettings The new Settings object to insert
 * @returns A new updated Data object
 * @category Helper
 */
const updateSettings = (
    oldData: bot.Data,
    updatedSettings: bot.Settings
): bot.Data => utils.update(oldData, {
    settings: updatedSettings,
}) as bot.Data;

/**
 * @param oldData The source Data object
 * @param updatedEvent The new Event object to insert
 * @returns A new updated Data object
 * @category Helper
 */
const updateEvent = (
    oldData: bot.Data,
    updatedEvent: runescape.Event
): bot.Data => {
    const newEvents: runescape.Event[] = oldData.events.map(
        (event: runescape.Event): runescape.Event => {
            if (event.id === updatedEvent.id) return updatedEvent;
            return event;
        }
    );
    const newData: bot.Data = utils.update(
        oldData,
        { events: newEvents }
    ) as bot.Data;
    return newData;
};

/**
 * @param oldData The source Data object
 * @param eventToDelete The Event object to remove
 * @returns A new updated Data object
 * @category Event
 */
const deleteEvent = (
    oldData: bot.Data,
    eventToDelete: runescape.Event
): bot.Data => {
    const newEvents: runescape.Event[] = oldData.events.filter(
        (event: runescape.Event):
        boolean => event.id !== eventToDelete.id
    );
    const newData: bot.Data = utils.update(
        oldData,
        { events: newEvents }
    ) as bot.Data;
    return newData;
};

/**
 * @param oldData The source Data object
 * @param oldEvent The source Event object
 * @param updatedParticipant The new Participant object to insert
 * @returns A new updated Data object
 * @category Helper
 */
const updateParticipant = (
    oldData: bot.Data,
    oldEvent: runescape.Event,
    updatedParticipant: runescape.Participant
): bot.Data => {
    const newParticipants: runescape.Participant[] = oldEvent.participants.map(
        (participant: runescape.Participant):
        runescape.Participant => {
            if (participant.discordId === updatedParticipant.discordId) return updatedParticipant;
            return participant;
        }
    );
    const newEvent: runescape.Event = utils.update(oldEvent, {
        participants: newParticipants,
    }) as runescape.Event;
    return updateEvent(oldData, newEvent);
};

/**
 * @param oldData The source Data object
 * @param oldEvent The source Event object
 * @param updatedParticipant The new Participant object to insert
 * @returns A new updated Data object
 * @category Event
 * @todo Possible refactor to use [[updateParticipant]]
 */
const signupParticipant = (
    oldData: bot.Data,
    oldEvent: runescape.Event,
    newParticipant: runescape.Participant
): bot.Data => {
    const foundParticipant: runescape.Participant = oldEvent.participants.find(
        (participant: runescape.Participant):
        boolean => participant.discordId === newParticipant.discordId
    );
    if (foundParticipant !== undefined) return oldData;
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
    if (foundRsn) return oldData;
    const newParticipants: runescape.Participant[] = oldEvent.participants.concat(newParticipant);
    const newEvent: runescape.Event = utils.update(oldEvent, {
        participants: newParticipants,
    }) as runescape.Event;
    return updateEvent(oldData, newEvent);
};

/**
 * @param oldData The source Data object
 * @param oldEvent The source Event object
 * @param participantToRemove The Participant object to remove
 * @returns A new updated Data object
 * @category Event
 */
const unsignupParticipant = (
    oldData: bot.Data,
    oldEvent: runescape.Event,
    participantToRemove: runescape.Participant
): bot.Data => {
    const newParticipants: runescape.Participant[] = oldEvent.participants.filter(
        (participant: runescape.Participant):
        boolean => participant.discordId !== participantToRemove.discordId
    );
    const newEvent: runescape.Event = utils.update(oldEvent, {
        participants: newParticipants,
    }) as runescape.Event;
    return updateEvent(oldData, newEvent);
};

/**
 * @function
 * @param guild The guild to use for display name lookup
 * @param discordId The Discord id to lookup
 * @returns The user's display name
 * @category Helper
 */
const discordIdToDisplayName = (guild: discord.Guild, discordId: string):
string => {
    if (!guild.available) return '(guild unavailable)';
    const member: discord.GuildMember = guild.members.find(
        (m: discord.GuildMember):
        boolean => m.id === discordId
    );
    if (member === null) return '(unknown)';
    return member.displayName;
};

/**
 * @param guild The guild send the message to
 * @param channelId The channel id to send the message to
 * @param attachmentToSend The attachment path to send
 * @category Send Guild Message
 */
const sendChannelAttachment = (
    guild: discord.Guild,
    channelId: string,
    attachmentToSend: string,
    text?: string
): void => {
    if (guild === null || !guild.available) return;
    const channel: discord.TextChannel = guild.channels.get(
        channelId
    ) as discord.TextChannel;
    if (channel === undefined || channel.type !== 'text') return;
    utils.logger.debug('Sending message to Guild');

    if (attachmentToSend !== null) {
        channel.send(text, {
            files: [{
                attachment: attachmentToSend,
            }],
        });
    }
};

/**
 * @function
 * @param guild The guild send the message to
 * @param channelId The channel id to send the message to
 * @param message The message content to send
 * @param options The Discord message options to use
 * @category Send Guild Message
 */
const sendChannelMessage = (
    guild: discord.Guild,
    channelId: string,
    message: string,
    options: discord.MessageOptions = null
): void => {
    if (guild === null || !guild.available) return;
    const channel: discord.TextChannel = guild.channels.get(
        channelId
    ) as discord.TextChannel;
    if (channel === undefined || channel.type !== 'text') return;
    utils.logger.debug('Sending message to Guild');

    if (message !== null) {
        channel.send(
            message,
            options
        );
    }
};

/**
 * @function
 * @param event The event containing the participants to notify
 * @param guild The guild to notify
 * @param channelId The channel id to send the notification to
 * @param message The message content to send
 * @category Send Guild Message
 */
const notifyParticipantsInEvent = (
    event: runescape.Event,
    guild: discord.Guild,
    channelId: string,
    message: string
): void => {
    const participants: string[] = event.participants.map(
        (participant: runescape.Participant): string => participant.discordId
    );
    const mentions: string = participants.map(
        (participant: string): string => `<@${participant}>`
    ).join(', ');
    sendChannelMessage(guild, channelId, `event '${event.name}' ${message} ${mentions}`, null);
};

/**
 * @param eventToSetTimers The Event to set timers for
 * @param guild The guild to notify on timer completion
 * @returns The global timer handle for potential cancellation
 * @category Timer
 */
const setTimerTwoHoursBefore = (
    eventToSetTimers: runescape.Event,
    guild: discord.Guild
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
            const data: bot.Data = bot.load(guild.id, false);
            const foundEvent: runescape.Event = data.events.find(
                (event: runescape.Event): boolean => event.id === eventToSetTimers.id
            );
            if (foundEvent === undefined) return;
            notifyParticipantsInEvent(
                foundEvent,
                guild,
                data.settings.notificationChannelId,
                'will begin within 2 hours'
            );
            // mark 2 hour warning as completed
            const newEvent: runescape.Event = utils.update(foundEvent, {
                hasNotifiedTwoHourWarning: true,
            }) as runescape.Event;
            const newData: bot.Data = updateEvent(data, newEvent);
            bot.save(guild.id, newData);
        }, twoHoursBeforeStart.getTime() - now.getTime()
    );
};

/**
 * @param event The Event to check what we tracked
 * @returns The enum that represents what we tracked
 * @category Helper
 */
const getEventTracking = (event: runescape.Event): runescape.TrackingEnum => {
    if (event.tracking.bh !== null) {
        return runescape.TrackingEnum.BH;
    }
    if (event.tracking.clues !== null) {
        return runescape.TrackingEnum.CLUES;
    }
    if (event.tracking.skills !== null) {
        return runescape.TrackingEnum.SKILLS;
    }
    if (event.tracking.lms !== null) {
        return runescape.TrackingEnum.LMS;
    }
    return null;
};

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
            if (event.tracking.skills === null) return 0;
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
            if (event.tracking.bh === null
                && event.tracking.clues === null
                && event.tracking.lms === null) return 0;
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
 * @param sortedParticipants Participants to calculate stats for in desc order
 * @param oldData The source Data object
 * @param event The source Event object
 * @param competitive If the event was competitive or not
 * @returns A new updated Data object
 * @category Calculation
 */
const updateStats = (
    sortedParticipants: runescape.Participant[],
    oldData: bot.Data,
    event: runescape.Event,
    competitive: boolean
): bot.Data => {
    const updatedStats: bot.Stats[] = sortedParticipants.map(
        (participant: runescape.Participant, placing: number):
        bot.Stats => {
            const foundStats: bot.Stats = oldData.stats.find(
                (stats: bot.Stats):
                boolean => stats.discordId === participant.discordId
            );
            const StatsToUse: bot.Stats = foundStats === undefined
                ? {
                    discordId: participant.discordId,
                    firstPlaceFinishes: 0,
                    secondPlaceFinishes: 0,
                    thirdPlaceFinishes: 0,
                    fourThroughTenFinishes: 0,
                    totalParticipants: 0,
                    totalPlaces: 0,
                    totalCompetitiveEvents: 0,
                    totalRegularEvents: 0,
                    totalSkillsGain: 0,
                    totalCluesGain: 0,
                    totalLmsGain: 0,
                    totalBhGain: 0,
                }
                : foundStats;

            if (!competitive) {
                const regularEvents: number = StatsToUse.totalRegularEvents;
                const newStats: bot.Stats = utils.update(
                    StatsToUse,
                    { totalRegularEvents: regularEvents + 1 }
                ) as bot.Stats;
                return newStats;
            }

            const firstPlaceFinish = placing === 0 ? 1 : 0;
            const secondPlaceFinish = placing === 1 ? 1 : 0;
            const thirdPlaceFinish = placing === 2 ? 1 : 0;
            const topTenPlaceFinishes = (placing > 2 && placing < 10) ? 1 : 0;
            const participantCount = sortedParticipants.length;
            const skillGain = getTotalEventGain(
                participant,
                event,
                runescape.TrackingEnum.SKILLS
            );
            const bhGain = getTotalEventGain(
                participant,
                event,
                runescape.TrackingEnum.BH
            );
            const lmsGain = getTotalEventGain(
                participant,
                event,
                runescape.TrackingEnum.LMS
            );
            const cluesGain = getTotalEventGain(
                participant,
                event,
                runescape.TrackingEnum.CLUES
            );
            const newFirstPlaceFinishes = StatsToUse.firstPlaceFinishes + firstPlaceFinish;
            const newSecondPlaceFinishes = StatsToUse.secondPlaceFinishes + secondPlaceFinish;
            const newThirdPlaceFinishes = StatsToUse.thirdPlaceFinishes + thirdPlaceFinish;
            const newTopTenPlaceFinishes = StatsToUse.fourThroughTenFinishes + topTenPlaceFinishes;
            const newTotalParticipants = StatsToUse.totalParticipants + participantCount;
            const newTotalPlaces = StatsToUse.totalPlaces + placing + 1;
            const newTotalEvents = StatsToUse.totalCompetitiveEvents + 1;
            const newTotalSkillsGain = StatsToUse.totalSkillsGain + skillGain;
            const newTotalBhGain = StatsToUse.totalBhGain + bhGain;
            const newLmsGain = StatsToUse.totalLmsGain + lmsGain;
            const newCluesGain = StatsToUse.totalCluesGain + cluesGain;
            return {
                discordId: StatsToUse.discordId,
                firstPlaceFinishes: newFirstPlaceFinishes,
                secondPlaceFinishes: newSecondPlaceFinishes,
                thirdPlaceFinishes: newThirdPlaceFinishes,
                fourThroughTenFinishes: newTopTenPlaceFinishes,
                totalParticipants: newTotalParticipants,
                totalPlaces: newTotalPlaces,
                totalCompetitiveEvents: newTotalEvents,
                totalRegularEvents: StatsToUse.totalRegularEvents,
                totalSkillsGain: newTotalSkillsGain,
                totalBhGain: newTotalBhGain,
                totalLmsGain: newLmsGain,
                totalCluesGain: newCluesGain,
            };
        }
    );
    const filteredStats: bot.Stats[] = oldData.stats.filter(
        (statsOuter: bot.Stats):
        boolean => updatedStats.every(
            (statsInner: bot.Stats):
            boolean => statsInner.discordId !== statsOuter.discordId
        )
    );
    const newStats: bot.Stats[] = filteredStats.concat(updatedStats);
    const newData: bot.Data = utils.update(oldData, {
        stats: newStats,
    }) as bot.Data;
    return newData;
};

/**
 * @param event The source event to update with new hiscores
 * @param starting If this is the initial data pull
 * @param pullNew If we should ignore the cache and update hiscores
 * @returns A new updated Data object
 * @category Runescape API Observable
 */
const updateParticipantsHiscores$ = (
    event: runescape.Event,
    starting: boolean,
    pullNew: boolean
): Observable<runescape.Participant[]> => {
    const update$: Observable<runescape.Participant>[] = event.participants.map(
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
                            if (starting) {
                                const updated = utils.update(
                                    account,
                                    {
                                        starting: hiscoreArr[idx],
                                        ending: hiscoreArr[idx],
                                    }
                                ) as runescape.CompetitiveAccountInfo;
                                return updated;
                            }
                            if (account.starting === undefined) {
                                const updated = utils.update(
                                    account,
                                    {
                                        starting: hiscoreArr[idx],
                                        ending: hiscoreArr[idx],
                                    }
                                ) as runescape.CompetitiveAccountInfo;
                                return updated;
                            }
                            const updated = utils.update(
                                account,
                                {
                                    ending: hiscoreArr[idx],
                                }
                            ) as runescape.CompetitiveAccountInfo;
                            return updated;
                        }
                    );
                    const newParticipant:
                    runescape.Participant = utils.update(
                        p,
                        { runescapeAccounts: newAccountInfos }
                    ) as runescape.Participant;
                    return newParticipant;
                })
            )
    );
    return forkJoin(update$);
};


/**
 * @param eventToPrint The event to print
 * @param guild The guild to lookup discord ids
 * @param pullNew If we should ignore the cache and update hiscores
 * @returns A string containing the scoreboard
 * @category Helper
 */
const getScoreboardString = (
    eventToPrint: runescape.Event,
    guild: discord.Guild
): string => {
    const tracking: runescape.TrackingEnum = getEventTracking(eventToPrint);
    const sortedParticipants: runescape.Participant[] = eventToPrint.participants.sort(
        (a: runescape.Participant, b: runescape.Participant):
        number => getTotalEventGain(
            b,
            eventToPrint,
            tracking
        ) - getTotalEventGain(
            a,
            eventToPrint,
            tracking
        )
    );

    const maxDisplayLength: number = sortedParticipants.map(
        (participant: runescape.Participant):
        number => discordIdToDisplayName(
            guild,
            participant.discordId
        ).length + getTotalEventGain(
            participant,
            eventToPrint,
            tracking
        ).toString().length
    ).reduce(
        (a: number, b: number):
        number => (a > b ? a : b)
    );

    const padding = 8;
    const totalMaxDisplayLength = maxDisplayLength + padding;

    const strToPrint: string = sortedParticipants.map(
        (participant: runescape.Participant, idx: number): string => {
            const displayName: string = discordIdToDisplayName(
                guild,
                participant.discordId
            );
            const eventGain: number = getTotalEventGain(
                participant,
                eventToPrint,
                tracking
            );

            const totalLength: number = displayName.length + eventGain.toString().length;
            const numSpacesToInsert: number = totalMaxDisplayLength - totalLength;
            const spaces: string = new Array(numSpacesToInsert + 1).join(' ');
            const displayStr = `${displayName}${spaces}${eventGain}`;

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
    return strToPrint;
};

/**
 *
 * @param event The source Event
 * @param guild The guild to update
 * @param starting Whether to update starting hiscore or ending hiscore
 * @category Helper
 */
const forceUpdateStats = (
    event: runescape.Event,
    guild: discord.Guild,
    starting: boolean
): void => {
    if (event.type === EVENT_TYPE.REGULAR) {
        const oldData: bot.Data = bot.load(
            guild.id,
            false
        );
        const newData: bot.Data = updateStats(
            event.participants,
            oldData,
            event,
            false
        );
        bot.save(
            guild.id,
            newData
        );
        return;
    }

    const newParticipant$: Observable<runescape.Participant[]> = updateParticipantsHiscores$(
        event,
        starting,
        true
    );
    newParticipant$.subscribe(
        (participantsArr: runescape.Participant[]): void => {
            if (starting) {
                const oldData: bot.Data = bot.load(
                    guild.id,
                    false
                );
                const newEvent: runescape.Event = utils.update(
                    event,
                    { participants: participantsArr }
                ) as runescape.Event;
                const newData = updateEvent(
                    oldData,
                    newEvent
                );
                bot.save(
                    guild.id,
                    newData
                );
                return;
            }
            // we should do stats here if it's an ending event
            const tracking: runescape.TrackingEnum = getEventTracking(event);
            const sortedParticipants: runescape.Participant[] = participantsArr.sort(
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
            const oldData = bot.load(
                guild.id,
                false
            );
            const newData: bot.Data = updateStats(
                sortedParticipants,
                oldData,
                event,
                true
            );
            bot.save(guild.id, newData);

            const strToPrint = getScoreboardString(
                event,
                guild
            );
            const channelId = newData.settings.notificationChannelId;
            sendChannelMessage(
                guild,
                channelId,
                strToPrint,
                { code: true }
            );

            if (sortedParticipants.length > 0) {
                const attachment = './attachments/congratulations.mp3';
                sendChannelAttachment(
                    guild,
                    channelId,
                    attachment,
                    `<@${sortedParticipants[0].discordId}>`
                );
            }
        }
    );
};

/**
 * @param eventToSetTimers The Event to set timers for
 * @param guild The guild to notify on timer completion
 * @returns The global timer handle for potential cancellation
 * @category Timer
 */
const setTimerStart = (
    eventToSetTimers: runescape.Event,
    guild: discord.Guild
): NodeJS.Timeout => {
    const now: Date = new Date();
    return setTimeout(
        (): void => {
            const data: bot.Data = bot.load(
                guild.id,
                false
            );
            const foundEvent: runescape.Event = data.events.find(
                (event: runescape.Event): boolean => event.id === eventToSetTimers.id
            );
            if (foundEvent === undefined) return;
            notifyParticipantsInEvent(
                foundEvent,
                guild,
                data.settings.notificationChannelId,
                'has started'
            );
            // mark start date as completed
            const newEvent: runescape.Event = utils.update(
                foundEvent, { hasNotifiedStarted: true }
            ) as runescape.Event;
            const newData: bot.Data = updateEvent(
                data,
                newEvent
            );
            bot.save(
                guild.id,
                newData
            );

            if (foundEvent.type === EVENT_TYPE.COMPETITIVE) {
            // pull new hiscores
                forceUpdateStats(
                    newEvent,
                    guild,
                    true
                );
            }
        }, eventToSetTimers.startingDate.getTime() - now.getTime()
    );
};

/**
 * @param eventToSetTimers The Event to set timers for
 * @param guild The guild to notify on timer completion
 * @returns The global timer handle for potential cancellation
 * @category Timer
 */
function setTimerEnd(
    eventToSetTimers: runescape.Event,
    guild: discord.Guild
): NodeJS.Timeout {
    const now: Date = new Date();
    return setTimeout(
        (): void => {
            const data: bot.Data = bot.load(
                guild.id,
                false
            );
            const foundEvent: runescape.Event = data.events.find(
                (event: runescape.Event): boolean => event.id === eventToSetTimers.id
            );
            if (foundEvent === undefined) return;

            notifyParticipantsInEvent(
                foundEvent,
                guild,
                data.settings.notificationChannelId,
                'has ended'
            );
            // mark end date as completed
            const newEvent: runescape.Event = utils.update(
                foundEvent,
                { hasNotifiedEnded: true }
            ) as runescape.Event;
            const newData: bot.Data = updateEvent(
                data,
                newEvent
            );
            bot.save(
                guild.id,
                newData
            );

            forceUpdateStats(
                newEvent,
                guild,
                false
            );
        }, eventToSetTimers.endingDate.getTime() - now.getTime()
    );
}


/**
 * @param data The Data to check
 * @returns A new array of events that have not been marked as notified
 * @category Event
 */
const getUnnotifiedEvents = (
    data: bot.Data
): runescape.Event[] => data.events.filter(
    (event: runescape.Event): boolean => !event.hasNotifiedTwoHourWarning
    || !event.hasNotifiedStarted
    || !event.hasNotifiedEnded
);

/**
 * @param regexes The array of input Regexes
 * @param search The input string to search for
 * @returns The array of matched strings entries or null entries
 * @category Helper
 */
const findFirstRegexesMatch = (regexes: RegExp[], search: string): string[] => {
    const foundRegexes: string[][] = regexes.map(
        (regex: RegExp): string[] => regex.exec(search)
    );
    const parsed: string[] = foundRegexes.map(
        (results: string[]): string => (results !== null ? results[1].trim() : null)
    );
    const nonEmpty: string[] = parsed.map(
        (str: string): string => (str !== null && str.length > 0 ? str : null)
    );
    return nonEmpty;
};

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
const timers: Record<string, NodeJS.Timeout[]> = {};

/**
 * Regex terminator for command [[bot.COMMANDS.SIGNUP_UPCOMING]]
 * @ignore
 */
const signupTermRegex = 'rsn|$';

/**
 * Regex terminators for command [[bot.COMMANDS.ADD_UPCOMING]]
 * @ignore
 */
const eventTermRegex = 'type|skills|starting|ending|name|bh|clues|$';

/**
 * Compound regex creator
 * @param term The string insert into RegExp string
 * @returns The compound RegExp string
 * @category Helper
 */
const commandRegex = (
    term: string
): string => `(?:\\s|)+(.*?)(?:\\s|)+(?:${term})`;

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
                    };
                    return input;
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
            utils.logger.debug(`message: ${command.message.content}`);
            utils.logger.debug(`author: ${command.author.username}`);
            utils.logger.debug(`guild: ${command.guild.name}`);
            utils.logger.debug(`input: ${command.input}`);
        }),
        filter((command: Input): boolean => botCommand.accessControl.controlFunction(
            command.author.id, bot.load(
                command.guild.id,
                false
            )
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
                const oldData: bot.Data = bot.load(
                    command.guild.id,
                    false
                );

                // let's only allow 10 upcoming events per Guild
                const upcomingEvents: runescape.Event[] = getUpcomingEvents(oldData.events);
                if (upcomingEvents.length >= 10) {
                    utils.logger.debug(`Guild ${command.guild.name} added too many events`);
                    command.message.reply('this guild has too many events scheduled');
                    return null;
                }

                const compoundRegex: string = commandRegex(eventTermRegex);
                const regexes: RegExp[] = [
                    new RegExp(`name${compoundRegex}`, 'gim'),
                    new RegExp(`starting${compoundRegex}`, 'gim'),
                    new RegExp(`ending${compoundRegex}`, 'gim'),
                    new RegExp(`type${compoundRegex}`, 'gim'),
                ];
                const parsedRegexes = findFirstRegexesMatch(
                    regexes,
                    command.input
                );
                // require all inputs to be valid
                if (parsedRegexes[0] === null) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid event name`);
                    command.message.reply(`invalid event name\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }

                if (parsedRegexes[1] === null) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid starting date`);
                    command.message.reply(`invalid starting date\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }

                if (parsedRegexes[2] === null) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid ending date`);
                    command.message.reply(`invalid ending date\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }

                if (parsedRegexes[3] === null) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid type`);
                    command.message.reply(`invalid type\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }

                const dateA: Date = new Date(parsedRegexes[1]);
                const dateB: Date = new Date(parsedRegexes[2]);
                const startingDate: Date = dateA <= dateB ? dateA : dateB;
                const endingDate: Date = dateA > dateB ? dateA : dateB;

                const inputType: string = parsedRegexes[3].toUpperCase();
                if (EVENT_TYPE[inputType] === undefined) {
                    utils.logger.debug(`Admin ${command.author.username} entered invalid event type`);
                    command.message.reply(`invalid event type\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                    return null;
                }
                const tracking: runescape.Tracking = {
                    skills: null,
                    bh: null,
                    clues: null,
                    lms: null,
                };
                const type = EVENT_TYPE[inputType];
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
                return [command, clanEvent];
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
 * [[EVENT_TYPE.REGULAR]] events
 * @category Command Observable
 * @ignore
 */
const filterUpcomingGenericEvent$:
Observable<[Input, runescape.Event]> = addUpcoming$
    .pipe(
        filter((commandEventArr: [Input, runescape.Event]): boolean => {
            const clanEvent: runescape.Event = commandEventArr[1];
            return clanEvent.type === EVENT_TYPE.REGULAR;
        }),
    );

/**
 * An Observable that handles the [[bot.COMMANDS.ADD_UPCOMING]] command for
 * [[EVENT_TYPE.COMPETITIVE]] events
 * @category Command Observable
 * @ignore
 */
const filterAndPrepareUpcomingCompetitiveEvent$:
Observable<[Input, runescape.Event]> = addUpcoming$
    .pipe(
        filter((commandEventArr: [Input, runescape.Event]): boolean => {
            const clanEvent: runescape.Event = commandEventArr[1];
            return clanEvent.type === EVENT_TYPE.COMPETITIVE;
        }),
        map((commandEventArr: [Input, runescape.Event]): [Input, runescape.Event] => {
            const inputCommand: Input = commandEventArr[0];
            const clanEvent: runescape.Event = commandEventArr[1];
            const compoundRegex: string = commandRegex(eventTermRegex);
            const competitiveRegex = [
                new RegExp(`skills${compoundRegex}`, 'gim'),
                new RegExp(`bh${compoundRegex}`, 'gim'),
                new RegExp(`clues${compoundRegex}`, 'gim'),
            ];
            const parsedRegex = findFirstRegexesMatch(
                competitiveRegex,
                inputCommand.input
            );
            if (parsedRegex[0] === null
                && parsedRegex[1] === null
                && parsedRegex[2] === null
            ) {
                utils.logger.debug(`Admin ${inputCommand.author.id} did not specify what to track`);
                inputCommand.message.reply(`no skills specified\n${bot.COMMANDS.ADD_UPCOMING.parameters}`);
                return null;
            }

            const processedRegex: string[][] = parsedRegex.map(
                (regexToProcess: string): string[] => {
                    if (regexToProcess === null) return null;
                    const split = regexToProcess.split(' ');
                    const trimmed = split.map(
                        (strToTrim: string): string => strToTrim.trim()
                    );
                    const filtered = trimmed.filter(
                        (strToCheck: string): boolean => strToCheck.length > 0
                    );
                    return filtered;
                }
            );
            const setRegex: string[][] = processedRegex.map(
                (regex: string[]): string[] => Array.from(
                    new Set(regex)
                )
            );
            const allKeys: string[][] = [
                Object.keys(runescape.SkillsEnum),
                Object.keys(runescape.BountyHunterEnum),
                Object.keys(runescape.CluesEnum),
            ];

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
            ];
            // Skills
            if (processedRegex[0] !== null) {
                const skillsArr:
                runescape.SkillsEnum[] = processedRegex[0] as runescape.SkillsEnum[];
                const filteredSkills: runescape.SkillsEnum[] = skillsArr.filter(
                    (skill: runescape.SkillsEnum): boolean => allValues[0].includes(skill)
                );
                if (skillsArr.length !== filteredSkills.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid skill names`);
                    inputCommand.message.reply(`some skill names entered are invalid\nchoices are: ${allValues[0].toString()}`);
                    return null;
                }
                const newTracking: runescape.Tracking = utils.update(
                    clanEvent.tracking,
                    { skills: setRegex[0] }
                ) as runescape.Tracking;
                const xpEvent: runescape.Event = utils.update(
                    clanEvent,
                    { tracking: newTracking }
                ) as runescape.Event;
                return [inputCommand, xpEvent];
            }
            // Bounty hunter
            if (processedRegex[1] !== null) {
                const bhArr:
                runescape.BountyHunterEnum[] = processedRegex[1] as runescape.BountyHunterEnum[];
                const filteredBh: runescape.BountyHunterEnum[] = bhArr.filter(
                    (bh: runescape.BountyHunterEnum): boolean => allValues[1].includes(bh)
                );
                if (bhArr.length !== filteredBh.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid bounty hunter names`);
                    inputCommand.message.reply(`some bounty hunter settings entered are invalid\nchoices are: ${allValues[1].toString()}`);
                    return null;
                }
                const newTracking: runescape.Tracking = utils.update(
                    clanEvent.tracking,
                    { bh: setRegex[1] }
                ) as runescape.Tracking;
                const bhEvent: runescape.Event = utils.update(
                    clanEvent,
                    { tracking: newTracking }
                ) as runescape.Event;
                return [inputCommand, bhEvent];
            }
            // Clues
            if (processedRegex[2] !== null) {
                const clueArr:
                runescape.CluesEnum[] = processedRegex[2] as runescape.CluesEnum[];
                const filteredClues: runescape.CluesEnum[] = clueArr.filter(
                    (clue: runescape.CluesEnum): boolean => allValues[2].includes(clue)
                );
                if (clueArr.length !== filteredClues.length) {
                    utils.logger.debug(`Admin ${inputCommand.author.id} entered some invalid clue names`);
                    inputCommand.message.reply(`some clue settings entered are invalid\nchoices are: ${allValues[2].toString()}`);
                    return null;
                }
                const clues: string[] = setRegex[2].includes(
                    runescape.CluesEnum.ALL
                )
                || (
                    setRegex[2].includes(runescape.CluesEnum.BEGINNER)
                    && setRegex[2].includes(runescape.CluesEnum.EASY)
                    && setRegex[2].includes(runescape.CluesEnum.MEDIUM)
                    && setRegex[2].includes(runescape.CluesEnum.HARD)
                    && setRegex[2].includes(runescape.CluesEnum.ELITE)
                    && setRegex[2].includes(runescape.CluesEnum.MASTER)
                )
                    ? [runescape.CluesEnum.ALL] : setRegex[2];
                const newTracking: runescape.Tracking = utils.update(clanEvent.tracking, {
                    clues,
                }) as runescape.Tracking;
                const clueEvent: runescape.Event = utils.update(
                    clanEvent,
                    { tracking: newTracking }
                ) as runescape.Event;
                return [inputCommand, clueEvent];
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
            const compoundRegex: string = commandRegex(signupTermRegex);
            const skillsRegex = [
                new RegExp(`${compoundRegex}`, 'gim'),
                new RegExp(`rsn${compoundRegex}`, 'gim'),
            ];
            const parsedRegex = findFirstRegexesMatch(skillsRegex, command.input);
            if (parsedRegex[0] === null) {
                utils.logger.debug(`${command.author.id} entered invalid index`);
                command.message.reply(`invalid index\n${bot.COMMANDS.SIGNUP_UPCOMING.parameters}`);
                return of(null);
            }
            if (parsedRegex[1] === null) {
                utils.logger.debug(`${command.author.id} entered invalid rsn`);
                command.message.reply(`invalid rsn. Did you forget to add 'rsn'?\n${bot.COMMANDS.SIGNUP_UPCOMING.parameters}`);
                return of(null);
            }

            // get upcoming events
            // if index is out of range return
            const oldData: bot.Data = bot.load(command.guild.id, false);
            const upcomingAndInFlightEvents: runescape.Event[] = getUpcomingAndInFlightEvents(
                oldData.events
            );
            const idxToModify: number = Number.parseInt(
                parsedRegex[0],
                10
            );
            if (Number.isNaN(idxToModify) || idxToModify >= upcomingAndInFlightEvents.length) {
                utils.logger.debug(`User did not specify index (${idxToModify})`);
                command.message.reply(`invalid index ${idxToModify}\n${bot.COMMANDS.SIGNUP_UPCOMING.parameters}`);
                return of<[bot.Data, discord.Message, hiscores.LookupResponse]>(null);
            }

            const discordIdToAdd: string = command.author.id;
            const rsnToAdd: string = parsedRegex[1];

            // get event to modify and its type
            const eventToModify: runescape.Event = upcomingAndInFlightEvents[idxToModify];

            const newRsAccount: runescape.AccountInfo = {
                rsn: rsnToAdd,
            };

            const participantToAdd: runescape.Participant = {
                discordId: discordIdToAdd,
                runescapeAccounts: [newRsAccount],
            };

            const newData: bot.Data = signupParticipant(
                oldData,
                eventToModify,
                participantToAdd,
            );

            if (newData === oldData) {
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
 * An Observable that handles the [[bot.COMMANDS.UPDATELEADERBOARD]] command
 * @category Command Observable
 */
const updateLeaderboard$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.UPDATELEADERBOARD
);

/**
 * An Observable that handles the [[bot.COMMANDS.SHOWLEADERBOARD]] command
 * @category Command Observable
 */
const showLeaderboard$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.SHOWLEADERBOARD
);

/**
 * An Observable that handles the [[bot.COMMANDS.SHOWSTATS]] command
 * @category Command Observable
 */
const showStat$: Observable<Input> = filteredMessage$(
    bot.COMMANDS.SHOWSTATS
);

//------------------------
// Subscriptions & helpers
//
//------------------------

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

            const guildData: bot.Data = bot.load(
                guild.id,
                true
            );
            utils.logger.debug(`Loaded json for guild ${guild.id}`);
            utils.logger.silly(`${JSON.stringify(guildData)}`);

            // startup tasks
            // handle generic events here

            const unnotifiedEvents = getUnnotifiedEvents(guildData);
            unnotifiedEvents.forEach(
                (clanEvent: runescape.Event): void => {
                    const now: Date = new Date();
                    const twoHoursBeforeStart: Date = new Date(
                        clanEvent.startingDate.getTime()
                    );
                    twoHoursBeforeStart.setHours(
                        twoHoursBeforeStart.getHours() - 2
                    );

                    const toleranceAfterStart: Date = new Date(
                        clanEvent.startingDate.getTime()
                    );
                    toleranceAfterStart.setMinutes(
                        toleranceAfterStart.getMinutes() + 30
                    );

                    const toleranceAfterEnd: Date = new Date(
                        clanEvent.endingDate.getTime()
                    );
                    toleranceAfterEnd.setMinutes(
                        toleranceAfterEnd.getMinutes() + 30
                    );

                    const toleranceAfterEndTolerance: Date = new Date(
                        clanEvent.endingDate.getTime()
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
                        // TODO: change me
                        timers[clanEvent.id] = [
                            setTimerTwoHoursBefore(
                                clanEvent,
                                guild
                            ),
                            setTimerStart(
                                clanEvent,
                                guild
                            ),
                            setTimerEnd(
                                clanEvent,
                                guild
                            ),
                        ];
                    } else if (now >= twoHoursBeforeStart
                        && now < clanEvent.startingDate) {
                        utils.logger.debug('after 2 hour warning');
                        if (!clanEvent.hasNotifiedTwoHourWarning) {
                            utils.logger.debug('notification had not fired');
                            notifyParticipantsInEvent(
                                clanEvent,
                                guild,
                                guildData.settings.notificationChannelId,
                                'will begin within 2 hours'
                            );
                            // mark 2 hour warning as completed
                            const newEvent: runescape.Event = utils.update(
                                clanEvent,
                                { hasNotifiedTwoHourWarning: true }
                            ) as runescape.Event;
                            const newData: bot.Data = updateEvent(
                                guildData,
                                newEvent
                            );
                            bot.save(
                                guild.id,
                                newData
                            );
                        }
                        // schedule start date notification
                        // schedule end date notification
                        // TODO: change me
                        timers[clanEvent.id] = [
                            setTimerStart(
                                clanEvent,
                                guild
                            ),
                            setTimerEnd(
                                clanEvent,
                                guild
                            ),
                        ];
                    } else if (now >= clanEvent.startingDate
                        && now < toleranceAfterStart) {
                        utils.logger.debug('after event started');
                        if (!clanEvent.hasNotifiedStarted) {
                            utils.logger.debug('notification had not fired');
                            // fire start notification
                            // mark 2 hour warning as completed
                            // mark start notification as complete
                            notifyParticipantsInEvent(
                                clanEvent,
                                guild,
                                guildData.settings.notificationChannelId,
                                'has begun'
                            );
                            const newEvent: runescape.Event = utils.update(
                                clanEvent,
                                {
                                    hasNotifiedTwoHourWarning: true,
                                    hasNotifiedStarted: true,
                                }
                            ) as runescape.Event;
                            const newData: bot.Data = updateEvent(
                                guildData,
                                newEvent
                            );
                            bot.save(
                                guild.id,
                                newData
                            );
                        }
                        // TODO: change me
                        timers[clanEvent.id] = [
                            setTimerEnd(
                                clanEvent,
                                guild
                            ),
                        ];
                    } else if (now >= toleranceAfterStart
                        && now < clanEvent.endingDate) {
                        utils.logger.debug('after 30 min start tolerance');
                        if (!clanEvent.hasNotifiedStarted) {
                            utils.logger.error('notification had not fired');
                            // fire start notification
                            // mark 2 hour warning as completed
                            // mark start notification as complete
                            // TODO: apologize lol
                            notifyParticipantsInEvent(
                                clanEvent,
                                guild,
                                guildData.settings.notificationChannelId,
                                'started more than 30 mins ago, yell at n0trout'
                            );
                            const newEvent: runescape.Event = utils.update(
                                clanEvent,
                                {
                                    hasNotifiedTwoHourWarning: true,
                                    hasNotifiedStarted: true,
                                }
                            ) as runescape.Event;
                            const newData: bot.Data = updateEvent(
                                guildData,
                                newEvent
                            );
                            bot.save(
                                guild.id,
                                newData
                            );
                        }
                        // schedule end date notification
                        // TODO: change me
                        timers[clanEvent.id] = [
                            setTimerEnd(
                                clanEvent,
                                guild
                            ),
                        ];
                    } else if (now >= clanEvent.endingDate
                        && now < toleranceAfterEnd) {
                        utils.logger.debug('after ended');
                        if (!clanEvent.hasNotifiedEnded) {
                            utils.logger.error('notification had not fired');
                            // fire end notification
                            // mark 2 hour warning as complete (unnecessary)
                            // mark start notification as complete (unnecessary)
                            // mark end notification as complete
                            notifyParticipantsInEvent(
                                clanEvent,
                                guild,
                                guildData.settings.notificationChannelId,
                                'has ended'
                            );
                            const newEvent: runescape.Event = utils.update(
                                clanEvent,
                                {
                                    hasNotifiedTwoHourWarning: true,
                                    hasNotifiedStarted: true,
                                    hasNotifiedEnded: true,
                                }
                            ) as runescape.Event;
                            const newData: bot.Data = updateEvent(
                                guildData,
                                newEvent
                            );
                            bot.save(
                                guild.id,
                                newData
                            );
                        }
                    } else if (now >= toleranceAfterEnd && now < toleranceAfterEndTolerance) {
                        utils.logger.debug('after 2 hour end tolerance');
                        if (!clanEvent.hasNotifiedEnded) {
                            utils.logger.error('notification had not fired');
                            // fire end notification
                            // apologize
                            // mark 2 hour warning as complete (unnecessary)
                            // mark start notification as complete (unnecessary)
                            // mark end notification as complete
                            notifyParticipantsInEvent(
                                clanEvent,
                                guild,
                                guildData.settings.notificationChannelId,
                                'had ended more than 2 hours ago, yell at n0trout'
                            );
                            const newEvent: runescape.Event = utils.update(
                                clanEvent,
                                {
                                    hasNotifiedTwoHourWarning: true,
                                    hasNotifiedStarted: true,
                                    hasNotifiedEnded: true,
                                }
                            ) as runescape.Event;
                            const newData: bot.Data = updateEvent(
                                guildData,
                                newEvent
                            );
                            bot.save(
                                guild.id,
                                newData
                            );
                        }
                    } else {
                        // too late to do anything
                        // just mark it as fired
                        const newEvent: runescape.Event = utils.update(
                            clanEvent,
                            {
                                hasNotifiedTwoHourWarning: true,
                                hasNotifiedStarted: true,
                                hasNotifiedEnded: true,
                            }
                        ) as runescape.Event;
                        const newData: bot.Data = updateEvent(
                            guildData,
                            newEvent
                        );
                        bot.save(
                            guild.id,
                            newData
                        );
                    }
                }
            );

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
        const data: bot.Data = bot.load(
            command.guild.id,
            false
        );
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
        const oldData: bot.Data = bot.load(
            command.guild.id,
            false
        );
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
        ) as bot.Settings;
        const newData: bot.Data = updateSettings(
            oldData,
            newSettings
        );
        bot.save(
            command.guild.id,
            newData
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

        const oldData: bot.Data = bot.load(
            command.guild.id,
            false
        );
        const events: runescape.Event[] = oldData.events.concat(event);
        const upcoming: runescape.Event[] = getUpcomingAndInFlightEvents(events);
        const idx: number = upcoming.indexOf(event);

        const guild: discord.Guild = command.guild;
        const newData: bot.Data = utils.update(
            oldData,
            { events }
        ) as bot.Data;
        bot.save(guild.id, newData);

        timers[event.id] = [
            setTimerTwoHoursBefore(event, guild),
            setTimerStart(event, guild),
            setTimerEnd(event, guild),
        ];

        utils.logger.debug('event added');
        command.message.reply(`event '${event.name}' added`);

        sendChannelMessage(
            guild,
            newData.settings.notificationChannelId,
            `@everyone clan event '${event.name}' has just been scheduled for ${event.startingDate.toString()}\nto sign-up type: '${bot.COMMANDS.SIGNUP_UPCOMING.command}${idx} rsn (your RuneScape name)'`,
            null,
        );
    }
);

listUpcomingEvent$.subscribe(
    (command: Input): void => {
        const oldData: bot.Data = bot.load(
            command.guild.id,
            false
        );
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
                if (event.tracking.skills !== null) {
                    return retStr.concat(` skills: ${event.tracking.skills.toString()}`);
                }
                if (event.tracking.bh !== null) {
                    return retStr.concat(` bh: ${event.tracking.bh.toString()}`);
                }
                if (event.tracking.clues !== null) {
                    return retStr.concat(` clues: ${event.tracking.clues.toString()}`);
                }
                return retStr;
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
        const oldData: bot.Data = bot.load(
            command.guild.id,
            false
        );
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
        const newData: bot.Data = deleteEvent(
            oldData,
            eventToDelete
        );
        bot.save(
            command.guild.id,
            newData
        );

        // cancel timers
        timers[eventToDelete.id].forEach(
            (timerHnd: NodeJS.Timeout): void => {
                clearTimeout(timerHnd);
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
        const oldData: bot.Data = bot.load(
            command.guild.id,
            false
        );
        const upcomingAndInFlightEvents:
        runescape.Event[] = getUpcomingAndInFlightEvents(oldData.events);
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
        const newData: bot.Data = unsignupParticipant(
            oldData,
            eventToModify,
            participantToRemove,
        );
        bot.save(
            command.guild.id,
            newData
        );

        utils.logger.debug('Unsignup called');
        command.message.reply('removed from event');
    }
);

amISignedUp$.subscribe(
    (command: Input): void => {
        const oldData: bot.Data = bot.load(
            command.guild.id,
            false
        );
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
        const oldData: bot.Data = bot.load(
            command.guild.id,
            false
        );
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
                    command.guild,
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
        const oldData: bot.Data = bot.load(
            command.guild.id,
            false
        );
        const channel: discord.Channel = command.message.mentions.channels.first();
        const newSettings: bot.Settings = utils.update(
            oldData.settings,
            {
                notificationChannelId: channel.id,
            }
        ) as bot.Settings;
        const newData: bot.Data = updateSettings(
            oldData,
            newSettings
        );
        bot.save(
            command.guild.id,
            newData
        );
        utils.logger.debug('Set channel called');
        command.message.reply(`notification channel set to ${channel}`);
    }
);

help$.subscribe(
    (command: Input): void => {
        const keys: string[] = Object.keys(bot.COMMANDS).filter(
            (key: string): boolean => {
                const data: bot.Data = bot.load(
                    command.guild.id,
                    false
                );
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
            { code: true }
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

updateLeaderboard$.subscribe(
    (command: Input): void => {
        const data: bot.Data = bot.load(command.guild.id, false);
        const upcomingAndInFlightEvents:
        runescape.Event[] = getUpcomingAndInFlightEvents(data.events);
        const idxToUpdate: number = Number.parseInt(
            command.input,
            10
        );
        if (Number.isNaN(idxToUpdate) || idxToUpdate >= upcomingAndInFlightEvents.length) {
            utils.logger.debug(`User did not specify index (${idxToUpdate})`);
            command.message.reply(`invalid index ${idxToUpdate}\n${bot.COMMANDS.UPDATELEADERBOARD.parameters}`);
            return;
        }

        const eventToUpdate: runescape.Event = upcomingAndInFlightEvents[idxToUpdate];
        if (!eventToUpdate.hasNotifiedStarted) {
            utils.logger.debug('User tried to update event that hasn\'t started yet');
            command.message.reply('cannot update an event that hasn\'t started yet');
            return;
        }

        const participant$ = updateParticipantsHiscores$(
            eventToUpdate,
            false,
            false
        );
        participant$.subscribe(
            (participantsArr: runescape.Participant[]): void => {
                const oldData: bot.Data = bot.load(
                    command.guild.id,
                    false
                );
                const newEvent: runescape.Event = utils.update(
                    eventToUpdate,
                    { participants: participantsArr }
                ) as runescape.Event;
                const newData = updateEvent(
                    oldData,
                    newEvent
                );
                bot.save(
                    command.guild.id,
                    newData
                );

                const message: discord.Message = mockMessage(
                    bot.COMMANDS.SHOWLEADERBOARD,
                    command.input,
                    command.message,
                    command.message.author
                );
                injectedMessages$.next(message);
            }
        );
    }
);

showLeaderboard$.subscribe(
    (command: Input): void => {
        const data: bot.Data = bot.load(
            command.guild.id,
            false
        );
        const upcomingAndInFlightEvents:
        runescape.Event[] = getUpcomingAndInFlightEvents(data.events);
        const idxToPrint: number = Number.parseInt(
            command.input,
            10
        );
        if (Number.isNaN(idxToPrint)
        || idxToPrint >= upcomingAndInFlightEvents.length) {
            utils.logger.debug(`User did not specify index (${idxToPrint})`);
            command.message.reply(`invalid index ${idxToPrint}\n${bot.COMMANDS.AMISIGNEDUP_UPCOMING.parameters}`);
            return;
        }

        const eventToPrint: runescape.Event = upcomingAndInFlightEvents[idxToPrint];
        if (!eventToPrint.hasNotifiedStarted) {
            utils.logger.debug('User tried to print event that hasn\'t started yet');
            command.message.reply('cannot print an event that hasn\'t started yet');
            return;
        }

        const strToPrint: string = getScoreboardString(
            eventToPrint,
            command.guild
        );
        command.message.reply(`\n${strToPrint}`, { code: true });
    }
);

showStat$.subscribe(
    (command: Input): void => {
        const data: bot.Data = bot.load(
            command.guild.id,
            false
        );
        const user: discord.User = command.message.mentions.members.array().length > 0
            ? command.message.mentions.users.array()[0]
            : command.author;
        const foundStats: bot.Stats = data.stats.find(
            (stats: bot.Stats): boolean => stats.discordId === user.id
        );
        const displayName: string = discordIdToDisplayName(
            command.guild,
            user.id
        );
        if (foundStats === undefined) {
            command.message.reply(`${displayName} has not completed any events yet`);
            return;
        }
        const stats: string = getStatsStr(
            displayName,
            foundStats
        );
        command.message.reply(stats);
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
