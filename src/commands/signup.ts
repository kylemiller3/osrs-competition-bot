import * as discord from 'discord.js';
import { hiscores, } from 'osrs-json-api';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Network, } from '../network';
import { Command, } from '../command';
import { Event, } from '../event';
import { Db, } from '../database';
import { willSignUpPlayer$, } from '../..';
import { Utils, } from '../utils';

class EventsSignupConversation extends Conversation {
    event: Event.Standard;
    rsn: string;
    teamName: string

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        const id = this.params.id as number | undefined;
        const rsn = this.params.rsn as string | undefined;
        let team = this.params.team as string | undefined;

        if (id === undefined || rsn === undefined) {
            return Promise.resolve(false);
        }

        if (team === undefined) {
            team = this.opMessage.author.id;
        }

        const guildEvent: Event.Standard | null = await Db.fetchAnyGuildEvent(
            id,
            this.opMessage.guild.id,
        );
        if (guildEvent === null) {
            return Promise.resolve(false);
        }

        const error: 'this rsn is already signed up'
        | 'osrs hiscores cannot be reached'
        | 'osrs account cannot be found'
        | 'team name needs to be supplied'
        | 'teams are locked 10 minutes before a global event starts'
        | 'teams have been locked by an administrator'
        | 'participant has no access to this event'
        | undefined = guildEvent.signupParticipant(
            this.opMessage.author.id,
            this.opMessage.guild.id,
            rsn,
            team,
        );

        if (error !== undefined) {
            this.returnMessage = `Signup failed because ${error}.`;
            return Promise.resolve(true);
        }

        this.returnMessage = 'Successfully signed-up up for event';
        const savedEvent: Event.Standard = await Db.upsertEvent(guildEvent);
        willSignUpPlayer$.next(savedEvent);
        return Promise.resolve(true);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event id would you like to signup for? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1E:
                return 'Event not found. Hint: find the event id on the corresponding scoreboard. Please try again.';
            case CONVERSATION_STATE.Q2:
                return 'What is your Runescape name?';
            case CONVERSATION_STATE.Q2E:
                return 'Cannot find Runescape name on hiscores. Please try again.';
            case CONVERSATION_STATE.Q3:
                return 'Would you like to join a team?';
            case CONVERSATION_STATE.Q3O:
                return 'Which team would you like to join?';
            case CONVERSATION_STATE.Q3E:
                return 'Could not parse team name. Please try again.';
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const id = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(id)) {
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                }
                const guildEvent: Event.Standard | null = await Db.fetchAnyGuildEvent(
                    id,
                    this.opMessage.guild.id,
                );
                if (guildEvent === null) {
                    this.state = CONVERSATION_STATE.Q1E;
                    return;
                }

                this.event = guildEvent;
                this.state = CONVERSATION_STATE.Q2;
                break;
            }
            case CONVERSATION_STATE.Q2:
            case CONVERSATION_STATE.Q2E: {
                this.rsn = qa.answer.content;
                const error: 'this rsn is already signed up'
                | 'osrs hiscores cannot be reached'
                | 'osrs account cannot be found'
                | 'team name needs to be supplied'
                | 'teams are locked 10 minutes before a global event starts'
                | 'teams have been locked by an administrator'
                | 'participant has no access to this event'
                | undefined = this.event.signupParticipant(
                    this.opMessage.author.id,
                    this.opMessage.guild.id,
                    this.rsn,
                    undefined
                );

                switch (error) {
                    case 'teams are locked 10 minutes before a global event starts':
                    case 'osrs hiscores cannot be reached':
                    case 'teams have been locked by an administrator': {
                        this.returnMessage = `Failed to sign up because ${error}.`;
                        this.state = CONVERSATION_STATE.DONE;
                        break;
                    }
                    case 'this rsn is already signed up':
                    case 'osrs account cannot be found': {
                        this.returnMessage = `Failed to sign up because ${error}.`;
                        this.state = CONVERSATION_STATE.DONE;
                        break;
                    }
                    case 'team name needs to be supplied': {
                        this.state = CONVERSATION_STATE.Q3;
                        break;
                    }
                    case undefined: {
                        this.returnMessage = 'Successfully signed-up up for event';
                        this.state = CONVERSATION_STATE.DONE;
                        const savedEvent: Event.Standard = await Db.upsertEvent(this.event);
                        willSignUpPlayer$.next(savedEvent);
                        break;
                    }
                    default: {
                        Utils.logger.error(`${error} case not handled`);
                        this.state = CONVERSATION_STATE.DONE;
                        break;
                    }
                }
                break;
            }
            case CONVERSATION_STATE.Q3: {
                const answer = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.teamName = this.opMessage.author.id;
                    const error: 'this rsn is already signed up'
                    | 'osrs hiscores cannot be reached'
                    | 'osrs account cannot be found'
                    | 'team name needs to be supplied'
                    | 'teams are locked 10 minutes before a global event starts'
                    | 'teams have been locked by an administrator'
                    | 'participant has no access to this event'
                    | undefined = this.event.signupParticipant(
                        this.opMessage.author.id,
                        this.opMessage.guild.id,
                        this.rsn,
                        this.opMessage.author.id,
                    );
                    switch (error) {
                        case 'osrs hiscores cannot be reached': {
                            this.returnMessage = `Failed to sign up because ${error}.`;
                            this.state = CONVERSATION_STATE.DONE;
                            break;
                        }
                        case undefined: {
                            this.returnMessage = 'Successfully signed-up up for event';
                            this.state = CONVERSATION_STATE.DONE;
                            const savedEvent: Event.Standard = await Db.upsertEvent(this.event);
                            willSignUpPlayer$.next(savedEvent);
                            break;
                        }
                        // everything else should be filtered out from q2
                        default: {
                            Utils.logger.error(`${error} case not handled`);
                            this.state = CONVERSATION_STATE.DONE;
                            break;
                        }
                    }
                } else {
                    this.state = CONVERSATION_STATE.Q3O;
                }
                break;
            }
            case CONVERSATION_STATE.Q3O:
            case CONVERSATION_STATE.Q3E: {
                this.teamName = qa.answer.content;
                const error: 'this rsn is already signed up'
                | 'osrs hiscores cannot be reached'
                | 'osrs account cannot be found'
                | 'team name needs to be supplied'
                | 'teams are locked 10 minutes before a global event starts'
                | 'teams have been locked by an administrator'
                | 'participant has no access to this event'
                | undefined = this.event.signupParticipant(
                    this.opMessage.author.id,
                    this.opMessage.guild.id,
                    this.rsn,
                    this.teamName,
                );
                switch (error) {
                    case 'osrs hiscores cannot be reached': {
                        this.returnMessage = `Failed to sign up because ${error}.`;
                        this.state = CONVERSATION_STATE.DONE;
                        break;
                    }
                    case undefined: {
                        this.returnMessage = 'Successfully signed-up up for event';
                        this.state = CONVERSATION_STATE.DONE;
                        const savedEvent: Event.Standard = await Db.upsertEvent(this.event);
                        willSignUpPlayer$.next(savedEvent);
                        break;
                    }
                    // everything else should be filtered out from q2
                    default: {
                        Utils.logger.error(`${error} case not handled`);
                        this.state = CONVERSATION_STATE.DONE;
                        break;
                    }
                }
                break;
            }
            default:
                break;
        }
    }
}

const eventsSignup = (
    msg: discord.Message
): void => {
    const params: Command.EventsSignup = Command.parseParameters(
        Command.ALL.EVENTS_SIGNUP,
        msg.content,
    );

    const eventsSignupConversation = new EventsSignupConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventsSignupConversation
    );
};

export default eventsSignup;
