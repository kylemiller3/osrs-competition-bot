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
    private _event: Event.Standard;

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    public produceQ(): string | null {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
                return 'Delete which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to delete event "${this._event.name}"? This cannot be undone.`;
            default:
                return null;
        }
    }

    protected async consumeQa(qa: Qa): Promise<void> {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const idToDelete: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(idToDelete)) {
                    this._lastErrorMessage = 'Could not find event. Hint: find the event id on the corresponding scoreboard.';
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                } else {
                    const event: Event.Standard | null = await Db.fetchLocallyCreatedEvent(
                        idToDelete,
                        this._opMessage.guild.id,
                    );
                    if (event === null) {
                        this._state = CONVERSATION_STATE.Q1E;
                        break;
                    } else if (event.isGlobal === true && Utils.isInPast(event.when.start)) {
                        this._returnMessage = 'A global event cannot be deleted after it has started.';
                        this._state = CONVERSATION_STATE.DONE;
                        break;
                    } else {
                        this._event = event;
                        this._state = CONVERSATION_STATE.CONFIRM;
                        break;
                    }
                }
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this._returnMessage = 'Cancelled.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    if (this._event.id !== undefined) {
                        await Db.deleteEvent(this._event.id);
                        willDeleteEvent$.next(this._event);
                    }
                    this._returnMessage = 'Event deleted.';
                    this._state = CONVERSATION_STATE.DONE;
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
