import { describe, it, } from 'mocha';
import { assert, } from 'chai';
import pgp from 'pg-promise';
import { Event, } from '../event';
import { Db2, } from '../database';
import { Utils, } from '../utils';

const accountA: Event.CompetitiveAccount = {
    rsn: 'rsn1',
    starting: {
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
    },
};

const insertEventA: Event.Event = {
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
    tracker: {
        tracking: Event.Tracking.NONE,
    },
};

const insertEventB: Event.Event = {
    guilds: {
        creator: {
            discordId: 'testE',
            guildMessages: {
                scoreboardMessages: [
                    {
                        channelId: 'testB',
                        messageId: 'testC',
                    },
                ],
                statusMessage: {
                    channelId: 'testB',
                    messageId: 'testD',
                },
            },
        },
        others: [
            {
                discordId: 'testA',
                guildMessages: {
                    scoreboardMessages: [
                        {
                            channelId: 'testB',
                            messageId: 'testE',
                        },
                    ],
                    statusMessage: {
                        channelId: 'testB',
                        messageId: 'testF',
                    },
                },
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
    tracker: {
        tracking: Event.Tracking.SKILLS,
        what: [
            Event.Skills.AGILITY,
        ],
    },
};


describe('Postgres Database', (): void => {
    Utils.logger.level = 'fatal';
    let connection: pgp.IConnected<unknown>;
    describe('Connect', (): void => {
        it('should not throw an error.', async (): Promise<void> => {
            connection = await Db2.testDb.connect();
        });
    });
    describe('Disconnect', (): void => {
        it('should not throw an error.', (): void => {
            connection.done();
        });
    });
    describe('Create event table', async (): Promise<void> => {
        it('should not throw an error.', async (): Promise<void> => {
            await Db2.testDb.none({
                text: 'DROP TABLE IF EXISTS events',
            });
            await Db2.createTable(Db2.testDb);
        });
    });
    describe('Insert event', async (): Promise<void> => {
        let idA: {id: number};
        let idB: {id: number};
        it('should not throw an error.', async (): Promise<void> => {
            idB = await Db2.insertOrUpdateEvent(Db2.testDb, insertEventB);
            idA = await Db2.insertOrUpdateEvent(Db2.testDb, insertEventA);
            insertEventA.id = idA.id;
            insertEventB.id = idB.id;
        });
        it('should have uniquely defined row values.', (): void => {
            assert(idA !== null && idA !== undefined);
            assert(idB !== null && idB !== undefined);
            assert(idA !== idB);
        });
        it('should fail when starting date is greater than ending date.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                when: {
                    start: new Date(1),
                    end: new Date(0),
                },
            };
            let failed = false;
            await Db2.insertOrUpdateEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when ending date is in the past.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                when: {
                    start: new Date(1000),
                    end: new Date(2000),
                },
            };
            let failed = false;
            await Db2.insertOrUpdateEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when starting and ending date is within 60 minutes.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                when: {
                    start: new Date(1000),
                    end: new Date(1000 + 1000 * 60 * 60 - 1),
                },
            };
            let failed = false;
            await Db2.insertOrUpdateEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when no participants for a team are inserted.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                teams: [
                    {
                        name: 'test',
                        participants: [],
                    },
                ],
            };
            let failed = false;
            await Db2.insertOrUpdateEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
    });
    describe('Update event', async (): Promise<void> => {
        let idB: {id: number};
        it('should not throw an error.', async (): Promise<void> => {
            insertEventB.name = 'updated event B';
            idB = await Db2.insertOrUpdateEvent(Db2.testDb, insertEventB);
        });
        it('should have same id as event updated.', async (): Promise<void> => {
            assert(idB.id === insertEventB.id);
        });
    });
    describe('Fetch all events', async (): Promise<void> => {
        let fetchedEvents: Event.Event[];
        it('should return a list of events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchAllEvents(Db2.testDb);
        });
        it('should have two events.', (): void => {
            assert(fetchedEvents.length === 2);
        });
    });
    describe('Fetching owned guild events', async (): Promise<void> => {
        let fetchedEvents: Event.Event[];
        it('should return a list of events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchCreatorEvents(Db2.testDb, 'testA');
        });
        it('should return one event.', (): void => {
            assert(fetchedEvents.length === 1);
        });
        it('should a defined id.', (): void => {
            assert(fetchedEvents[0].id !== null && fetchedEvents[0].id !== undefined);
        });
    });
    describe('Fetch all guild events', async (): Promise<void> => {
        let fetchedEvents: Event.Event[];
        it('should return a list of events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchAllGuildEvents(Db2.testDb, 'testA');
        });
        it('should return two events.', (): void => {
            assert(fetchedEvents.length === 2);
        });
        it('should both have a uniquely defined id.', (): void => {
            assert(fetchedEvents[0].id !== null && fetchedEvents[0].id !== undefined);
            assert(fetchedEvents[1].id !== null && fetchedEvents[1].id !== undefined);
            assert(fetchedEvents[0].id !== fetchedEvents[1].id);
        });
    });
    describe('Fetching all participant\'s events', async (): Promise<void> => {
        let fetchedEvents: Event.Event[];
        it('should return a list of events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchAllOfAParticipantsEvents(Db2.testDb, 'discord1');
        });
        it('should return one event.', (): void => {
            assert(fetchedEvents.length === 1);
        });
    });
    describe('Fetch all events between dates', async (): Promise<void> => {
        let fetchedEvents: Event.Event[];
        it('should return a list of events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchEventsStartingBetweenDates(
                Db2.testDb,
                new Date('1970-01-01T01:00:00.000Z'),
                new Date('9999-12-31T01:00:00.000Z'),
            );
        });
        it('should return one event.', (): void => {
            assert(fetchedEvents.length === 1);
        });
        it('should return two events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchEventsStartingBetweenDates(
                Db2.testDb,
                new Date('1970-01-01T00:00:00.000Z'),
                new Date('9999-12-31T23:59:59.999Z'),
            );
            assert(fetchedEvents.length === 2);
        });
    });
    describe('Fetch all guild events between dates', async (): Promise<void> => {
        let fetchedEvents: Event.Event[];
        it('should return a list of events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchAllGuildEventsBetweenDates(
                Db2.testDb,
                'testA',
                new Date('9999-12-31T00:00:00.000Z'),
                new Date('9999-12-31T23:59:59.999Z'),
            );
        });
        it('should return one event.', (): void => {
            assert(fetchedEvents.length === 1);
        });
        it('should return no events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchAllGuildEventsBetweenDates(
                Db2.testDb,
                'testA',
                new Date('9999-12-31T23:59:58.999Z'),
                new Date('9999-12-31T23:59:59.999Z'),
            );
            assert(fetchedEvents.length === 0);
        });
        it('should return one event.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchAllGuildEventsBetweenDates(
                Db2.testDb,
                'testE',
                new Date('1970-01-01T00:00:00.000Z'),
                new Date('9999-12-31T23:59:59.999Z'),
            );
            assert(fetchedEvents.length === 1);
        });
        it('should return two events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchAllGuildEventsBetweenDates(
                Db2.testDb,
                'testA',
                new Date('1970-01-01T00:00:00.000Z'),
                new Date('9999-12-31T23:59:59.999Z'),
            );
            assert(fetchedEvents.length === 2);
        });
    });
    describe('Delete event', async (): Promise<void> => {
        it('should not throw an error.', async (): Promise<void> => {
            await Db2.deleteEvent(Db2.testDb, 0);
        });
    });
    describe('Clean up', async (): Promise<void> => {
        it('should drop events table.', async (): Promise<void> => {
            await Db2.testDb.none({
                text: 'DROP TABLE events',
            });
        });
    });
});
