import * as discord from 'discord.js';
import { Event, } from '../event';
import {
    Conversation, ConversationManager, CONVERSATION_STATE, Qa,
} from '../conversation';
import { Utils, } from '../utils';
import { Db } from '../database';

class EventAdd extends Conversation {
    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'What would you like to name the event?';
            case CONVERSATION_STATE.Q1E:
                return 'Failed to name the event.\nExample: Runecrafting Event #1.';
            case CONVERSATION_STATE.Q2:
                return 'When would you like to start the event?\nExample: 2019-12-20T14:00-05:00 - (which is December 20th, 2019 at 2:00pm ET) OR now for right now.';
            case CONVERSATION_STATE.Q2E:
                return 'Failed to set date.';
            case CONVERSATION_STATE.Q2C:
                return `Starting date is set for ${this.param.start.toString()}. Is this ok? y/N`;
            case CONVERSATION_STATE.Q3:
                return 'When would you like to end the event?\nExample: 2019-12-21T14:00-05:00 - (which is December 21st, 2019 at 2:00pm ET) OR tbd for long running event.';
            case CONVERSATION_STATE.Q3E:
                return 'Failed to set date. Maybe your event end before it starts?';
            case CONVERSATION_STATE.Q3C:
                return `Ending date is set for ${this.param.end.toString()}. Is this ok? y/N`;
            case CONVERSATION_STATE.Q4:
                return 'Which type of event would you like?\nChoices are casual, skills with skill name list, bh with bh mode (rogue and/or hunter), lms, clues with clue difficulty list, or custom.';
            case CONVERSATION_STATE.Q4E:
                return 'Could not set event type.';
            case CONVERSATION_STATE.Q4C:
                return `Event will be of type ${(this.param.tracker as Event.Tracker).tracking} and track ${(this.param.tracker as Event.Tracker).what === undefined ? 'nothing' : (this.param.tracker as Event.Tracker).what}. Is this ok? y/N`;
            case CONVERSATION_STATE.Q5:
                return 'Would you like other Discord guilds to be able to compete?';
            case CONVERSATION_STATE.Q5E:
                return 'Could not set global flag. Try yes or no.';
            case CONVERSATION_STATE.CONFIRM:
                return `The event looks like this:\n${JSON.stringify(this.param, null, 2)}\n\nIs this ok? y/N`;
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
                    this.param.name = name;
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
                    this.param.start = start;
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
                    : new Date('9999-12-31Z');
                if (!Utils.isValidDate(end) || this.param.start >= end) {
                    this.state = CONVERSATION_STATE.Q3E;
                } else {
                    this.param.end = end;
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
                let tracker: Event.Tracker = {
                    tracking: Event.Tracking.NONE,
                };
                const tracking: Event.Tracking | undefined = Object.values(
                    Event.Tracking
                ).find(
                    (value: string):
                    boolean => type
                        .toLowerCase()
                        .trim()
                        .startsWith(value)
                );

                let what: Event.BountyHunter[] | Event.Clues[] | Event.Skills[] | undefined;
                if (tracking !== undefined) {
                    const tracks: string = type
                        .toLowerCase()
                        .trim()
                        .split(tracking)[1];
                    const keys: string[] = tracks.split(' ');
                    const filteredKeys = keys.filter(
                        (key: string):
                        boolean => key !== ''
                    );

                    // our enum keys are in upper case
                    switch (tracking) {
                        case Event.Tracking.BH:
                            what = filteredKeys
                                .map(
                                    (key: string):
                                    Event.BountyHunter => Event.BountyHunter[key.toUpperCase()]
                                )
                                .filter(
                                    (value: string):
                                    boolean => value !== undefined
                                );
                            // default HUNTER
                            if (what.length === 0) {
                                what = [
                                    Event.BountyHunter.HUNTER,
                                ];
                            }
                            break;
                        case Event.Tracking.CLUES:
                            what = filteredKeys
                                .map(
                                    (key: string):
                                    Event.Clues => Event.Clues[key.toUpperCase()]
                                )
                                .filter(
                                    (value: string):
                                    boolean => value !== undefined
                                );
                            // default ALL
                            if (what.length === 0) {
                                what = [
                                    Event.Clues.ALL,
                                ];
                            }
                            break;
                        case Event.Tracking.SKILLS: {
                            what = filteredKeys
                                .map(
                                    (key: string):
                                    Event.Skills => Event.Skills[key.toUpperCase()]
                                )
                                .filter(
                                    (value: string):
                                    boolean => value !== undefined
                                );
                            // default undefined
                            if (what.length === 0) {
                                this.state = CONVERSATION_STATE.Q4E;
                                return Promise.resolve();
                            }
                            break;
                        }
                        default:
                            break;
                    }

                    if (tracking !== Event.Tracking.NONE) {
                        tracker = {
                            tracking,
                            what,
                        };
                    }
                    this.param.tracker = tracker;
                    this.state = CONVERSATION_STATE.Q4C;
                } else {
                    this.state = CONVERSATION_STATE.Q4E;
                }
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
                this.param.global = Utils.isYes(global);
                this.state = CONVERSATION_STATE.CONFIRM;
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.DONE;
                    this.confirmationMessage = 'Cancelled.';
                } else {
                    // save here
                    const event: Event.Object = {
                        name: this.param.name as string,
                        when: {
                            start: this.param.start as Date,
                            end: this.param.end as Date,
                        },
                        guilds: {
                            creator: {
                                discordId: qa.answer.guild.id,
                            },
                        },
                        teams: [],
                        tracker: this.param.tracker as Event.Tracker,
                    };
                    const obj = await Db.upsertEvent(event);
                    Utils.logger.trace(`Saved event id ${obj.id} to database.`);
                    this.confirmationMessage = 'Event successfully scheduled.';
                    this.state = CONVERSATION_STATE.DONE;
                }
                break;
            }
            default:
                break;
        }
        return Promise.resolve();
    }
}

/**
 * Validates and prepares an event
 * @param msg the input Discord message
 */
const eventsAdd = (
    msg: discord.Message
): void => {
    const eventAddConversation = new EventAdd(msg);
    ConversationManager.startNewConversation(
        msg,
        eventAddConversation
    );

    // const params: Command.EventsAdd = Command.parseParameters(
    //     Command.ALL.EVENTS_ADD,
    //     msg.content,
    // );

    // let errors: string[] = [];
    // if (params.name === undefined) {
    //     errors = [
    //         ...errors,
    //         '\'name\' is required but was undefined.',
    //     ];
    // }

    // if (params.type === undefined) {
    //     errors = [
    //         ...errors,
    //         '\'type\' is required but was undefined.',
    //     ];
    // }

    // const start: Date = params.starting !== undefined
    //     ? new Date(
    //         params.starting
    //     )
    //     : new Date();
    // const end: Date = params.ending !== undefined
    //     ? new Date(
    //         params.ending
    //     )
    //     : new Date('9999-12-31Z');

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
    //     boolean => params.type
    //         .toLowerCase()
    //         .trim()
    //         .startsWith(value)
    // );

    // let what: Event.BountyHunter[] | Event.Clues[] | Event.Skills[];
    // if (tracking !== undefined) {
    //     const tracks: string = params.type
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
    //     name: params.name,
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
