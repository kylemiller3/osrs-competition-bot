import * as discord from 'discord.js';
import { Command, } from '../command';
import { spoofMessage, } from '../main';
import { Event } from '../event';
import { hiscores } from 'osrs-json-api';

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
    const keys: string[] = event.tracker.what as string[];
    switch (tracking) {
        case Event.Tracking.SKILLS: {
            if (Event.getEventTracking(event) !== Event.Tracking.SKILLS) return 0;
            const xps: number[] = participant.runescapeAccounts.map(
                (account: Event.CompetitiveAccount): number => {
                    if (account.starting === undefined || account.ending === undefined) return NaN;
                    const skillsComponents:
                    hiscores.SkillComponent[][] = keys.map(
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

        case Event.Tracking.BH: {
            if (Event.getEventTracking(event) !== Event.Tracking.BH) return 0;
            const gains: number[] = participant.runescapeAccounts.map(
                (account: Event.CompetitiveAccount): number => {
                    if (account.starting === undefined
                            || account.ending === undefined) return NaN;
                    const rankAndScoreComponents:
                    hiscores.RankAndScoreComponent[][] = keys.map(
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

        case Event.Tracking.CLUES: {
            if (Event.getEventTracking(event) !== Event.Tracking.CLUES) return 0;
            const gains: number[] = participant.runescapeAccounts.map(
                (account: Event.CompetitiveAccount): number => {
                    if (account.starting === undefined
                        || account.ending === undefined) return NaN;
                    const rankAndScoreComponents:
                    hiscores.RankAndScoreComponent[][] = keys.map(
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

        case Event.Tracking.LMS: {
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
 * @param data The Data input to process
 * @param discordId The Discord id to display stats for
 * @returns A string describing a players statistics
 * @category Stats
 */
/*
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
        TenPlusFinishes: number
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
};
*/

const usersStats = (
    msg: discord.Message
): void => {
    if (msg.mentions.members.array().length > 0) {
        spoofMessage(
            Command.ALL.USERS_STATS,
            msg,
            msg.mentions.users.array()[0],
        );
        return;
    }
};

export default usersStats;
