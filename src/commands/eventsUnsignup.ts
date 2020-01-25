import * as discord from 'discord.js';
import { Command, } from '../command';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Event, } from '../event';
import { Utils, } from '../utils';
import { Db, } from '../database';
import { willUnsignupPlayer$, } from '../main';

class EventDeleteConversation extends Conversation {
    id: number;

    private async unsignupToEvent(
        id,
        reallyUnsignup: boolean = false,
    ): Promise<CONVERSATION_STATE> {
        // p1
        if (Number.isNaN(id)) {
            return CONVERSATION_STATE.Q1E;
        }
        const event: Event.Object | null = await Db.fetchGuildEvent(
            id,
            this.opMessage.guild.id,
        );
        let access = false;
        if (event !== null) {
            const standard: boolean = event.guilds.creator.discordId
                === this.opMessage.guild.id;
            const global: boolean = event.global === true
                && event.guilds.others !== undefined
                && event.guilds.others.some(
                    (guild: Event.Guild):
                    boolean => guild.discordId === this.opMessage.guild.id
                );
            access = standard || global;
        }
        if (event === null || access === false) {
            return CONVERSATION_STATE.Q1E;
        }
        // did we find the user?
        const findUser = (participant: Event.Participant):
        boolean => participant.discordId.toLowerCase()
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
        const saved: Event.Object = await Db.upsertEvent(event);
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
                return 'Not found. Hint: try the \'!f events listall\' command. Please try again.';
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
                this.state = await this.unsignupToEvent(this.id);
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

    const eventDeleteConversation = new EventDeleteConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventDeleteConversation
    );

    // if (params.id === undefined) {
    //     msg.reply(ERROR.NO_EVENT_SPECIFIED);
    //     return;
    // }
};

export default eventsUnsignup;
