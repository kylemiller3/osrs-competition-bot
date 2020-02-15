import pgp from 'pg-promise';
// eslint-disable-next-line import/no-unresolved
import pg from 'pg-promise/typescript/pg-subset';
import QueryStream from 'pg-query-stream';
import { tap } from 'rxjs/operators';
import { streamToRx, streamToStringRx } from 'rxjs-stream';
import { Observable } from 'rxjs';
import { Utils } from './utils';
import { Event } from './event';
import { dbPassword } from '../auth';
import {
    upsertEventStmt, upsertTeamStmt, upsertParticipantStmt, upsertStartingAccountStmt, upsertGuildStmt, upsertMessagesStmt, fetchEventJsonStmt, createTableStartingAccountStmt, createTableEventsStmt, createTableGuildStmt, createTableMessageStmt, createTableParticipantsStmt, createTableTeamsStmt, EventRow, upsertCurrentAccountStmt, upsertTrackingStmt,
} from './databaseMisc';


// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Db {
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
        error(event: pgp.IEventContext): void {
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

    export const mainDb: pgp.IDatabase<unknown> = pgp(initOptions)({
        host: 'localhost',
        port: 5432,
        database: 'osrs-competition-bot',
        user: 'postgres',
        password: dbPassword,
    });

    export const testDb: pgp.IDatabase<unknown> = pgp(initOptions)({
        host: 'localhost',
        port: 5432,
        database: 'osrs-competition-bot-test',
        user: 'postgres',
        password: dbPassword,
    });

    export const createTables = async (
        db: pgp.IDatabase<unknown> = mainDb,
    ): Promise<void> => {
        await db.task(
            async (): Promise<void> => {
                await db.none(
                    createTableEventsStmt,
                );

                await db.none(
                    createTableTeamsStmt,
                );

                await db.none(
                    createTableParticipantsStmt,
                );

                await db.none(
                    createTableStartingAccountStmt,
                );

                await db.none(
                    createTableGuildStmt,
                );

                await db.none(
                    createTableMessageStmt,
                );
            },
        );
    };

    export const fetchEventJson = async (
        id: number,
        db: pgp.IDatabase<unknown> = mainDb,
    ): Promise<null | any> => {
        const event = await db.oneOrNone(
            fetchEventJsonStmt,
            [
                id,
            ],
        );
        return event.jsonb_build_object;
    };

    export const saveEvent = async (
        event: Event.Standard,
        db: pgp.IDatabase<unknown> = mainDb,
    ): Promise<void> => {
        await db.task(
            async (): Promise<void> => {
                const eventId = await db.one(
                    upsertEventStmt,
                    [
                        event.name,
                        event.startingDate.toISOString(),
                        event.endingDate.toISOString(),
                        event.isGlobal,
                        event.isAdminLocked,
                    ],
                );

                const teamPromises: Promise<void>[] = event.teams.map(
                    async (team: Event.Team): Promise<void> => {
                        const teamId = await db.one(
                            upsertTeamStmt,
                            [
                                eventId.id,
                                team.name,
                                team.guildId,
                            ],
                        );
                        const participantPromises: Promise<void>[] = team.participants.map(
                            async (participant: Event.Participant): Promise<void> => {
                                const participantId = await db.one(
                                    upsertParticipantStmt,
                                    [
                                        teamId.id,
                                        participant.userId,
                                        participant.customScore,
                                    ],
                                );
                                const accountPromises:
                                Promise<void>[] = participant.runescapeAccounts.map(
                                    async (account: Event.Account): Promise<void> => {
                                        if (account.starting !== undefined) {
                                            const startingPart: (string | number)[] = [
                                                account.starting.bh.rogue.rank,
                                                account.starting.bh.rogue.score,
                                                account.starting.bh.hunter.rank,
                                                account.starting.bh.hunter.score,
                                                account.starting.lms.rank,
                                                account.starting.lms.score,
                                                account.starting.clues.all.rank,
                                                account.starting.clues.all.score,
                                                account.starting.clues.easy.rank,
                                                account.starting.clues.easy.score,
                                                account.starting.clues.hard.rank,
                                                account.starting.clues.hard.score,
                                                account.starting.clues.elite.rank,
                                                account.starting.clues.elite.score,
                                                account.starting.clues.master.rank,
                                                account.starting.clues.master.score,
                                                account.starting.clues.medium.rank,
                                                account.starting.clues.medium.score,
                                                account.starting.clues.beginner.rank,
                                                account.starting.clues.beginner.score,
                                                account.starting.bosses.Obor.rank,
                                                account.starting.bosses.Obor.score,
                                                account.starting.bosses.Mimic.rank,
                                                account.starting.bosses.Mimic.score,
                                                account.starting.bosses.Kraken.rank,
                                                account.starting.bosses.Kraken.score,
                                                account.starting.bosses.Zulrah.rank,
                                                account.starting.bosses.Zulrah.score,
                                                account.starting.bosses.Hespori.rank,
                                                account.starting.bosses.Hespori.score,
                                                account.starting.bosses.Scorpia.rank,
                                                account.starting.bosses.Scorpia.score,
                                                account.starting.bosses.Skotizo.rank,
                                                account.starting.bosses.Skotizo.score,
                                                account.starting.bosses["Vet'ion"].rank,
                                                account.starting.bosses["Vet'ion"].score,
                                                account.starting.bosses.Vorkath.rank,
                                                account.starting.bosses.Vorkath.score,
                                                account.starting.bosses.Zalcano.rank,
                                                account.starting.bosses.Zalcano.score,
                                                account.starting.bosses.Callisto.rank,
                                                account.starting.bosses.Callisto.score,
                                                account.starting.bosses.Cerberus.rank,
                                                account.starting.bosses.Cerberus.score,
                                                account.starting.bosses.Bryophyta.rank,
                                                account.starting.bosses.Bryophyta.score,
                                                account.starting.bosses["Kree'Arra"].rank,
                                                account.starting.bosses["Kree'Arra"].score,
                                                account.starting.bosses.Sarachnis.rank,
                                                account.starting.bosses.Sarachnis.score,
                                                account.starting.bosses['TzKal-Zuk'].rank,
                                                account.starting.bosses['TzKal-Zuk'].score,
                                                account.starting.bosses['TzTok-Jad'].rank,
                                                account.starting.bosses['TzTok-Jad'].score,
                                                account.starting.bosses.Venenatis.rank,
                                                account.starting.bosses.Venenatis.score,
                                                account.starting.bosses['Giant Mole'].rank,
                                                account.starting.bosses['Giant Mole'].score,
                                                account.starting.bosses.Wintertodt.rank,
                                                account.starting.bosses.Wintertodt.score,
                                                account.starting.bosses['Abyssal Sire'].rank,
                                                account.starting.bosses['Abyssal Sire'].score,
                                                account.starting.bosses['The Gauntlet'].rank,
                                                account.starting.bosses['The Gauntlet'].score,
                                                account.starting.bosses['Chaos Fanatic'].rank,
                                                account.starting.bosses['Chaos Fanatic'].score,
                                                account.starting.bosses['Dagannoth Rex'].rank,
                                                account.starting.bosses['Dagannoth Rex'].score,
                                                account.starting.bosses['Barrows Chests'].rank,
                                                account.starting.bosses['Barrows Chests'].score,
                                                account.starting.bosses['Kalphite Queen'].rank,
                                                account.starting.bosses['Kalphite Queen'].score,
                                                account.starting.bosses['Chaos Elemental'].rank,
                                                account.starting.bosses['Chaos Elemental'].score,
                                                account.starting.bosses['Corporeal Beast'].rank,
                                                account.starting.bosses['Corporeal Beast'].score,
                                                account.starting.bosses['Dagannoth Prime'].rank,
                                                account.starting.bosses['Dagannoth Prime'].score,
                                                account.starting.bosses['Alchemical Hydra'].rank,
                                                account.starting.bosses['Alchemical Hydra'].score,
                                                account.starting.bosses['General Graardor'].rank,
                                                account.starting.bosses['General Graardor'].score,
                                                account.starting.bosses["K'ril Tsutsaroth"].rank,
                                                account.starting.bosses["K'ril Tsutsaroth"].score,
                                                account.starting.bosses['Theatre of Blood'].rank,
                                                account.starting.bosses['Theatre of Blood'].score,
                                                account.starting.bosses['Chambers of Xeric'].rank,
                                                account.starting.bosses['Chambers of Xeric'].score,
                                                account.starting.bosses['Commander Zilyana'].rank,
                                                account.starting.bosses['Commander Zilyana'].score,
                                                account.starting.bosses['Dagannoth Supreme'].rank,
                                                account.starting.bosses['Dagannoth Supreme'].score,
                                                account.starting.bosses['King Black Dragon'].rank,
                                                account.starting.bosses['King Black Dragon'].score,
                                                account.starting.bosses['Crazy Archaeologist'].rank,
                                                account.starting.bosses['Crazy Archaeologist'].score,
                                                account.starting.bosses['Grotesque Guardians'].rank,
                                                account.starting.bosses['Grotesque Guardians'].score,
                                                account.starting.bosses['Deranged Archaeologist'].rank,
                                                account.starting.bosses['Deranged Archaeologist'].score,
                                                account.starting.bosses['The Corrupted Gauntlet'].rank,
                                                account.starting.bosses['The Corrupted Gauntlet'].score,
                                                account.starting.bosses['Thermonuclear Smoke Devil'].rank,
                                                account.starting.bosses['Thermonuclear Smoke Devil'].score,
                                                account.starting.bosses['Chambers of Xeric: Challenge Mode'].rank,
                                                account.starting.bosses['Chambers of Xeric: Challenge Mode'].score,
                                                account.starting.skills.magic.xp,
                                                account.starting.skills.magic.rank,
                                                account.starting.skills.magic.level,
                                                account.starting.skills.attack.xp,
                                                account.starting.skills.attack.rank,
                                                account.starting.skills.attack.level,
                                                account.starting.skills.hunter.xp,
                                                account.starting.skills.hunter.rank,
                                                account.starting.skills.hunter.level,
                                                account.starting.skills.mining.xp,
                                                account.starting.skills.mining.rank,
                                                account.starting.skills.mining.level,
                                                account.starting.skills.prayer.xp,
                                                account.starting.skills.prayer.rank,
                                                account.starting.skills.prayer.level,
                                                account.starting.skills.ranged.xp,
                                                account.starting.skills.ranged.rank,
                                                account.starting.skills.ranged.level,
                                                account.starting.skills.slayer.xp,
                                                account.starting.skills.slayer.rank,
                                                account.starting.skills.slayer.level,
                                                account.starting.skills.agility.xp,
                                                account.starting.skills.agility.rank,
                                                account.starting.skills.agility.level,
                                                account.starting.skills.cooking.xp,
                                                account.starting.skills.cooking.rank,
                                                account.starting.skills.cooking.level,
                                                account.starting.skills.defence.xp,
                                                account.starting.skills.defence.rank,
                                                account.starting.skills.defence.level,
                                                account.starting.skills.farming.xp,
                                                account.starting.skills.farming.rank,
                                                account.starting.skills.farming.level,
                                                account.starting.skills.fishing.xp,
                                                account.starting.skills.fishing.rank,
                                                account.starting.skills.fishing.level,
                                                account.starting.skills.overall.xp,
                                                account.starting.skills.overall.rank,
                                                account.starting.skills.overall.level,
                                                account.starting.skills.crafting.xp,
                                                account.starting.skills.crafting.rank,
                                                account.starting.skills.crafting.level,
                                                account.starting.skills.herblore.xp,
                                                account.starting.skills.herblore.rank,
                                                account.starting.skills.herblore.level,
                                                account.starting.skills.smithing.xp,
                                                account.starting.skills.smithing.rank,
                                                account.starting.skills.smithing.level,
                                                account.starting.skills.strength.xp,
                                                account.starting.skills.strength.rank,
                                                account.starting.skills.strength.level,
                                                account.starting.skills.thieving.xp,
                                                account.starting.skills.thieving.rank,
                                                account.starting.skills.thieving.level,
                                                account.starting.skills.fletching.xp,
                                                account.starting.skills.fletching.rank,
                                                account.starting.skills.fletching.level,
                                                account.starting.skills.hitpoints.xp,
                                                account.starting.skills.hitpoints.rank,
                                                account.starting.skills.hitpoints.level,
                                                account.starting.skills.runecraft.xp,
                                                account.starting.skills.runecraft.rank,
                                                account.starting.skills.runecraft.level,
                                                account.starting.skills.firemaking.xp,
                                                account.starting.skills.firemaking.rank,
                                                account.starting.skills.firemaking.level,
                                                account.starting.skills.woodcutting.xp,
                                                account.starting.skills.woodcutting.rank,
                                                account.starting.skills.woodcutting.level,
                                                account.starting.skills.construction.xp,
                                                account.starting.skills.construction.rank,
                                                account.starting.skills.construction.level,
                                                account.starting.bosses.Nightmare.rank,
                                                account.starting.bosses.Nightmare.score,
                                            ];
                                            await db.one(
                                                upsertStartingAccountStmt,
                                                [
                                                    participantId.id,
                                                    account.rsn,
                                                    startingPart,
                                                ],
                                            );
                                        }
                                        if (account.ending !== undefined) {
                                            const endingPart: (string | number)[] = [
                                                account.ending.bh.rogue.rank,
                                                account.ending.bh.rogue.score,
                                                account.ending.bh.hunter.rank,
                                                account.ending.bh.hunter.score,
                                                account.ending.lms.rank,
                                                account.ending.lms.score,
                                                account.ending.clues.all.rank,
                                                account.ending.clues.all.score,
                                                account.ending.clues.easy.rank,
                                                account.ending.clues.easy.score,
                                                account.ending.clues.hard.rank,
                                                account.ending.clues.hard.score,
                                                account.ending.clues.elite.rank,
                                                account.ending.clues.elite.score,
                                                account.ending.clues.master.rank,
                                                account.ending.clues.master.score,
                                                account.ending.clues.medium.rank,
                                                account.ending.clues.medium.score,
                                                account.ending.clues.beginner.rank,
                                                account.ending.clues.beginner.score,
                                                account.ending.bosses.Obor.rank,
                                                account.ending.bosses.Obor.score,
                                                account.ending.bosses.Mimic.rank,
                                                account.ending.bosses.Mimic.score,
                                                account.ending.bosses.Kraken.rank,
                                                account.ending.bosses.Kraken.score,
                                                account.ending.bosses.Zulrah.rank,
                                                account.ending.bosses.Zulrah.score,
                                                account.ending.bosses.Hespori.rank,
                                                account.ending.bosses.Hespori.score,
                                                account.ending.bosses.Scorpia.rank,
                                                account.ending.bosses.Scorpia.score,
                                                account.ending.bosses.Skotizo.rank,
                                                account.ending.bosses.Skotizo.score,
                                                account.ending.bosses["Vet'ion"].rank,
                                                account.ending.bosses["Vet'ion"].score,
                                                account.ending.bosses.Vorkath.rank,
                                                account.ending.bosses.Vorkath.score,
                                                account.ending.bosses.Zalcano.rank,
                                                account.ending.bosses.Zalcano.score,
                                                account.ending.bosses.Callisto.rank,
                                                account.ending.bosses.Callisto.score,
                                                account.ending.bosses.Cerberus.rank,
                                                account.ending.bosses.Cerberus.score,
                                                account.ending.bosses.Bryophyta.rank,
                                                account.ending.bosses.Bryophyta.score,
                                                account.ending.bosses["Kree'Arra"].rank,
                                                account.ending.bosses["Kree'Arra"].score,
                                                account.ending.bosses.Sarachnis.rank,
                                                account.ending.bosses.Sarachnis.score,
                                                account.ending.bosses['TzKal-Zuk'].rank,
                                                account.ending.bosses['TzKal-Zuk'].score,
                                                account.ending.bosses['TzTok-Jad'].rank,
                                                account.ending.bosses['TzTok-Jad'].score,
                                                account.ending.bosses.Venenatis.rank,
                                                account.ending.bosses.Venenatis.score,
                                                account.ending.bosses['Giant Mole'].rank,
                                                account.ending.bosses['Giant Mole'].score,
                                                account.ending.bosses.Wintertodt.rank,
                                                account.ending.bosses.Wintertodt.score,
                                                account.ending.bosses['Abyssal Sire'].rank,
                                                account.ending.bosses['Abyssal Sire'].score,
                                                account.ending.bosses['The Gauntlet'].rank,
                                                account.ending.bosses['The Gauntlet'].score,
                                                account.ending.bosses['Chaos Fanatic'].rank,
                                                account.ending.bosses['Chaos Fanatic'].score,
                                                account.ending.bosses['Dagannoth Rex'].rank,
                                                account.ending.bosses['Dagannoth Rex'].score,
                                                account.ending.bosses['Barrows Chests'].rank,
                                                account.ending.bosses['Barrows Chests'].score,
                                                account.ending.bosses['Kalphite Queen'].rank,
                                                account.ending.bosses['Kalphite Queen'].score,
                                                account.ending.bosses['Chaos Elemental'].rank,
                                                account.ending.bosses['Chaos Elemental'].score,
                                                account.ending.bosses['Corporeal Beast'].rank,
                                                account.ending.bosses['Corporeal Beast'].score,
                                                account.ending.bosses['Dagannoth Prime'].rank,
                                                account.ending.bosses['Dagannoth Prime'].score,
                                                account.ending.bosses['Alchemical Hydra'].rank,
                                                account.ending.bosses['Alchemical Hydra'].score,
                                                account.ending.bosses['General Graardor'].rank,
                                                account.ending.bosses['General Graardor'].score,
                                                account.ending.bosses["K'ril Tsutsaroth"].rank,
                                                account.ending.bosses["K'ril Tsutsaroth"].score,
                                                account.ending.bosses['Theatre of Blood'].rank,
                                                account.ending.bosses['Theatre of Blood'].score,
                                                account.ending.bosses['Chambers of Xeric'].rank,
                                                account.ending.bosses['Chambers of Xeric'].score,
                                                account.ending.bosses['Commander Zilyana'].rank,
                                                account.ending.bosses['Commander Zilyana'].score,
                                                account.ending.bosses['Dagannoth Supreme'].rank,
                                                account.ending.bosses['Dagannoth Supreme'].score,
                                                account.ending.bosses['King Black Dragon'].rank,
                                                account.ending.bosses['King Black Dragon'].score,
                                                account.ending.bosses['Crazy Archaeologist'].rank,
                                                account.ending.bosses['Crazy Archaeologist'].score,
                                                account.ending.bosses['Grotesque Guardians'].rank,
                                                account.ending.bosses['Grotesque Guardians'].score,
                                                account.ending.bosses['Deranged Archaeologist'].rank,
                                                account.ending.bosses['Deranged Archaeologist'].score,
                                                account.ending.bosses['The Corrupted Gauntlet'].rank,
                                                account.ending.bosses['The Corrupted Gauntlet'].score,
                                                account.ending.bosses['Thermonuclear Smoke Devil'].rank,
                                                account.ending.bosses['Thermonuclear Smoke Devil'].score,
                                                account.ending.bosses['Chambers of Xeric: Challenge Mode'].rank,
                                                account.ending.bosses['Chambers of Xeric: Challenge Mode'].score,
                                                account.ending.skills.magic.xp,
                                                account.ending.skills.magic.rank,
                                                account.ending.skills.magic.level,
                                                account.ending.skills.attack.xp,
                                                account.ending.skills.attack.rank,
                                                account.ending.skills.attack.level,
                                                account.ending.skills.hunter.xp,
                                                account.ending.skills.hunter.rank,
                                                account.ending.skills.hunter.level,
                                                account.ending.skills.mining.xp,
                                                account.ending.skills.mining.rank,
                                                account.ending.skills.mining.level,
                                                account.ending.skills.prayer.xp,
                                                account.ending.skills.prayer.rank,
                                                account.ending.skills.prayer.level,
                                                account.ending.skills.ranged.xp,
                                                account.ending.skills.ranged.rank,
                                                account.ending.skills.ranged.level,
                                                account.ending.skills.slayer.xp,
                                                account.ending.skills.slayer.rank,
                                                account.ending.skills.slayer.level,
                                                account.ending.skills.agility.xp,
                                                account.ending.skills.agility.rank,
                                                account.ending.skills.agility.level,
                                                account.ending.skills.cooking.xp,
                                                account.ending.skills.cooking.rank,
                                                account.ending.skills.cooking.level,
                                                account.ending.skills.defence.xp,
                                                account.ending.skills.defence.rank,
                                                account.ending.skills.defence.level,
                                                account.ending.skills.farming.xp,
                                                account.ending.skills.farming.rank,
                                                account.ending.skills.farming.level,
                                                account.ending.skills.fishing.xp,
                                                account.ending.skills.fishing.rank,
                                                account.ending.skills.fishing.level,
                                                account.ending.skills.overall.xp,
                                                account.ending.skills.overall.rank,
                                                account.ending.skills.overall.level,
                                                account.ending.skills.crafting.xp,
                                                account.ending.skills.crafting.rank,
                                                account.ending.skills.crafting.level,
                                                account.ending.skills.herblore.xp,
                                                account.ending.skills.herblore.rank,
                                                account.ending.skills.herblore.level,
                                                account.ending.skills.smithing.xp,
                                                account.ending.skills.smithing.rank,
                                                account.ending.skills.smithing.level,
                                                account.ending.skills.strength.xp,
                                                account.ending.skills.strength.rank,
                                                account.ending.skills.strength.level,
                                                account.ending.skills.thieving.xp,
                                                account.ending.skills.thieving.rank,
                                                account.ending.skills.thieving.level,
                                                account.ending.skills.fletching.xp,
                                                account.ending.skills.fletching.rank,
                                                account.ending.skills.fletching.level,
                                                account.ending.skills.hitpoints.xp,
                                                account.ending.skills.hitpoints.rank,
                                                account.ending.skills.hitpoints.level,
                                                account.ending.skills.runecraft.xp,
                                                account.ending.skills.runecraft.rank,
                                                account.ending.skills.runecraft.level,
                                                account.ending.skills.firemaking.xp,
                                                account.ending.skills.firemaking.rank,
                                                account.ending.skills.firemaking.level,
                                                account.ending.skills.woodcutting.xp,
                                                account.ending.skills.woodcutting.rank,
                                                account.ending.skills.woodcutting.level,
                                                account.ending.skills.construction.xp,
                                                account.ending.skills.construction.rank,
                                                account.ending.skills.construction.level,
                                                account.ending.bosses.Nightmare.rank,
                                                account.ending.bosses.Nightmare.score,
                                            ];

                                            await db.one(
                                                upsertCurrentAccountStmt,
                                                [
                                                    participantId.id,
                                                    account.rsn,
                                                    endingPart,
                                                ],
                                            );
                                        }
                                    },
                                );
                                await Promise.all(accountPromises);
                            },
                        );
                        await Promise.all(participantPromises);
                    },
                );

                const insertGuild = async (guild: Event.Guild, creator: boolean): Promise<void> => {
                    const guildId = await db.one(
                        upsertGuildStmt,
                        [
                            eventId.id,
                            guild.guildId,
                            creator,
                        ],
                    );

                    let messagePromises: Promise<void>[] = [];
                    if (guild.scoreboardMessages !== undefined) {
                        messagePromises = guild.scoreboardMessages.map(
                            async (channelMessage: Event.ChannelMessage): Promise<void> => {
                                if (guild.scoreboardMessages !== undefined) {
                                    await db.one(
                                        upsertMessagesStmt,
                                        [
                                            guildId.id,
                                            channelMessage.channelId,
                                            channelMessage.messageId,
                                        ],
                                    );
                                }
                            },
                        );
                    }
                    await messagePromises;
                };

                const creatorPromise: Promise<void> = insertGuild(
                    event.guilds.creator,
                    true,
                );

                const othersPromises: Promise<void>[] = event.guilds.others
                    ? event.guilds.others.map(
                        async (guild: Event.Guild): Promise<void> => insertGuild(
                            guild,
                            false,
                        ),
                    )
                    : [];

                const trackingPromise: Promise<void> = db.one(
                    upsertTrackingStmt,
                    [
                        eventId,
                    ],

                );

                // https://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key?page=1&tab=votes#tab-top
                // ['attack', ...] -> column true for event database
                // column true -> ['attack', ...] for event object
                // 'attack' -> 'skills.attack.xp' for event scoreboard
                // aggregate and generate SQL

                await Promise.all([
                    ...teamPromises,
                    creatorPromise,
                    ...othersPromises,
                    trackingPromise,
                ]);
            },
        );
    };

    // export const createTables = (
    //     db: pgp.IDatabase<unknown, pg.IClient> = Db.mainDb,
    // ): Promise<unknown> => db.tx(
    //     async (task: pgp.ITask<unknown>):
    //     Promise<void> => {
    //         //---------------
    //         // Settings table
    //         //---------------
    //         task.none({
    //             text: 'CREATE TABLE IF NOT EXISTS '
    //                 + `${TABLES.SETTINGS}`
    //                 + '('
    //                 + `${SETTINGS_COL.GUILD_ID} TEXT PRIMARY KEY NOT NULL, `
    //                 + `${SETTINGS_COL.CHANNEL_ID} TEXT NOT NULL, `
    //                 + `${SETTINGS_COL.PAY_TIER} SMALLINT NOT NULL`
    //                 + ')',
    //         });

    //         task.none({
    //             text: 'CREATE INDEX IF NOT EXISTS idx_tier ON '
    //                 + `${TABLES.SETTINGS}`
    //                 + '('
    //                 + `${SETTINGS_COL.PAY_TIER}`
    //                 + ')',
    //         });

    //         //------------
    //         // Event table
    //         //------------
    //         task.none({
    //             text: 'CREATE OR REPLACE FUNCTION '
    //                 + 'f_cast_isots(text) '
    //                 + 'RETURNS timestamptz AS '
    //                 + '$$SELECT to_timestamp($1, \'YYYY-MM-DDTHH24:MI\')$$ '
    //                 + 'LANGUAGE sql IMMUTABLE',
    //         });
    //         task.none({
    //             text: 'CREATE TABLE IF NOT EXISTS '
    //                 + `${TABLES.EVENTS}`
    //                 + '('
    //                 + `${EVENTS_COL.ID} SERIAL PRIMARY KEY, `
    //                 + `${EVENTS_COL.EVENT} JSONB NOT NULL `
    //                 + ')',
    //         });
    //         task.none({
    //             text: 'CREATE INDEX IF NOT EXISTS idx_name ON '
    //                 + `${TABLES.EVENTS}`
    //                 + '('
    //                 + `(${EVENTS_COL.EVENT}->>'name')`
    //                 + ')',

    //         });
    //         task.none({
    //             text: 'CREATE INDEX IF NOT EXISTS idx_start ON '
    //                 + `${TABLES.EVENTS}`
    //                 + '('
    //                 + 'f_cast_isots'
    //                 + '('
    //                 + `(${EVENTS_COL.EVENT}->'when'->>'start')`
    //                 + ')'
    //                 + ')',
    //         });
    //         task.none({
    //             text: 'CREATE INDEX IF NOT EXISTS idx_end ON '
    //                 + `${TABLES.EVENTS}`
    //                 + '('
    //                 + 'f_cast_isots'
    //                 + '('
    //                 + `(${EVENTS_COL.EVENT}->'when'->>'end')`
    //                 + ')'
    //                 + ')',
    //         });
    //         task.none({
    //             text: 'CREATE INDEX IF NOT EXISTS idx_creator_guild_id ON '
    //                 + `${TABLES.EVENTS}`
    //                 + '('
    //                 + `(${EVENTS_COL.EVENT}->'guilds'->'creator'->>'guildId')`
    //                 + ')',
    //         });
    //         task.none({
    //             text: 'CREATE INDEX IF NOT EXISTS idx_other_guilds ON '
    //                 + `${TABLES.EVENTS} `
    //                 + 'USING gin '
    //                 + '('
    //                 + `(${EVENTS_COL.EVENT}->'guilds'->'others')`
    //                 + ' jsonb_path_ops'
    //                 + ')',
    //         });
    //         task.none({
    //             text: 'CREATE INDEX IF NOT EXISTS idx_participants ON '
    //                 + `${TABLES.EVENTS} `
    //                 + 'USING gin '
    //                 + '('
    //                 + `(${EVENTS_COL.EVENT}->'teams'->'participants')`
    //                 + ' jsonb_path_ops'
    //                 + ')',
    //         });
    //         task.none({
    //             text: `ALTER TABLE ${TABLES.EVENTS} DROP CONSTRAINT IF EXISTS name_is_defined`,
    //         });
    //         task.none({
    //             text: 'ALTER TABLE '
    //                 + `${TABLES.EVENTS} `
    //                 + 'ADD CONSTRAINT name_is_defined CHECK '
    //                 + '('
    //                 + `(${EVENTS_COL.EVENT} ? 'name' AND NOT ${EVENTS_COL.EVENT}->>'name' IS NULL)`
    //                 + ')',
    //         });
    //         task.none({
    //             text: `ALTER TABLE ${TABLES.EVENTS} DROP CONSTRAINT IF EXISTS valid_dates`,
    //         });
    //         task.none({
    //             text: 'ALTER TABLE '
    //                 + `${TABLES.EVENTS} `
    //                 + 'ADD CONSTRAINT valid_dates CHECK '
    //                 + '('
    //                 + '('
    //                 + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz <= (${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz`
    //                 + ')'
    //                 + ' AND '
    //                 + '('
    //                 + `${EVENTS_COL.EVENT}->'when' ? 'start' AND NOT ${EVENTS_COL.EVENT}->'when'->>'start' IS NULL`
    //                 + ' AND '
    //                 + `${EVENTS_COL.EVENT}->'when' ? 'end' AND NOT ${EVENTS_COL.EVENT}->'when'->>'end' IS NULL`
    //                 + ')'
    //                 + ')',
    //         });
    //         task.none({
    //             text: `ALTER TABLE ${TABLES.EVENTS} DROP CONSTRAINT IF EXISTS creator_guild_id_is_defined`,
    //         });
    //         task.none({
    //             text: 'ALTER TABLE '
    //                 + `${TABLES.EVENTS} `
    //                 + 'ADD CONSTRAINT creator_guild_id_is_defined CHECK '
    //                 + '('
    //                 + `${EVENTS_COL.EVENT}->'guilds'->'creator' ? 'guildId' AND NOT ${EVENTS_COL.EVENT}->'guilds'->'creator'->>'guildId' IS NULL`
    //                 + ')',
    //         });
    //         task.none({
    //             text: `ALTER TABLE ${TABLES.EVENTS} DROP CONSTRAINT IF EXISTS teams_have_participant`,
    //         });
    //         task.none({
    //             text: 'ALTER TABLE '
    //                 + `${TABLES.EVENTS} `
    //                 + 'ADD CONSTRAINT teams_have_participant CHECK '
    //                 + '('
    //                 + `jsonb_path_exists(${EVENTS_COL.EVENT}, '$ ? ((@.teams.type() == "array" && @.teams.size() == 0) || (@.teams.participants.type() == "array" && @.teams.participants.size() > 0))')`
    //                 + ')',
    //         });
    //         // TODO: add constraint that checks for unique rsn?
    //     }
    // );

    // const insertNewEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'insert new event',
    //     text: `INSERT INTO ${TABLES.EVENTS} `
    //         + `(${EVENTS_COL.EVENT}) `
    //         + 'VALUES '
    //         + '($1) '
    //         + 'RETURNING *',
    // });
    // const updateEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'update event',
    //     text: `UPDATE ${TABLES.EVENTS} `
    //         + 'SET '
    //         + `${EVENTS_COL.EVENT} = $2 `
    //         + 'WHERE '
    //         + `${EVENTS_COL.ID} = $1::bigint `
    //         + 'RETURNING *',
    // });
    // export const upsertEvent = async (
    //     event: Event.Standard,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard> => {
    //     if (event.id === undefined) {
    //         const json: string = JSON.stringify(event);
    //         const ret: { id: number; event: Event.Standard } = await db.one(
    //             insertNewEventStmt,
    //             json,
    //         );
    //         return rowToEvent(ret);
    //     }
    //     const ret: { id: number; event: Event.Standard } = await db.one(
    //         updateEventStmt,
    //         [
    //             event.id,
    //             JSON.stringify(event),
    //         ],
    //     );
    //     return rowToEvent(ret);
    // };

    // const fetchAllEventsStartAscStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch all events start asc',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'ORDER BY '
    //         + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz ASC, `
    //         + `${EVENTS_COL.ID} ASC`,
    // });
    // const fetchAllEventsEndAscStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch all events end asc',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'ORDER BY '
    //         + `(${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz ASC, `
    //         + `${EVENTS_COL.ID} ASC`,
    // });
    // export const fetchAllEvents = async (
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    //     startAsc: boolean = true,
    // ): Promise<Event.Standard[] | null> => {
    //     const ret: EventRow[] | null = await db.manyOrNone(
    //         startAsc ? fetchAllEventsStartAscStmt : fetchAllEventsEndAscStmt,
    //     );
    //     if (ret === null) return null;
    //     return ret.map(rowToEvent);
    // };

    // const fetchEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch event',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + `${EVENTS_COL.ID} = $1::bigint`,
    // });
    // export const fetchEvent = async (
    //     id: number,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard | null> => {
    //     const ret: EventRow | null = await db.oneOrNone(
    //         fetchEventStmt,
    //         id,
    //     );
    //     if (ret === null) return null;
    //     return rowToEvent(ret);
    // };

    // const fetchAllCreatorsGuildStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch all creator events',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'guildId' = $1::text`,
    // });
    // export const fetchAllCreatorEvents = async (
    //     guildId: string,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard[] | null> => {
    //     const ret: EventRow[] | null = await db.manyOrNone(
    //         fetchAllCreatorsGuildStmt,
    //         guildId,
    //     );
    //     if (ret === null) return null;
    //     return ret.map(rowToEvent);
    // };

    // const fetchCreatorEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch creator event',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + `${EVENTS_COL.ID} = $1::bigint `
    //         + 'AND '
    //         + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'guildId' = $2::text`,
    // });
    // export const fetchLocallyCreatedEvent = async (
    //     id: number,
    //     guildId: string,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard | null> => {
    //     const ret: EventRow | null = await db.oneOrNone(
    //         fetchCreatorEventStmt,
    //         [
    //             id,
    //             guildId,
    //         ]
    //     );
    //     if (ret === null) return null;
    //     return rowToEvent(ret);
    // };

    // const fetchAllGuildEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch all guild events',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + `${EVENTS_COL.EVENT}->'guilds'->'others' @> jsonb_build_array(jsonb_build_object('guildId', $1::text)) `
    //         + 'OR '
    //         + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'guildId' = $1::text `
    //         + 'ORDER BY '
    //         + `${EVENTS_COL.ID} DESC`,
    // });
    // export const fetchAllGuildEvents = async (
    //     guildId: string,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard[] | null> => {
    //     const ret: EventRow[] | null = await db.manyOrNone(
    //         fetchAllGuildEventsStmt,
    //         guildId,
    //     );
    //     if (ret === null) return null;
    //     return ret.map(rowToEvent);
    // };

    // const fetchGuildEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch guild event',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + `${EVENTS_COL.ID} = $1::bigint `
    //         + 'AND'
    //         + '('
    //         + `${EVENTS_COL.EVENT}->'guilds'->'others' @> jsonb_build_array(jsonb_build_object('guildId', $2::text)) `
    //         + 'OR '
    //         + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'guildId' = $2::text`
    //         + ')',
    // });
    // export const fetchAnyGuildEvent = async (
    //     id: number,
    //     guildId: string,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard | null> => {
    //     const ret: EventRow | null = await db.oneOrNone(
    //         fetchGuildEventStmt,
    //         [
    //             id,
    //             guildId,
    //         ]
    //     );
    //     if (ret === null) return null;
    //     return rowToEvent(ret);
    // };

    // const fetchAllGlobalEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch all global events',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + `${EVENTS_COL.EVENT}->>'global')::boolean = TRUE`,
    // });
    // export const fetchAllGlobalEvents = async (
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard[] | null> => {
    //     const ret: EventRow[] | null = await db.manyOrNone(
    //         fetchAllGlobalEventsStmt,
    //     );
    //     if (ret === null) return null;
    //     return ret.map(rowToEvent);
    // };

    // const fetchGlobalEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch global event',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + `${EVENTS_COL.ID} = $1::bigint `
    //         + 'AND '
    //         + `(${EVENTS_COL.EVENT}->>'global')::boolean = TRUE`,
    // });
    // export const fetchGlobalEvent = async (
    //     id: number,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard | null> => {
    //     const ret: EventRow | null = await db.oneOrNone(
    //         fetchGlobalEventStmt,
    //         id,
    //     );
    //     if (ret === null) return null;
    //     return rowToEvent(ret);
    // };

    // const fetchAllInvitedEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch all invited events',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + `(${EVENTS_COL.EVENT}->>'global')::boolean = TRUE `
    //         + 'AND '
    //         + '('
    //         + `${EVENTS_COL.EVENT}->'invitations' @> to_jsonb($1::text) `
    //         + 'OR NOT '
    //         + `${EVENTS_COL.EVENT} ? 'invitations'`
    //         + ')',
    // });
    // export const fetchAllInvitedEvents = async (
    //     guildId: string,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard[] | null> => {
    //     const ret: EventRow[] | null = await db.manyOrNone(
    //         fetchAllInvitedEventsStmt,
    //         guildId,
    //     );
    //     if (ret === null) return null;
    //     return ret.map(rowToEvent);
    // };

    // const fetchInvitedEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch global invited event',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + `${EVENTS_COL.ID} = $1::bigint `
    //         + 'AND '
    //         + `(${EVENTS_COL.EVENT}->>'global')::boolean = TRUE `
    //         + 'AND '
    //         + '('
    //         + `${EVENTS_COL.EVENT}->'invitations' @> to_jsonb($2::text) `
    //         + 'OR NOT '
    //         + `${EVENTS_COL.EVENT} ? 'invitations'`
    //         + ')',
    // });
    // export const fetchInvitedEvent = async (
    //     id: number,
    //     guildId: string,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard | null> => {
    //     const ret: EventRow | null = await db.oneOrNone(
    //         fetchInvitedEventStmt,
    //         [
    //             id,
    //             guildId,
    //         ],
    //     );
    //     if (ret === null) return null;
    //     return rowToEvent(ret);
    // };

    // const fetchAllOfAParticipantsEventsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch a participant\'s events',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS}, `
    //         + `jsonb_array_elements(${EVENTS_COL.EVENT}->'teams') teams `
    //         + 'WHERE '
    //         + 'teams->\'participants\' @> jsonb_build_array(jsonb_build_object(\'userId\', $1::text))',
    // });
    // export const fetchAllOfAParticipantsEvents = async (
    //     userId: string,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard[] | null> => {
    //     const ret: EventRow[] | null = await db.manyOrNone(
    //         fetchAllOfAParticipantsEventsStmt,
    //         userId,
    //     );
    //     if (ret === null) return null;
    //     return ret.map(rowToEvent);
    // };

    // const eventsBetweenDatesStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch all between dates',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + '('
    //         + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz, (${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz`
    //         + ')'
    //         + ' OVERLAPS '
    //         + '('
    //         + '$1::timestamptz, $2::timestamptz'
    //         + ')',
    // });
    // export const fetchAllEventsBetweenDates = async (
    //     dateA: Date,
    //     dateB: Date,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard[] | null> => {
    //     const ret: EventRow[] | null = await db.manyOrNone(
    //         eventsBetweenDatesStmt,
    //         [
    //             dateA.toISOString(),
    //             dateB.toISOString(),
    //         ]
    //     );
    //     if (ret === null) return null;
    //     return ret.map(rowToEvent);
    // };

    // const eventsCurrentlyRunningStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch all running events',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + '('
    //         + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz <= current_timestamp `
    //         + 'AND '
    //         + `(${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz > current_timestamp`
    //         + ')'
    //         + 'ORDER BY '
    //         + `${EVENTS_COL.ID} ASC`,
    // });
    // export const fetchAllCurrentlyRunningEvents = async (
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard[] | null> => {
    //     const ret: EventRow[] | null = await db.manyOrNone(
    //         eventsCurrentlyRunningStmt,
    //     );
    //     if (ret === null) return null;
    //     return ret.map(rowToEvent);
    // };

    // const guildEventsBetweenDatesStmt: pgp.PreparedStatement = new PreparedStatement({
    //     name: 'fetch all guild events between dates',
    //     text: 'SELECT '
    //         + `${EVENTS_COL.ID}, `
    //         + `${EVENTS_COL.EVENT} `
    //         + 'FROM '
    //         + `${TABLES.EVENTS} `
    //         + 'WHERE '
    //         + '('
    //         + `${EVENTS_COL.EVENT}->'guilds'->'others' @> jsonb_build_array(jsonb_build_object('guildId', $1::text)) `
    //         + 'OR '
    //         + `${EVENTS_COL.EVENT}->'guilds'->'creator'->>'guildId' = $1::text`
    //         + ') '
    //         + 'AND '
    //         + '('
    //         + '('
    //         + `(${EVENTS_COL.EVENT}->'when'->>'start')::timestamptz, (${EVENTS_COL.EVENT}->'when'->>'end')::timestamptz`
    //         + ')'
    //         + ' OVERLAPS '
    //         + '('
    //         + '$2::timestamptz, $3::timestamptz'
    //         + ')'
    //         + ')',
    // });
    // export const fetchAllGuildEventsBetweenDates = async (
    //     guildId: string,
    //     dateA: Date,
    //     dateB: Date,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Event.Standard[] | null> => {
    //     const ret: EventRow[] | null = await db.manyOrNone(
    //         guildEventsBetweenDatesStmt,
    //         [
    //             guildId,
    //             dateA.toISOString(),
    //             dateB.toISOString(),
    //         ],
    //     );
    //     if (ret === null) return null;
    //     return ret.map(rowToEvent);
    // };

    // const deleteEventStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'delete event',
    //     text: 'DELETE FROM '
    //         + `${TABLES.EVENTS}`
    //         + ' WHERE '
    //         + `${EVENTS_COL.ID} = $1::bigint`,
    // });
    // export const deleteEvent = (
    //     eventId: number,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<null> => db.none(
    //     deleteEventStmt,
    //     eventId,
    // );

    // const upsertSettingsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'insert new settings',
    //     text: `INSERT INTO ${TABLES.SETTINGS} `
    //         + '('
    //         + `${SETTINGS_COL.GUILD_ID}, `
    //         + `${SETTINGS_COL.CHANNEL_ID}, `
    //         + `${SETTINGS_COL.PAY_TIER}, `
    //         + ')'
    //         + 'VALUES '
    //         + '($1, $2, $3) '
    //         + 'ON CONFLICT DO NOTHING '
    //         + 'RETURNING *',
    // });
    // export const upsertSettings = async (
    //     settings: Settings.GuildSettings,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Settings.GuildSettings> => {
    //     const ret: {
    //         [SETTINGS_COL.GUILD_ID]: string
    //         [SETTINGS_COL.CHANNEL_ID]: string
    //         [SETTINGS_COL.PAY_TIER]: Settings.PAY_TIER
    //     } = await db.one(
    //         upsertSettingsStmt,
    //         [
    //             settings.guildId,
    //             settings.channelId,
    //             settings.payTier,
    //         ],
    //     );
    //     return {
    //         guildId: ret[SETTINGS_COL.GUILD_ID],
    //         channelId: ret[SETTINGS_COL.CHANNEL_ID],
    //         payTier: ret[SETTINGS_COL.PAY_TIER],
    //     };
    // };

    // const fetchSettingsStmt: pgp.PreparedStatement = new pgp.PreparedStatement({
    //     name: 'fetch settings',
    //     text: 'SELECT * FROM '
    //         + `${TABLES.SETTINGS} `
    //         + 'WHERE '
    //         + `${SETTINGS_COL.GUILD_ID} = $1`,
    // });
    // export const fetchSettings = async (
    //     guildId: string,
    //     db: pgp.IDatabase<unknown> = Db.mainDb,
    // ): Promise<Settings.GuildSettings | null> => {
    //     const ret: {
    //         [SETTINGS_COL.GUILD_ID]: string
    //         [SETTINGS_COL.CHANNEL_ID]: string
    //         [SETTINGS_COL.PAY_TIER]: Settings.PAY_TIER
    //     } | null = await db.oneOrNone(
    //         fetchSettingsStmt,
    //         [
    //             guildId,
    //         ],
    //     );
    //     if (ret === null) return null;
    //     return {
    //         guildId: ret[SETTINGS_COL.GUILD_ID],
    //         channelId: ret[SETTINGS_COL.CHANNEL_ID],
    //         payTier: ret[SETTINGS_COL.PAY_TIER],
    //     };
    // };
}
