import { describe, it, utils, } from 'mocha';
import { assert, expect, } from 'chai';
import pgp from 'pg-promise';
import { Event, } from '../event';
import { Db2, } from '../database';
import { Utils, } from '../utils';

const accountA: Event.CompetitiveAccount = {
    rsn: 'rsn1',
    starting: {
        skills: {
            overall: {
                rank: null,
                level: null,
                xp: 0,
            },
            attack: {
                rank: null,
                level: null,
                xp: 1,
            },
            strength: {
                rank: null,
                level: null,
                xp: 2,
            },
            defence: {
                rank: null,
                level: null,
                xp: 3,
            },
            ranged: {
                rank: null,
                level: null,
                xp: 4,
            },
            prayer: {
                rank: null,
                level: null,
                xp: 5,
            },
            magic: {
                rank: null,
                level: null,
                xp: 6,
            },
            runecraft: {
                rank: null,
                level: null,
                xp: 7,
            },
            construction: {
                rank: null,
                level: null,
                xp: 8,
            },
            hitpoints: {
                rank: null,
                level: null,
                xp: 9,
            },
            agility: {
                rank: null,
                level: null,
                xp: 10,
            },
            herblore: {
                rank: null,
                level: null,
                xp: 11,
            },
            thieving: {
                rank: null,
                level: null,
                xp: 12,
            },
            crafting: {
                rank: null,
                level: null,
                xp: 13,
            },
            fletching: {
                rank: null,
                level: null,
                xp: 14,
            },
            slayer: {
                rank: null,
                level: null,
                xp: 15,
            },
            hunter: {
                rank: null,
                level: null,
                xp: 16,
            },
            mining: {
                rank: null,
                level: null,
                xp: 17,
            },
            smithing: {
                rank: null,
                level: null,
                xp: 18,
            },
            fishing: {
                rank: null,
                level: null,
                xp: 19,
            },
            cooking: {
                rank: null,
                level: null,
                xp: 20,
            },
            firemaking: {
                rank: null,
                level: null,
                xp: 21,
            },
            woodcutting: {
                rank: null,
                level: null,
                xp: 22,
            },
            farming: {
                rank: null,
                level: null,
                xp: 23,
            },
        },
        bh: {
            rogue: {
                rank: null,
                score: 24,
            },
            hunter: {
                rank: null,
                score: 25,
            },
        },
        lms: {
            rank: null,
            score: 26,
        },
        clues: {
            all: {
                rank: null,
                score: 26,
            },
            beginner: {
                rank: null,
                score: 27,
            },
            easy: {
                rank: null,
                score: 28,
            },
            medium: {
                rank: null,
                score: 29,
            },
            hard: {
                rank: null,
                score: 30,
            },
            elite: {
                rank: null,
                score: 31,
            },
            master: {
                rank: null,
                score: 32,
            },
        },
    },
    ending: {
        skills: {
            overall: {
                rank: null,
                level: null,
                xp: 33,
            },
            attack: {
                rank: null,
                level: null,
                xp: 34,
            },
            strength: {
                rank: null,
                level: null,
                xp: 35,
            },
            defence: {
                rank: null,
                level: null,
                xp: 36,
            },
            ranged: {
                rank: null,
                level: null,
                xp: 37,
            },
            prayer: {
                rank: null,
                level: null,
                xp: 38,
            },
            magic: {
                rank: null,
                level: null,
                xp: 39,
            },
            runecraft: {
                rank: null,
                level: null,
                xp: 40,
            },
            construction: {
                rank: null,
                level: null,
                xp: 41,
            },
            hitpoints: {
                rank: null,
                level: null,
                xp: 42,
            },
            agility: {
                rank: null,
                level: null,
                xp: 43,
            },
            herblore: {
                rank: null,
                level: null,
                xp: 44,
            },
            thieving: {
                rank: null,
                level: null,
                xp: 45,
            },
            crafting: {
                rank: null,
                level: null,
                xp: 46,
            },
            fletching: {
                rank: null,
                level: null,
                xp: 47,
            },
            slayer: {
                rank: null,
                level: null,
                xp: 48,
            },
            hunter: {
                rank: null,
                level: null,
                xp: 49,
            },
            mining: {
                rank: null,
                level: null,
                xp: 50,
            },
            smithing: {
                rank: null,
                level: null,
                xp: 51,
            },
            fishing: {
                rank: null,
                level: null,
                xp: 52,
            },
            cooking: {
                rank: null,
                level: null,
                xp: 53,
            },
            firemaking: {
                rank: null,
                level: null,
                xp: 54,
            },
            woodcutting: {
                rank: null,
                level: null,
                xp: 55,
            },
            farming: {
                rank: null,
                level: null,
                xp: 56,
            },
        },
        bh: {
            rogue: {
                rank: null,
                score: 57,
            },
            hunter: {
                rank: null,
                score: 58,
            },
        },
        lms: {
            rank: null,
            score: 59,
        },
        clues: {
            all: {
                rank: null,
                score: 60,
            },
            beginner: {
                rank: null,
                score: 61,
            },
            easy: {
                rank: null,
                score: 62,
            },
            medium: {
                rank: null,
                score: 63,
            },
            hard: {
                rank: null,
                score: 64,
            },
            elite: {
                rank: null,
                score: 65,
            },
            master: {
                rank: null,
                score: 66,
            },
        },
    },
};

const insertEventA: Event.Event = {
    competingGuilds: [
        {
            discordId: 'testA',
        },
    ],
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
    competingGuilds: [
        {
            discordId: 'testE',
            guildMessages: {
                scoreboardMessage: {
                    channelId: 'testB',
                    messageId: 'testC',
                },
                statusMessage: {
                    channelId: 'testB',
                    messageId: 'testD',
                },
            },
        },
        {
            discordId: 'testA',
            guildMessages: {
                scoreboardMessage: {
                    channelId: 'testB',
                    messageId: 'testE',
                },
                statusMessage: {
                    channelId: 'testB',
                    messageId: 'testF',
                },
            },
        },
    ],
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
    Utils.logger.level = 'error';
    let connection: pgp.IConnected<unknown>;
    describe('Connect', (): void => {
        it('should not throw an error.', async (): Promise<void> => {
            connection = await Db2.testDb.connect();
        });
        return null;
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
        return null;
    });
    describe('Insert event', async (): Promise<void> => {
        let idA: number;
        let idB: number;
        it('should not throw an error.', async (): Promise<void> => {
            idA = await Db2.insertEvent(Db2.testDb, insertEventA);
            idB = await Db2.insertEvent(Db2.testDb, insertEventB);
        });
        it('should have uniquely defined row values.', (): void => {
            assert(idA !== null && idA !== undefined);
            assert(idB !== null && idB !== undefined);
            assert(idA !== idB);
        });
        it('should fail when event name is null.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                name: null,
            };
            let failed = false;
            await Db2.insertEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when event name is undefined.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                name: undefined,
            };
            let failed = false;
            await Db2.insertEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
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
            await Db2.insertEvent(Db2.testDb, event).catch((): void => {
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
            await Db2.insertEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when no guilds inserted.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                competingGuilds: [],
            };
            let failed = false;
            await Db2.insertEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when start is null.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                when: {
                    start: null,
                    end: insertEventA.when.end,
                },
            };
            let failed = false;
            await Db2.insertEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when start is undefined.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                when: {
                    start: undefined,
                    end: insertEventA.when.end,
                },
            };
            let failed = false;
            await Db2.insertEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when end is null.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                when: {
                    start: insertEventA.when.start,
                    end: null,
                },
            };
            let failed = false;
            await Db2.insertEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        it('should fail when end is undefined.', async (): Promise<void> => {
            const event: Event.Event = {
                ...insertEventA,
                when: {
                    start: insertEventA.when.start,
                    end: undefined,
                },
            };
            let failed = false;
            await Db2.insertEvent(Db2.testDb, event).catch((): void => {
                failed = true;
            });
            assert(failed);
        });
        return null;
    });
    describe('Fetching all guild events', async (): Promise<void> => {
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
        return null;
    });
    describe('Fetching all participant\'s events', async (): Promise<void> => {
        let fetchedEvents: Event.Event[];
        it('should return a list of events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchAllAParticipantsEvents(Db2.testDb, 'discord1');
        });
        it('should return one event.', (): void => {
            assert(fetchedEvents.length === 1);
        });
        return null;
    });
    describe('Fetch all events between dates', async (): Promise<void> => {
        let fetchedEvents: Event.Event[];
        it('should return a list of events.', async (): Promise<void> => {
            fetchedEvents = await Db2.fetchEventsStartingBetweenDates(
                Db2.testDb,
                new Date('1970-01-01T01:00:00.000Z'),
                new Date('9999-12-31T01:00:00.000Z')
            );
        });
        it('should return one event.', (): void => {
            assert(fetchedEvents.length === 1);
        });
    });
    describe('Clean up', async (): Promise<void> => {
        it('should drop events table.', async (): Promise<void> => {
            await Db2.testDb.none({
                text: 'DROP TABLE events',
            });
        });
        return null;
    });
});
