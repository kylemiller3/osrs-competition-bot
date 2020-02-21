import * as discord from 'discord.js';
import {
  Conversation, Qa, ConversationManager, CONVERSATION_STATE,
} from '../conversation';
import { Db } from '../database';
import { Utils } from '../utils';
import { Command } from '../command';
import { Settings } from '../settings';

class AdminSetChannelConversation extends Conversation {
  // eslint-disable-next-line class-methods-use-this
  public async init(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public produceQ(): string | null {
    switch (this._state) {
      case CONVERSATION_STATE.Q1:
        return 'Mention a channel to set text channel? (type .exit to stop command)';
      default:
        return null;
    }
  }

  protected async consumeQa(qa: Qa): Promise<void> {
    switch (this._state) {
      case CONVERSATION_STATE.Q1:
      case CONVERSATION_STATE.Q1E: {
        const channelMentions = qa.answer.mentions.channels;
        if (channelMentions.array().length === 0) {
          this._lastErrorMessage = 'Could not find channel mention.\nExample: \'#general\'';
          this._state = CONVERSATION_STATE.Q1E;
        } else {
          await Db.upsertSettings({
            guildId: this._opMessage.guild.id,
            channelId: channelMentions.array()[0].id,
            payTier: Settings.PAY_TIER.FREEMIUM,
          });
          Utils.logger.trace(`Upserted ${this._opMessage.guild.id} settings to database.`);
          this._returnMessage = 'Channel set successfully.';
          this._state = CONVERSATION_STATE.DONE;
        }
        break;
      }
      default:
        break;
    }
  }
}

/**
 * Validates and executes set channel function
 * @param msg the input message
 */
const adminSetChannel = (
  msg: discord.Message,
): void => {
  const params: Command.AdminSetChannel = Command.parseParameters(
    Command.ALL.ADMIN_SET_CHANNEL,
    msg.content,
  );

  const adminSetChannelConversation = new AdminSetChannelConversation(msg, params);
  ConversationManager.startNewConversation(
    msg,
    adminSetChannelConversation,
  );
};

export default adminSetChannel;
