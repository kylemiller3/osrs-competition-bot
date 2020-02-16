import * as discord from 'discord.js';
import { Command } from '../command';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Event } from '../event';
import { Utils } from '../utils';
import { Db } from '../database';
import { willUpdateScores$, gClient } from '../..';

class EventUnsignupConversation extends Conversation {
    private _event: Event.Standard;

    public async init(): Promise<boolean> {
        const id = this._params.id as number | undefined;
        if (id === undefined) {
            return Promise.resolve(false);
        }

        const dummy: discord.Message = new discord.Message(
            this.opMessage.channel, {
                id: this.opMessage.id,
                type: this.opMessage.type,
                author: this.opMessage.author,
                content: `${id}`,
                member: this.opMessage.member,
                pinned: this.opMessage.pinned,
                tts: this.opMessage.tts,
                nonce: this.opMessage.nonce,
                system: this.opMessage.system,
                embeds: this.opMessage.embeds,
                attachments: this.opMessage.attachments,
                createdTimestamp: this.opMessage.createdTimestamp,
                editedTimestamp: this.opMessage.editedTimestamp,
                reactions: this.opMessage.reactions,
                webhookID: this.opMessage.webhookID,
                hit: this.opMessage.hit,
            }, gClient,
        );
        await this.consumeQa({
            questions: [],
            answer: dummy,
        });

        dummy.content = 'yes';
        await this.consumeQa({
            questions: [],
            answer: dummy,
        });

        return Promise.resolve(true);
    }

    public produceQ(): string | null {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
                return 'Remove yourself from which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.CONFIRM:
                return 'Are you sure you want to remove yourself from the event? You will lose all your points and have to sign up all your accounts again if you change your mind.';
            default:
                return null;
        }
    }

    protected async consumeQa(qa: Qa): Promise<void> {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const id: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(id)) {
                    this._lastErrorMessage = 'Cannot parse number.';
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                }

                const guildEvent: Event.Standard | null = await Db.fetchAnyGuildEvent(
                    id,
                    qa.answer.guild.id,
                );
                if (guildEvent === null) {
                    this._lastErrorMessage = 'Event not found. Hint: find the event id on the corresponding scoreboard.';
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                }

                if (guildEvent.isGlobal === true) {
                    // make sure teams are not locked
                    const tenMinutesBeforeStart: Date = new Date(guildEvent.when.start);
                    tenMinutesBeforeStart.setMinutes(tenMinutesBeforeStart.getMinutes() - 10);
                    if (Utils.isInPast(tenMinutesBeforeStart)) {
                        this._lastErrorMessage = 'Teams are locked 10 minutes before a global event starts.';
                        this._state = CONVERSATION_STATE.DONE;
                        break;
                    }
                }
                if (guildEvent.isAdminLocked) {
                    this._lastErrorMessage = 'Teams have been locked by an administrator.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                }
                this._event = guildEvent;
                this._state = CONVERSATION_STATE.CONFIRM;
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this._returnMessage = 'Cancelled.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    // did we find the user?
                    const findUser = (participant: Event.Participant):
                    boolean => participant.userId === qa.answer.author.id;

                    const userIdx: number = this._event.teams.findIndex(
                        (team: Event.Team):
                        boolean => team.participants.some(
                            findUser,
                        ),
                    );
                    const userJdx: number = userIdx !== -1
                        ? this._event.teams[userIdx].participants.findIndex(
                            findUser,
                        ) : -1;
                    if (userJdx === -1) {
                        // participant not found
                        this._lastErrorMessage = 'You were not signed up anyway.';
                        this._state = CONVERSATION_STATE.DONE;
                        break;
                    } else {
                        // remove the user
                        this._event.teams[userIdx].participants.splice(
                            userJdx, 1,
                        );
                        // if no participants remove the team
                        if (this._event.teams[userIdx].participants.length === 0) {
                            this._event.teams.splice(
                                userIdx, 1,
                            );
                        }
                        const savedEvent: Event.Standard = await Db.upsertEvent(this._event);
                        willUpdateScores$.next([
                            savedEvent,
                            false,
                        ]);

                        this._returnMessage = 'Removed from event.';
                        this._state = CONVERSATION_STATE.DONE;
                        break;
                    }
                }
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
        eventDeleteConversation,
    );
};

export default eventsUnsignup;
