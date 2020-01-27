import * as discord from 'discord.js';
import { Command, } from '../command';
import { Utils, } from '../utils';
import { Event, } from '../event';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Db, } from '../database';

class AddScoreConversation extends Conversation {
    event: Event.Standard;
    user: discord.User;
    // async initAndParseParams(): Promise<void> {
    //     // we should probably standardize this
    //     // try to parse and if failed end conversation
    //     // leave a return message about the error

    //     // do we have a user mention?
    //     // const userMentions = this.opMessage.mentions.users;
    //     // if (userMentions.array().length === 0) {
    //     //     this.state = CONVERSATION_STATE.Q1;
    //     //     return;
    //     // }

    //     // params
    //     // if (this.params.score !== undefined && this.params.score !== null) {
    //     // }
    //     this.state = CONVERSATION_STATE.Q1;
    // }

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Add score to which event? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event. Hint: find the event id on the corresponding scoreboard. Please try again.';
            case CONVERSATION_STATE.Q2:
                return 'Add score to which discord user?';
            case CONVERSATION_STATE.Q2E:
                return 'Could not find discord user mention. Please try again.';
            case CONVERSATION_STATE.Q3:
                return 'How many points to add?';
            case CONVERSATION_STATE.Q3E:
                return 'Could not parse number. Please try again.';
            case CONVERSATION_STATE.Q4:
                return 'Add a note to this score for record keeping?';
            case CONVERSATION_STATE.Q4O:
                return 'Enter your note.';
            case CONVERSATION_STATE.Q4E:
                return 'Could not add a note. Please try again.';
            case CONVERSATION_STATE.CONFIRM:
                return `Add ${this.params.score} to user ${this.user.tag} for event ${this.event.name}?`;
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const eventId = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(eventId)) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    const event: Event.Standard | null = await Db.fetchCreatorEvent(
                        eventId,
                        this.opMessage.guild.id
                    );
                    if (event === null) {
                        this.state = CONVERSATION_STATE.Q1E;
                    } else {
                        this.event = event;
                        this.state = CONVERSATION_STATE.Q2;
                    }
                }
                break;
            }
            case CONVERSATION_STATE.Q2:
            case CONVERSATION_STATE.Q2E: {
                const userMentions = qa.answer.mentions.users;
                if (userMentions.array().length === 0) {
                    this.state = CONVERSATION_STATE.Q2E;
                } else {
                    this.user = userMentions.array()[0];
                    this.state = CONVERSATION_STATE.Q3;
                }
                break;
            }
            case CONVERSATION_STATE.Q3:
            case CONVERSATION_STATE.Q3E: {
                const scoreToAdd = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(scoreToAdd)) {
                    this.state = CONVERSATION_STATE.Q3E;
                } else {
                    this.params.score = scoreToAdd;
                    this.state = CONVERSATION_STATE.Q4;
                }
                break;
            }
            case CONVERSATION_STATE.Q4: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.CONFIRM;
                } else {
                    this.state = CONVERSATION_STATE.Q4O;
                }
                break;
            }
            case CONVERSATION_STATE.Q4O:
            case CONVERSATION_STATE.Q4E: {
                const msg: string = qa.answer.content;
                this.params.note = msg;
                this.state = CONVERSATION_STATE.CONFIRM;
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                } else {
                    this.returnMessage = 'Updated score.';
                }
                this.state = CONVERSATION_STATE.DONE;
                break;
            }
            default:
                break;
        }
    }
}

const eventsAddScore = (
    msg: discord.Message
): void => {
    // const params: Command.EventsAddScore = Command.parseParameters(
    //     Command.ALL.EVENTS_ADD_SCORE,
    //     msg.content,
    // );

    // const eventAddScoreConversation = new AddScoreConversation(
    //     msg,
    //     params
    // );
    // ConversationManager.startNewConversation(
    //     msg,
    //     eventAddScoreConversation
    // );

    /*

    let errors: string[] = [];
    if (msg.mentions.members.array().length === 0) {
        errors = [
            ...errors,
            Error.NO_USER_MENTION,
        ];
    }

    if (params.id === undefined) {
        errors = [
            ...errors,
            Error.NO_EVENT_SPECIFIED,
        ];
    }

    if (params.score === undefined) {
        errors = [
            ...errors,
            Error.NO_SCORE_SPECIFIED,
        ];
    }

    if (errors.length > 0) {
        Utils.logger.info(
            errors.join(' ')
        );
        return;
    }

    const event: Event.Event = {} as Event.Event; // get from db
    if (event === undefined) {
        errors = [
            ...errors,
            Error.EVENT_NOT_FOUND,
        ];
    }

    const mention: discord.User = msg.mentions.users.array()[0];
    const foundTeam: Event.Team = event.teams.find(
        (team: Event.Team):
        boolean => team.participants.some(
            (participant: Event.Participant):
            boolean => participant.discordId === mention.id
        )
    );
    if (foundTeam === undefined) {
        Utils.logger.debug(
            `Did not find participant '${getDisplayNameFromDiscordId(msg.guild.id, mention.id)}'`
        );
        msg.reply(
            `${getDisplayNameFromDiscordId(msg.guild.id, mention.id)} ${Error.USER_NOT_SIGNED_UP}`
        );
        return;
    }
    const foundParticipant: Event.Participant = foundTeam.participants.find(
        (participant: Event.Participant):
        boolean => participant.discordId === mention.id
    );
    const newParticipant: Event.Participant = { ...foundParticipant, };
    newParticipant.customScore += params.score;
    const newEvent: Event.Event = Event.updateEventParticipant(
        event,
        newParticipant,
    );
    msg.reply(`${mention} now has ${newParticipant.customScore} points`);
    Utils.logger.debug(newEvent);
    */
};

export default eventsAddScore;
