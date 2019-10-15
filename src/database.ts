
import Database, * as sqlite3 from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { Utils, } from './utils';
import { Event, } from './event';


// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Db {
    export const tempDb = new Database('temp.db', { memory: true, });
    export const persistentDb = new Database('persistent.db', {});

    process.on('exit', (): void => {
        tempDb.close();
        persistentDb.close();
    });
    process.on('SIGHUP', (): void => process.exit(128 + 1));
    process.on('SIGINT', (): void => process.exit(128 + 2));
    process.on('SIGTERM', (): void => process.exit(128 + 15));

    enum TABLES {
        EVENTS = 'events',
        GUILDS = 'guilds',
        TEAMS = 'teams',
        PARTICIPANTS = 'participants',
        ACCOUNTS = 'accounts',
        EVENT_GUILD_XREF = 'event-guild-xref',
        EVENT_TEAM_XREF = 'event-team-xref',
        EVENT_TEAM_PARTICIPANT_XREF = 'event-team-participant-xref',
        EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF = 'event-team-participant-account-xref',
    }

    enum EVENTS_COL {
        ID = 'id',
        NAME = 'name',
        STARTING = 'starting',
        ENDING = 'ending',
        TRACKING = 'tracking',
        TRACKING_WHAT = 'tracking_what',
    }

    enum GUILDS_COL {
        ID = 'id',
        DISCORD_ID = 'discord id',
        SCOREBOARD_MESSAGE_DISCORD_CHANNEL_ID = 'scoreboard_channel_id',
        SCOREBOARD_MESSAGE_DISCORD_MESSAGE_ID = 'scoreboard_message_id',
        STATUS_MESSAGE_DISCORD_CHANNEL_ID = 'status_channel_id',
        STATUS_MESSAGE_DISCORD_MESSAGE_ID = 'status_discord_id',
    }

    enum TEAMS_COL {
        ID = 'id',
        NAME = 'name',
    }

    enum PARTICIPANTS_COL {
        ID = 'id',
        DISCORD_ID = 'discord_id',
        CUSTOM_SCORE = 'custom_score',
    }

    enum ACCOUNTS_COL {
        ID = 'id',
        RSN = 'rsn',
        SKILLS_OVERALL_XP_STARTING = 'skills_overall_xp_starting',
        SKILLS_OVERALL_XP_ENDING = 'skills_overall_xp_ending',
        SKILLS_ATTACK_XP_STARTING = 'skills_attack_xp_starting',
        SKILLS_ATTACK_XP_ENDING = 'skills_attack_xp_ending',
        SKILLS_DEFENSE_XP_STARTING = 'skills_defense_xp_starting',
        SKILLS_DEFENSE_XP_ENDING = 'skills_defense_xp_ending',
        SKILLS_STRENGTH_XP_STARTING = 'skills_strength_xp_starting',
        SKILLS_STRENGTH_XP_ENDING = 'skills_strength_xp_ending',
        SKILLS_HITPOINTS_XP_STARTING = 'skills_hitpoints_xp_starting',
        SKILLS_HITPOINTS_XP_ENDING = 'skills_hitpoints_xp_ending',
        SKILLS_RANGED_XP_STARTING = 'skills_ranged_xp_starting',
        SKILLS_RANGED_XP_ENDING = 'skills_ranged_xp_ending',
        SKILLS_PRAYER_XP_STARTING = 'skills_prayer_xp_starting',
        SKILLS_PRAYER_XP_ENDING = 'skills_prayer_xp_ending',
        SKILLS_MAGIC_XP_STARTING = 'skills_magic_xp_starting',
        SKILLS_MAGIC_XP_ENDING = 'skills_magic_xp_ending',
        SKILLS_COOKING_XP_STARTING = 'skills_cooking_xp_starting',
        SKILLS_COOKING_XP_ENDING = 'skills_cooking_xp_ending',
        SKILLS_WOODCUTTING_XP_STARTING = 'skills_woodcutting_xp_starting',
        SKILLS_WOODCUTTING_XP_ENDING = 'skills_woodcutting_xp_ending',
        SKILLS_FLETCHING_XP_STARTING = 'skills_fletching_xp_starting',
        SKILLS_FLETCHING_XP_ENDING = 'skills_fletching_xp_ending',
        SKILLS_FISHING_XP_STARTING = 'skills_fishing_xp_starting',
        SKILLS_FISHING_XP_ENDING = 'skills_fishing_xp_ending',
        SKILLS_FIREMAKING_XP_STARTING = 'skills_firemaking_xp_starting',
        SKILLS_FIREMAKING_XP_ENDING = 'skills_firemaking_xp_ending',
        SKILLS_CRAFTING_XP_STARTING = 'skills_crafting_xp_starting',
        SKILLS_CRAFTING_XP_ENDING = 'skills_crafting_xp_ending',
        SKILLS_SMITHING_XP_STARTING = 'skills_smithing_xp_starting',
        SKILLS_SMITHING_XP_ENDING = 'skills_smithing_xp_ending',
        SKILLS_MINING_XP_STARTING = 'skills_mining_xp_starting',
        SKILLS_MINING_XP_ENDING = 'skills_mining_xp_ending',
        SKILLS_HERBLORE_XP_STARTING = 'skills_herblore_xp_starting',
        SKILLS_HERBLORE_XP_ENDING = 'skills_herblore_xp_ending',
        SKILLS_AGILITY_XP_STARTING = 'skills_agility_xp_starting',
        SKILLS_AGILITY_XP_ENDING = 'skills_agility_xp_ending',
        SKILLS_THIEVING_XP_STARTING = 'skills_thieving_xp_starting',
        SKILLS_THIEVING_XP_ENDING = 'skills_thieving_xp_ending',
        SKILLS_SLAYER_XP_STARTING = 'skills_slayer_xp_starting',
        SKILLS_SLAYER_XP_ENDING = 'skills_slayer_xp_ending',
        SKILLS_FARMING_XP_STARTING = 'skills_farming_xp_starting',
        SKILLS_FARMING_XP_ENDING = 'skills_farming_xp_ending',
        SKILLS_RUNECRAFT_XP_STARTING = 'skills_runecraft_xp_starting',
        SKILLS_RUNECRAFT_XP_ENDING = 'skills_runecraft_xp_ending',
        SKILLS_HUNTER_XP_STARTING = 'skills_hunter_xp_starting',
        SKILLS_HUNTER_XP_ENDING = 'skills_hunter_xp_ending',
        SKILLS_CONSTRUCTION_XP_STARTING = 'skills_construction_xp_starting',
        SKILLS_CONSTRUCTION_XP_ENDING = 'skills_construction_xp_ending',
        BH_HUNTER_SCORE_STARTING = 'bh_hunter_score_starting',
        BH_HUNTER_SCORE_ENDING = 'bh_hunter_score_ending',
        BH_ROGUE_SCORE_STARTING = 'bh_rogue_score_starting',
        BH_ROGUE_SCORE_ENDING = 'bh_rogue_score_ending',
        LMS_SCORE_STARTING = 'lms_score_starting',
        LMS_SCORE_ENDING = 'lms_score_ending',
        CLUES_ALL_SCORE_STARTING = 'clues_all_score_starting',
        CLUES_ALL_SCORE_ENDING = 'clues_all_score_ending',
        CLUES_BEGINNER_SCORE_STARTING = 'clues_beginner_score_starting',
        CLUES_BEGINNER_SCORE_ENDING = 'clues_beginner_score_ending',
        CLUES_EASY_SCORE_STARTING = 'clues_easy_score_starting',
        CLUES_EASY_SCORE_ENDING = 'clues_easy_score_ending',
        CLUES_MEDIUM_SCORE_STARTING = 'clues_medium_score_starting',
        CLUES_MEDIUM_SCORE_ENDING = 'clues_medium_score_ending',
        CLUES_HARD_SCORE_STARTING = 'clues_hard_score_starting',
        CLUES_HARD_SCORE_ENDING = 'clues_hard_score_ending',
        CLUES_ELITE_SCORE_STARTING = 'clues_elite_score_starting',
        CLUES_ELITE_SCORE_ENDING = 'clues_elite_score_ending',
        CLUES_MASTER_SCORE_STARTING = 'clues_master_score_starting',
        CLUES_MASTER_SCORE_ENDING = 'clues_master_score_ending',
    }

    enum EVENT_GUILD_XREF_COL {
        EVENT_ID = 'event_id',
        GUILD_ID = 'guild_id',
    }

    enum EVENT_TEAM_XREF_COL {
        EVENT_ID = 'event_id',
        TEAM_ID = 'team_id',
    }

    enum EVENT_TEAM_PARTICIPANT_XREF_COL {
        EVENT_ID = 'event_id',
        TEAM_ID = 'team_id',
        PARTICIPANT_ID = 'participant_id',
    }

    enum EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL {
        EVENT_ID = 'event_id',
        TEAM_ID = 'team_id',
        PARTICIPANT_ID = 'participant_id',
        ACCOUNT_ID = 'account_id',
    }

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

    export const insertNewEvent = (
        db: sqlite3.Database,
        event: Event.Event,
    ): Event.Event => {
        // prepare standard table insert statements
        const insertEventStmt: sqlite3.Statement = db.prepare(
            'INSERT INTO'
            + `'${TABLES.EVENTS}'`
            + '('
            + `'${EVENTS_COL.NAME}'`
            + ','
            + `'${EVENTS_COL.STARTING}'`
            + ','
            + `'${EVENTS_COL.ENDING}'`
            + ','
            + `'${EVENTS_COL.TRACKING}'`
            + ','
            + `'${EVENTS_COL.TRACKING_WHAT}'`
            + ')'
            + 'VALUES'
            + '('
            + `${event.name ? `'${event.name}'` : null}`
            + ','
            + `${event.when ? `'${event.when.start.toISOString()}'` : null}`
            + ','
            + `${event.when ? `'${event.when.end.toISOString()}'` : null}`
            + ','
            + `${event.tracker ? `'${event.tracker.tracking}'` : null}`
            + ','
            + `${event.tracker && event.tracker.what ? `'${event.tracker.what.join(',')}'` : null}`
            + ')'
        );

        const insertGuildStmts: sqlite3.Statement[] = event.competingGuilds.map(
            (guild: Event.CompetingGuild):
            sqlite3.Statement => {
                const insertGuildStmt: sqlite3.Statement = db.prepare(
                    'INSERT INTO'
                    + `'${TABLES.GUILDS}'`
                    + '('
                    + `'${GUILDS_COL.DISCORD_ID}'`
                    + ','
                    + `'${GUILDS_COL.SCOREBOARD_MESSAGE_DISCORD_CHANNEL_ID}'`
                    + ','
                    + `'${GUILDS_COL.SCOREBOARD_MESSAGE_DISCORD_MESSAGE_ID}'`
                    + ','
                    + `'${GUILDS_COL.STATUS_MESSAGE_DISCORD_CHANNEL_ID}'`
                    + ','
                    + `'${GUILDS_COL.STATUS_MESSAGE_DISCORD_MESSAGE_ID}'`
                    + ')'
                    + 'VALUES'
                    + '('
                    + `'${guild.discordId}'`
                    + ','
                    + `${guild.guildMessages && guild.guildMessages.scoreboardMessage ? `'${guild.guildMessages.scoreboardMessage.channelId}'` : null}`
                    + ','
                    + `${guild.guildMessages && guild.guildMessages.scoreboardMessage ? `'${guild.guildMessages.scoreboardMessage.messageId}'` : null}`
                    + ','
                    + `${guild.guildMessages ? `'${guild.guildMessages.statusMessage.channelId}'` : null}`
                    + ','
                    + `${guild.guildMessages ? `'${guild.guildMessages.statusMessage.messageId}'` : null}`
                    + ')'
                );
                return insertGuildStmt;
            }
        );

        const insertTeamStmts: sqlite3.Statement[] = event.teams.map(
            (team: Event.Team):
            sqlite3.Statement => db.prepare(
                'INSERT INTO'
                + `'${TABLES.TEAMS}'`
                + '('
                + `'${TEAMS_COL.NAME}'`
                + ')'
                + 'VALUES'
                + '('
                + `${team.name}`
                + ')'
            )
        );

        const insertParticipantStmts: sqlite3.Statement[] = event.teams.flatMap(
            (team: Event.Team):

        );

        // .map(
        //     (participant: Event.Participant):
        //     sqlite3.Statement => db.prepare(
        //         'INSERT INTO'
        //         + `${TABLES.PARTICIPANTS}`
        //         + '('
        //         + `${PARTICIPANTS_COL.DISCORD_ID}`
        //         + ','
        //         + `${PARTICIPANTS_COL.CUSTOM_SCORE}`
        //         + ')'
        //     )
        // );

        let insertEventResult: sqlite3.RunResult;
        let insertGuildResults: sqlite3.RunResult[];
        let insertTeamResults: sqlite3.RunResult[];
        let insertParticipantResults: sqlite3.RunResult[];

        // execute standard table insertion statments
        const insertEventTrns: sqlite3.Transaction = db.transaction(
            (): void => {
                const insertPrimaryTables: sqlite3.Transaction = db.transaction(
                    (): void => {
                        insertEventResult = insertEventStmt.run();
                        insertGuildResults = insertGuildStmts.map(
                            (stmt: sqlite3.Statement):
                            sqlite3.RunResult => stmt.run()
                        );
                        insertTeamResults = insertTeamStmts.map(
                            (stmt: sqlite3.Statement):
                            sqlite3.RunResult => stmt.run()
                        );
                    }
                );
                insertPrimaryTables();

                // prepare xref insert statements
                const insertEventGuildXrefStmts: sqlite3.Statement[] = insertGuildResults.map(
                    (insertGuildResult: sqlite3.RunResult):
                    sqlite3.Statement => db.prepare(
                        'INSERT INTO'
                        + `'${TABLES.EVENT_GUILD_XREF}'`
                        + '('
                        + `'${EVENT_GUILD_XREF_COL.EVENT_ID}'`
                        + ','
                        + `'${EVENT_GUILD_XREF_COL.GUILD_ID}'`
                        + ')'
                        + 'VALUES'
                        + '('
                        + `${insertEventResult.lastInsertRowid as number}`
                        + ','
                        + `${insertGuildResult.lastInsertRowid as number}`
                        + ')'
                    )
                );

                // execute xref insert statements
                const insertXrefTables: sqlite3.Transaction = db.transaction(
                    (): void => {
                        insertEventGuildXrefStmts.map(
                            (stmt: sqlite3.Statement):
                            sqlite3.RunResult => stmt.run()
                        );
                    }
                );
                insertXrefTables();
            }
        );
        insertEventTrns();

        return {
            ...event,
            id: insertEventResult.lastInsertRowid.valueOf() as number,
        };
    };

    export const createTables = (
        db: sqlite3.Database,
    ): boolean => {
        const createEventsStmt: sqlite3.Statement = db.prepare(
            'CREATE TABLE IF NOT EXISTS'
            + `'${TABLES.EVENTS}'`
            + '('
            + `'${EVENTS_COL.ID}' INTEGER PRIMARY KEY NOT NULL`
            + ','
            + `'${EVENTS_COL.NAME}' TEXT NOT NULL`
            + ','
            + `'${EVENTS_COL.STARTING}' TEXT DEFAULT NULL`
            + ','
            + `'${EVENTS_COL.ENDING}' TEXT DEFAULT NULL`
            + ','
            + `'${EVENTS_COL.TRACKING}' TEXT DEFAULT NULL`
            + ','
            + `'${EVENTS_COL.TRACKING_WHAT}' TEXT DEFAULT NULL`
            + ','
            + 'CHECK'
            + '('
            + `datetime('${EVENTS_COL.STARTING}') < datetime('${EVENTS_COL.ENDING}')`
            + ')'
            + ')'
        );
        const createGuildsStmt: sqlite3.Statement = db.prepare(
            'CREATE TABLE IF NOT EXISTS'
            + `'${TABLES.GUILDS}'`
            + '('
            + `'${GUILDS_COL.ID}' INTEGER PRIMARY KEY`
            + ','
            + `'${GUILDS_COL.DISCORD_ID}' TEXT NOT NULL UNIQUE`
            + ','
            + `'${GUILDS_COL.SCOREBOARD_MESSAGE_DISCORD_CHANNEL_ID}' TEXT`
            + ','
            + `'${GUILDS_COL.SCOREBOARD_MESSAGE_DISCORD_MESSAGE_ID}' TEXT UNIQUE`
            + ','
            + `'${GUILDS_COL.STATUS_MESSAGE_DISCORD_CHANNEL_ID}' TEXT`
            + ','
            + `'${GUILDS_COL.STATUS_MESSAGE_DISCORD_MESSAGE_ID}' TEXT UNIQUE`
            + ')'
        );
        const createTeamsStmt: sqlite3.Statement = db.prepare(
            'CREATE TABLE IF NOT EXISTS'
            + `'${TABLES.TEAMS}'`
            + '('
            + `'${TEAMS_COL.ID}' INTEGER PRIMARY KEY`
            + ','
            + `'${TEAMS_COL.NAME}' TEXT NOT NULL`
            + ')'
        );
        const createParticipantsStmt: sqlite3.Statement = db.prepare(
            'CREATE TABLE IF NOT EXISTS'
            + `'${TABLES.PARTICIPANTS}'`
            + '('
            + `'${PARTICIPANTS_COL.ID}' INTEGER PRIMARY KEY`
            + ','
            + `'${PARTICIPANTS_COL.DISCORD_ID}' TEXT NOT NULL UNIQUE`
            + ','
            + `'${PARTICIPANTS_COL.CUSTOM_SCORE}' INTEGER NOT NULL DEFAULT 0`
            + ')'
        );
        const createAccountsStmt: sqlite3.Statement = db.prepare(
            'CREATE TABLE IF NOT EXISTS'
            + `'${TABLES.ACCOUNTS}'`
            + '('
            + `'${ACCOUNTS_COL.ID}' INTEGER PRIMARY KEY`
            + ','
            + `'${ACCOUNTS_COL.RSN}' TEXT DEFAULT NULL`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_OVERALL_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_OVERALL_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_ATTACK_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_ATTACK_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_DEFENSE_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_DEFENSE_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_STRENGTH_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_STRENGTH_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_HITPOINTS_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_HITPOINTS_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_RANGED_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_RANGED_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_PRAYER_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_PRAYER_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_MAGIC_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_MAGIC_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_COOKING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_COOKING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_WOODCUTTING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_WOODCUTTING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_FLETCHING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_FLETCHING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_FISHING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_FISHING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_FIREMAKING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_FIREMAKING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_CRAFTING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_CRAFTING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_SMITHING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_SMITHING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_MINING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_MINING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_HERBLORE_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_HERBLORE_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_AGILITY_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_AGILITY_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_THIEVING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_THIEVING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_SLAYER_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_SLAYER_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_FARMING_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_FARMING_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_RUNECRAFT_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_RUNECRAFT_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_HUNTER_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_HUNTER_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_CONSTRUCTION_XP_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.SKILLS_CONSTRUCTION_XP_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.BH_HUNTER_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.BH_HUNTER_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.BH_ROGUE_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.BH_ROGUE_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.LMS_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.LMS_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_ALL_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_ALL_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_BEGINNER_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_BEGINNER_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_EASY_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_EASY_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_MEDIUM_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_MEDIUM_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_HARD_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_HARD_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_ELITE_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_ELITE_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_MASTER_SCORE_STARTING}' INTEGER NOT NULL DEFAULT 0`
            + ','
            + `'${ACCOUNTS_COL.CLUES_MASTER_SCORE_ENDING}' INTEGER NOT NULL DEFAULT 0`
            + ')'
        );
        const createEventGuildXrefStmt: sqlite3.Statement = db.prepare(
            'CREATE TABLE IF NOT EXISTS'
            + `'${TABLES.EVENT_GUILD_XREF}'`
            + '('
            + `'${EVENT_GUILD_XREF_COL.EVENT_ID}'`
            + ','
            + `'${EVENT_GUILD_XREF_COL.GUILD_ID}'`
            + ','
            + 'PRIMARY KEY'
            + '('
            + `'${EVENT_GUILD_XREF_COL.EVENT_ID}'`
            + ','
            + `'${EVENT_GUILD_XREF_COL.GUILD_ID}'`
            + ')'
            + ','
            + `FOREIGN KEY ('${EVENT_GUILD_XREF_COL.EVENT_ID}') REFERENCES '${TABLES.EVENTS}' ('${EVENTS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ','
            + `FOREIGN KEY ('${EVENT_GUILD_XREF_COL.GUILD_ID}') REFERENCES '${TABLES.GUILDS}' ('${GUILDS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ')'
        );
        const createEventTeamXrefStmt: sqlite3.Statement = db.prepare(
            'CREATE TABLE IF NOT EXISTS'
            + `'${TABLES.EVENT_TEAM_XREF}'`
            + '('
            + `'${EVENT_TEAM_XREF_COL.EVENT_ID}'`
            + ','
            + `'${EVENT_TEAM_XREF_COL.TEAM_ID}'`
            + ','
            + 'PRIMARY KEY'
            + '('
            + `'${EVENT_TEAM_XREF_COL.EVENT_ID}'`
            + ','
            + `'${EVENT_TEAM_XREF_COL.TEAM_ID}'`
            + ')'
            + ','
            + `FOREIGN KEY ('${EVENT_TEAM_XREF_COL.EVENT_ID}') REFERENCES '${TABLES.EVENTS}' ('${EVENTS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ','
            + `FOREIGN KEY ('${EVENT_TEAM_XREF_COL.TEAM_ID}') REFERENCES '${TABLES.TEAMS}' ('${TEAMS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ')'
        );
        const createEventTeamParticipantXrefStmt: sqlite3.Statement = db.prepare(
            'CREATE TABLE IF NOT EXISTS'
            + `'${TABLES.EVENT_TEAM_PARTICIPANT_XREF}'`
            + '('
            + `'${EVENT_TEAM_PARTICIPANT_XREF_COL.EVENT_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_XREF_COL.TEAM_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_XREF_COL.PARTICIPANT_ID}'`
            + ','
            + 'PRIMARY KEY'
            + '('
            + `'${EVENT_TEAM_PARTICIPANT_XREF_COL.EVENT_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_XREF_COL.TEAM_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_XREF_COL.PARTICIPANT_ID}'`
            + ')'
            + ','
            + `FOREIGN KEY ('${EVENT_TEAM_PARTICIPANT_XREF_COL.EVENT_ID}') REFERENCES '${TABLES.EVENTS}' ('${EVENTS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ','
            + `FOREIGN KEY ('${EVENT_TEAM_PARTICIPANT_XREF_COL.TEAM_ID}') REFERENCES '${TABLES.TEAMS}' ('${TEAMS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ','
            + `FOREIGN KEY ('${EVENT_TEAM_PARTICIPANT_XREF_COL.PARTICIPANT_ID}') REFERENCES '${TABLES.PARTICIPANTS}' ('${PARTICIPANTS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ')'
        );
        const creteEventTeamParticipantAccountXrefStmt: sqlite3.Statement = db.prepare(
            'CREATE TABLE IF NOT EXISTS'
            + `'${TABLES.EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF}'`
            + '('
            + `'${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.EVENT_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.TEAM_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.PARTICIPANT_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.ACCOUNT_ID}'`
            + ','
            + 'PRIMARY KEY'
            + '('
            + `'${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.EVENT_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.TEAM_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.PARTICIPANT_ID}'`
            + ','
            + `'${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.ACCOUNT_ID}'`
            + ')'
            + ','
            + `FOREIGN KEY ('${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.EVENT_ID}') REFERENCES '${TABLES.EVENTS}' ('${EVENTS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ','
            + `FOREIGN KEY ('${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.TEAM_ID}') REFERENCES '${TABLES.TEAMS}' ('${TEAMS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ','
            + `FOREIGN KEY ('${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.PARTICIPANT_ID}') REFERENCES '${TABLES.PARTICIPANTS}' ('${PARTICIPANTS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ','
            + `FOREIGN KEY ('${EVENT_TEAM_PARTICIPANT_ACCOUNT_XREF_COL.ACCOUNT_ID}') REFERENCES '${TABLES.ACCOUNTS}' ('${ACCOUNTS_COL.ID}') ON DELETE CASCADE ON UPDATE NO ACTION`
            + ')'
        );

        // Utils.logger.debug(createEventsStmt.source);
        // Utils.logger.debug(createGuildsStmt.source);
        // Utils.logger.debug(createTeamsStmt.source);
        // Utils.logger.debug(createParticipantsStmt.source);
        // Utils.logger.debug(createAccountsStmt.source);

        // Utils.logger.debug(createEventGuildXrefStmt.source);
        // Utils.logger.debug(createEventTeamXrefStmt.source);
        // Utils.logger.debug(createEventTeamParticipantXrefStmt.source);
        // Utils.logger.debug(creteEventTeamParticipantAccountXrefStmt.source);
        const createTrns: sqlite3.Transaction = db.transaction(
            (): void => {
                createEventsStmt.run();
                createGuildsStmt.run();
                createTeamsStmt.run();
                createParticipantsStmt.run();
                createAccountsStmt.run();

                createEventGuildXrefStmt.run();
                createEventTeamXrefStmt.run();
                createEventTeamParticipantXrefStmt.run();
                creteEventTeamParticipantAccountXrefStmt.run();
            }
        );
        createTrns();

        return true;
    };

    const checkTablesExist = (
        db: sqlite3.Database
    ): boolean => {
        const stmt: sqlite3.Statement = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='${TABLES.EVENTS}'`
        );
        const table = stmt.get();
        if (table === undefined) {
            return false;
        }
        return true;
    };

    const importData = (
        db: sqlite3.Database,
    ): void => {

    };
}
