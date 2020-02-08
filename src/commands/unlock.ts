import * as discord from 'discord.js';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Event, } from '../event';
import { Db, } from '../database';
import { Command, } from '../command';


class UnlockEventConversation extends Conversation {
    event: Event.Standard;

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event id would you like to unlock? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1E:
                return 'Event not found. Hint: find the event id on the corresponding scoreboard. Please try again.';
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const id = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(id)) {
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                }
                const creatorEvent: Event.Standard | null = await Db.fetchLocallyCreatedEvent(
                    id,
                    this.opMessage.guild.id,
                );
                if (creatorEvent === null) {
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                }

                if (creatorEvent.global === true) {
                    this.returnMessage = 'Failed: Globally enabled events automatically lock.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                }

                creatorEvent.adminLocked = false;
                await Db.upsertEvent(creatorEvent);
                this.returnMessage = 'Successfully unlocked event';
                this.state = CONVERSATION_STATE.DONE;
                break;
            }
            default:
                break;
        }
    }
}

const unlockEvent = (
    msg: discord.Message
): void => {
    const params: Command.EventsSignup = Command.parseParameters(
        Command.ALL.EVENTS_UNLOCK,
        msg.content,
    );

    const unlockEventCoversation = new UnlockEventConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        unlockEventCoversation
    );
};

export default unlockEvent;
