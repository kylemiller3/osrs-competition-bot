import { describe, it, } from 'mocha';
import { assert, expect, } from 'chai';
import { Db, } from '../database';
import { Event, } from '../event';


describe('Database', (): void => {
    describe('create', (): void => {
        it('should not throw an error', (): void => {
            Db.createTables(Db.persistentDb);
        });
    });
    let insertEventA: Event.Event;
    let insertEventB: Event.Event;
    describe('insert event', (): void => {
        it('should not throw an error', (): void => {
            Db.createTables(Db.persistentDb);
            insertEventA = Db.insertNewEvent(Db.persistentDb, {
                id: undefined,
                competingGuilds: [],
                name: 'undefined test',
                when: undefined,
                teams: [],
                tracker: undefined,
            });
            insertEventB = Db.insertNewEvent(Db.persistentDb, {
                id: undefined,
                competingGuilds: [
                    {
                        discordId: 'a',
                        guildMessages: {
                            scoreboardMessage: {
                                channelId: 'b',
                                messageId: 'c',
                            },
                            statusMessage: {
                                channelId: 'b',
                                messageId: 'd',
                            },
                        },
                    },
                    {
                        discordId: 'z',
                        guildMessages: {
                            scoreboardMessage: {
                                channelId: 'b',
                                messageId: 'e',
                            },
                            statusMessage: {
                                channelId: 'b',
                                messageId: 'f',
                            },
                        },
                    },
                ],
                name: 'test',
                when: {
                    start: new Date('1970-01-01T00:00:00.000Z'),
                    end: new Date('9999-12-31T00:00:00.000Z'),
                },
                teams: [],
                tracker: {
                    tracking: Event.Tracking.SKILLS,
                    what: [
                        Event.Skills.AGILITY,
                    ],
                },
            });
        });
        it('should update event ids', (): void => {
            assert(insertEventA.id !== undefined);
            assert(insertEventB.id !== undefined);
        });
        it('should have unique event ids', (): void => {
            assert(insertEventA.id !== insertEventB.id);
        });
        it('should fail when name is null', (): void => {
            expect((): void => {
                Db.insertNewEvent(Db.persistentDb, {
                    id: undefined,
                    competingGuilds: [],
                    name: null,
                    when: {
                        start: new Date('1970-01-01T00:00:00.000Z'),
                        end: new Date('9999-12-31T00:00:00.000Z'),
                    },
                    teams: [],
                    tracker: {
                        tracking: Event.Tracking.SKILLS,
                        what: [
                            Event.Skills.AGILITY,
                        ],
                    },
                });
            }).to.throw();
        });
        it('should fail when name is undefined', (): void => {
            expect((): void => {
                Db.insertNewEvent(Db.persistentDb, {
                    id: undefined,
                    competingGuilds: [],
                    name: undefined,
                    when: {
                        start: new Date('1970-01-01T00:00:00.000Z'),
                        end: new Date('9999-12-31T00:00:00.000Z'),
                    },
                    teams: [],
                    tracker: {
                        tracking: Event.Tracking.SKILLS,
                        what: [
                            Event.Skills.AGILITY,
                        ],
                    },
                });
            }).to.throw();
        });
        it('xref table should link ', (): void => {
        });
    });
});
