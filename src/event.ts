import {
    hiscores,
} from 'osrs-json-api';

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
     * Contract for a [[Participant]]'s RuneScape account
     * @category Event
     */
    export interface Account {
        rsn: string
    }

    /**
     * Extended contract of a [[Participant]]'s [[Account]]
     * for a competitive [[Event]]
     * @category Event
     */
    export interface CompetitiveAccount extends Account {
        starting: hiscores.Player
        ending: hiscores.Player
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
    export interface Tracker {
        tracking: TrackingCategory
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
        statusMessage?: ChannelMessage
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
        tracker: Tracker
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
        if (event.tracker === undefined) return 'casual';
        return event.tracker.tracking;
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

    /**
     * Searches the events array for a specific [[Event]]
     * @param events The source events to search
     * @param eventIdToSearch The event id to search for
     * @returns The found event
     * @category Event Filter
     */
    export const findEventById = (
        events: Event.Object[],
        eventIdToSearch: number,
    ): Event.Object | undefined => {
        const foundEvent: Event.Object | undefined = events.find(
            (event: Event.Object):
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
