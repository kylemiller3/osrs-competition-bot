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
        this._opMessage.channel, {
          id: this._opMessage.id,
          type: this._opMessage.type,
          author: this._opMessage.author,
          content: `${id}`,
          member: this._opMessage.member,
          pinned: this._opMessage.pinned,
          tts: this._opMessage.tts,
          nonce: this._opMessage.nonce,
          system: this._opMessage.system,
          embeds: this._opMessage.embeds,
          attachments: this._opMessage.attachments,
          createdTimestamp: this._opMessage.createdTimestamp,
          editedTimestamp: this._opMessage.editedTimestamp,
          reactions: this._opMessage.reactions,
          webhookID: this._opMessage.webhookID,
          hit: this._opMessage.hit,
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
            // delete thru the event
            this._event.unsignupParticipant(qa.answer.author.id);
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
