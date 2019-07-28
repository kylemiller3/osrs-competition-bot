declare module 'Runescape' {
    import {
        hiscores
    } from 'osrs-json-api'


    /**
    * @description Enum of all Runescape skills
    * @enum
    * @default
    */
    export enum SkillsEnum {
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
        FARMING = 'farming'
    }

    /**
     * @description Enum of all bounty hunter items to track
     * @enum
     * @default
     */
    export enum BountyHunterEnum {
        ROGUE = 'rogue',
        HUNTER = 'hunter'
    }

    /**
     * @description Enum of all clue items to track
     * @enum
     * @default
     */
    export enum CluesEnum {
        ALL = 'all',
        BEGINNER = 'beginner',
        EASY = 'easy',
        MEDIUM = 'medium',
        HARD = 'hard',
        ELITE = 'elite',
        MASTER = 'master'
    }

    /**
     * @description Contract containing information about Runescape event participants
     * @interface
     */
    export interface EventParticipant extends Record<string, unknown> {
        discordId: string
        runescapeAccounts: RegularEventAccountInfo[]
    }

    /**
     * @description Contract containing information about a Runescape account
     * @interface
     */
    export interface RegularEventAccountInfo extends Record<string, unknown> {
        rsn: string
    }

    /**
     * @description Contract extending information about a Runescape account for competitive events
     * @interface
     */
    export interface CompetitiveEventAccountInfo extends RegularEventAccountInfo {
        skills: SkillsEventParticipantComponent
        bh: BhEventParticipantComponent
        clues: CluesEventParticipantComponent
    }

    /**
     * @description Contract component containing the tracking information for skills
     * @interface
     */
    export interface SkillsEventParticipantComponent extends Record<string, hiscores.SkillsInfo> {
        starting: hiscores.SkillsInfo
        ending: hiscores.SkillsInfo
    }

    /**
     * @description Contract component containing the tracking information for bounty hunter
     * @interface
     */
    export interface BhEventParticipantComponent extends Record<string, hiscores.BountyHunterInfo> {
        starting: hiscores.BountyHunterInfo
        ending: hiscores.BountyHunterInfo
    }

    /**
     * @description Contract component containing the tracking information for clues
     * @interface
     */
    export interface CluesEventParticipantComponent extends Record<string, hiscores.CluesInfo> {
        starting: hiscores.CluesInfo
        ending: hiscores.CluesInfo
    }

    /**
     * @description Contract of all possible things to track
     * @interface
     * @default
     */
    export interface Tracking extends Record<string, unknown> {
        skills: SkillsEnum[]
        bh: BountyHunterEnum[]
        clues: CluesEnum[]
    }

    /**
     * @description Contract containing information about a Runescape event
     * @interface
     */
    export interface Event extends Record<string, unknown> {
        name: string
        startingDate: Date
        endingDate: Date
        type: string
        tracking: Tracking
        participants: EventParticipant[]
        hasNotifiedTwoHourWarning: boolean
        hasNotifiedStarted: boolean
        hasNotifiedEnded: boolean
    }
}
