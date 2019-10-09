
import Database, * as sqlite3 from 'better-sqlite3';
import { Utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Db {
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
}
