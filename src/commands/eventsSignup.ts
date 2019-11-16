import * as discord from 'discord.js';
import { hiscores, } from 'osrs-json-api';
import { Utils, } from '../utils';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Network, } from '../network';

class EventsSignupConversation extends Conversation {
    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event number would you like to signup for?\nHint: find the event number with the list events command.';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event number.';
            case CONVERSATION_STATE.Q2:
                return 'What is your Runescape name?';
            case CONVERSATION_STATE.Q2E:
                return 'Cannot find Runescape name on hiscores.';
            case CONVERSATION_STATE.Q3:
                return 'Would you like to join a team?';
            case CONVERSATION_STATE.Q3O:
                return 'Which team would you like to join?';
            case CONVERSATION_STATE.Q3E:
                return 'Could not parse team name.';
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const eventNumStr: string = qa.answer.content;
                const eventNum: number = Number.parseInt(eventNumStr, 10);
                if (Number.isNaN(eventNum)) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    this.param.eventNum = eventNum;
                    // this will be async code
                    // get the event so we know if we skip q2 or not
                    // this.event =
                    // await
                    this.state = CONVERSATION_STATE.Q2;
                }
                break;
            }
            case CONVERSATION_STATE.Q2:
            case CONVERSATION_STATE.Q2E: {
                const rsn: string = qa.answer.content;
                const hiscore: hiscores.LookupResponse | null = await Network.hiscoresFetch$(
                    rsn,
                    false
                ).toPromise();
                if (hiscore === null) {
                    this.state = CONVERSATION_STATE.Q2E;
                } else {
                    this.state = CONVERSATION_STATE.Q3;
                    this.param.rsn = rsn;
                }
                break;
            }
            case CONVERSATION_STATE.Q3: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.DONE;
                    this.confirmationMessage = 'Signed up for event';
                } else {
                    this.state = CONVERSATION_STATE.Q3O;
                }
                break;
            }
            case CONVERSATION_STATE.Q3O:
            case CONVERSATION_STATE.Q3E: {
                const team: string = qa.answer.content;
                this.param.team = team;
                this.state = CONVERSATION_STATE.DONE;
                this.confirmationMessage = 'Signed up for team';
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
    const eventsSignupConversation = new EventsSignupConversation(msg);
    ConversationManager.startNewConversation(
        msg,
        eventsSignupConversation
    );

    /*
    let errors: string[] = [];
    if (params.id === undefined) {
        errors = [
            ...errors,
            Error.NO_EVENT_SPECIFIED,
        ];
    }

    const event: Event.Event = {} as Event.Event;
    // grab stats?
    if (event === undefined) {
        msg.reply(Error.EVENT_NOT_FOUND);
        return;
    }

    if (params.rsn === undefined
        && (!Event.isEventCasual(event) && !Event.isEventCustom(event))) {
        errors = [
            ...errors,
            Error.NO_RSN_SPECIFIED,
        ];
    }

    if (params.team === undefined && Event.isTeamEvent(event)) {
        errors = [
            ...errors,
            Error.NO_TEAM_SPECIFIED,
        ];
    }

    if (errors.length > 0) {
        Utils.logger.info(
            errors.join(' ')
        );
        return;
    }

    if (!event.state.hasEnded) {
        if (Event.isEventCasual(event) || Event.isEventCustom(event)) {
            // mutate participants
        } else {
            // grab stats
        }
    }
    */
};

export default eventsSignup;
