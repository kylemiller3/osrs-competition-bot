declare module 'Runescape' {
    import {
        hiscores
    } from 'osrs-json-api'

    /**
     * @description Contract containing information about clan event participants
     * @interface
     */
    export interface EventParticipant extends Record<string, unknown> {
        discordId: string
        runescapeAccounts: RegularEventAccountInfo[]
    }

    export interface RegularEventAccountInfo extends Record<string, unknown> {
        rsn: string
    }

    export interface CompetitiveEventAccountInfo extends RegularEventAccountInfo {
        skills: SkillsEventParticipantComponent
        bh: BhEventParticipantComponent
        clues: CluesEventParticipantComponent
    }

    /**
     * @description Contract component containing the tracking information
     * a clan event participant needs for XP clan events
     * @interface
     */
    export interface SkillsEventParticipantComponent extends Record<string, hiscores.SkillsInfo> {
        starting: hiscores.SkillsInfo
        ending: hiscores.SkillsInfo
    }

    export interface BhEventParticipantComponent extends Record<string, hiscores.BountyHunterInfo> {
        starting: hiscores.BountyHunterInfo
        ending: hiscores.BountyHunterInfo
    }

    export interface CluesEventParticipantComponent extends Record<string, hiscores.CluesInfo> {
        starting: hiscores.CluesInfo
        ending: hiscores.CluesInfo
    }

    /**
     * @description Contract containing information about a specific clan event
     * @interface
     */
    export interface Event extends Record<string, unknown> {
        name: string
        startingDate: Date
        endingDate: Date
        type: string
        participants: EventParticipant[]
        hasNotifiedTwoHourWarning: boolean
        hasNotifiedStarted: boolean
        hasNotifiedEnded: boolean
    }
}
