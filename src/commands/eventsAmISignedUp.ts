import * as discord from 'discord.js';
import { Event, } from '../event';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Db, } from '../database';
import { Command, } from '../command';

class AmISignedUpConversation extends Conversation {
    events: Event.Object[] = [];
    static isSignedUp(
        event: Event.Object,
        discordId: string,
    ): boolean {
        const signedUp: boolean = event.teams.some(
            (team: Event.Team):
            boolean => team.participants.some(
                (participant: Event.Participant):
                boolean => participant.discordId === discordId
            )
        );
        return signedUp;
    }

    async init(): Promise<void> {
        const events: Event.Object[] | null = await Db.fetchAllGuildEvents(
            this.opMessage.guild.id
        );
        if (events !== null) {
            this.events = events;
        } else {
            this.state = CONVERSATION_STATE.DONE;
            this.returnMessage = 'This guild has no events';
            return;
        }

        if (this.params.id !== undefined && this.params.id !== null) {
            this.state = CONVERSATION_STATE.DONE;
            const foundEvent: Event.Object | undefined = this.events.find(
                (event: Event.Object):
                boolean => event.id === this.params.id
            );
            if (foundEvent === undefined) {
                this.returnMessage = 'Could not find event. Hint: find the event id with the list events command.';
            } else {
                this.returnMessage = `You are ${AmISignedUpConversation.isSignedUp(foundEvent, this.opMessage.author.id) ? '' : 'not '}signed up.`;
            }
            this.endConversation();
        } else {
            this.state = CONVERSATION_STATE.Q1;
        }
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event id would you like to check?';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event. Hint: find the event id with the list events command. Please try again.';
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const eventIdStr: string = qa.answer.content;
                const eventId: number = Number.parseInt(eventIdStr, 10);
                if (Number.isNaN(eventId)) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    const foundEvent: Event.Object | undefined = this.events.find(
                        (event: Event.Object):
                        boolean => event.id === eventId
                    );
                    if (foundEvent === undefined) {
                        this.state = CONVERSATION_STATE.Q1E;
                    } else {
                        this.state = CONVERSATION_STATE.DONE;
                        this.returnMessage = `You are ${AmISignedUpConversation.isSignedUp(foundEvent, this.opMessage.author.id) ? '' : 'not '}signed up.`;
                    }
                }
                break;
            }
            default:
                break;
        }
    }
}

const eventsAmISignedUp = (
    msg: discord.Message
): void => {
    const params: Command.EventsAmISignedUp = Command.parseParameters(
        Command.ALL.EVENTS_AMISIGNEDUP,
        msg.content,
    );

    const amISignedUpConversation = new AmISignedUpConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        amISignedUpConversation
    );

    /*
    const event: Event.Event = undefined; // get event here (params.id)
    if (event === undefined) {
        msg.reply(`event ${params.id} not found`);
        return;
    }

    const signedUp = event.participants.find(
        (participant: Event.Participant):
        boolean => participant.discordId === msg.author.id
    );

    let signupStr = signedUp
        ? `You are signed up to ${event.name} (id=${event.id}).`
        : `You are not signed up to ${event.name} (id=${event.id}).`;

    if (event.teams !== undefined) {
        const teamName = event.teams.find(
            (team: Event.Team):
            boolean => team.linkedDiscordIds.includes(msg.author.id)
        );
        signupStr = teamName !== undefined
            ? signupStr.concat(` Your team is ${teamName}.`)
            : signupStr.concat(' You are not on a team.');
    }

    msg.reply(signupStr);
    */
};

export default eventsAmISignedUp;
