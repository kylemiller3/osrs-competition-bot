import * as discord from 'discord.js';
import { Command } from '../command';
import { Event } from '../event';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Db } from '../database';
import { Utils } from '../utils';
import { willEndEvent$ } from '../..';

class EventEndConversation extends Conversation {
    private _event: Event.Standard;

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    public produceQ(): string | null {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
                return 'End which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to end ${this._event.name} now? This cannot be undone.`;
            default:
                return null;
        }
    }

    protected async consumeQa(qa: Qa): Promise<void> {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const idToEdit: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(idToEdit)) {
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                } else {
                    const event: Event.Standard | null = await Db.fetchLocallyCreatedEvent(
                        idToEdit,
                        this.opMessage.guild.id,
                    );
                    if (event === null) {
                        this._lastErrorMessage = 'Could not find event. Hint: find the event id on the corresponding scoreboard.';
                        this._state = CONVERSATION_STATE.Q1E;
                        break;
                    } else if (Utils.isInFuture(event.when.start)) {
                        this._returnMessage = 'The even_whens not started. Delete it instead.';
                        this._state = CONVERSATION_STATE.DONE;
                        break;
                    } else if (Utils.isInPast(event.when.end)) {
                        this._returnMessage = 'The ev_whenhas already ended.';
                        this._state = CONVERSATION_STATE.DONE;
                        break;
                    } else if (event.isGlobal === true) {
                        this._returnMessage = 'Ending early is disabled for global events.';
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
                    this._event.end();
                    const savedEvent: Event.Standard = await Db.upsertEvent(this._event);
                    willEndEvent$.next(savedEvent);

                    this._returnMessage = 'Event successfully ended.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                }
            }
            default:
                break;
        }
    }
}

const eventsEndEvent = (
    msg: discord.Message,
): void => {
    const params: Command.EventsEnd = Command.parseParameters(
        Command.ALL.EVENTS_END_EVENT,
        msg.content,
    );

    const eventEndConversation = new EventEndConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventEndConversation,
    );
};

export default eventsEndEvent;
