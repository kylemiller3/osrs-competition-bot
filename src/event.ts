import {
    hiscores,
} from 'osrs-json-api';
import { getTagFromDiscordId, gClient, getDisplayNameFromDiscordId, } from './main';
import { Utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Event {

    /**
     * All possible RuneScape Bosses to track
     * @category Tracking
     */
    export type Bosses = 'Abyssal Sire'
    | 'Alchemical Hydra'
    | 'Barrows Chests'
    | 'Bryophyta'
    | 'Callisto'
    | 'Cerberus'
    | 'Chambers of Xeric'
    | 'Chambers of Xeric: Challenge Mode'
    | 'Chaos Elemental'
    | 'Chaos Fanatic'
    | 'Commander Zilyana'
    | 'Corporeal Beast'
    | 'Crazy Archaeologist'
    | 'Dagannoth Prime'
    | 'Dagannoth Rex'
    | 'Dagannoth Supreme'
    | 'Deranged Archaeologist'
    | 'General Graardor'
    | 'Giant Mole'
    | 'Grotesque Guardians'
    | 'Hespori'
    | 'Kalphite Queen'
    | 'King Black Dragon'
    | 'Kraken'
    | 'Kree\'Arra'
    | 'K\'ril Tsutsaroth'
    | 'Mimic'
    | 'Obor'
    | 'Sarachnis'
    | 'Scorpia'
    | 'Skotizo'
    | 'The Gauntlet'
    | 'The Corrupted Gauntlet'
    | 'Theatre of Blood'
    | 'Thermonuclear Smoke Devil'
    | 'TzKal-Zuk'
    | 'TzTok-Jad'
    | 'Venenatis'
    | 'Vet\'ion'
    | 'Vorkath'
    | 'Wintertodt'
    | 'Zalcano'
    | 'Zulrah'

    /**
     * All possible RuneScape Skills to track
     * @category Tracking
     */
    export type Skills = 'attack'
    | 'strength'
    | 'defense'
    | 'ranged'
    | 'prayer'
    | 'magic'
    | 'runecraft'
    | 'construction'
    | 'hitpoints'
    | 'agility'
    | 'herblore'
    | 'thieving'
    | 'crafting'
    | 'fletching'
    | 'slayer'
    | 'hunter'
    | 'mining'
    | 'smithing'
    | 'fishing'
    | 'cooking'
    | 'firemaking'
    | 'woodcutting'
    | 'farming'

    /**
     * All possible Bounty Hunter stats to track
     * @category Tracking
     */
    export type BountyHunter = 'rogue'
    | 'hunter'

    /**
     * All possible Clue stats to track
     * @category Tracking
     */
    export type Clues = 'all'
    | 'beginner'
    | 'easy'
    | 'medium'
    | 'hard'
    | 'elite'
    | 'master'

    /**
     * Contract for an [[Event]]'s participant
     * @category Event
     */
    export interface Participant {
        discordId: string
        customScore: number
        runescapeAccounts: Account[]
    }

    /**
     * Extended contract of a [[Participant]]'s [[Account]]
     * for a competitive [[Event]]
     * @category Event
     */
    export interface Account {
        rsn: string
        starting?: hiscores.Player
        ending?: hiscores.Player
    }

    /**
     * Enum of all possible [[Tracking]] options
     * @category Tracking
     */
    export type TrackingCategory = 'casual'
    | 'skills'
    | 'bh'
    | 'lms'
    | 'clues'
    | 'custom'
    | 'bosses'

    /**
     * Contract for information on a Team
     * for a non-casual [[Event]]
     * @category Event
     */
    export interface Team {
        name: string
        participants: Participant[]
    }

    /**
     * Contract for when the event takes place
     * @category Event
     */
    export interface When {
        start: Date
        end: Date
    }

    /**
     * Contract for what the event tracks
     * @category Event
     */
    export interface Tracking {
        category: TrackingCategory
        what: BountyHunter[] | Clues[] | Skills[] | Bosses[] | undefined
    }

    /**
     * Contract to track event messages
     * @category Event
     */
    export interface ChannelMessage {
        channelId: string
        messagesId: string[]
    }

    /**
     * Contract of the information necessary to track a guild
     * @category Event
     */
    export interface Guild {
        discordId: string
        scoreboardMessage?: ChannelMessage
    }

    export interface CompetingGuilds {
        creator: Guild
        others?: Guild[]
    }

    /**
     * Contract for a RuneScape Event
     * @category Event
     */
    export interface Object {
        id?: number
        name: string
        when: When
        guilds: CompetingGuilds
        teams: Team[]
        tracking: Tracking
        global: boolean
    }

    /**
     * Gets the [[Tracking]] enum for the given [[Event]]
     * @param event The event to check what we tracked
     * @returns The tracking enum that represents what we tracked
     * @category Helper
     */
    export const getEventTracking = (
        event: Event.Object
    ): TrackingCategory => {
        if (event.tracking === undefined) return 'casual';
        return event.tracking.category;
    };

    /**
     * Checks an event to see if it is long running
     * @param event The event to check
     */
    export const isLongRunningEvent = (
        event: Event.Object,
    ): boolean => event.when.end === undefined;

    /**
     * Checks an event to see if [[Event.Team]] is defined
     * @param event The event to check
     * @returns True if the event is a team event
     * @category Event Property
     */
    export const isTeamEvent = (
        event: Event.Object,
    ): boolean => event.teams !== undefined;

    /**
     * Checks an [[Event]] to see if it is casual
     * @param event The event to check
     * @returns True if the event is a causal event
     * @category Event Property
     */
    export const isEventCasual = (
        event: Event.Object,
    ): boolean => getEventTracking(event) === 'casual';

    /**
     * Checks an event to see if it is a [[EventType.CUSTOM]] type
     * @param event The event to check
     * @returns True if the event is a custom event
     * @category Event Property
     */
    export const isEventCustom = (
        event: Event.Object
    ): boolean => getEventTracking(event) === 'custom';


    // Process event scoreboards here

    export interface WhatScoreboard {
        lhs: string
        whatScore: number
    }

    export interface AccountScoreboard {
        lhs: string
        accountScore: number
        whatsScores: WhatScoreboard[] | undefined
    }

    export interface ParticipantScoreboard {
        lhs: string
        customScore: number
        participantScore: number
        accountsScores: AccountScoreboard[]
    }

    export interface TeamScoreboard {
        lhs: string
        teamScore: number
        participantsScores: ParticipantScoreboard[]
    }

    export const getEventScoreboardString = async (
        event: Event.Object,
        error: Error | undefined = undefined,
        guildId: string,
        currentScoreboard: TeamScoreboard[],
        lastScoreboard: TeamScoreboard[],
        eventType: TrackingCategory,
        granularity: 'teams' | 'participants' | 'accounts' | 'what',
        inversion: boolean = false,
        mode: 'regular' | 'shortened', // boss mode is likely too long make a special case
        numEntries: number = 3,
    ): Promise<string> => {
        // format the string here
        const tabLength = 2;
        const lhsPaddingLength = 6;
        const diffPadding = 2;

        const lhsPad: string = new Array(lhsPaddingLength + 1).join(' ');
        const tab: string = new Array(tabLength + 1).join(' ');

        const promises: Promise<string>[] = currentScoreboard.flatMap(
            (team: TeamScoreboard):
            Promise<string>[] => team.participantsScores.flatMap(
                (participant: ParticipantScoreboard):
                Promise<string> => {
                    const displayName: string | null = getDisplayNameFromDiscordId(
                        gClient,
                        guildId,
                        participant.lhs,
                    );
                    if (displayName === null) {
                        return getTagFromDiscordId(
                            gClient,
                            participant.lhs,
                        );
                    }
                    return Promise.resolve(displayName);
                }
            )
        );
        const tags: string[] = await Promise.all(promises);

        let idx = 0;
        const str: string = currentScoreboard.map(
            (team: TeamScoreboard, idi: number): string => {
                const participantsStr = team.participantsScores.map(
                    (participant: ParticipantScoreboard): string => {
                        const accountsStr = participant.accountsScores.map(
                            (account: AccountScoreboard): string => {
                                if (account.whatsScores !== undefined) {
                                    const whatStr = account.whatsScores.map(
                                        (what: WhatScoreboard): string => `${what.lhs}${tab}${what.whatScore.toLocaleString('en-us')}`
                                    ).join(`\n${tab}${tab}${tab}`);
                                    if (account.accountScore !== 0) {
                                        return `${account.lhs}${tab}${account.accountScore.toLocaleString('en-us')}\n${tab}${tab}${tab}${whatStr}`;
                                    }
                                    return `${account.lhs}\n${tab}${tab}${tab}${whatStr}`;
                                }
                                return account.lhs;
                            }
                        ).join(`\n${tab}${tab}`);
                        let ret: string;
                        if (participant.participantScore !== 0) {
                            ret = `${tags[idx]}${tab}${participant.participantScore.toLocaleString('en-us')}\n${tab}${tab}${accountsStr}`;
                        } else {
                            ret = `${tags[idx]}\n${tab}${tab}${accountsStr}`;
                        }
                        idx += 1;
                        return ret;
                    }
                ).join(`\n${tab}`);
                if (team.teamScore !== 0) {
                    return `${idi + 1}. Team ${team.lhs}${tab}${team.teamScore.toLocaleString('en-us')}\n${tab}${participantsStr}`;
                }
                return `${idi + 1}. Team ${team.lhs}\n${tab}${participantsStr}`;
            }
        ).join('\n');

        const now: Date = new Date();
        let status: string;
        if (event.when.end >= new Date('9999-12-31')) {
            status = '';
        } else if (Utils.isInPast(event.when.end)) {
            status = '(ended)';
        } else if (Utils.isInPast(event.when.start)) {
            status = `(${Number(((event.when.end.getTime() - now.getTime()) / 3.6e6).toFixed(1)).toLocaleString('en-us')} hrs left)`;
        } else {
            status = '(sign-ups)';
        }

        // if (error !== undefined) {
        //     const lastUpdatedStr: string = lastUpdateSuccess === null
        //         ? 'Updated: never'
        //         : `Updated: ${lastUpdateSuccess.toLocaleString('en-us')}`;
        //     return `${idi + 1}. Team ${team.lhs}\n${tab}${participantsStr}\nError: ${error.message}\n${lastUpdatedStr}`;
        // }
        // lastUpdateSuccess = new Date();
        // return `${idi + 1}. Team ${team.lhs}\n${tab}${participantsStr}\nUpdated: ${lastUpdateSuccess.toLocaleString('en-us')}`;
        if (error !== undefined) {
            return `Event ${event.name} (${event.tracking.category})\n#${event.id} ${event.when.start.toLocaleString('en-us')} ${status}\n\n${str}\n\n${error}`;
        }
        return `Event ${event.name} (${event.tracking.category})\n#${event.id} ${event.when.start.toLocaleString('en-us')} ${status}\n\n${str}\n\nUpdated: ${new Date().toLocaleString('en-us')}`;
    };

    export const getEventTeamsScoreboards = (
        event: Event.Object,
    ): TeamScoreboard[] => {
        // get the tracking category
        const categoryKey: TrackingCategory = event.tracking.category;

        // get the tracking what list
        const whatKeys: string[] | undefined = event.tracking.what;

        const add = (acc: number, x: number): number => acc + x;
        const teamsScores: TeamScoreboard[] | undefined = event.teams.map(
            (team: Team): TeamScoreboard => {
                const participantsScores: ParticipantScoreboard[] = team.participants.map(
                    (participant: Participant): ParticipantScoreboard => {
                        const accountsScores:
                        AccountScoreboard[] = participant.runescapeAccounts.map(
                            (account: Account): AccountScoreboard => {
                                const whatsScores:
                                WhatScoreboard[] | undefined = whatKeys === undefined
                                    ? undefined
                                    : whatKeys.map(
                                        (whatKey: string): WhatScoreboard => {
                                            if (account.ending !== undefined
                                                && account.starting !== undefined) {
                                                // case of a new boss or skill or something
                                                // we may not have the starting defined
                                                if (account.ending[categoryKey] !== undefined
                                                    && account.ending[categoryKey][whatKey] !== undefined
                                                    && (account.starting[categoryKey] === undefined
                                                    || account.starting[categoryKey][whatKey] === undefined)
                                                ) {
                                                    if (categoryKey === 'skills') {
                                                        const ending = account
                                                            .ending
                                                            .skills[whatKey]
                                                            .xp;
                                                        return {
                                                            lhs: whatKey,
                                                            whatScore: ending,
                                                        };
                                                    }
                                                    const ending = account
                                                        .ending[categoryKey][whatKey]
                                                        .score;
                                                    return {
                                                        lhs: whatKey,
                                                        whatScore: ending,
                                                    };
                                                }
                                                if (categoryKey === 'skills') {
                                                    const ending = account
                                                        .ending
                                                        .skills[whatKey]
                                                        .xp;
                                                    const starting = account
                                                        .starting
                                                        .skills[whatKey]
                                                        .xp;
                                                    return {
                                                        lhs: whatKey,
                                                        whatScore: ending - starting,
                                                    };
                                                }
                                                const ending = account
                                                    .ending[categoryKey][whatKey]
                                                    .score;
                                                const starting = account
                                                    .starting[categoryKey][whatKey]
                                                    .score;
                                                return {
                                                    lhs: whatKey,
                                                    whatScore: ending - starting,
                                                };
                                            }
                                            return {
                                                lhs: whatKey,
                                                whatScore: 0,
                                            };
                                        }
                                    ).sort(
                                        (a: WhatScoreboard, b: WhatScoreboard):
                                        number => b.whatScore - a.whatScore
                                    );
                                const accountScore: number = whatsScores === undefined
                                    ? 0
                                    : whatsScores.map(
                                        (what: WhatScoreboard): number => what.whatScore
                                    ).reduce(add);
                                return {
                                    lhs: account.rsn,
                                    accountScore,
                                    whatsScores,
                                };
                            }
                        ).sort(
                            (a: AccountScoreboard, b: AccountScoreboard):
                            number => b.accountScore - a.accountScore
                        );
                        const customScore: number = participant.customScore;
                        const participantScore: number = accountsScores.map(
                            (account: AccountScoreboard): number => account.accountScore,
                            customScore,
                        ).reduce(add);

                        return {
                            lhs: participant.discordId,
                            customScore,
                            participantScore,
                            accountsScores,
                        };
                    }
                ).sort(
                    (a: ParticipantScoreboard, b: ParticipantScoreboard):
                    number => b.participantScore - a.participantScore
                );
                const teamScore: number = participantsScores.map(
                    (participant: ParticipantScoreboard):
                    number => participant.participantScore
                ).reduce(add);

                return {
                    lhs: team.name,
                    teamScore,
                    participantsScores,
                };
            }
        ).sort(
            (a: TeamScoreboard, b: TeamScoreboard):
            number => b.teamScore - a.teamScore
        );
        return teamsScores;
    };

    // /**
    //  * Searches the events array for a specific [[Event]]
    //  * @param events The source events to search
    //  * @param eventIdToSearch The event id to search for
    //  * @returns The found event
    //  * @category Event Filter
    //  */
    // export const findEventById = (
    //     events: Event.Object[],
    //     eventIdToSearch: number,
    // ): Event.Object | undefined => {
    //     const foundEvent: Event.Object | undefined = events.find(
    //         (event: Event.Object):
    //         boolean => event.id === eventIdToSearch
    //     );
    //     return foundEvent;
    // };

    // /**
    //  * Gets all currently scheduled [[Event]]s that have yet to end
    //  * @param events The event array to filter
    //  * @returns A new array of upcoming and in-flight events
    //  * @category Event Filter
    //  */
    // export const getUpcomingAndInFlightEvents = (
    //     events: Event[],
    // ): Event[] => events.filter(
    //     (event: Event):
    //     boolean => !event.state.hasEnded
    // );

    // /**
    //  * Gets all currently scheduled [[Event]]s that have yet to start
    //  * @param events The event array to filter
    //  * @returns A new array of upcoming and in-flight events
    //  * @category Event Filter
    //  */
    // export const getUpcomingEvents = (
    //     events: Event[],
    // ): Event[] => events.filter(
    //     (event: Event):
    //     boolean => !event.state.hasStarted
    // );

    // /**
    //  * Deletes an upcoming or in-flight [[Event]] by [[Event.name]]
    //  * @param events The Events array to search
    //  * @param eventToDelete The Event to delete
    //  * @returns A new updated Event array
    //  * @category Event Operator
    //  */
    // export const deleteEvent = (
    //     events: Event[],
    //     eventToDelete: Event
    // ): Event[] => {
    //     const newEvents: Event[] = events.filter(
    //         (event: Event):
    //         boolean => event.id !== eventToDelete.id
    //     );
    //     return newEvents;
    // };

    // /**
    //  * Updates a [[Participant]] in an [[Event]]
    //  * @param event The source event to modify
    //  * @param updatedParticipant The updated participant
    //  * @returns A new updated event with the updated participant
    //  * @category Event Operator
    //  */
    // export const updateEventParticipant = (
    //     event: Event,
    //     updatedParticipant: Participant
    // ): Event => {
    //     const newParticipants: Participant[] = event.participants.map(
    //         (participant: Participant):
    //         Participant => {
    //             if (participant.discordId === updatedParticipant.discordId) {
    //                 return updatedParticipant;
    //             }
    //             return participant;
    //         }
    //     );
    //     const newEvent: Event = { ...event, };
    //     newEvent.participants = newParticipants;
    //     return newEvent;
    // };

    // /**
    //  * Inserts a new [[Participant]] into an [[Event]]
    //  * @param event The source event
    //  * @param newParticipant The new participant to insert
    //  * @returns A new updated event with the new participant
    //  * @category Event Operator
    //  */
    // export const signupEventParticipant = (
    //     event: Event,
    //     newParticipant: Participant
    // ): Event => {
    //     const foundParticipant: Participant = event.participants.find(
    //         (participant: Participant):
    //         boolean => participant.discordId === newParticipant.discordId
    //     );
    //     if (foundParticipant !== undefined) return event;
    //     const allRsn: string[] = event.participants.map(
    //         (participant: Participant):
    //         Account[] => participant.runescapeAccounts
    //     ).reduce(
    //         (acc: Account[], x: Account[]):
    //         Account[] => acc.concat(x), []
    //     ).map(
    //         (account: Account): string => account.rsn
    //     );
    //     const newRsn: string[] = newParticipant.runescapeAccounts.map(
    //         (account: Account): string => account.rsn
    //     );
    //     const foundRsn: boolean = allRsn.some(
    //         (rsn: string): boolean => newRsn.includes(rsn)
    //     );
    //     if (foundRsn) return event;
    //     const newParticipants:
    //     Participant[] = event.participants.concat(
    //         newParticipant
    //     );
    //     const newEvent: Event = { ...event, };
    //     newEvent.participants = newParticipants;
    //     return newEvent;
    // };

    // /**
    //  * Removes a [[Participant]] from an [[Event]]
    //  * @param event The source event
    //  * @param participantToRemove The participant to remove
    //  * @returns A new updated event with the participant removed
    //  * @category Event Operator
    //  */
    // export const unsignupEventParticipant = (
    //     event: Event,
    //     participantToRemove: Participant
    // ): Event => {
    //     const newParticipants: Participant[] = event.participants.filter(
    //         (participant: Participant):
    //         boolean => participant.discordId !== participantToRemove.discordId
    //     );
    //     const newEvent: Event = { ...event, };
    //     newEvent.participants = newParticipants;
    //     return newEvent;
    // };

    // /**
    //  * Updates a specific [[Event]] in an [[Event]] array
    //  * @param events The source event array
    //  * @param updatedEvent The updated event
    //  * @returns A new updated event array with the updated event
    //  * @category Event Operator
    //  */
    // export const modifyEventArray = (
    //     events: Event[],
    //     updatedEvent: Event
    // ): Event[] => {
    //     const newEvents: Event[] = events.map(
    //         (event: Event): Event => {
    //             if (event.id === updatedEvent.id) return updatedEvent;
    //             return event;
    //         }
    //     );
    //     return newEvents;
    // };

    // /**
    //  * Finds a [[Participant]] by their Discord id
    //  * @param participants The source Participant array to search
    //  * @param discordId The linked Discord id to find
    //  * @returns The found participant
    //  * @category Participant Filter
    //  */
    // export const getParticipantByDiscordId = (
    //     participants: Participant[],
    //     discordId: string
    // ): Participant => participants.find(
    //     (participant: Participant): boolean => participant.discordId === discordId
    // );

    // /**
    //  * Gets all [[Participant]]s in a [[Team]]
    //  * @param event The source event to search
    //  * @param teamName The team name to find
    //  * @returns The array of participants in the team
    //  * @category Participant Filter
    //  */
    // export const getTeamParticipants = (
    //     event: Event,
    //     teamName: string
    // ):
    // Participant[] => {
    //     if (event.teams === undefined) return undefined;
    //     const foundTeam: Team = event.teams.find(
    //         (info: Team):
    //         boolean => info.name === teamName
    //     );
    //     if (foundTeam === undefined) return undefined;
    //     const teamParticipants: Participant[] = foundTeam.linkedDiscordIds.map(
    //         (discordId: string):
    //         Participant => getParticipantByDiscordId(
    //             event.participants,
    //             discordId
    //         )
    //     );
    //     const filteredParticipants: Participant[] = teamParticipants.filter(
    //         (participant: Participant):
    //         boolean => participant !== undefined
    //     );
    //     return filteredParticipants;
    // };
}
