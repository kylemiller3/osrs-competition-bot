
import Database, * as sqlite3 from 'better-sqlite3';
import { Utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Db {
    export const tempDb = new Database('temp.db', { verbose: Utils.logger.log, memory: true, });
    export const persistentDb = new Database('persistent.db', { verbose: Utils.logger.log, });

    export enum COMMANDS {
        MUTATE_EVENT_NEW, // insert a new (event)
        MUTATE_EVENT_DELETE, // delete an existing (eventId)
        MUTATE_EVENT_EDIT, // edit an existing (eventId)
        MUTATE_EVENT_SIGNUP, // add a (participant) to the (guildId) (eventId)
        MUTATE_EVENT_UNSIGNUP, // remove (participant) from the (guildId) (eventId)
        MUTATE_NOTIFICATION_CHANNEL_SET, // change the (guildId) (notificationChannel)
        MUTATE_SCOREBOARD_MESSAGE_ID, // change the (guildId) (scoreboardMessageId)
        MUTATE_STATUS_MESSAGE_ID, // change the (guildId) (statusMessageId)
        MUTATE_PARTICIPANT, // change the (guildId) (eventId) (discordId)
        FETCH_ALL_EVENTS, // get all (guildId) events
        FETCH_ALL_EVENTS_WITH_DISCORD_ID, // get all (guildId) events starring (discordId)
        FETCH_EVENT_FROM_ID, // get event from (guildId) (eventId)
        FETCH_EVENT_FROM_NAME, // get event from (guildId) (name)
        FETCH_EVENTS_STARTING_BETWEEN_DATES, // get events from (guildId?) between (date1) (date2)
        FETCH_EVENTS_ENDING_BETWEEN_DATES, // get events from (guildId?) between (date1) (date2)
        FETCH_EVENTS_ACTIVE, // get events from (guildId) where now is between starting and ending
        FETCH_USER_EVENTS, // get all events the (discordId) was active in
        FETCH_NOTIFICATION_CHANNEL, // get the notification channel of the (guildId)
        FETCH_SCOREBOARD_MESSAGE_ID, // get the (guildId) (scoreboardMessageId)
        FETCH_STATUS_MESSAGE_ID, // get the (guildId) (statusMessageId)
        FETCH_PARTICIPANT, // get the (guildId) (eventId) (discordId)
        FETCH_ALL_PARTICIPANTS, // get the (guildId) (eventId) participants
    }

    const createTablesIfNotExists = (
        db: sqlite3.Database,
    ): boolean => {
        const stmt: sqlite3.Statement = db.prepare(
            'SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'test\''
        );
        const table = stmt.get();
        if (table === undefined) {
            // import guild data
            return true;
        }
        return false;
    };
}
