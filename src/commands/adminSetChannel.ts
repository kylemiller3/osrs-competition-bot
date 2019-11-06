import * as discord from 'discord.js';
import {
    Conversation, Qa, ConversationManager, CONVERSATION_STATE,
} from '../conversation';

class AdminSetChannelConversation extends Conversation {
    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Set to which text channel?';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find channel mention.\nExample: \'#general\'';
            default:
                return null;
        }
    }

    consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const channelMentions = qa.answer.mentions.channels;
                if (channelMentions.array().length === 0) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    this.state = CONVERSATION_STATE.DONE;
                    // save to db here
                    this.confirmationMessage = 'Channel set successfully'; // or failure
                }
                break;
            }
            default:
                break;
        }
        return Promise.resolve();
    }
}

/**
 * Validates and executes set channel function
 * @param msg the input message
 */
const adminSetChannel = (
    msg: discord.Message,
): void => {
    const adminSetChannelConversation = new AdminSetChannelConversation(msg);
    ConversationManager.startNewConversation(
        msg,
        adminSetChannelConversation
    );
};

export default adminSetChannel;
