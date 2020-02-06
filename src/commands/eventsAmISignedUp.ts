import * as discord from 'discord.js';
import { Event, } from '../event';
import {
    Conversation, Qa, CONVERSATION_STATE, ConversationManager,
} from '../conversation';
import { Db, } from '../database';
import { Command, } from '../command';

class AmISignedUpConversation extends Conversation {
    events: Event.Standard[] = [];
    static isSignedUp(
        event: Event.Standard,
        discordId: string,
    ): boolean {
        const signedUp: boolean = event.teams.some(
            (team: Event.Team):
            boolean => team.participants.some(
                (participant: Event.Participant):
                boolean => participant.userId === discordId
            )
        );
        return signedUp;
    }

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event id would you like to check? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event. Hint: find the event id on the corresponding scoreboard. Please try again.';
            default:
                return null;
        }
    }

    async consumeQa(qa: Qa): Promise<void> {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const eventId: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(eventId)) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    const event: Event.Standard | null = await Db.fetchAnyGuildEvent(
                        eventId,
                        this.opMessage.guild.id,
                    );
                    if (event === null) {
                        this.state = CONVERSATION_STATE.Q1E;
                    } else {
                        this.state = CONVERSATION_STATE.DONE;
                        this.returnMessage = `You are ${AmISignedUpConversation.isSignedUp(event, this.opMessage.author.id) ? '' : 'not '}signed up.`;
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
    // const params: Command.EventsAmISignedUp = Command.parseParameters(
    //     Command.ALL.EVENTS_AMISIGNEDUP,
    //     msg.content,
    // );

    // const amISignedUpConversation = new AmISignedUpConversation(
    //     msg,
    //     params,
    // );
    // ConversationManager.startNewConversation(
    //     msg,
    //     amISignedUpConversation
    // );

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
