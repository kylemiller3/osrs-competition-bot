import * as jsonfile from 'jsonfile'
import {
    runescape,
} from './runescape'
import { utils } from './utils'

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace bot {
    const loadCache: Record<string, bot.Data> = {}

    /**
     * @description Empty GuildData default
     * @constant
     * @type {GuildData}
     * @default
     */
    const GUILD_DATA_DEFAULT: bot.Data = {
        settings: {
            admins: [],
            notificationChannelId: undefined,
        },

        events: [],
        stats: [],
    }

    /**
    * @function
    * @description Checks the Guild configuration for any administrators
    * @param {bot.Data} data Guild data to check
    * @returns {boolean} If the Guild has the administrator array set
    */
    export const hasAdmin = (data: bot.Data):
    boolean => data.settings.admins.length > 0

    /**
      * @function
      * @description Checks if the author of a discord message is on
      * the administrator list for that Guild
      * @param {discord.User} author The author of the message
      * @param {bot.Data} data The Guild configuration of the message's
      * Guild from where it was received
      * @returns {boolean} True if the author is an administrator
      */
    export const isAdmin = (authorId: string, data: bot.Data):
    boolean => data.settings.admins.includes(authorId)

    /**
    * @description Contract for describing access controls for each command
    * @interface
    */
    export interface AccessControl {
        controlFunction: (authorId: string, data: Data) => boolean
        description: string
    }

    /**
    * @description Contract describing each possible command
    * @interface
    */
    export interface Command extends Record<string, unknown> {
        description: string
        accessControl: AccessControl
        parameters: string
        command: string
    }

    /**
    * @description Contract containing all known commands
    * @interface
    */
    export interface Commands extends Record<string, Command> {
        DEBUG: Command
        ADD_ADMIN: Command
        ADD_UPCOMING: Command
        LIST_UPCOMING: Command
        DELETE_UPCOMING: Command
        SIGNUP_UPCOMING: Command
        UNSIGNUP_UPCOMING: Command
        AMISIGNEDUP_UPCOMING: Command
        LIST_PARTICIPANTS_UPCOMING: Command
        HELP: Command
        SET_CHANNEL: Command
    }

    /**
    * @description Contract for each Guild's configuration
    * @interface
    */
    export interface Settings extends Record<string, unknown> {
        admins: string[]
        notificationChannelId: string
    }

    /**
    * @description Top level contract for each Guild's configuration
    * @interface
    */
    export interface Data extends Record<string, unknown> {
        settings: Settings
        events: runescape.Event[]
        stats: Stats[]
    }

    export interface Stats extends Record<string, unknown> {
        discordId: string
        firstPlaceFinishes: number
        secondPlaceFinishes: number
        thirdPlaceFinishes: number
        topTenPlaceFinishes: number
        totalParticipants: number
        totalPlaces: number
        totalCompetitiveEvents: number
        totalRegularEvents: number
        totalSkillsGain: number
        totalCluesGain: number
        totalLmsGain: number
        totalBhGain: number
    }

    /**
    * @description Implementation of Bot.AccessControl for unset
    * Guild configuration or admin users only access
    * @type {bot.AccessControl}
    * @constant
    */
    export const ONLY_UNSET_ADMINS_OR_ADMIN: bot.AccessControl = {
        controlFunction: (
            authorId: string, guildData: bot.Data
        ): boolean => !hasAdmin(guildData) || isAdmin(authorId, guildData),
        description: 'unset guild configuration or have admin privileges',
    }

    /**
    * @description Implementation of Bot.AccessControl for admin users only access
    * @type {bot.AccessControl}
    * @constant
    */
    export const ONLY_ADMIN: bot.AccessControl = {
        controlFunction: (
            authorId: string, guildData: bot.Data
        ): boolean => isAdmin(authorId, guildData),
        description: 'have admin privileges',
    }

    /**
    * @description Implementation of Bot.AccessControl for any user access
    * @type {bot.AccessControl}
    * @constant
    */
    export const ANY_USER: bot.AccessControl = {
        controlFunction: (): boolean => true,
        description: 'any user',
    }

    /**
     * @description Implementation of all recognized Bot.Commands
    * @constant
    * @type {bot.Commands}
    * @default
    */
    export const COMMANDS: bot.Commands = {
        DEBUG: {
            command: '!f debug',
            description: 'logs debug info to console',
            accessControl: ONLY_ADMIN,
            parameters: '',
        },

        ADD_ADMIN: {
            command: '!f add admin ',
            description: 'adds administration for this guild',
            accessControl: ONLY_UNSET_ADMINS_OR_ADMIN,
            parameters: '(mentions)',
        },

        ADD_UPCOMING: {
            command: '!f add event ',
            description: 'schedules a new event',
            accessControl: ONLY_ADMIN,
            parameters: '(name, starting, ending, type (competition (skills (list of skills) | bh (bounty hunter mode) | clues (clue difficulties)) | regular ))',
        },

        LIST_UPCOMING: {
            command: '!f events',
            description: 'lists scheduled events along and event number',
            accessControl: ANY_USER,
            parameters: '',
        },

        DELETE_UPCOMING: {
            command: '!f delete ',
            description: 'deletes an event by event number (use with \'!f events\')',
            accessControl: ONLY_ADMIN,
            parameters: '(event number)',
        },

        SIGNUP_UPCOMING: {
            command: '!f signup ',
            description: 'signs up for a scheduled event number with RuneScape name (use with \'!f events\')',
            accessControl: ANY_USER,
            parameters: '(RSN, event number)',
        },

        UNSIGNUP_UPCOMING: {
            command: '!f unsignup ',
            description: 'un-signs up for a scheduled event number (use with \'!f events\')',
            accessControl: ANY_USER,
            parameters: '(event number)',
        },

        AMISIGNEDUP_UPCOMING: {
            command: '!f amisignedup ',
            description: 'checks to see if you are signed up for a scheduled event number (use with \'!f events\')',
            accessControl: ANY_USER,
            parameters: '(event number)',
        },

        LIST_PARTICIPANTS_UPCOMING: {
            command: '!f list ',
            description: 'lists all participants in an event number (use with \'!f events\')',
            accessControl: ANY_USER,
            parameters: '(event number)',
        },

        HELP: {
            command: '!f help',
            description: 'prints this help',
            accessControl: ANY_USER,
            parameters: '',
        },

        SET_CHANNEL: {
            command: '!f set channel ',
            description: 'sets the channel for notifications - must be set or there will be no notifications',
            accessControl: ONLY_ADMIN,
            parameters: '(channel mention)',
        },

        FORCESIGNUP_UPCOMING: {
            command: '!f forcesignup ',
            description: 'forces signup for a scheduled event number with RuneScape name and mention (use with \'!f events\')',
            accessControl: ONLY_ADMIN,
            parameters: '(index rsn mention)',
        },

        FORCEUNSIGNUP_UPCOMING: {
            command: '!f forceunsignup ',
            description: 'forces un-signup for a scheduled event number with RuneScape name and mention (use with \'!f events\')',
            accessControl: ONLY_ADMIN,
            parameters: '(index mention)',
        },
    }

    /**
 * @function
 * @description Loads the Guild configuration using cache or GUILD_DEFAULT_DATA if none
 * @param {string} id Guild id configuration to load
 * @param {boolean} dirty Loads configuration from disk if set
 * @returns {Observable<bot.Data>} Observable of the load
 * @throws If the OS rejects our load
 */
    export const load = (id: string, dirty: boolean): bot.Data => {
        if (dirty || loadCache[id] === undefined) {
            try {
                loadCache[id] = jsonfile.readFileSync((`./guilds/${id}.json`), {
                // this is very fragile but works for our data structures
                    reviver: ((key: string, value: unknown): unknown => {
                        if (key.toLowerCase().includes('date')) { return new Date(value as string) }
                        return value
                    }),
                })
            } catch (error) {
                if (error.errno === -2) {
                    utils.logger.info('Guild has no configuration')
                    return GUILD_DATA_DEFAULT
                }
                utils.logError(error)
                utils.logger.error(`Error loading ${id} from disk`)
                throw error
            }
        }

        const cached: bot.Data = loadCache[id]
        const keys = Object.keys(loadCache)
        if (keys.length >= 1000) {
            const idxToRemove: number = Math.floor((Math.random() * 10))
            const keyToRemove: string = keys[idxToRemove]
            loadCache[keyToRemove] = undefined
        }
        return cached
    }

    /**
 * @function
 * @description Saves the Guild configuration and then triggers a dirty load
 * @param {string} id Guild id configuration to save
 * @param {bot.Data} guildData The Bot.Database to save to disk
 * @returns {Observable<bot.Data>} Observable of the load
 * @throws If the OS rejects our save
 */
    export const save = (id: string, guildData: bot.Data): bot.Data => {
        try {
            jsonfile.writeFileSync(`./guilds/${id}.json`, guildData)
            utils.logger.debug(`Wrote settings to ${id}`)
            return load(id, true)
        } catch (error) {
            utils.logError(error)
            utils.logger.error(`Error writing ${id} to disk`)
            throw error
        }
    }
}
