import pgp, { PreparedStatement, } from 'pg-promise';
// eslint-disable-next-line import/no-unresolved
import pg from 'pg-promise/typescript/pg-subset';
import { Utils, } from './utils';
import { Event, } from './event';
import { Settings, } from './settings';
import { async } from 'rxjs/internal/scheduler/async';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Db {

    enum TABLES {
        EVENTS = 'events',
        SETTINGS = 'settings',
    }

    enum EVENTS_COL {
        ID = 'id',
        EVENT = 'event',
    }

    interface EventRow {
        id: number
        event: Event.Object
    }

    const eventRowToEvent = (
        eventRow: EventRow
    ): Event.Object => ({
        id: eventRow.id,
        ...eventRow.event,
        when: {
            start: new Date(eventRow.event.when.start),
            end: new Date(eventRow.event.when.end),
        },
    });

    enum SETTINGS_COL {
        GUILD_ID = 'guild_id',
        CHANNEL_ID = 'channel_id',
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
            Utils.logger.debug(JSON.stringify(data, null, 2));
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
                Utils.logger.error('Query: ', event.query);
                if (event.params) {
                    // query parameters are available
                    Utils.logger.error('Params: ', event.params);
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

    export const createTables = (
        db: pgp.IDatabase<unknown, pg.IClient> = Db.mainDb,
    ): Promise<unknown> => db.tx(
        async (task: pgp.ITask<unknown>):
        Promise<void> => {
            //---------------
            // Settings table
            //---------------
            task.none({
                text: 'CREATE TABLE IF NOT EXISTS '
                + `${TABLES.SETTINGS}`
                + '('
                    + `${SETTINGS_COL.GUILD_ID} TEXT PRIMARY KEY NOT NULL, `
                    + `${SETTINGS_COL.CHANNEL_ID} TEXT NOT NULL`
                + ')',
            });

            //------------
            // Event table
            //------------
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
                            + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamp < ((${EVENTS_COL.EVENT}->'when'->>'end')::timestamp + (60 || 'minutes')::interval)`
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
            // TODO: add constraint that checks for unique rsn?
        }
    );

    const insertNewEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'insert new event',
        text: `INSERT INTO ${TABLES.EVENTS} `
        + `(${EVENTS_COL.EVENT}) `
        + 'VALUES '
        + '($1) '
        + 'RETURNING *',
    });
    const updateEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'update event',
        text: `UPDATE ${TABLES.EVENTS} `
        + 'SET '
        + `${EVENTS_COL.EVENT} = $2 `
        + 'WHERE '
        + `${EVENTS_COL.ID} = $1::bigint `
        + 'RETURNING *',
    });
    export const upsertEvent = async (
        event: Event.Object,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Object> => {
        if (event.id === undefined) {
            const ret: {id: number; event: Event.Object} = await db.one(
                insertNewEventStmt,
                JSON.stringify(event),
            );
            return { ...event, id: ret.id, };
        }
        const ret: {id: number; event: Event.Object} = await db.one(
            updateEventStmt,
            [
                event.id,
                JSON.stringify(event),
            ],
        );
        return { ...event, id: ret.id, };
    };

    const fetchAllEventsStartAscStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'ORDER BY '
            + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamp ASC, `
            + `${EVENTS_COL.ID} ASC`,
    });
    const fetchAllEventsEndAscStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'ORDER BY '
            + `(${EVENTS_COL.EVENT}->'when'->>'end')::timestamp ASC, `
            + `${EVENTS_COL.ID} ASC`,
    });
    export const fetchAllEvents = async (
        db: pgp.IDatabase<unknown> = Db.mainDb,
        startAsc: boolean = true,
    ): Promise<Event.Object[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            startAsc ? fetchAllEventsStartAscStmt : fetchAllEventsEndAscStmt,
        );
        if (ret === null) return null;
        return ret.map(eventRowToEvent);
    };

    const fetchEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch event',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.ID} = $1::bigint`,
    });
    export const fetchEvent = async (
        id: number,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Object | null> => {
        const ret: EventRow | null = await db.oneOrNone(
            fetchEventStmt,
            id,
        );
        if (ret === null) return null;
        return eventRowToEvent(ret);
    };

    const fetchAllCreatorsGuildStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all owned events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'discordId' = $1::text`,
    });
    export const fetchCreatorEvents = async (
        guildId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Object[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            fetchAllCreatorsGuildStmt,
            guildId,
        );
        if (ret === null) return null;
        return ret.map(eventRowToEvent);
    };

    const fetchAllGuildEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all guild events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.EVENT}->'guilds'->'others' @> jsonb_build_array(jsonb_build_object('discordId', $1::text)) `
            + 'OR '
            + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'discordId' = $1::text `
            + 'ORDER BY '
            + `${EVENTS_COL.ID} DESC`,
    });
    export const fetchAllGuildEvents = async (
        guildId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Object[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            fetchAllGuildEventsStmt,
            guildId,
        );
        if (ret === null) return null;
        return ret.map(eventRowToEvent);
    };

    // const fetchGuildIdAdjustedEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch owned event id adjusted',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT}, `
    //         + 'row_number() '
    //         + 'OVER '
    //         + '('
    //             + 'ORDER BY '
    //             + `${EVENTS_COL.ID} `
    //             + 'DESC'
    //         + ') '
    //         + 'AS relativeRowNumber '
    //         + 'FROM '
    //         + '('
    //             + 'SELECT '
    //             + `${EVENTS_COL.ID}, `
    //             + `${EVENTS_COL.EVENT} `
    //             + 'FROM '
    //             + `${TABLES.EVENTS} `
    //             + 'WHERE '
    //             + `${EVENTS_COL.EVENT}->'guilds'->'others' @> jsonb_build_array(jsonb_build_object('discordId', $1::text)) `
    //             + 'OR '
    //             + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'discordId' = $1::text`
    //             + 'ORDER BY '
    //             + `${EVENTS_COL.ID} DESC`
    //         + ') '
    //         + 'WHERE '
    //         + 'relativeRowNumber = $2::bigint',
    // });
    // export const fetchGuildIdAdjustedEvent = (
    //     db: pgp.IDatabase<unknown>,
    //     guildId: string,
    //     relativeRowNumber: number,
    // ): Promise<Event.Event | null> => db.oneOrNone(
    //     fetchGuildIdAdjustedEventStmt,
    //     [
    //         guildId,
    //         relativeRowNumber,
    //     ],
    // );

    const fetchAllOfAParticipantsEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch a participant\'s events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS}, `
            + `jsonb_array_elements(${EVENTS_COL.EVENT}->'teams') teams `
            + 'WHERE '
            + 'teams->\'participants\' @> jsonb_build_array(jsonb_build_object(\'discordId\', $1::text))',
    });
    export const fetchAllOfAParticipantsEvents = async (
        discordId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Object[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            fetchAllOfAParticipantsEventsStmt,
            discordId,
        );
        if (ret === null) return null;
        return ret.map(eventRowToEvent);
    };

    const eventsBetweenDatesStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all between dates',
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
                + '$1::timestamp, $2::timestamp'
            + ')',
    });
    export const fetchAllEventsBetweenDates = async (
        dateA: Date,
        dateB: Date,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Object[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            eventsBetweenDatesStmt,
            [
                dateA.toISOString(),
                dateB.toISOString(),
            ]
        );
        if (ret === null) return null;
        return ret.map(eventRowToEvent);
    };

    const eventsCurrentlyRunningStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all running events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + '('
                + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamp <= current_timestamp `
                + 'AND '
                + `(${EVENTS_COL.EVENT}->'when'->>'end')::timestamp > current_timestamp`
            + ')',
    });
    export const fetchAllCurrentlyRunningEvents = async (
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Object[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            eventsCurrentlyRunningStmt,
        );
        if (ret === null) return null;
        return ret.map(eventRowToEvent);
    }

    const guildEventsBetweenDatesStmt: pgp.PreparedStatement = new PreparedStatement({
        name: 'fetch all guild events between dates',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + '('
                + `${EVENTS_COL.EVENT}->'guilds'->'others' @> jsonb_build_array(jsonb_build_object('discordId', $1::text)) `
                + 'OR '
                + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'discordId' = $1::text`
            + ') '
            + 'AND '
            + '('
                + '('
                    + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamp, (${EVENTS_COL.EVENT}->'when'->>'end')::timestamp`
                + ')'
                + ' OVERLAPS '
                + '('
                    + '$2::timestamp, $3::timestamp'
                + ')'
            + ')',
    });
    export const fetchAllGuildEventsBetweenDates = async (
        guildId: string,
        dateA: Date,
        dateB: Date,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Object[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            guildEventsBetweenDatesStmt,
            [
                guildId,
                dateA.toISOString(),
                dateB.toISOString(),
            ],
        );
        if (ret === null) return null;
        return ret.map(eventRowToEvent);
    };

    const deleteEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'delete event',
        text: 'DELETE FROM '
            + `${TABLES.EVENTS}`
            + ' WHERE '
            + `${EVENTS_COL.ID} = $1::bigint`,
    });
    export const deleteEvent = (
        eventId: number,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<null> => db.none(
        deleteEventStmt,
        eventId,
    );

    const upsertSettingsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'insert new settings',
        text: `INSERT INTO ${TABLES.SETTINGS} `
        + '('
            + `${SETTINGS_COL.GUILD_ID}, `
            + `${SETTINGS_COL.CHANNEL_ID} `
        + ')'
        + 'VALUES '
        + '($1, $2) '
        + 'ON CONFLICT '
        + `(${SETTINGS_COL.GUILD_ID}) `
        + 'DO UPDATE '
        + 'SET '
        + `${SETTINGS_COL.CHANNEL_ID} = $2 `
        + 'RETURNING *',
    });
    export const upsertSettings = async (
        settings: Settings.Object,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Settings.Object> => {
        const ret: {
            [SETTINGS_COL.GUILD_ID]: string
            [SETTINGS_COL.CHANNEL_ID]: string
        } = await db.one(
            upsertSettingsStmt,
            [
                settings.guildId,
                settings.channelId,
            ],
        );
        return {
            guildId: ret[SETTINGS_COL.GUILD_ID],
            channelId: ret[SETTINGS_COL.CHANNEL_ID],
        };
    };

    const fetchSettingsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch settings',
        text: 'SELECT * FROM '
        + `${TABLES.SETTINGS} `
        + 'WHERE '
        + `${SETTINGS_COL.GUILD_ID} = $1`,
    });
    export const fetchSettings = async (
        guildId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Settings.Object | null> => {
        const ret: {
            [SETTINGS_COL.GUILD_ID]: string
            [SETTINGS_COL.CHANNEL_ID]: string
        } | null = await db.oneOrNone(
            fetchSettingsStmt,
            [
                guildId,
            ],
        );
        if (ret === null) return null;
        return {
            guildId: ret[SETTINGS_COL.GUILD_ID],
            channelId: ret[SETTINGS_COL.CHANNEL_ID],
        };
    };
}
