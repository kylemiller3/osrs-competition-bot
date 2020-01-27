import * as discord from 'discord.js';
import { Command, } from '../command';
import { Event, } from '../event';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Db, } from '../database';
import { Utils, } from '../utils';

class EventDeleteConversation extends Conversation {
    event: Event.Obj;

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Delete which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event. Hint: find the event id on the corresponding scoreboard. Please try again.';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to delete event ${this.event.name}? This cannot be undone.`;
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const idToDelete: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(idToDelete)) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    const event: Event.Obj | null = await Db.fetchCreatorEvent(
                        idToDelete,
                        this.opMessage.guild.id,
                    );
                    if (event === null) {
                        this.state = CONVERSATION_STATE.Q1E;
                        break;
                    }
                    if (event.global
                        && Utils.isInPast(event.when.start)) {
                        this.returnMessage = 'Global events are locked after they start.';
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
                    this.returnMessage = 'Cancelled.';
                } else {
                    if (this.event.id !== undefined) {
                        Db.deleteEvent(this.event.id);
                    }
                    this.returnMessage = 'Event deleted.';
                }
                this.state = CONVERSATION_STATE.DONE;
                break;
            }
            default:
                break;
        }
    }
}

const eventsDelete = (
    msg: discord.Message
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
        eventDeleteConversation
    );
};

export default eventsDelete;
