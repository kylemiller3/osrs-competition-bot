import * as discord from 'discord.js';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Event, } from '../event';
import { Command, } from '../command';
import { Utils, } from '../utils';
import { Db, } from '../database';
import { willUpdateScores$, } from '../..';

class EventsUnjoinGlobalConversation extends Conversation {
    event: Event.Standard;

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Leave which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.CONFIRM:
                return `Are you sure you want to be removed from ${this.event.name}? If you change your mind everyone will have to signup again.`;
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

                const event: Event.Standard | null = await Db.fetchAnyGuildEvent(
                    id,
                    this.opMessage.guild.id,
                );
                if (event === null) {
                    this.lastErrorMessage = 'Could not find event. Did you join this event? Hint: find the event id with the listall command.';
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                } else {
                    this.state = CONVERSATION_STATE.CONFIRM;
                    this.event = event;
                    break;
                }
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                const thirtyMinutesBeforeStart: Date = new Date(this.event.when.start);
                thirtyMinutesBeforeStart.setMinutes(thirtyMinutesBeforeStart.getMinutes() - 30);
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                } else if (this.event.guilds.others === undefined) {
                    this.returnMessage = 'Your guild wasn\'t participating anyway.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                } else if (Utils.isInPast(thirtyMinutesBeforeStart)) {
                    this.returnMessage = 'Cannot leave a global event within thirty minutes of the start date.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                }

                // filter out on the others list
                const newOthers: Event.Guild[] = this.event.guilds.others.filter(
                    (other: Event.Guild): boolean => other.guildId !== this.opMessage.guild.id
                );
                if (this.event.guilds.others.length === newOthers.length) {
                    this.state = CONVERSATION_STATE.DONE;
                    this.returnMessage = 'Your guild wasn\'t participating anyway.';
                    break;
                } else {
                    this.event.guilds.others = newOthers;

                    // update - removing all teams signed-up by this guild
                    const newTeams: Event.Team[] = this.event.teams.filter(
                        (team: Event.Team): boolean => team.guildId !== this.opMessage.guild.id
                    );
                    this.event.teams = newTeams;
                    const savedEvent: Event.Standard = await Db.upsertEvent(
                        this.event,
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
                    this.returnMessage = 'Removed from global event.';
                    this.state = CONVERSATION_STATE.DONE;
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
        eventsUnjoinGlobalConversation
    );
};

export default unjoinGlobal;
