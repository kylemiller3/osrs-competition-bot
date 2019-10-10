
import Database, * as sqlite3 from 'better-sqlite3';
import { Utils, } from './utils';
import { Command, } from './command';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Db {
    export interface Input {
        command: Command.ALL
        data: any
    }

    export const tempDb = new Database('foobar.db', { verbose: Utils.logger.log, memory: true, });
    export const permDb = new Database('foobar.db', { verbose: Utils.logger.log, memory: true, });

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


    export const handleCommand = (
        dict: Record<string, any>
    ): void => {
        /*
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
        */
        if (dict.command === Command.ALL.ADMIN_SET_CHANNEL) {
            // do code here to save to database
            Utils.logger.debug(dict.data);
        }

        if (dict.command === Command.ALL.EVENTS_ADD) {
            // do code here to save to database
            Utils.logger.debug(dict.data);
        }
    };
}
