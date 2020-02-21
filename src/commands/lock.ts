import * as discord from 'discord.js';
import {
  Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Event } from '../event';
import { Db } from '../database';
import { Command } from '../command';


class LockEventConversation extends Conversation {
  // eslint-disable-next-line class-methods-use-this
  public async init(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public produceQ(): string | null {
    switch (this._state) {
      case CONVERSATION_STATE.Q1:
        return 'Which event id would you like to lock? (type .exit to stop command)';
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
        const creatorEvent: Event.Standard | null = await Db.fetchLocallyCreatedEvent(
          id,
          this._opMessage.guild.id,
        );
        if (creatorEvent === null) {
          this._lastErrorMessage = 'Event not found. Hint: find the event id on the corresponding scoreboard.';
          this._state = CONVERSATION_STATE.Q1E;
          break;
        }

        if (creatorEvent.isGlobal === true) {
          this._returnMessage = 'Globally enabled events automatically lock.';
          this._state = CONVERSATION_STATE.DONE;
          break;
        } else {
          creatorEvent.adminLocked = true;
          await Db.upsertEvent(creatorEvent);
          this._returnMessage = 'Successfully locked event.';
          this._state = CONVERSATION_STATE.DONE;
          break;
        }
      }
      default:
        break;
    }
  }
}

const lockEvent = (
  msg: discord.Message,
): void => {
  const params: Command.EventsSignup = Command.parseParameters(
    Command.ALL.EVENTS_LOCK,
    msg.content,
  );

  const lockEventCoversation = new LockEventConversation(
    msg,
    params,
  );
  ConversationManager.startNewConversation(
    msg,
    lockEventCoversation,
  );
};

export default lockEvent;
