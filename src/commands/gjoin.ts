import * as discord from 'discord.js';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Event, } from '../event';
import { Command, } from '../command';
import { Utils, } from '../utils';
import { Db, } from '../database';
import { willUpdateScores$, } from '../..';

class EventsJoinGlobalConversation extends Conversation {
    event: Event.Standard;

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Join which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to join "${this.event.name}" now? Global events have special rules.`;
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

                const event: Event.Standard | null = await Db.fetchInvitedEvent(
                    id,
                    this.opMessage.guild.id,
                );
                if (event === null) {
                    this.lastErrorMessage = 'Could not find event. Hint: find the event id on the corresponding scoreboard.';
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                } else if (event.guilds.others !== undefined
                    && event.guilds.others.findIndex(
                        (guild: Event.Guild): boolean => guild.guildId === this.opMessage.guild.id
                    ) !== -1) {
                    this.returnMessage = 'Your guild has already joined this event.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    this.state = CONVERSATION_STATE.CONFIRM;
                    this.event = event;
                    break;
                }
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    if (this.event.guilds.others !== undefined) {
                        this.event.guilds.others = [
                            ...this.event.guilds.others,
                            {
                                guildId: this.opMessage.guild.id,
                            },
                        ];
                    } else {
                        this.event.guilds.others = [
                            {
                                guildId: this.opMessage.guild.id,
                            },
                        ];
                    }
                    const savedEvent: Event.Standard = await Db.upsertEvent(
                        this.event,
                    );
                    willUpdateScores$.next([
                        savedEvent,
                        false,
                    ]);
                    this.returnMessage = 'Joined global event.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                }
            }
            default:
                break;
        }
    }
}

const joinGlobal = (
    msg: discord.Message,
): void => {
    const params: Command.JoinGlobal = Command.parseParameters(
        Command.ALL.JOIN_GLOBAL,
        msg.content,
    );

    const eventsJoinGlobalConversation = new EventsJoinGlobalConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventsJoinGlobalConversation
    );
};

export default joinGlobal;
