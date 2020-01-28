import * as discord from 'discord.js';
import { Command, } from '../command';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Event, } from '../event';
import { Utils, } from '../utils';
import { Db, } from '../database';
import { willUnsignupPlayer$, } from '../main';

class EventUnsignupConversation extends Conversation {
    id: number;

    private async unsignupToEvent(
        id,
        reallyUnsignup: boolean = false,
    ): Promise<CONVERSATION_STATE> {
        // p1
        if (Number.isNaN(id)) {
            return CONVERSATION_STATE.Q1E;
        }
        const event: Event.Standard | null = await Db.fetchGuildEvent(
            id,
            this.opMessage.guild.id,
        );
        if (event === null) {
            return CONVERSATION_STATE.Q1E;
        }

        const thirtyMinsBeforeStart: Date = new Date(event.when.start);
        thirtyMinsBeforeStart.setMinutes(thirtyMinsBeforeStart.getMinutes() - 30);
        if (event.global
            && Utils.isInPast(thirtyMinsBeforeStart)) {
            this.returnMessage = 'Sorry, teams are locked 30 minutes before a global event starts.';
            return CONVERSATION_STATE.DONE;
        }

        // did we find the user?
        const findUser = (participant: Event.Participant):
        boolean => participant.userId.toLowerCase()
                    === this.opMessage.author.id.toLowerCase();

        const userIdx: number = event.teams.findIndex(
            (team: Event.Team):
            boolean => team.participants.some(
                findUser
            )
        );
        const userJdx: number = userIdx !== -1
            ? event.teams[userIdx].participants.findIndex(
                findUser
            ) : -1;
        if (userJdx === -1) {
            // not found
            this.returnMessage = 'You weren\'t signed up anyway';
            return CONVERSATION_STATE.DONE;
        }

        if (!reallyUnsignup) {
            return CONVERSATION_STATE.CONFIRM;
        }

        // really unsignup
        event.teams[userIdx].participants.splice(
            userJdx, 1
        );
        if (event.teams[userIdx].participants.length === 0) {
            event.teams.splice(
                userIdx, 1
            );
        }
        const saved: Event.Standard = await Db.upsertEvent(event);
        this.returnMessage = 'Removed.';
        willUnsignupPlayer$.next(saved);
        return CONVERSATION_STATE.DONE;
    }

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        const id = this.params.id as number | undefined;
        if (id === undefined) {
            return Promise.resolve(false);
        }

        this.state = CONVERSATION_STATE.DONE;
        await this.unsignupToEvent(
            id,
            true
        );
        return Promise.resolve(true);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Remove yourself from which event id? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1E:
                return 'Event not found. Hint: find the event id on the corresponding scoreboard. Please try again.';
            case CONVERSATION_STATE.CONFIRM:
                return 'Are you sure you want to remove yourself from the event? You will lose all your points and have to sign up all your accounts again if you change your mind.';
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                this.id = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(this.id)) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    this.state = await this.unsignupToEvent(this.id);
                }
                break;
            }
            case CONVERSATION_STATE.CONFIRM: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.returnMessage = 'Cancelled.';
                    this.state = CONVERSATION_STATE.DONE;
                } else {
                    this.state = await this.unsignupToEvent(this.id, true);
                }
                break;
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
        eventDeleteConversation
    );
};

export default eventsUnsignup;
