import pgp, { PreparedStatement } from 'pg-promise';
// eslint-disable-next-line import/no-unresolved
import pg from 'pg-promise/typescript/pg-subset';
import { Utils } from './utils';
import { Event } from './event';
import { Settings } from './settings';
import {
    dbUser, dbPassword, dbHost, dbPort, dbName,
} from '../auth';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Db {

    enum TABLES {
        EVENTS = 'events',
        SETTINGS = 'settings',
        PREMIUM = 'premium'
    }

    enum EVENTS_COL {
        ID = 'id',
        EVENT = 'event',
    }

    interface EventRow {
        id: number;
        event: Event.Standard;
    }

    const rowToEvent = (
        eventRow: EventRow,
    ): Event.Standard => {
        const event: Event.Standard = eventRow.event;
        let returnEvent: Event.Standard;
        if (event instanceof Event.Global || event.isGlobal) {
            returnEvent = new Event.Global(
                eventRow.id,
                event.name,
                event.when.start,
                event.when.end,
                event.guilds,
                event.teams,
                event.tracking,
                event.isGlobal,
                event.isAdminLocked,
                (event as Event.Global).invitations,
            );
        } else {
            returnEvent = new Event.Standard(
                eventRow.id,
                event.name,
                event.when.start,
                event.when.end,
                event.guilds,
                event.teams,
                event.tracking,
                event.isGlobal,
                event.isAdminLocked,
            );
        }
        return returnEvent;
    };
    // }({
    //     id: eventRow.id,
    //     ...eventRow.event,
    //     when: {
    //         start: new Date(eventRow.event.when.start),
    //         end: new Date(eventRow.event.when.end),
    //     },
    // });

    enum SETTINGS_COL {
        GUILD_ID = 'guild_id',
        CHANNEL_ID = 'channel_id',
        PAY_TIER = 'pay_tier',
    }

    export const initOptions: pgp.IInitOptions = {
        capSQL: true,
        connect(client: pg.IClient): void {
            const cp = client.connectionParameters;
            Utils.logger.trace('Connected to database:', cp.database);
        },
        disconnect(client: pg.IClient): void {
            const cp = client.connectionParameters;
            Utils.logger.trace('Disconnecting from database:', cp.database);
        },
        query(event: pgp.IEventContext): void {
            Utils.logger.trace(`${event.query.name}\n${event.query.text}`);
        },
        receive(data: unknown): void {
            Utils.logger.trace(JSON.stringify(data));
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
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
    });

    // export const testDb = pgp(initOptions)({
    //     host: dbHost,
    //     port: dbPort,
    //     database: dbName,
    //     user: dbUser,
    //     password: dbPassword,
    // });

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
                    + `${SETTINGS_COL.CHANNEL_ID} TEXT NOT NULL, `
                    + `${SETTINGS_COL.PAY_TIER} SMALLINT NOT NULL DEFAULT 0`
                    + ')',
            });

            task.none({
                text: 'CREATE INDEX IF NOT EXISTS idx_tier ON '
                    + `${TABLES.SETTINGS}`
                    + '('
                    + `${SETTINGS_COL.PAY_TIER}`
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
                text: 'CREATE INDEX IF NOT EXISTS idx_name ON '
                    + `${TABLES.EVENTS}`
                    + '('
                    + `(${EVENTS_COL.EVENT}->>'name')`
                    + ')',

            });
            task.none({
                text: 'CREATE INDEX IF NOT EXISTS idx_start ON '
                    + `${TABLES.EVENTS}`
                    + '('
                    + 'f_cast_isots'
                    + '('
                    + `(${EVENTS_COL.EVENT}->'when'->>'start')`
                    + ')'
                    + ')',
            });
            task.none({
                text: 'CREATE INDEX IF NOT EXISTS idx_end ON '
                    + `${TABLES.EVENTS}`
                    + '('
                    + 'f_cast_isots'
                    + '('
                    + `(${EVENTS_COL.EVENT}->'when'->>'end')`
                    + ')'
                    + ')',
            });
            task.none({
                text: 'CREATE INDEX IF NOT EXISTS idx_participants ON '
                    + `${TABLES.EVENTS} `
                    + 'USING gin '
                    + '('
                    + `(${EVENTS_COL.EVENT}->'teams'->'participants')`
                    + ' jsonb_path_ops'
                    + ')',
            });
            task.none({
                text: `ALTER TABLE ${TABLES.EVENTS} DROP CONSTRAINT IF EXISTS name_is_defined`,
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
                text: `ALTER TABLE ${TABLES.EVENTS} DROP CONSTRAINT IF EXISTS valid_dates`,
            });
            task.none({
                text: 'ALTER TABLE '
                    + `${TABLES.EVENTS} `
                    + 'ADD CONSTRAINT valid_dates CHECK '
                    + '('
                    + '('
                    + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz <= (${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz`
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
                text: `ALTER TABLE ${TABLES.EVENTS} DROP CONSTRAINT IF EXISTS guild_is_defined`,
            });
            task.none({
                text: 'ALTER TABLE '
                    + `${TABLES.EVENTS} `
                    + 'ADD CONSTRAINT guild_is_defined CHECK '
                    + '('
                        + `${EVENTS_COL.EVENT}->'guilds'->0 ? 'guildId' AND NOT ${EVENTS_COL.EVENT}->'guilds'->0->>'guildId' IS NULL`
                    + ')',
            });
            task.none({
                text: `ALTER TABLE ${TABLES.EVENTS} DROP CONSTRAINT IF EXISTS teams_have_participant`,
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
        },
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
        event: Event.Standard,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard> => {
        if (event.id === undefined) {
            const ret: { id: number; event: Event.Standard } = await db.one(
                insertNewEventStmt,
                [
                    event.dbStringify,
                ],
            );
            return rowToEvent(ret);
        }
        const ret: { id: number; event: Event.Standard } = await db.one(
            updateEventStmt,
            [
                event.id,
                event.dbStringify,
            ],
        );
        return rowToEvent(ret);
    };

    const fetchAllEventsStartAscStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all events start asc',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'ORDER BY '
            + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz ASC, `
            + `${EVENTS_COL.ID} ASC`,
    });
    const fetchAllEventsEndAscStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all events end asc',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'ORDER BY '
            + `(${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz ASC, `
            + `${EVENTS_COL.ID} ASC`,
    });
    export const fetchAllEvents = async (
        db: pgp.IDatabase<unknown> = Db.mainDb,
        startAsc: boolean = true,
    ): Promise<Event.Standard[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            startAsc ? fetchAllEventsStartAscStmt : fetchAllEventsEndAscStmt,
        );
        if (ret === null) return null;
        return ret.map(rowToEvent);
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
    ): Promise<Event.Standard | null> => {
        const ret: EventRow | null = await db.oneOrNone(
            fetchEventStmt,
            id,
        );
        if (ret === null) return null;
        return rowToEvent(ret);
    };

    const fetchAllCreatorsGuildStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all creator events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.EVENT}->'guilds'->0->>'guildId' = $1::text`,
    });
    export const fetchAllCreatorEvents = async (
        guildId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            fetchAllCreatorsGuildStmt,
            guildId,
        );
        if (ret === null) return null;
        return ret.map(rowToEvent);
    };

    const fetchCreatorEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch creator event',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.ID} = $1::bigint `
            + 'AND '
            + `${EVENTS_COL.EVENT}->'guilds'->0->>'guildId' = $2::text`,
    });
    export const fetchLocallyCreatedEvent = async (
        id: number,
        guildId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard | null> => {
        const ret: EventRow | null = await db.oneOrNone(
            fetchCreatorEventStmt,
            [
                id,
                guildId,
            ],
        );
        if (ret === null) return null;
        return rowToEvent(ret);
    };

    const fetchAllGuildEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all guild events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.EVENT}->'guilds' @> jsonb_build_array(jsonb_build_object('guildId', $1::text)) `
            + 'ORDER BY '
            + `${EVENTS_COL.ID} DESC`,
    });
    export const fetchAllGuildEvents = async (
        guildId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            fetchAllGuildEventsStmt,
            guildId,
        );
        if (ret === null) return null;
        return ret.map(rowToEvent);
    };

    const fetchGuildEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch guild event',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.ID} = $1::bigint `
            + 'AND'
            + '('
                + `${EVENTS_COL.EVENT}->'guilds' @> jsonb_build_array(jsonb_build_object('guildId', $2::text)) `
            + ')',
    });
    export const fetchAnyGuildEvent = async (
        id: number,
        guildId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard | null> => {
        const ret: EventRow | null = await db.oneOrNone(
            fetchGuildEventStmt,
            [
                id,
                guildId,
            ],
        );
        if (ret === null) return null;
        return rowToEvent(ret);
    };

    const fetchAllGlobalEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all global events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.EVENT}->>'global')::boolean = TRUE`,
    });
    export const fetchAllGlobalEvents = async (
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            fetchAllGlobalEventsStmt,
        );
        if (ret === null) return null;
        return ret.map(rowToEvent);
    };

    const fetchGlobalEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch global event',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.ID} = $1::bigint `
            + 'AND '
            + `(${EVENTS_COL.EVENT}->>'global')::boolean = TRUE`,
    });
    export const fetchGlobalEvent = async (
        id: number,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard | null> => {
        const ret: EventRow | null = await db.oneOrNone(
            fetchGlobalEventStmt,
            id,
        );
        if (ret === null) return null;
        return rowToEvent(ret);
    };

    const fetchAllInvitedEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch all invited events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `(${EVENTS_COL.EVENT}->>'global')::boolean = TRUE `
            + 'AND '
            + '('
            + `${EVENTS_COL.EVENT}->'invitations' @> to_jsonb($1::text) `
            + 'OR NOT '
            + `${EVENTS_COL.EVENT} ? 'invitations'`
            + ')',
    });
    export const fetchAllInvitedEvents = async (
        guildId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            fetchAllInvitedEventsStmt,
            guildId,
        );
        if (ret === null) return null;
        return ret.map(rowToEvent);
    };

    const fetchInvitedEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch global invited event',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + `${EVENTS_COL.ID} = $1::bigint `
            + 'AND '
            + `(${EVENTS_COL.EVENT}->>'global')::boolean = TRUE `
            + 'AND '
            + '('
            + `${EVENTS_COL.EVENT}->'invitations' @> to_jsonb($2::text) `
            + 'OR NOT '
            + `${EVENTS_COL.EVENT} ? 'invitations'`
            + ')',
    });
    export const fetchInvitedEvent = async (
        id: number,
        guildId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard | null> => {
        const ret: EventRow | null = await db.oneOrNone(
            fetchInvitedEventStmt,
            [
                id,
                guildId,
            ],
        );
        if (ret === null) return null;
        return rowToEvent(ret);
    };

    const fetchAllOfAParticipantsEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
        name: 'fetch a participant\'s events',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS}, `
            + `jsonb_array_elements(${EVENTS_COL.EVENT}->'teams') teams `
            + 'WHERE '
            + 'teams->\'participants\' @> jsonb_build_array(jsonb_build_object(\'userId\', $1::text))',
    });
    export const fetchAllOfAParticipantsEvents = async (
        userId: string,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            fetchAllOfAParticipantsEventsStmt,
            userId,
        );
        if (ret === null) return null;
        return ret.map(rowToEvent);
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
            + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz, (${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz`
            + ')'
            + ' OVERLAPS '
            + '('
            + '$1::timestamptz, $2::timestamptz'
            + ')',
    });
    export const fetchAllEventsBetweenDates = async (
        dateA: Date,
        dateB: Date,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            eventsBetweenDatesStmt,
            [
                dateA.toISOString(),
                dateB.toISOString(),
            ],
        );
        if (ret === null) return null;
        return ret.map(rowToEvent);
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
            + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz <= current_timestamp `
            + 'AND '
            + `(${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz > current_timestamp`
            + ')'
            + 'ORDER BY '
            + `${EVENTS_COL.ID} ASC`,
    });
    export const fetchAllCurrentlyRunningEvents = async (
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            eventsCurrentlyRunningStmt,
        );
        if (ret === null) return null;
        return ret.map(rowToEvent);
    };

    const guildEventsBetweenDatesStmt: pgp.PreparedStatement = new PreparedStatement({
        name: 'fetch all guild events between dates',
        text: 'SELECT '
            + `${EVENTS_COL.ID}, `
            + `${EVENTS_COL.EVENT} `
            + 'FROM '
            + `${TABLES.EVENTS} `
            + 'WHERE '
            + '('
                + `${EVENTS_COL.EVENT}->'guilds' @> jsonb_build_array(jsonb_build_object('guildId', $1::text)) `
            + ') '
            + 'AND '
            + '('
            + '('
            + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz, (${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz`
            + ')'
            + ' OVERLAPS '
            + '('
            + '$2::timestamptz, $3::timestamptz'
            + ')'
            + ')',
    });
    export const fetchAllGuildEventsBetweenDates = async (
        guildId: string,
        dateA: Date,
        dateB: Date,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Event.Standard[] | null> => {
        const ret: EventRow[] | null = await db.manyOrNone(
            guildEventsBetweenDatesStmt,
            [
                guildId,
                dateA.toISOString(),
                dateB.toISOString(),
            ],
        );
        if (ret === null) return null;
        return ret.map(rowToEvent);
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
            + 'ON CONFLICT DO NOTHING '
            + 'RETURNING *',
    });
    export const upsertSettings = async (
        settings: Settings.GuildSettings,
        db: pgp.IDatabase<unknown> = Db.mainDb,
    ): Promise<Settings.GuildSettings> => {
        const ret: {
            [SETTINGS_COL.GUILD_ID]: string;
            [SETTINGS_COL.CHANNEL_ID]: string;
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
            payTier: ret[SETTINGS_COL.PAY_TIER],
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
    ): Promise<Settings.GuildSettings | null> => {
        const ret: {
            [SETTINGS_COL.GUILD_ID]: string;
            [SETTINGS_COL.CHANNEL_ID]: string;
            [SETTINGS_COL.PAY_TIER]: Settings.PAY_TIER;
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
            payTier: ret[SETTINGS_COL.PAY_TIER],
        };
    };
}
