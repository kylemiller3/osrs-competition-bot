import * as discord from 'discord.js';
import { Command, } from '../command';
import { Event, } from '../event';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Db, } from '../database';
import { Utils, } from '../utils';
import { willEndEvent$, } from '../main';

class EventEndConversation extends Conversation {
    event: Event.Standard;
    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'End which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event. Hint: find the event id on the corresponding scoreboard. Please try again.';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to end ${this.event.name} now? This cannot be undone.`;
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
                    const event: Event.Standard | null = await Db.fetchCreatorEvent(
                        idToEdit,
                        this.opMessage.guild.id,
                    );
                    if (event === null) {
                        this.state = CONVERSATION_STATE.Q1E;
                        break;
                    }
                    if (event.global
                        && Utils.isInPast(event.when.start)) {
                        this.returnMessage = 'Sorry, global events are locked after they start.';
                        this.state = CONVERSATION_STATE.DONE;
                        break;
                    }
                    this.event = event;
                    this.state = CONVERSATION_STATE.CONFIRM;
                }
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Did not end event.';
                } else if (Utils.isInFuture(this.event.when.start)) {
                    this.returnMessage = 'Event has not started. Delete it instead';
                } else if (Utils.isInPast(this.event.when.end)) {
                    this.returnMessage = 'Event has already ended.';
                } else {
                    this.event.when.end = new Date();
                    const savedEvent: Event.Standard = await Db.upsertEvent(this.event);
                    willEndEvent$.next(savedEvent);
                    // Utils.logger.trace(`Ended event id ${obj.id}.`);
                    this.returnMessage = 'Event successfully ended.';
                }
                this.state = CONVERSATION_STATE.DONE;
                break;
            }
            default:
                break;
        }
    }
}

const eventsEndEvent = (
    msg: discord.Message
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
        eventEndConversation
    );
};

export default eventsEndEvent;
