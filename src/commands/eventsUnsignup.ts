import * as discord from 'discord.js';
import { Command, } from '../command';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Event, } from '../event';
import { Utils, } from '../utils';
import { Db, } from '../database';
import { willUpdateScores$, } from '../main';

class EventUnsignupConversation extends Conversation {
    event: Event.Standard;
    async init(): Promise<boolean> {
        const id = this.params.id as number | undefined;
        if (id === undefined) {
            return Promise.resolve(false);
        }

        const guildEvent: Event.Standard | null = await Db.fetchGuildEvent(
            id,
            this.opMessage.guild.id,
        );

        if (guildEvent === null) {
            this.returnMessage = 'Removal from event failed because the event was not found.';
            return Promise.resolve(true);
        }

        const error: 'participant was not signed-up'
        | undefined = guildEvent.unsignupParticipant(
            this.opMessage.author.id
        );
        if (error !== undefined) {
            this.returnMessage = `Removal from event failed because ${error}.`;
            return Promise.resolve(true);
        }

        const savedEvent: Event.Standard = await Db.upsertEvent(guildEvent);
        this.returnMessage = 'Removed from event.';
        this.state = CONVERSATION_STATE.DONE;
        willUpdateScores$.next([
            savedEvent,
            false,
        ]);
        return Promise.resolve(true);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Remove yourself from which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1E:
                return 'Event not found. Hint: find the event id on the corresponding scoreboard. Please try again.';
            case CONVERSATION_STATE.CONFIRM:
                return 'Are you sure you want to remove yourself from the event? You will lose all your points and have to sign up all your accounts again if you change your mind.';
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const id: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(id)) {
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                }

                const guildEvent: Event.Standard | null = await Db.fetchGuildEvent(
                    id,
                    this.opMessage.guild.id,
                );
                if (guildEvent === null) {
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                }
                this.event = guildEvent;
                this.state = CONVERSATION_STATE.CONFIRM;
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                }
                const error: 'participant was not signed-up'
                | undefined = this.event.unsignupParticipant(
                    this.opMessage.author.id
                );
                if (error !== undefined) {
                    this.returnMessage = `Removal from event failed because ${error}.`;
                    this.state = CONVERSATION_STATE.DONE;
                }
                const savedEvent: Event.Standard = await Db.upsertEvent(this.event);
                this.returnMessage = 'Removed from event.';
                this.state = CONVERSATION_STATE.DONE;
                willUpdateScores$.next([
                    savedEvent,
                    false,
                ]);
                break;
            }
            default:
                break;
        }
    }
}

const eventsUnsignup = (msg: discord.Message):
void => {
    const params: Command.EventsDelete = Command.parseParameters(
        Command.ALL.EVENTS_DELETE,
        msg.content,
    );

    const eventDeleteConversation = new EventUnsignupConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventDeleteConversation
    );
};

export default eventsUnsignup;
