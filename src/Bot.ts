declare module 'Bot' {
    import * as discord from 'discord.js'
    import * as Runescape from 'Runescape'
    /**
    * @description Contract for describing access controls for each command
    * @interface
    */
    export interface AccessControl {
        controlFunction: (author: discord.User, guildData: Database) => boolean
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

    export interface Input extends Record<string, unknown> {
        message: discord.Message
        author: discord.User
        guild: discord.Guild
        input: string
        guildData: Database
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
    export interface Database extends Record<string, unknown> {
        settings: Settings
        events: Runescape.Event[]
    }
}
