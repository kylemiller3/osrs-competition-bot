import * as discord from 'discord.js';
import { Command } from '../command';
import { Event } from '../event';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Db } from '../database';
import { Utils } from '../utils';
import { willDeleteEvent$ } from '../..';

class EventDeleteConversation extends Conversation {
    event: Event.Standard;

    // eslint-disable-next-line class-methods-use-this
    protected async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    protected produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Delete which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to delete event "${this.event._name}"? This cannot be undone.`;
            default:
                return null;
        }
    }

    protected async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const idToDelete: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(idToDelete)) {
                    this.lastErrorMessage = 'Could not find event. Hint: find the event id on the corresponding scoreboard.';
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                } else {
                    const event: Event.Standard | null = await Db.fetchLocallyCreatedEvent(
                        idToDelete,
                        this.opMessage.guild.id,
                    );
                    if (event === null) {
                        this.state = CONVERSATION_STATE.Q1E;
                        break;
                    } else if (event.global === true && Utils.isInPast(event.when.start)) {
                        this.returnMessage = 'A global event cannot be deleted after it has started.';
                        this.state = CONVERSATION_STATE.DONE;
                        break;
                    } else {
                        this.event = event;
                        this.state = CONVERSATION_STATE.CONFIRM;
                        break;
                    }
                }
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    if (this.event.id !== undefined) {
                        await Db.deleteEvent(this.event.id);
                        willDeleteEvent$.next(this.event);
                    }
                    this.returnMessage = 'Event deleted.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                }
            }
            default:
                break;
        }
    }
}

const eventsDelete = (
    msg: discord.Message,
): void => {
    const params: Command.EventsDelete = Command.parseParameters(
        Command.ALL.EVENTS_DELETE,
        msg.content,
    );

    const eventDeleteConversation = new EventDeleteConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventDeleteConversation,
    );
};

export default eventsDelete;
