import * as discord from 'discord.js';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Event } from '../event';
import { Command } from '../command';
import { Utils } from '../utils';
import { Db } from '../database';
import { willUpdateScores$ } from '../..';

class EventsJoinGlobalConversation extends Conversation {
    private _event: Event.Standard;

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    public produceQ(): string | null {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
                return 'Join which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to join "${this._event.name}" now? Global events have special rules.`;
            default:
                return null;
        }
    }

    protected async consumeQa(qa: Qa): Promise<void> {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const id = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(id)) {
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                }

                const event: Event.Standard | null = await Db.fetchInvitedEvent(
                    id,
                    this.opMessage.guild.id,
                );

                if (event === null) {
                    this._lastErrorMessage = 'Could not find event. Hint: find the event id on the corresponding scoreboard.';
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                }

                const thirtyMinutesBeforeStart: Date = new Date(event.when.start);
                thirtyMinutesBeforeStart.setMinutes(thirtyMinutesBeforeStart.getMinutes() - 30);
                if (event.guilds.others !== undefined
                    && event.guilds.others.findIndex(
                        (guild: Event.Guild): boolean => guild.guildId === this.opMessage.guild.id,
                    ) !== -1) {
                    this._returnMessage = 'Your guild has already joined this event.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else if (Utils.isInPast(thirtyMinutesBeforeStart)) {
                    this._lastErrorMessage = 'Cannot join a global event within thirty minutes of the start date.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    this._state = CONVERSATION_STATE.CONFIRM;
                    this._event = event;
                    break;
                }
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this._returnMessage = 'Cancelled.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    if (this._event.guilds.others !== undefined) {
                        this._event.guilds.others = [
                            ...this._event.guilds.others,
                            {
                                guildId: this.opMessage.guild.id,
                            },
                        ];
                    } else {
                        this._event.guilds.others = [
                            {
                                guildId: this.opMessage.guild.id,
                            },
                        ];
                    }
                    const savedEvent: Event.Standard = await Db.upsertEvent(
                        this._event,
                    );
                    willUpdateScores$.next([
                        savedEvent,
                        false,
                    ]);
                    this._returnMessage = 'Joined global event.';
                    this._state = CONVERSATION_STATE.DONE;
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
        eventsJoinGlobalConversation,
    );
};

export default joinGlobal;
