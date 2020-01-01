import * as discord from 'discord.js';
import { Command, } from '../command';
import { Event, } from '../event';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Db, } from '../database';
import { Utils, } from '../utils';

class EventEndConversation extends Conversation<Command.EventsEnd> {
    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'End which event id?';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event. Hint: find the event id with the list events command. Please try again.';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to end ${this.params.event ? this.params.event.name : 'ERROR'} now? This cannot be undone.`;
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
                        this.params.event = event;
                        this.state = CONVERSATION_STATE.CONFIRM;
                    }
                }
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Did not end event.';
                } else {
                    // end here
                    // const obj = await Db.upsertEvent(this.params.event);
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
