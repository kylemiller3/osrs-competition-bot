import * as discord from 'discord.js';
import {
  Conversation,
  Qa,
  CONVERSATION_STATE,
  ConversationManager,
} from '../conversation';
import { Event } from '../event';
import { Command } from '../command';
import { Utils } from '../utils';
import { Db } from '../database';
import { willUpdateScores$ } from '../..';

class EventsUnjoinGlobalConversation extends Conversation {
  private _event: Event.Global;

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
          this._opMessage.guild.id,
        );
        if (event === null) {
          this._lastErrorMessage = 'Could not find event. Did you join this event? Hint: find the event id with the listall command.';
          this._state = CONVERSATION_STATE.Q1E;
          break;
        }

        if (!(event instanceof Event.Global)) {
          Utils.logger.error(
            'We have a standard event pulled from the database when it should only be global.',
          );
          break;
        }

        this._state = CONVERSATION_STATE.CONFIRM;
        this._event = event;
        break;
      }
      case CONVERSATION_STATE.CONFIRM: {
        const answer: string = qa.answer.content;
        const thirtyMinutesBeforeStart: Date = new Date(this._event.when.start);
        thirtyMinutesBeforeStart.setMinutes(
          thirtyMinutesBeforeStart.getMinutes() - 30,
        );
        if (!Utils.isYes(answer)) {
          this._returnMessage = 'Cancelled.';
          this._state = CONVERSATION_STATE.DONE;
          break;
        } else if (this._event.guilds.length === 1) {
          this._returnMessage = "Your guild wasn't participating anyway.";
          this._state = CONVERSATION_STATE.DONE;
          break;
        } else if (Utils.isInPast(thirtyMinutesBeforeStart)) {
          this._returnMessage = 'Cannot leave a global event within thirty minutes of the start date.';
          this._state = CONVERSATION_STATE.DONE;
        }

        // filter out on the others list
        const oldLen: number = this._event.guilds.length;
        this._event.removeOtherGuild(this._opMessage.guild.id);
        if (this._event.guilds.length === oldLen) {
          this._state = CONVERSATION_STATE.DONE;
          this._returnMessage = "Your guild wasn't participating anyway.";
          break;
        }

        // update - removing all teams signed-up by this guild
        const newTeams: Event.Team[] = this._event.teams.filter(
          (team: Event.Team): boolean => team.guildId !== this._opMessage.guild.id,
        );
        this._event.teams = newTeams;
        const savedEvent: Event.Standard = await Db.upsertEvent(this._event);
        // update this code later
        // the leaving guild scoreboard is not updated
        // messages are erased with the filtering of 'other'
        // putting this.event will revive the event
        // put in new custom behavior
        willUpdateScores$.next([savedEvent, false]);
        this._returnMessage = 'Removed from global event.';
        this._state = CONVERSATION_STATE.DONE;
        break;
      }
      default:
        break;
    }
  }
}

const unjoinGlobal = (msg: discord.Message): void => {
  const params: Command.UnjoinGlobal = Command.parseParameters(
    Command.ALL.UNJOIN_GLOBAL,
    msg.content,
  );

  const eventsUnjoinGlobalConversation = new EventsUnjoinGlobalConversation(
    msg,
    params,
  );
  ConversationManager.startNewConversation(msg, eventsUnjoinGlobalConversation);
};

export default unjoinGlobal;
