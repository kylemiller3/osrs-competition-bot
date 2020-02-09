import * as discord from 'discord.js';
import {
    Conversation, ConversationManager, CONVERSATION_STATE, Qa,
} from '../conversation';
import { Utils, } from '../utils';
import { Db, } from '../database';
import { Command, } from '../command';
import { willAddEvent$, } from '../..';
import { Event, } from '../event';

class EventAddConversation extends Conversation {
    event: Event.Standard;
    name: string;
    tracker: Event.Tracking;
    start: Date;
    end: Date;
    now: Date

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        this.now = new Date()
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Event name? (type .exit to stop command)';
            case CONVERSATION_STATE.Q2: {
                const twoDaysFromNow: Date = new Date(this.now);
                twoDaysFromNow.setMilliseconds(0);
                twoDaysFromNow.setSeconds(0);
                twoDaysFromNow.setHours(twoDaysFromNow.getHours() + 24 * 2);
                return `Start it when?\nExample: ${twoDaysFromNow.toISOString()} which is two days from now OR 'asap' for one hour from now.`;
            }
            case CONVERSATION_STATE.Q2C:
                return `Starting date is set for ${this.start.toString()}. Is this ok?`;
            case CONVERSATION_STATE.Q3: {
                const oneWeekFromNow: Date = new Date(this.now);
                oneWeekFromNow.setMilliseconds(0);
                oneWeekFromNow.setSeconds(0);
                oneWeekFromNow.setHours(oneWeekFromNow.getHours() + 24 * 7);
                return `End it when?\nExample: ${oneWeekFromNow.toISOString()} which is one week from now.`;
            }
            case CONVERSATION_STATE.Q3C:
                return `Ending date is set for ${this.end.toString()}. Is this ok?`;
            case CONVERSATION_STATE.Q4:
                return 'Which category of event?';
            case CONVERSATION_STATE.Q4C:
                return `Event will be of type ${this.tracker.category} and track ${this.tracker.what === undefined ? 'nothing' : this.tracker.what}. Is this ok?`;
            case CONVERSATION_STATE.Q5:
                return 'Would you like other Discord guilds to be able to compete?';
            case CONVERSATION_STATE.Q6:
                return 'Would you like to invite specific guilds (yes) or leave the event open to everyone (no)?';
            case CONVERSATION_STATE.Q6O:
                return 'Enter the Discord Guild IDs separating each one with a comma.';
            case CONVERSATION_STATE.CONFIRM:
                return `The event looks like this:\n\`\`\`json\n${JSON.stringify(this.event, null, 2)}\n\`\`\`\nIs this ok?`;
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            // Event name
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const name: string = qa.answer.content;
                if (name.length === 0) {
                    this.state = CONVERSATION_STATE.Q1E;
                    this.lastErrorMessage = 'The name is blank.';
                    break;
                } else if (name.length > 50) {
                    this.state = CONVERSATION_STATE.Q1E;
                    this.lastErrorMessage = 'The name is greater than 100 characters long.';
                    break;
                } else {
                    this.name = name;
                    this.state = CONVERSATION_STATE.Q2;
                    break;
                }
            }
            // Start date
            case CONVERSATION_STATE.Q2:
            case CONVERSATION_STATE.Q2E: {
                const dateStr: string = qa.answer.content;
                const now: Date = new Date();
                const oneHourFromNow = new Date(now);
                oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
                const start: Date = dateStr.toLowerCase() !== 'asap'
                    ? new Date(dateStr)
                    : oneHourFromNow;
                if (!Utils.isValidDate(start)) {
                    this.state = CONVERSATION_STATE.Q2E;
                    this.lastErrorMessage = 'The date is not in a valid ISO 8601 format.';
                    break;
                } else if (start.getTime() - now.getTime() < 1000 * 60 * 60) {
                    this.state = CONVERSATION_STATE.Q2E;
                    this.lastErrorMessage = 'The start date must be at least an hour in advance';
                    break;
                } else {
                    this.start = start;
                    this.state = CONVERSATION_STATE.Q2C;
                    break;
                }
            }
            case CONVERSATION_STATE.Q2C: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q2;
                    break;
                } else {
                    this.state = CONVERSATION_STATE.Q3;
                    break;
                }
            }
            // End date
            case CONVERSATION_STATE.Q3:
            case CONVERSATION_STATE.Q3E: {
                const dateStr: string = qa.answer.content;
                const end: Date = new Date(dateStr);
                if (!Utils.isValidDate(end)) {
                    this.state = CONVERSATION_STATE.Q3E;
                    this.lastErrorMessage = 'The date is not in a valid ISO 8601 format.';
                    break;
                }
                
                if (this.start >= end) {
                    this.state = CONVERSATION_STATE.Q3E;
                    this.lastErrorMessage = 'The start date is after the event end date.';
                    break;
                } else if (end.getTime() - this.start.getTime() < 1000 * 60 * 60) {
                    this.state = CONVERSATION_STATE.Q3E;
                    this.lastErrorMessage = 'The event must be at least an hour in duration.';
                    break;
                } else if (end.getTime() - this.start.getTime() > 1000 * 60 * 60 * 24 * 5) {
                    // freemium
                    this.state = CONVERSATION_STATE.Q3E;
                    this.lastErrorMessage = 'The free version limits events to five days duration maximum.';
                    break;
                } else {
                    this.end = end;
                    this.state = CONVERSATION_STATE.Q3C;
                    break;
                }
            }
            case CONVERSATION_STATE.Q3C: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q3;
                    break;
                } else {
                    this.state = CONVERSATION_STATE.Q4;
                    break;
                }
            }
            // Category / Tracking
            case CONVERSATION_STATE.Q4:
            case CONVERSATION_STATE.Q4E: {
                const type: string = qa.answer.content;
                const trackingStr: string = type
                    .toLowerCase()
                    .trim()
                    .split(' ', 1)[0];
                let tracking: Event.TrackingCategory;
                switch (trackingStr) {
                    case 'custom':
                    case 'skills':
                    case 'bh':
                    case 'lms':
                    case 'clues':
                    case 'bosses':
                        tracking = trackingStr;
                        break;
                    default:
                        this.state = CONVERSATION_STATE.Q4E;
                        this.lastErrorMessage = 'Unknown category. See user manual.';
                        return;
                }

                let what: Event.BountyHunter[]
                | Event.Clues[]
                | Event.Skills[]
                | Event.Bosses[]
                | undefined;

                const keyStrs: string[] = type
                    .trim()
                    .split(' ')
                    .slice(1)
                    .join(' ')
                    .split(',')
                    .map(
                        (str: string): string => str.trim()
                    );
                switch (tracking) {
                    case 'custom':
                    case 'lms': {
                        what = undefined;
                        break;
                    }
                    case 'bh': {
                        what = keyStrs.map(
                            (keyStr: string):
                            Event.BountyHunter | null => {
                                switch (keyStr) {
                                    case 'hunter':
                                    case 'rogue':
                                        return keyStr;
                                    default:
                                        return null;
                                }
                            }
                        ).filter(Utils.isDefinedFilter);
                        break;
                    }
                    case 'clues': {
                        what = keyStrs.map(
                            (keyStr: string):
                            Event.Clues | null => {
                                switch (keyStr) {
                                    case 'all':
                                    case 'beginner':
                                    case 'easy':
                                    case 'medium':
                                    case 'hard':
                                    case 'elite':
                                    case 'master':
                                        return keyStr;
                                    default:
                                        return null;
                                }
                            }
                        ).filter(Utils.isDefinedFilter);
                        break;
                    }
                    case 'skills': {
                        what = keyStrs.map(
                            (keyStr: string):
                            Event.Skills | null => {
                                switch (keyStr) {
                                    case 'attack':
                                    case 'strength':
                                    case 'defense':
                                    case 'ranged':
                                    case 'prayer':
                                    case 'magic':
                                    case 'runecraft':
                                    case 'construction':
                                    case 'hitpoints':
                                    case 'agility':
                                    case 'herblore':
                                    case 'thieving':
                                    case 'crafting':
                                    case 'fletching':
                                    case 'slayer':
                                    case 'hunter':
                                    case 'mining':
                                    case 'smithing':
                                    case 'fishing':
                                    case 'cooking':
                                    case 'firemaking':
                                    case 'woodcutting':
                                    case 'farming':
                                        return keyStr;
                                    default:
                                        return null;
                                }
                            }
                        ).filter(Utils.isDefinedFilter);
                        break;
                    }
                    case 'bosses': {
                        what = keyStrs.map(
                            (keyStr: string):
                            Event.Bosses | null => {
                                switch (keyStr) {
                                    case 'Abyssal Sire':
                                    case 'Alchemical Hydra':
                                    case 'Barrows Chests':
                                    case 'Bryophyta':
                                    case 'Callisto':
                                    case 'Cerberus':
                                    case 'Chambers of Xeric':
                                    case 'Chambers of Xeric: Challenge Mode':
                                    case 'Chaos Elemental':
                                    case 'Chaos Fanatic':
                                    case 'Commander Zilyana':
                                    case 'Corporeal Beast':
                                    case 'Crazy Archaeologist':
                                    case 'Dagannoth Prime':
                                    case 'Dagannoth Rex':
                                    case 'Dagannoth Supreme':
                                    case 'Deranged Archaeologist':
                                    case 'General Graardor':
                                    case 'Giant Mole':
                                    case 'Grotesque Guardians':
                                    case 'Hespori':
                                    case 'Kalphite Queen':
                                    case 'King Black Dragon':
                                    case 'Kraken':
                                    case 'Kree\'Arra':
                                    case 'K\'ril Tsutsaroth':
                                    case 'Mimic':
                                    case 'Obor':
                                    case 'Sarachnis':
                                    case 'Scorpia':
                                    case 'Skotizo':
                                    case 'The Gauntlet':
                                    case 'The Corrupted Gauntlet':
                                    case 'Theatre of Blood':
                                    case 'Thermonuclear Smoke Devil':
                                    case 'TzKal-Zuk':
                                    case 'TzTok-Jad':
                                    case 'Venenatis':
                                    case 'Vet\'ion':
                                    case 'Vorkath':
                                    case 'Wintertodt':
                                    case 'Zalcano':
                                    case 'Zulrah':
                                        return keyStr;
                                    default:
                                        return null;
                                }
                            }
                        ).filter(Utils.isDefinedFilter);
                        break;
                    }
                    default: {
                        what = undefined;
                        break;
                    }
                }
                if (what !== undefined && what.length !== keyStrs.length) {
                    this.state = CONVERSATION_STATE.Q4E;
                    this.lastErrorMessage = 'Some inputs were invalid. See user manual.';
                    break;
                }
                this.tracker = {
                    category: tracking,
                    what,
                };
                this.state = CONVERSATION_STATE.Q4C;
                break;
            }
            case CONVERSATION_STATE.Q4C: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q4;
                    break;
                } else {
                    // create event here
                    // freemium
                    this.event = new Event.Standard(
                        undefined,
                        this.name,
                        this.start,
                        this.end,
                        {
                            creator: {
                                guildId: qa.answer.guild.id,
                            },
                        },
                        [],
                        this.tracker,
                        false,
                        false,
                    );
                    // freemium
                    this.state = CONVERSATION_STATE.CONFIRM;
                    break;
                }
            }
            // // Global
            // case CONVERSATION_STATE.Q5:
            // case CONVERSATION_STATE.Q5E: {
            //     const global: boolean = Utils.isYes(qa.answer.content);

            //     if (!global) {
            //         this.event = new Event.Standard(
            //             undefined,
            //             this.name,
            //             this.start,
            //             this.end,
            //             {
            //                 creator: {
            //                     guildId: qa.answer.guild.id,
            //                 },
            //             },
            //             [],
            //             this.tracker,
            //             global,
            //             false,
            //         );
            //         this.state = CONVERSATION_STATE.CONFIRM;
            //     } else {
            //         this.event = new Event.Global(
            //             undefined,
            //             this.name as string,
            //             this.start,
            //             this.end,
            //             {
            //                 creator: {
            //                     guildId: qa.answer.guild.id,
            //                 },
            //             },
            //             [],
            //             this.tracker,
            //             global,
            //             false,
            //         );
            //         this.state = CONVERSATION_STATE.Q6;
            //     }
            //     break;
            // }
            // case CONVERSATION_STATE.Q6: {
            //     const answer = qa.answer.content;
            //     if (!Utils.isYes(answer)) {
            //         this.state = CONVERSATION_STATE.CONFIRM;
            //     } else {
            //         this.state = CONVERSATION_STATE.Q6O;
            //     }
            //     break;
            // }
            // case CONVERSATION_STATE.Q6O:
            // case CONVERSATION_STATE.Q6E: {
            //     const ids: string[] = qa.answer.content.split(',').map(
            //         (str: string): string => str.trim()
            //     );
            //     if (ids.length === 0) {
            //         this.state = CONVERSATION_STATE.Q6E;
            //     } else {
            //         if (this.event instanceof Event.Global) {
            //             this.event.invitations = ids;
            //         }
            //         this.state = CONVERSATION_STATE.CONFIRM;
            //     }
            //     break;
            // }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    // save here
                    const savedEvent: Event.Standard = await Db.upsertEvent(this.event);
                    willAddEvent$.next(savedEvent);
                    Utils.logger.trace(`Saved event id ${savedEvent.id} to database.`);

                    this.returnMessage = 'Event successfully scheduled.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                }
            }
            default:
                break;
        }
    }
}

/**
 * Validates and prepares an event
 * @info msg the input Discord message
 */
const eventsAdd = (
    msg: discord.Message
): void => {
    const params: Command.EventsAdd = Command.parseParameters(
        Command.ALL.EVENTS_ADD,
        msg.content,
    );

    const eventAddConversation = new EventAddConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventAddConversation
    );
};

export default eventsAdd;
