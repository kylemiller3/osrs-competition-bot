
import Database, * as sqlite3 from 'better-sqlite3';
import { Utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Db {
    export const tempDb = new Database('foobar.db', { verbose: Utils.logger.log, memory: true, });
    export const permDb = new Database('foobar.db', { verbose: Utils.logger.log, memory: true, });

    export enum MUTATE {
        EVENT_NEW,
        EVENT_DELETE,
        EVENT_START,
        EVENT_WARN,
        EVENT_END,
        EVENT_SIGNUP,
        EVENT_UNSIGNUP,
        NOTIFICATION_CHANNEL_SET,
    }

    export interface Mutate {
        command: Db.MUTATE
        guildId?: string
        data: unknown
    }

    export enum FETCH {
        FETCH_ALL_EVENTS,
        FETCH_EVENT_FROM_ID,
        FETCH_EVENT_FROM_NAME,
        FETCH_EVENTS_STARTING_BEFORE_DATE,
        FETCH_EVENTS_STARTING_AFTER_DATE,
        FETCH_EVENTS_ENDING_BEFORE_DATE,
        FETCH_EVENTS_BETWEEN_DATES,
        FETCH_EVENTS_ACTIVE,
        NOTIFICATION_CHANNEL_GET,
    }

    export interface Fetch {
        command: Db.FETCH
        guildId: string
        data: unknown
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

    /*
    export const willHandleSave = (
        dict: Mutate
    ): void => {

        example:
        {
            command: Command.ALL.ADMIN_SET_CHANNEL,
            data: {
                channelId: channel.id,
            }
        }
        another:
        {
            command: Command.ALL.EVENTS_SIGNUP
            data: {
                uid: 10,
                user: 235897234027937,
                rsn: somename,
            }
        }

        if (dict.command === Db.MUTATE.NEW_EVENT) {
            // do code here to save to database
            Utils.logger.debug(dict.data);
        }

        if (dict.command === Db.MUTATE.DELETE_EVENT) {
            // do code here to save to database
            Utils.logger.debug(dict.data);
        }

        if (dict.command === Db.MUTATE.SAVE_NOTIFICATION_CHANNEL) {
            // do code here to save to database
            Utils.logger.debug(dict.data);
        }
    };
    */
}
