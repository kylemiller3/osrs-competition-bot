/* eslint-disable no-unused-expressions */
import { describe, it, } from 'mocha';
import { assert, expect, } from 'chai';
import pgp from 'pg-promise';
import pg from 'pg-promise/typescript/pg-subset';
import { Event, } from '../event';
import { Db, } from '../database';
import { Utils, } from '../utils';
import { Settings, } from '../settings';

const accountA: Event.Account = {
    rsn: 'rsn1',
    starting: {
        bosses: {
            'Abyssal Sire': {
                rank: -1,
                score: 66,
            },
            'Alchemical Hydra': {
                rank: -1,
                score: 66,
            },
            'Barrows Chests': {
                rank: -1,
                score: 66,
            },
            Bryophyta: {
                rank: -1,
                score: 66,
            },
            Callisto: {
                rank: -1,
                score: 66,
            },
            Cerberus: {
                rank: -1,
                score: 66,
            },
            'Chambers of Xeric': {
                rank: -1,
                score: 66,
            },
            'Chambers of Xeric: Challenge Mode': {
                rank: -1,
                score: 66,
            },
            'Chaos Elemental': {
                rank: -1,
                score: 66,
            },
            'Chaos Fanatic': {
                rank: -1,
                score: 66,
            },
            'Commander Zilyana': {
                rank: -1,
                score: 66,
            },
            'Corporeal Beast': {
                rank: -1,
                score: 66,
            },
            'Crazy Archaeologist': {
                rank: -1,
                score: 66,
            },
            'Dagannoth Prime': {
                rank: -1,
                score: 66,
            },
            'Dagannoth Rex': {
                rank: -1,
                score: 66,
            },
            'Dagannoth Supreme': {
                rank: -1,
                score: 66,
            },
            'Deranged Archaeologist': {
                rank: -1,
                score: 66,
            },
            'General Graardor': {
                rank: -1,
                score: 66,
            },
            'Giant Mole': {
                rank: -1,
                score: 66,
            },
            'Grotesque Guardians': {
                rank: -1,
                score: 66,
            },
            Hespori: {
                rank: -1,
                score: 66,
            },
            'Kalphite Queen': {
                rank: -1,
                score: 66,
            },
            'King Black Dragon': {
                rank: -1,
                score: 66,
            },
            Kraken: {
                rank: -1,
                score: 66,
            },
            'Kree\'Arra': {
                rank: -1,
                score: 66,
            },
            'K\'ril Tsutsaroth': {
                rank: -1,
                score: 66,
            },
            Mimic: {
                rank: -1,
                score: 66,
            },
            Obor: {
                rank: -1,
                score: 66,
            },
            Sarachnis: {
                rank: -1,
                score: 66,
            },
            Scorpia: {
                rank: -1,
                score: 66,
            },
            Skotizo: {
                rank: -1,
                score: 66,
            },
            'The Gauntlet': {
                rank: -1,
                score: 66,
            },
            'The Corrupted Gauntlet': {
                rank: -1,
                score: 66,
            },
            'Theatre of Blood': {
                rank: -1,
                score: 66,
            },
            'Thermonuclear Smoke Devil': {
                rank: -1,
                score: 66,
            },
            'TzKal-Zuk': {
                rank: -1,
                score: 66,
            },
            'TzTok-Jad': {
                rank: -1,
                score: 66,
            },
            Venenatis: {
                rank: -1,
                score: 66,
            },
            'Vet\'ion': {
                rank: -1,
                score: 66,
            },
            Vorkath: {
                rank: -1,
                score: 66,
            },
            Wintertodt: {
                rank: -1,
                score: 66,
            },
            Zalcano: {
                rank: -1,
                score: 66,
            },
            Zulrah: {
                rank: -1,
                score: 66,
            },
        },
        skills: {
            overall: {
                rank: '-1',
                level: -1,
                xp: 0,
            },
            attack: {
                rank: '-1',
                level: -1,
                xp: 1,
            },
            strength: {
                rank: '-1',
                level: -1,
                xp: 2,
            },
            defence: {
                rank: '-1',
                level: -1,
                xp: 3,
            },
            ranged: {
                rank: '-1',
                level: -1,
                xp: 4,
            },
            prayer: {
                rank: '-1',
                level: -1,
                xp: 5,
            },
            magic: {
                rank: '-1',
                level: -1,
                xp: 6,
            },
            runecraft: {
                rank: '-1',
                level: -1,
                xp: 7,
            },
            construction: {
                rank: '-1',
                level: -1,
                xp: 8,
            },
            hitpoints: {
                rank: '-1',
                level: -1,
                xp: 9,
            },
            agility: {
                rank: '-1',
                level: -1,
                xp: 10,
            },
            herblore: {
                rank: '-1',
                level: -1,
                xp: 11,
            },
            thieving: {
                rank: '-1',
                level: -1,
                xp: 12,
            },
            crafting: {
                rank: '-1',
                level: -1,
                xp: 13,
            },
            fletching: {
                rank: '-1',
                level: -1,
                xp: 14,
            },
            slayer: {
                rank: '-1',
                level: -1,
                xp: 15,
            },
            hunter: {
                rank: '-1',
                level: -1,
                xp: 16,
            },
            mining: {
                rank: '-1',
                level: -1,
                xp: 17,
            },
            smithing: {
                rank: '-1',
                level: -1,
                xp: 18,
            },
            fishing: {
                rank: '-1',
                level: -1,
                xp: 19,
            },
            cooking: {
                rank: '-1',
                level: -1,
                xp: 20,
            },
            firemaking: {
                rank: '-1',
                level: -1,
                xp: 21,
            },
            woodcutting: {
                rank: '-1',
                level: -1,
                xp: 22,
            },
            farming: {
                rank: '-1',
                level: -1,
                xp: 23,
            },
        },
        bh: {
            rogue: {
                rank: -1,
                score: 24,
            },
            hunter: {
                rank: -1,
                score: 25,
            },
        },
        lms: {
            rank: -1,
            score: 26,
        },
        clues: {
            all: {
                rank: -1,
                score: 26,
            },
            beginner: {
                rank: -1,
                score: 27,
            },
            easy: {
                rank: -1,
                score: 28,
            },
            medium: {
                rank: -1,
                score: 29,
            },
            hard: {
                rank: -1,
                score: 30,
            },
            elite: {
                rank: -1,
                score: 31,
            },
            master: {
                rank: -1,
                score: 32,
            },
        },
    },
    ending: {
        skills: {
            overall: {
                rank: '-1',
                level: -1,
                xp: 33,
            },
            attack: {
                rank: '-1',
                level: -1,
                xp: 34,
            },
            strength: {
                rank: '-1',
                level: -1,
                xp: 35,
            },
            defence: {
                rank: '-1',
                level: -1,
                xp: 36,
            },
            ranged: {
                rank: '-1',
                level: -1,
                xp: 37,
            },
            prayer: {
                rank: '-1',
                level: -1,
                xp: 38,
            },
            magic: {
                rank: '-1',
                level: -1,
                xp: 39,
            },
            runecraft: {
                rank: '-1',
                level: -1,
                xp: 40,
            },
            construction: {
                rank: '-1',
                level: -1,
                xp: 41,
            },
            hitpoints: {
                rank: '-1',
                level: -1,
                xp: 42,
            },
            agility: {
                rank: '-1',
                level: -1,
                xp: 43,
            },
            herblore: {
                rank: '-1',
                level: -1,
                xp: 44,
            },
            thieving: {
                rank: '-1',
                level: -1,
                xp: 45,
            },
            crafting: {
                rank: '-1',
                level: -1,
                xp: 46,
            },
            fletching: {
                rank: '-1',
                level: -1,
                xp: 47,
            },
            slayer: {
                rank: '-1',
                level: -1,
                xp: 48,
            },
            hunter: {
                rank: '-1',
                level: -1,
                xp: 49,
            },
            mining: {
                rank: '-1',
                level: -1,
                xp: 50,
            },
            smithing: {
                rank: '-1',
                level: -1,
                xp: 51,
            },
            fishing: {
                rank: '-1',
                level: -1,
                xp: 52,
            },
            cooking: {
                rank: '-1',
                level: -1,
                xp: 53,
            },
            firemaking: {
                rank: '-1',
                level: -1,
                xp: 54,
            },
            woodcutting: {
                rank: '-1',
                level: -1,
                xp: 55,
            },
            farming: {
                rank: '-1',
                level: -1,
                xp: 56,
            },
        },
        bh: {
            rogue: {
                rank: -1,
                score: 57,
            },
            hunter: {
                rank: -1,
                score: 58,
            },
        },
        lms: {
            rank: -1,
            score: 59,
        },
        clues: {
            all: {
                rank: -1,
                score: 60,
            },
            beginner: {
                rank: -1,
                score: 61,
            },
            easy: {
                rank: -1,
                score: 62,
            },
            medium: {
                rank: -1,
                score: 63,
            },
            hard: {
                rank: -1,
                score: 64,
            },
            elite: {
                rank: -1,
                score: 65,
            },
            master: {
                rank: -1,
                score: 66,
            },
        },
        bosses: {
            'Abyssal Sire': {
                rank: -1,
                score: 66,
            },
            'Alchemical Hydra': {
                rank: -1,
                score: 66,
            },
            'Barrows Chests': {
                rank: -1,
                score: 66,
            },
            Bryophyta: {
                rank: -1,
                score: 66,
            },
            Callisto: {
                rank: -1,
                score: 66,
            },
            Cerberus: {
                rank: -1,
                score: 66,
            },
            'Chambers of Xeric': {
                rank: -1,
                score: 66,
            },
            'Chambers of Xeric: Challenge Mode': {
                rank: -1,
                score: 66,
            },
            'Chaos Elemental': {
                rank: -1,
                score: 66,
            },
            'Chaos Fanatic': {
                rank: -1,
                score: 66,
            },
            'Commander Zilyana': {
                rank: -1,
                score: 66,
            },
            'Corporeal Beast': {
                rank: -1,
                score: 66,
            },
            'Crazy Archaeologist': {
                rank: -1,
                score: 66,
            },
            'Dagannoth Prime': {
                rank: -1,
                score: 66,
            },
            'Dagannoth Rex': {
                rank: -1,
                score: 66,
            },
            'Dagannoth Supreme': {
                rank: -1,
                score: 66,
            },
            'Deranged Archaeologist': {
                rank: -1,
                score: 66,
            },
            'General Graardor': {
                rank: -1,
                score: 66,
            },
            'Giant Mole': {
                rank: -1,
                score: 66,
            },
            'Grotesque Guardians': {
                rank: -1,
                score: 66,
            },
            Hespori: {
                rank: -1,
                score: 66,
            },
            'Kalphite Queen': {
                rank: -1,
                score: 66,
            },
            'King Black Dragon': {
                rank: -1,
                score: 66,
            },
            Kraken: {
                rank: -1,
                score: 66,
            },
            'Kree\'Arra': {
                rank: -1,
                score: 66,
            },
            'K\'ril Tsutsaroth': {
                rank: -1,
                score: 66,
            },
            Mimic: {
                rank: -1,
                score: 66,
            },
            Obor: {
                rank: -1,
                score: 66,
            },
            Sarachnis: {
                rank: -1,
                score: 66,
            },
            Scorpia: {
                rank: -1,
                score: 66,
            },
            Skotizo: {
                rank: -1,
                score: 66,
            },
            'The Gauntlet': {
                rank: -1,
                score: 66,
            },
            'The Corrupted Gauntlet': {
                rank: -1,
                score: 66,
            },
            'Theatre of Blood': {
                rank: -1,
                score: 66,
            },
            'Thermonuclear Smoke Devil': {
                rank: -1,
                score: 66,
            },
            'TzKal-Zuk': {
                rank: -1,
                score: 66,
            },
            'TzTok-Jad': {
                rank: -1,
                score: 66,
            },
            Venenatis: {
                rank: -1,
                score: 66,
            },
            'Vet\'ion': {
                rank: -1,
                score: 66,
            },
            Vorkath: {
                rank: -1,
                score: 66,
            },
            Wintertodt: {
                rank: -1,
                score: 66,
            },
            Zalcano: {
                rank: -1,
                score: 66,
            },
            Zulrah: {
                rank: -1,
                score: 66,
            },
        },
    },
};

const insertEventA: Event.Obj = {
    guilds: {
        creator: {
            discordId: 'testA',
        },
    },
    when: {
        start: new Date('9999-12-31T23:00:00.000Z'),
        end: new Date('9999-12-31T23:59:00.000Z'),
    },
    name: 'undefined test',
    teams: [],
    tracking: {
        category: 'custom',
        what: undefined,
    },
    global: false,
};

const insertEventB: Event.Obj = {
    global: false,
    guilds: {
        creator: {
            discordId: 'testE',
            scoreboardMessage: {
                channelId: 'testB',
                messagesId: [
                    'testC',
                ],
            },
            // statusMessage: {
            //     channelId: 'testB',
            //     messagesId: [
            //         'testD',
            //     ],
            // },
        },
        others: [
            {
                discordId: 'testA',
                scoreboardMessage: {
                    channelId: 'testB',
                    messagesId: [
                        'testE',
                    ],
                },
                // statusMessage: {
                //     channelId: 'testB',
                //     messagesId: [
                //         'testF',
                //     ],
                // },
            },
        ],
    },
    name: 'test event B',
    when: {
        start: new Date('1970-01-01T00:00:00.000Z'),
        end: new Date('9999-12-31T00:00:00.000Z'),
    },
    teams: [
        {
            name: 'team spaghetti',
            guildId: '',
            participants: [
                {
                    discordId: 'discord1',
                    customScore: 0,
                    runescapeAccounts: [
                        accountA,
                        {
                            ...accountA,
                            rsn: 'rsn2',
                        },
                    ],
                },
            ],
        },
        {
            name: 'team meatballs',
            guildId: '',
            participants: [
                {
                    discordId: 'discord2',
                    customScore: 0,
                    runescapeAccounts: [
                        {
                            ...accountA,
                            rsn: 'rsn3',
                        },
                    ],
                },
            ],
        },
    ],
    tracking: {
        category: 'skills',
        what: [
            'agility',
        ],
    },
};

const settingsA: Settings.Obj = {
    guildId: 'guild 1',
    channelId: 'channel 1',
};

const settingsB: Settings.Obj = {
    guildId: 'guild 2',
    channelId: 'channel 2',
};

describe('Postgres Database', (): void => {
    Utils.logger.level = 'fatal';
    let connection: pgp.IConnected<unknown, pg.IClient>;
    describe('Connect', (): void => {
        it('should not throw an error.', async (): Promise<void> => {
            connection = await Db.testDb.connect();
        });
    });
    describe('Disconnect', (): void => {
        it('should not throw an error.', (): void => {
            connection.done();
        });
    });
    describe('Create tables', async (): Promise<void> => {
        it('should not throw an error.', async (): Promise<void> => {
            await Db.testDb.none({
                text: 'DROP TABLE IF EXISTS events, settings',
            });
            await Db.createTables(Db.testDb);
        });
    });
    describe('Upsert event', async (): Promise<void> => {
        let a: Event.Obj;
        let b: Event.Obj;
        it('should not throw an error.', async (): Promise<void> => {
            b = await Db.upsertEvent(insertEventB, Db.testDb);
            a = await Db.upsertEvent(
                insertEventA,
                Db.testDb
            );
            insertEventA.id = a.id;
            insertEventB.id = b.id;
        });
        it('should have uniquely defined row values.', (): void => {
            expect(a).to.not.be.null;
            expect(a).to.not.be.undefined;
            expect(b).to.not.be.null;
            expect(b).to.not.be.undefined;
            expect(a.id).to.not.be.null;
            expect(a.id).to.not.be.undefined;
            expect(b.id).to.not.be.null;
            expect(b.id).to.not.be.undefined;
            expect(a.id).to.not.equal(b.id);
        });
        it('should have same inserted event names.', (): void => {
            expect(a.name).to.equal(insertEventA.name);
            expect(b.name).to.equal(insertEventB.name);
        });
        it('should fail when starting date is greater than ending date.', async (): Promise<void> => {
            const event: Event.Obj = {
                ...insertEventA,
                when: {
                    start: new Date(1),
                    end: new Date(0),
                },
            };
            let failed = false;
            await Db.upsertEvent(
                event,
                Db.testDb
            ).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when ending date is in the past.', async (): Promise<void> => {
            const event: Event.Obj = {
                ...insertEventA,
                when: {
                    start: new Date(1000),
                    end: new Date(2000),
                },
            };
            let failed = false;
            await Db.upsertEvent(
                event,
                Db.testDb
            ).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when starting and ending date is within 60 minutes.', async (): Promise<void> => {
            const event: Event.Obj = {
                ...insertEventA,
                when: {
                    start: new Date(1000),
                    end: new Date(1000 + 1000 * 60 * 60 - 1),
                },
            };
            let failed = false;
            await Db.upsertEvent(
                event,
                Db.testDb
            ).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when no participants for a team are inserted.', async (): Promise<void> => {
            const event: Event.Obj = {
                ...insertEventA,
                teams: [
                    {
                        name: 'test',
                        guildId: 'id',
                        participants: [],
                    },
                ],
            };
            let failed = false;
            await Db.upsertEvent(
                event,
                Db.testDb
            ).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should update event name.', async (): Promise<void> => {
            const b1: Event.Obj = { ...insertEventB, name: 'updated event B', };
            b = await Db.upsertEvent(
                b1,
                Db.testDb
            );
            expect(b.id).to.equal(b1.id);
            expect(b.name).to.equal(b1.name);
        });
    });
    describe('Fetch all events', async (): Promise<void> => {
        let fetchedEvents: Event.Obj[];
        it('should return a list of events.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllEvents(Db.testDb);
        });
        it('should have two events.', (): void => {
            expect(fetchedEvents.length).to.equal(2);
        });
    });
    describe('Fetch event', async (): Promise<void> => {
        let fetchedEvent: Event.Obj | null;
        it('should not return an event.', async (): Promise<void> => {
            fetchedEvent = await Db.fetchEvent(
                3,
                Db.testDb,
            );
            expect(fetchedEvent).to.be.null;
        });
        it('should return an event.', async (): Promise<void> => {
            fetchedEvent = await Db.fetchEvent(
                2,
                Db.testDb,
            );
            expect(fetchedEvent).to.not.be.null;
        });
        it('should have id of 2.', (): void => {
            // @ts-ignore
            expect(fetchedEvent.id).to.be.equal(2);
        });
    });
    describe('Fetching owned guild events', async (): Promise<void> => {
        let fetchedEvents: Event.Obj[];
        it('should return a list of events.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllCreatorEvents(
                'testA',
                Db.testDb,
            );
        });
        it('should return one event.', (): void => {
            expect(fetchedEvents.length).to.equal(1);
            // assert(fetchedEvents.length === 1);
        });
        it('should a defined id.', (): void => {
            expect(fetchedEvents[0].id).to.not.be.null;
            expect(fetchedEvents[0].id).to.not.be.undefined;
        });
    });
    describe('Fetch all guild events', async (): Promise<void> => {
        let fetchedEvents: Event.Obj[];
        it('should return a list of events.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllGuildEvents(
                'testA',
                Db.testDb
            );
        });
        it('should return two events.', (): void => {
            expect(fetchedEvents.length).to.equal(2);
        });
        it('should both have a uniquely defined id.', (): void => {
            expect(fetchedEvents[0].id).to.not.be.null;
            expect(fetchedEvents[0].id).to.not.be.undefined;
            expect(fetchedEvents[1].id).to.not.be.null;
            expect(fetchedEvents[1].id).to.not.be.undefined;
            expect(fetchedEvents[0].id).to.not.equal(fetchedEvents[1].id);
        });
    });
    describe('Fetching all participant\'s events', async (): Promise<void> => {
        let fetchedEvents: Event.Obj[];
        it('should return a list of events.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllOfAParticipantsEvents(
                'discord1',
                Db.testDb
            );
        });
        it('should return one event.', (): void => {
            expect(fetchedEvents.length).to.equal(1);
        });
    });
    describe('Fetch all events between dates', async (): Promise<void> => {
        let fetchedEvents: Event.Obj[];
        it('should return a list of events.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllEventsBetweenDates(
                new Date('1970-01-01T01:00:00.000Z'),
                new Date('9999-12-31T01:00:00.000Z'),
                Db.testDb,
            );
        });
        it('should return two events.', (): void => {
            expect(fetchedEvents.length).to.equal(2);
        });
        it('should return two events.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllEventsBetweenDates(
                new Date('1970-01-01T00:00:00.000Z'),
                new Date('9999-12-31T23:59:59.999Z'),
                Db.testDb,
            );
            expect(fetchedEvents.length).to.equal(2);
        });
    });
    describe('Fetch all guild events between dates', async (): Promise<void> => {
        let fetchedEvents: Event.Obj[];
        it('should return a list of events.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllGuildEventsBetweenDates(
                'testA',
                new Date('9999-12-31T00:00:00.000Z'),
                new Date('9999-12-31T23:59:59.999Z'),
                Db.testDb,
            );
        });
        it('should return one event.', (): void => {
            expect(fetchedEvents.length).to.equal(1);
        });
        it('should return no events.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllGuildEventsBetweenDates(
                'testA',
                new Date('9999-12-31T23:59:58.999Z'),
                new Date('9999-12-31T23:59:59.999Z'),
                Db.testDb,
            );
            expect(fetchedEvents.length).to.equal(0);
        });
        it('should return one event.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllGuildEventsBetweenDates(
                'testE',
                new Date('1970-01-01T00:00:00.000Z'),
                new Date('9999-12-31T23:59:59.999Z'),
                Db.testDb,
            );
            expect(fetchedEvents.length).to.equal(1);
        });
        it('should return two events.', async (): Promise<void> => {
            // @ts-ignore
            fetchedEvents = await Db.fetchAllGuildEventsBetweenDates(
                'testA',
                new Date('1970-01-01T00:00:00.000Z'),
                new Date('9999-12-31T23:59:59.999Z'),
                Db.testDb,
            );
            expect(fetchedEvents.length).to.equal(2);
        });
    });
    describe('Delete event', async (): Promise<void> => {
        it('should not throw an error.', async (): Promise<void> => {
            await Db.deleteEvent(
                0,
                Db.testDb,
            );
        });
    });
    describe('Upsert settings', async (): Promise<void> => {
        it('should not throw an error.', async (): Promise<void> => {
            Db.upsertSettings(
                settingsA,
                Db.testDb,
            );
            Db.upsertSettings(
                settingsB,
                Db.testDb,
            );
        });
        it('should update a channel id.', async (): Promise<void> => {
            const a: Settings.Obj = { ...settingsB, channelId: 'changed', };
            const b: Settings.Obj = await Db.upsertSettings(
                a,
                Db.testDb,
            );
            expect(b.guildId).to.be.equal(a.guildId);
            expect(b.channelId).to.be.equal('changed');
        });
    });
    describe('Fetch settings', async (): Promise<void> => {
        it('should not return a settings.', async (): Promise<void> => {
            const s: Settings.Obj | null = await Db.fetchSettings(
                'invalid',
                Db.testDb,
            );
            expect(s).to.be.null;
        });
        it('should return correct settings.', async (): Promise<void> => {
            const s: Settings.Obj | null = await Db.fetchSettings(
                'guild 1',
                Db.testDb,
            );
            expect(s).to.not.be.null;
            // @ts-ignore
            expect(JSON.stringify(s)).to.be.equal(JSON.stringify(settingsA));
        });
    });
    // describe('Clean up', async (): Promise<void> => {
    //     it('should drop events table.', async (): Promise<void> => {
    //         await Db.testDb.none({
    //             text: 'DROP TABLE events, settings',
    //         });
    //     });
    // });
});
