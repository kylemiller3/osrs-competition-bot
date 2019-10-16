import pgp from 'pg-promise';
// eslint-disable-next-line import/no-unresolved
import pg from 'pg-promise/typescript/pg-subset';
import { async, } from 'rxjs/internal/scheduler/async';
import { Utils, } from './utils';
import { Event, } from './event';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Db2 {

    enum TABLES {
        EVENTS = 'events',
    }

    enum EVENTS_COL {
        ID = 'id',
        EVENT = 'event',
    }

    export const initOptions: pgp.IInitOptions = {
        capSQL: true,
        connect(client: pg.IClient): void {
            const cp = client.connectionParameters;
            Utils.logger.debug('Connected to database:', cp.database);
        },
        disconnect(client: pg.IClient): void {
            const cp = client.connectionParameters;
            Utils.logger.debug('Disconnecting from database:', cp.database);
        },
        query(event: pgp.IEventContext): void {
            Utils.logger.debug(event.query);
        },
        receive(data: unknown): void {
            Utils.logger.debug(data);
        },
        task(event: pgp.IEventContext): void {
            if (event.ctx.finish) {
                // this is a task->finish event;
                Utils.logger.debug('Duration:', event.ctx.duration);
                if (event.ctx.success) {
                    // e.ctx.result = resolved data;
                    Utils.logger.debug('Task successful');
                } else {
                    // e.ctx.result = error/rejection reason;
                    Utils.logger.debug('Task failed: ', event.ctx.result);
                }
            } else {
                // this is a task->start event;
                Utils.logger.debug('Start Time:', event.ctx.start);
            }
        },
        transact(event: pgp.IEventContext): void {
            if (event.ctx.finish) {
                // this is a transaction->finish event;
                Utils.logger.debug('Duration:', event.ctx.duration);
                if (event.ctx.success) {
                    // e.ctx.result = resolved data;
                } else {
                    // e.ctx.result = error/rejection reason;
                }
            } else {
                // this is a transaction->start event;
                Utils.logger.debug('Start Time:', event.ctx.start);
            }
        },
        error(err: Error, event: pgp.IEventContext): void {
            if (event.cn) {
                // this is a connection-related error
                // cn = safe connection details passed into the library:
                //      if password is present, it is masked by #
            }
            if (event.query) {
                // query string is available
                if (event.params) {
                    // query parameters are available
                }
            }
            if (event.ctx) {
                // occurred inside a task or transaction
            }
        },
    };

    export const mainDb = pgp(initOptions)({
        host: 'localhost',
        port: 5432,
        database: 'osrs-competition-bot',
        user: 'postgres',
        password: '123',
    });

    export const testDb = pgp(initOptions)({
        host: 'localhost',
        port: 5432,
        database: 'osrs-competition-bot-test',
        user: 'postgres',
        password: '123',
    });

    export const createTable = (
        db: pgp.IDatabase<unknown>,
    ): Promise<unknown> => db.tx(
        async (task: pgp.ITask<unknown>):
        Promise<void> => {
            task.none({
                text: 'CREATE OR REPLACE FUNCTION '
                + 'f_cast_isots(text) '
                + 'RETURNS timestamptz AS '
                + '$$SELECT to_timestamp($1, \'YYYY-MM-DDTHH24:MI\')$$ '
                + 'LANGUAGE sql IMMUTABLE',
            });
            task.none({
                text: 'CREATE TABLE IF NOT EXISTS '
                        + `${TABLES.EVENTS}`
                        + '('
                            + `${EVENTS_COL.ID} SERIAL PRIMARY KEY, `
                            + `${EVENTS_COL.EVENT} JSONB NOT NULL `
                        + ')',
            });
            task.none({
                text: 'CREATE INDEX idx_name ON '
                        + `${TABLES.EVENTS}`
                        + '('
                            + `(${EVENTS_COL.EVENT}->>'name')`
                        + ')',

            });
            task.none({
                text: 'CREATE INDEX idx_start ON '
                        + `${TABLES.EVENTS}`
                        + '('
                            + 'f_cast_isots'
                            + '('
                                + `(${EVENTS_COL.EVENT}->'when'->>'start')`
                            + ')'
                        + ')',
            });
            task.none({
                text: 'CREATE INDEX idx_end ON '
                        + `${TABLES.EVENTS}`
                        + '('
                            + 'f_cast_isots'
                            + '('
                                + `(${EVENTS_COL.EVENT}->'when'->>'end')`
                            + ')'
                        + ')',
            });
            task.none({
                text: 'CREATE INDEX idx_creator_guild_id ON '
                        + `${TABLES.EVENTS}`
                        + '('
                            + `(${EVENTS_COL.EVENT}->'guilds'->'creator'->>'discordId')`
                        + ')',
            });
            task.none({
                text: 'CREATE INDEX idx_other_guilds ON '
                        + `${TABLES.EVENTS} `
                        + 'USING gin '
                        + '('
                            + `(${EVENTS_COL.EVENT}->'guilds'->'others')`
                            + ' jsonb_path_ops'
                        + ')',
            });
            task.none({
                text: 'CREATE INDEX idx_participants ON '
                        + `${TABLES.EVENTS} `
                        + 'USING gin '
                        + '('
                            + `(${EVENTS_COL.EVENT}->'teams'->'participants')`
                            + ' jsonb_path_ops'
                        + ')',
            });
            task.none({
                text: 'ALTER TABLE '
                    + `${TABLES.EVENTS} `
                    + 'ADD CONSTRAINT name_is_defined CHECK '
                    + '('
                        + `(${EVENTS_COL.EVENT} ? 'name' AND NOT ${EVENTS_COL.EVENT}->>'name' IS NULL)`
                    + ')',
            });
            task.none({
                text: 'ALTER TABLE '
                    + `${TABLES.EVENTS} `
                    + 'ADD CONSTRAINT valid_dates CHECK '
                    + '('
                        + '('
                            + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamp < (${EVENTS_COL.EVENT}->'when'->>'end')::timestamp `
                            + 'AND '
                            + `(${EVENTS_COL.EVENT}->'when'->>'end')::timestamp > NOW()`
                        + ')'
                        + ' AND '
                        + '('
                            + `${EVENTS_COL.EVENT}->'when' ? 'start' AND NOT ${EVENTS_COL.EVENT}->'when'->>'start' IS NULL`
                            + ' AND '
                            + `${EVENTS_COL.EVENT}->'when' ? 'end' AND NOT ${EVENTS_COL.EVENT}->'when'->>'end' IS NULL`
                        + ')'
                    + ')',
            });
            task.none({
                text: 'ALTER TABLE '
                    + `${TABLES.EVENTS} `
                    + 'ADD CONSTRAINT creator_guild_id_is_defined CHECK '
                    + '('
                        // + `jsonb_path_exists(${EVENTS_COL.EVENT}, '$.competingGuilds[*].discordId')`
                        + `${EVENTS_COL.EVENT}->'guilds'->'creator' ? 'discordId' AND NOT ${EVENTS_COL.EVENT}->'guilds'->'creator'->>'discordId' IS NULL`
                    + ')',
            });
            task.none({
                text: 'ALTER TABLE '
                    + `${TABLES.EVENTS} `
                    + 'ADD CONSTRAINT teams_have_participant CHECK '
                    + '('
                        + `jsonb_path_exists(${EVENTS_COL.EVENT}, '$ ? ((@.teams.type() == "array" && @.teams.size() == 0) || (@.teams.participants.type() == "array" && @.teams.participants.size() > 0))')`
                    + ')',
            });
        }
    );

    export const insertNewEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'insert new event',
        text: `INSERT INTO ${TABLES.EVENTS} (${EVENTS_COL.EVENT}) VALUES ($1) RETURNING ${EVENTS_COL.ID}`,
    });
    export const updateEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'update event',
        text: `UPDATE ${TABLES.EVENTS} SET ${EVENTS_COL.EVENT} = $2 WHERE ${EVENTS_COL.ID} = $1 RETURNING ${EVENTS_COL.ID}`,
    });
    export const insertOrUpdateEvent = (
        db: pgp.IDatabase<unknown>,
        event: Event.Event,
    ): Promise<{id: number}> => {
        if (event.id === undefined) {
            insertNewEventStmt.values = [
                JSON.stringify(event),
            ];
            return db.one(
                insertNewEventStmt,
            );
        }
        updateEventStmt.values = [
            event.id,
            JSON.stringify(event),
        ];
        return db.one(
            updateEventStmt,
        );
    };

    export const fetchAllGuildOwnedEvents = (
        db: pgp.IDatabase<unknown>,
        guildId: string,
    ): Promise<Event.Event[]> => db.manyOrNone({
        text: 'SELECT '
        + `${EVENTS_COL.ID}, `
        + `${EVENTS_COL.EVENT} `
        + 'FROM '
        + `${TABLES.EVENTS} `
        + 'WHERE '
        + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'discordId' = '${guildId}'`,
    });

    export const fetchAllGuildEvents = (
        db: pgp.IDatabase<unknown>,
        guildId: string,
    ): Promise<Event.Event[]> => db.manyOrNone({
        text: 'SELECT '
        + `${EVENTS_COL.ID}, `
        + `${EVENTS_COL.EVENT} `
        + 'FROM '
        + `${TABLES.EVENTS} `
        + 'WHERE '
        + `${EVENTS_COL.EVENT}->'guilds'->'others' @> '[{"discordId":"${guildId}"}]'`
        + ' OR '
        + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'discordId' = '${guildId}'`,
    });

    export const fetchAllEvents = (
        db: pgp.IDatabase<unknown>,
    ): Promise<Event.Event[]> => db.manyOrNone({
        text: 'SELECT '
        + `${EVENTS_COL.ID}, `
        + `${EVENTS_COL.EVENT} `
        + 'FROM '
        + `${TABLES.EVENTS} `,
    });

    export const deleteGuildEvent = (
        db: pgp.IDatabase<unknown>,
        guildId: string,
        eventId: number,
    ): Promise<null> => db.none({
        text: 'DELETE FROM '
            + `${TABLES.EVENTS}`
            + ' WHERE '
            + `${EVENTS_COL.ID} = '${eventId}'`,
    });

    export const fetchAllAParticipantsEvents = (
        db: pgp.IDatabase<unknown>,
        discordId: string,
    ): Promise<Event.Event[]> => db.manyOrNone({
        text: 'SELECT '
        + `${EVENTS_COL.ID}, `
        + `${EVENTS_COL.EVENT} `
        + 'FROM '
        + `${TABLES.EVENTS}, `
        + `jsonb_array_elements(${EVENTS_COL.EVENT}->'teams') teams `
        + 'WHERE '
        + `teams->'participants' @> '[{"discordId":"${discordId}"}]'`,
    });

    export const fetchEventsStartingBetweenDates = (
        db: pgp.IDatabase<unknown>,
        dateA: Date,
        dateB: Date,
    ): Promise<Event.Event[]> => db.manyOrNone({
        text: 'SELECT '
        + `${EVENTS_COL.ID}, `
        + `${EVENTS_COL.EVENT} `
        + 'FROM '
        + `${TABLES.EVENTS} `
        + 'WHERE '
        + '('
            + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamp, (${EVENTS_COL.EVENT}->'when'->>'end')::timestamp`
        + ')'
        + ' OVERLAPS '
        + '('
            + `'${dateA.toISOString()}'::timestamp, '${dateB.toISOString()}'::timestamp`
        + ')',
    });
}
