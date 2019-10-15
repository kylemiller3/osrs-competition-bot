import {
    hiscores,
} from 'osrs-json-api';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Event {
    /**
     * All possible RuneScape Skills to track
     * @category Tracking
     */
    export enum Skills {
        ATTACK = 'attack',
        STRENGTH = 'strength',
        DEFENSE = 'defense',
        RANGED = 'ranged',
        PRAYER = 'prayer',
        MAGIC = 'magic',
        RUNECRAFT = 'runecraft',
        CONSTRUCTION = 'construction',
        HITPOINTS = 'hitpoints',
        AGILITY = 'agility',
        HERBLORE = 'herblore',
        THIEVING = 'thieving',
        CRAFTING = 'crafting',
        FLETCHING = 'fletching',
        SLAYER = 'slayer',
        HUNTER = 'hunter',
        MINING = 'mining',
        SMITHING = 'smithing',
        FISHING = 'fishing',
        COOKING = 'cooking',
        FIREMAKING = 'firemaking',
        WOODCUTTING = 'woodcutting',
        FARMING = 'farming',
    }

    /**
     * All possible Bounty Hunter stats to track
     * @category Tracking
     */
    export enum BountyHunter {
        ROGUE = 'rogue',
        HUNTER = 'hunter',
    }

    /**
     * All possible Last Man Standing stats to track
     * @category Tracking
     */
    export enum LastManStanding {
        LMS = 'lms',
    }

    /**
     * All possible Clue stats to track
     * @category Tracking
     */
    export enum Clues {
        ALL = 'all',
        BEGINNER = 'beginner',
        EASY = 'easy',
        MEDIUM = 'medium',
        HARD = 'hard',
        ELITE = 'elite',
        MASTER = 'master',
    }

    /**
     * Contract for an [[Event]]'s participant
     * @category Event
     */
    export interface Participant {
        id?: number
        discordId: string
        customScore: number
        runescapeAccounts: Account[]
    }

    /**
     * Contract for a [[Participant]]'s RuneScape account
     * @category Event
     */
    export interface Account {
        id?: number
        rsn: string
    }

    /**
     * Extended contract of a [[Participant]]'s [[Account]]
     * for a competitive [[Event]]
     * @category Event
     */
    export interface CompetitiveAccount extends Account {
        starting: hiscores.LookupResponse
        ending: hiscores.LookupResponse
    }

    /**
     * Enum of all possible [[Tracking]] options
     * @category Tracking
     */
    export enum Tracking {
        NONE = 'casual',
        SKILLS = 'skills',
        BH = 'bh',
        LMS = 'lms',
        CLUES = 'clues',
        CUSTOM = 'custom',
    }

    /**
     * Contract for information on a Team
     * for a non-casual [[Event]]
     * @category Event
     */
    export interface Team {
        id?: number
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
    export interface Tracker {
        tracking: Tracking
        what?: BountyHunter[] | Clues[] | Skills[]
    }

    /**
     * Contract to track event messages
     * @category Event
     */
    export interface ChannelMessage {
        channelId: string
        messageId: string
    }

    /**
     * Contract for tracked status messages
     * @category Event
     */
    export interface GuildMessages {
        scoreboardMessage?: ChannelMessage
        statusMessage: ChannelMessage
    }

    /**
     * Contract of the information necessary to track a guild
     * @category Event
     */
    export interface CompetingGuild {
        id?: number
        discordId: string
        guildMessages?: GuildMessages
    }

    /**
     * Contract for a RuneScape Event
     * @category Event
     */
    export interface Event {
        id?: number // database id
        competingGuilds: CompetingGuild[] // info necessary to manage a tracked guild
        name: string // name of the event
        when?: When // when the event starts and ends
        teams: Team[] // the team (or participants) of the event (can be cross guild)
        tracker?: Tracker // what is being tracked if anything
    }

    /**
     * Gets the [[Tracking]] enum for the given [[Event]]
     * @param event The event to check what we tracked
     * @returns The tracking enum that represents what we tracked
     * @category Helper
     */
    export const getEventTracking = (
        event: Event
    ): Tracking => {
        if (event.tracker === undefined) return Tracking.NONE;
        return event.tracker.tracking;
    };

    /**
     * Checks an event to see if it is long running
     * @param event The event to check
     */
    export const isLongRunningEvent = (
        event: Event,
    ): boolean => event.when.end === undefined;

    /**
     * Checks an event to see if [[Event.Team]] is defined
     * @param event The event to check
     * @returns True if the event is a team event
     * @category Event Property
     */
    export const isTeamEvent = (
        event: Event,
    ): boolean => event.teams !== undefined;

    /**
     * Checks an [[Event]] to see if it is casual
     * @param event The event to check
     * @returns True if the event is a causal event
     * @category Event Property
     */
    export const isEventCasual = (
        event: Event,
    ): boolean => getEventTracking(event) === Tracking.NONE;

    /**
     * Checks an event to see if it is a [[EventType.CUSTOM]] type
     * @param event The event to check
     * @returns True if the event is a custom event
     * @category Event Property
     */
    export const isEventCustom = (
        event: Event
    ): boolean => getEventTracking(event) === Tracking.CUSTOM;

    /**
     * Searches the events array for a specific [[Event]]
     * @param events The source events to search
     * @param eventIdToSearch The event id to search for
     * @returns The found event
     * @category Event Filter
     */
    export const findEventById = (
        events: Event[],
        eventIdToSearch: number,
    ): Event => {
        const foundEvent: Event = events.find(
            (event: Event):
            boolean => event.id === eventIdToSearch
        );
        return foundEvent;
    };

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
