import * as discord from 'discord.js';
import { Event, } from '../event';
import {
    Conversation, ConversationManager, CONVERSATION_STATE, Qa,
} from '../conversation';
import { Utils, } from '../utils';
import { Db, } from '../database';
import { Command, } from '../command';
import { willAddEvent$, } from '../main';

class EventAddConversation extends Conversation {
    event: Event.Object;
    tracker: Event.Tracking;
    start: Date;
    end: Date;

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Event name? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1E:
                return 'Failed to name the event.\nExample: Runecrafting Event #1. Please try again.';
            case CONVERSATION_STATE.Q2: {
                const twoDaysFromNow: Date = new Date();
                twoDaysFromNow.setMilliseconds(0);
                twoDaysFromNow.setSeconds(0);
                twoDaysFromNow.setHours(twoDaysFromNow.getHours() + 24 * 2);
                return `Start it when?\nExample: ${twoDaysFromNow.toISOString()} (2 days from now) OR 'now' for right now.`;
            }
            case CONVERSATION_STATE.Q2E:
                return 'Failed to set date. Please try again.';
            case CONVERSATION_STATE.Q2C:
                return `Starting date is set for ${this.start.toString()}. Is this ok?`;
            case CONVERSATION_STATE.Q3: {
                const oneWeekFromNow: Date = new Date();
                oneWeekFromNow.setMilliseconds(0);
                oneWeekFromNow.setSeconds(0);
                oneWeekFromNow.setHours(oneWeekFromNow.getHours() + 24 * 7);
                return `End it when?\nExample: ${oneWeekFromNow.toISOString()} (a week from now) OR 'tbd' for long running event.`;
            }
            case CONVERSATION_STATE.Q3E:
                return 'Failed to set date. Maybe your event ends before it starts? Please try again.';
            case CONVERSATION_STATE.Q3C:
                return `Ending date is set for ${this.end.toString()}. Is this ok?`;
            case CONVERSATION_STATE.Q4:
                return 'Which category of event?\nChoices are \'skills\' with skill name list, \'bh\' with bh mode (\'rogue\' and/or \'hunter\'), \'lms\', \'clues\' with clue difficulty list, \'custom\', or \'bosses\' with bosses list. NOTE: lists must be comma separated and are case sensitive';
            case CONVERSATION_STATE.Q4E:
                return 'Could not set event type. Please try again.';
            case CONVERSATION_STATE.Q4C:
                return `Event will be of type ${this.tracker.category} and track ${this.tracker.what === undefined ? 'nothing' : this.tracker.what}. Is this ok?`;
            case CONVERSATION_STATE.Q5:
                return 'Would you like other Discord guilds to be able to compete?';
            case CONVERSATION_STATE.Q5E:
                return 'Could not set global flag. Try yes or no. Please try again.';
            case CONVERSATION_STATE.CONFIRM:
                return `The event looks like this:\n\`\`\`json\n${JSON.stringify(this.event, null, 2)}\n\`\`\`\nIs this ok?`;
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const name: string = qa.answer.content;
                if (name.length === 0) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    this.params.name = name;
                    this.state = CONVERSATION_STATE.Q2;
                }
                break;
            }
            case CONVERSATION_STATE.Q2:
            case CONVERSATION_STATE.Q2E: {
                const dateStr: string = qa.answer.content;
                const start: Date = dateStr.toLowerCase() !== 'now'
                    ? new Date(
                        dateStr
                    )
                    : new Date();
                if (!Utils.isValidDate(start)) {
                    this.state = CONVERSATION_STATE.Q2E;
                } else {
                    this.start = start;
                    this.state = CONVERSATION_STATE.Q2C;
                }
                break;
            }
            case CONVERSATION_STATE.Q2C: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q2;
                } else {
                    this.state = CONVERSATION_STATE.Q3;
                }
                break;
            }
            case CONVERSATION_STATE.Q3:
            case CONVERSATION_STATE.Q3E: {
                const dateStr: string = qa.answer.content;
                const end: Date = dateStr.toLowerCase() !== 'tbd'
                    ? new Date(
                        dateStr
                    )
                    : Utils.distantFuture;
                if (!Utils.isValidDate(end) || this.start >= end) {
                    this.state = CONVERSATION_STATE.Q3E;
                } else {
                    this.end = end;
                    this.state = CONVERSATION_STATE.Q3C;
                }
                break;
            }
            case CONVERSATION_STATE.Q3C: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q3;
                } else {
                    this.state = CONVERSATION_STATE.Q4;
                }
                break;
            }
            case CONVERSATION_STATE.Q4:
            case CONVERSATION_STATE.Q4E: {
                const type: string = qa.answer.content;
                const trackingStr: string = type
                    .toLowerCase()
                    .trim()
                    .split(' ', 1)[0];
                let tracking: Event.TrackingCategory;
                switch (trackingStr) {
                    case 'casual':
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
                    case 'casual':
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
                    return;
                }
                this.tracker = {
                    category: tracking,
                    what,
                };
                this.state = CONVERSATION_STATE.Q5;
                break;
            }
            case CONVERSATION_STATE.Q4C: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q4;
                } else {
                    this.state = CONVERSATION_STATE.Q5;
                }
                break;
            }
            case CONVERSATION_STATE.Q5:
            case CONVERSATION_STATE.Q5E: {
                const global: string = qa.answer.content;
                this.params.global = Utils.isYes(global);
                this.event = {
                    name: this.params.name as string,
                    when: {
                        start: this.start as Date,
                        end: this.end as Date,
                    },
                    guilds: {
                        creator: {
                            discordId: qa.answer.guild.id,
                        },
                    },
                    teams: [],
                    tracking: this.tracker as Event.Tracking,
                    global: this.params.global,
                };
                this.state = CONVERSATION_STATE.CONFIRM;
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                } else {
                    // save here
                    const savedEvent: Event.Object = await Db.upsertEvent(this.event);
                    willAddEvent$.next(savedEvent);
                    Utils.logger.trace(`Saved event id ${savedEvent.id} to database.`);
                    this.returnMessage = 'Event successfully scheduled.';
                }
                this.state = CONVERSATION_STATE.DONE;
                break;
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

    // probably too complicated to use
    // just leave it commented
    //
    // let errors: string[] = [];
    // if (infos.name === undefined) {
    //     errors = [
    //         ...errors,
    //         '\'name\' is required but was undefined.',
    //     ];
    // }

    // if (infos.type === undefined) {
    //     errors = [
    //         ...errors,
    //         '\'type\' is required but was undefined.',
    //     ];
    // }

    // const start: Date = infos.starting !== undefined
    //     ? new Date(
    //         infos.starting
    //     )
    //     : new Date();
    // const end: Date = infos.ending !== undefined
    //     ? new Date(
    //         infos.ending
    //     )
    //     : Utils.distantFuture;

    // if (!Utils.isValidDate(start)) {
    //     errors = [
    //         ...errors,
    //         '\'start\' date is invalid.',
    //     ];
    // }
    // if (!Utils.isValidDate(end)) {
    //     errors = [
    //         ...errors,
    //         '\'end\' date is invalid.',
    //     ];
    // }

    // if (Utils.isValidDate(start) && Utils.isValidDate(end)) {
    //     if (start >= end) {
    //         errors = [
    //             ...errors,
    //             '\'starting\' date is later than or equal to \'ending\' date.',
    //         ];
    //     }

    //     if (Utils.isInPast(end)) {
    //         errors = [
    //             ...errors,
    //             '\'end\' date is in the past.',
    //         ];
    //     }
    // }

    // let tracker: Event.Tracker;
    // const tracking: Event.Tracking | undefined = Object.values(
    //     Event.Tracking
    // ).find(
    //     (value: string):
    //     boolean => infos.type
    //         .toLowerCase()
    //         .trim()
    //         .startsWith(value)
    // );

    // let what: Event.BountyHunter[] | Event.Clues[] | Event.Skills[];
    // if (tracking !== undefined) {
    //     const tracks: string = infos.type
    //         .toLowerCase()
    //         .trim()
    //         .split(tracking)[1];
    //     const keys: string[] = tracks.split(' ');
    //     const filteredKeys = keys.filter(
    //         (key: string):
    //         boolean => key !== ''
    //     );

    //     // our enum keys are in upper case
    //     switch (tracking) {
    //         case Event.Tracking.BH:
    //             what = filteredKeys
    //                 .map(
    //                     (key: string):
    //                     Event.BountyHunter => Event.BountyHunter[key.toUpperCase()]
    //                 )
    //                 .filter(
    //                     (value: string):
    //                     boolean => value !== undefined
    //                 );
    //             // default HUNTER
    //             if (what.length === 0) {
    //                 what = [
    //                     Event.BountyHunter.HUNTER,
    //                 ];
    //             }
    //             break;
    //         case Event.Tracking.CLUES:
    //             what = filteredKeys
    //                 .map(
    //                     (key: string):
    //                     Event.Clues => Event.Clues[key.toUpperCase()]
    //                 )
    //                 .filter(
    //                     (value: string):
    //                     boolean => value !== undefined
    //                 );
    //             // default ALL
    //             if (what.length === 0) {
    //                 what = [
    //                     Event.Clues.ALL,
    //                 ];
    //             }
    //             break;
    //         case Event.Tracking.SKILLS: {
    //             what = filteredKeys
    //                 .map(
    //                     (key: string):
    //                     Event.Skills => Event.Skills[key.toUpperCase()]
    //                 )
    //                 .filter(
    //                     (value: string):
    //                     boolean => value !== undefined
    //                 );
    //             // default undefined
    //             if (what.length === 0) {
    //                 errors = [
    //                     ...errors,
    //                     Error.NO_TRACKING_SPECIFIED,
    //                 ];
    //             }
    //             break;
    //         }
    //         default:
    //             break;
    //     }
    // }

    // if (tracking !== Event.Tracking.NONE) {
    //     tracker = {
    //         tracking,
    //         what,
    //     };
    // }

    // if (errors.length > 0) {
    //     Utils.logger.info(
    //         errors.join(' ')
    //     );
    //     return;
    // }

    // const newEvent: Event.Event = {
    //     id: undefined,
    //     competingGuilds: [
    //         {
    //             discordId: msg.guild.id,
    //         },
    //     ],
    //     name: infos.name,
    //     when: {
    //         start,
    //         end,
    //     },
    //     teams: [],
    //     tracker,
    // };
    // Utils.logger.debug(newEvent);

    // // confirmation here

    // // Db.saveNewEvent
    // msg.reply('event added.');
};

export default eventsAdd;
