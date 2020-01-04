import * as discord from 'discord.js';
import { Command, } from '../command';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Event, } from '../event';
import { Utils, } from '../utils';
import { Db, } from '../database';

class EventDeleteConversation extends Conversation<Command.EventsDelete> {
    event: Event.Object;
    userIdx: number;
    userJdx: number;

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<void> {
        return Promise.resolve();
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Remove yourself from which event id?';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event. Hint: find the event id with the list events command. Please try again.';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to remove yourself from event ${this.event.name}? You will lose all your points and have to sign up all your accounts again if you change your mind.`;
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
                    const event: Event.Object | null = await Db.fetchEvent(idToDelete);
                    if (event === null) {
                        this.state = CONVERSATION_STATE.Q1E;
                    } else {
                        // did we find the user?
                        const findUser = (participant: Event.Participant):
                        boolean => participant.discordId.toLowerCase()
                            === this.opMessage.author.id.toLowerCase();

                        this.userIdx = event.teams.findIndex(
                            (team: Event.Team):
                            boolean => team.participants.some(
                                findUser
                            )
                        );
                        this.userJdx = this.userIdx !== -1
                            ? event.teams[this.userIdx].participants.findIndex(
                                findUser
                            ) : -1;
                        this.event = event;
                        this.state = CONVERSATION_STATE.CONFIRM;
                    }
                }
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                } else {
                    this.event.teams[this.userIdx].participants.splice(
                        this.userJdx, 1
                    );
                    if (this.event.teams[this.userIdx].participants.length === 0) {
                        this.event.teams.splice(
                            this.userIdx, 1
                        );
                    }
                    await Db.upsertEvent(this.event);
                    this.returnMessage = 'Removed.';
                }
                this.state = CONVERSATION_STATE.DONE;
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

    const eventDeleteConversation = new EventDeleteConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventDeleteConversation
    );

    // if (params.id === undefined) {
    //     msg.reply(ERROR.NO_EVENT_SPECIFIED);
    //     return;
    // }
};

export default eventsUnsignup;
