import * as discord from 'discord.js';
import { Command, } from '../command';
import { Event, } from '../event';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Db, } from '../database';
import { Utils, } from '../utils';
import { willStartEvent$, willEndEvent$, } from '../main';

class EventEditConversation extends Conversation {
    event: Event.Object;

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Edit which event id?';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event. Hint: find the event id with the list events command. Please try again.';
            case CONVERSATION_STATE.Q2:
                return 'Would you like to edit the name?';
            case CONVERSATION_STATE.Q2O:
                return 'Enter the new name.';
            case CONVERSATION_STATE.Q2E:
                return 'Could not update the event name.';
            case CONVERSATION_STATE.Q3:
                return 'Would you like to update the starting date of the event?';
            case CONVERSATION_STATE.Q3O:
                return 'When would you like to start the event?\nExample: 2019-12-20T14:00-05:00 - (which is December 20th, 2019 at 2:00pm ET) OR now for right now.';
            case CONVERSATION_STATE.Q3E:
                return 'Failed to set date.';
            case CONVERSATION_STATE.Q3C:
                return `Starting date is set for ${this.event.when.start.toString()}. Is this ok?`;
            case CONVERSATION_STATE.Q4:
                return 'Would you like to update the ending date of the event?';
            case CONVERSATION_STATE.Q4O:
                return 'When would you like to end the event?\nExample: 2019-12-21T14:00-05:00 - (which is December 21st, 2019 at 2:00pm ET) OR tbd for long running event.';
            case CONVERSATION_STATE.Q4E:
                return 'Failed to set date. Maybe your event ends before it starts?';
            case CONVERSATION_STATE.Q4C:
                return `Ending date is set for ${this.event.when.end.toString()}. Is this ok?`;
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to update this event ${this.event.name}? This cannot be undone.`;
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const idToEdit: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(idToEdit)) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    const event: Event.Object | null = await Db.fetchEvent(idToEdit);
                    if (event === null) {
                        this.state = CONVERSATION_STATE.Q1E;
                    } else {
                        this.event = event;
                        this.state = CONVERSATION_STATE.Q2;
                    }
                }
                break;
            }
            case CONVERSATION_STATE.Q2: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q3;
                } else {
                    this.state = CONVERSATION_STATE.Q2O;
                }
                break;
            }
            case CONVERSATION_STATE.Q2O:
            case CONVERSATION_STATE.Q2E: {
                const name: string = qa.answer.content;
                if (name.length === 0) {
                    this.state = CONVERSATION_STATE.Q2E;
                } else {
                    this.event.name = name;
                    this.state = CONVERSATION_STATE.Q3;
                }
                break;
            }
            case CONVERSATION_STATE.Q3: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q4;
                } else {
                    this.state = CONVERSATION_STATE.Q3O;
                }
                break;
            }
            case CONVERSATION_STATE.Q3O:
            case CONVERSATION_STATE.Q3E: {
                const dateStr: string = qa.answer.content;
                const start: Date = dateStr.toLowerCase() !== 'now'
                    ? new Date(
                        dateStr
                    )
                    : new Date();
                if (!Utils.isValidDate(start)) {
                    this.state = CONVERSATION_STATE.Q3E;
                } else {
                    this.event.when.start = start;
                    this.state = CONVERSATION_STATE.Q3C;
                }
                break;
            }
            case CONVERSATION_STATE.Q3C: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q2;
                } else {
                    this.state = CONVERSATION_STATE.Q3;
                }
                break;
            }
            case CONVERSATION_STATE.Q4: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.CONFIRM;
                } else {
                    this.state = CONVERSATION_STATE.Q4O;
                }
                break;
            }
            case CONVERSATION_STATE.Q4O:
            case CONVERSATION_STATE.Q4E: {
                const dateStr: string = qa.answer.content;
                const end: Date = dateStr.toLowerCase() !== 'tbd'
                    ? new Date(
                        dateStr
                    )
                    : Utils.distantFuture;
                if (!Utils.isValidDate(end) || this.event.when.start >= end) {
                    this.state = CONVERSATION_STATE.Q3E;
                } else {
                    this.event.when.end = end;
                    this.state = CONVERSATION_STATE.Q3C;
                }
                break;
            }
            case CONVERSATION_STATE.Q4C: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.Q3;
                } else {
                    this.state = CONVERSATION_STATE.Q4;
                }
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                } else {
                    // save here
                    const obj = await Db.upsertEvent(this.event);
                    Utils.logger.trace(`Saved event id ${obj.id} to database.`);
                    this.returnMessage = 'Event successfully updated.';

                    if (Utils.isInPast(this.event.when.start)) {
                        willStartEvent$.next(this.event);
                    }
                    if (Utils.isInPast(this.event.when.end)) {
                        willEndEvent$.next(this.event);
                    }
                }
                this.state = CONVERSATION_STATE.DONE;
                break;
            }
            default:
                break;
        }
    }
}

const eventsEdit = (
    msg: discord.Message
): void => {
    const params: Command.EventsEdit = Command.parseParameters(
        Command.ALL.EVENTS_EDIT,
        msg.content,
    );

    const eventEditConversation = new EventEditConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventEditConversation
    );
};

export default eventsEdit;
