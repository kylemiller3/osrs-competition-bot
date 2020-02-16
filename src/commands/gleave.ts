import * as discord from 'discord.js';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Event } from '../event';
import { Command } from '../command';
import { Utils } from '../utils';
import { Db } from '../database';
import { willUpdateScores$ } from '../..';

class EventsUnjoinGlobalConversation extends Conversation {
    private _event: Event.Standard;

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    public produceQ(): string | null {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
                return 'Leave which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to be removed from ${this._event.name}? If you change your mind everyone will have to signup again.`;
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
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                }

                const event: Event.Standard | null = await Db.fetchAnyGuildEvent(
                    id,
                    this.opMessage.guild.id,
                );
                if (event === null) {
                    this._lastErrorMessage = 'Could not find event. Did you join this event? Hint: find the event id with the listall command.';
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                } else {
                    this._state = CONVERSATION_STATE.CONFIRM;
                    this._event = event;
                    break;
                }
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                const thirtyMinutesBeforeStart: Date = new Date(this._event.when.start);
                thirtyMinutesBeforeStart.setMinutes(thirtyMinutesBeforeStart.getMinutes() - 30);
                if (!Utils.isYes(answer)) {
                    this._returnMessage = 'Cancelled.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else if (this._event.guilds.others === undefined) {
                    this._returnMessage = 'Your guild wasn\'t participating anyway.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else if (Utils.isInPast(thirtyMinutesBeforeStart)) {
                    this._returnMessage = 'Cannot leave a global event within thirty minutes of the start date.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                }

                // filter out on the others list
                const newOthers: Event.Guild[] = this._event.guilds.others.filter(
                    (other: Event.Guild): boolean => other.guildId !== this.opMessage.guild.id,
                );
                if (this._event.guilds.others.length === newOthers.length) {
                    this._state = CONVERSATION_STATE.DONE;
                    this._returnMessage = 'Your guild wasn\'t participating anyway.';
                    break;
                } else {
                    this._event.guilds.others = newOthers;

                    // update - removing all teams signed-up by this guild
                    const newTeams: Event.Team[] = this._event.teams.filter(
                        (team: Event.Team): boolean => team.guildId !== this.opMessage.guild.id,
                    );
                    this._event.teams = newTeams;
                    const savedEvent: Event.Standard = await Db.upsertEvent(
                        this._event,
                    );
                    // update this code later
                    // the leaving guild scoreboard is not updated
                    // messages are erased with the filtering of 'other'
                    // putting this.event will revive the event
                    // put in new custom behavior
                    willUpdateScores$.next([
                        savedEvent,
                        false,
                    ]);
                    this._returnMessage = 'Removed from global event.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                }
            }
            default:
                break;
        }
    }
}

const unjoinGlobal = (
    msg: discord.Message,
): void => {
    const params: Command.UnjoinGlobal = Command.parseParameters(
        Command.ALL.UNJOIN_GLOBAL,
        msg.content,
    );

    const eventsUnjoinGlobalConversation = new EventsUnjoinGlobalConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventsUnjoinGlobalConversation,
    );
};

export default unjoinGlobal;
