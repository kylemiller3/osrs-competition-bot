import * as discord from 'discord.js';
import { Command, } from '../command';
import { Event, } from '../event';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Db, } from '../database';
import { Utils, } from '../utils';
import { getDisplayNameFromDiscordId, } from '../main';

class ListParticipantsConversation extends Conversation {
    event: Event.Object;
    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<void> {
        return Promise.resolve();
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'List which event id?';
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
                const idToEdit: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(idToEdit)) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    const event: Event.Object | null = await Db.fetchEvent(idToEdit);
                    if (event === null) {
                        this.state = CONVERSATION_STATE.Q1E;
                    } else {
                        const retMsgsResolver: Promise<string>[] = event.teams.map(
                            async (team: Event.Team): Promise<string> => {
                                const participantResolver:
                                Promise<discord.User>[] = team.participants.map(
                                    (participant: Event.Participant):
                                    Promise<discord.User> => this.opMessage.client.fetchUser(
                                        participant.discordId
                                    )
                                );
                                const discordUsers: discord.User[] = await Promise.all(
                                    participantResolver
                                );
                                const participantStr: string = discordUsers.map(
                                    (user: discord.User, idx: number): string => {
                                        const participant: Event.Participant = team.participants[idx];
                                        const rsnStrs: string = participant.runescapeAccounts.map(
                                            (account: Event.Account): string => `\t\trsn: ${account.rsn}`
                                        ).join('\n');
                                        return `\tDiscord: ${user.tag}\n${rsnStrs}\n`;
                                    }
                                ).join('\n');
                                return `Team ${team.name}:\n${participantStr}`;
                            }
                        );
                        const retMsgs: string[] = await Promise.all(retMsgsResolver);

                        this.event = event;
                        this.state = CONVERSATION_STATE.DONE;
                        this.returnOptions = {
                            code: true,
                            reply: this.opMessage.author,
                        };
                        this.returnMessage = `Event ${event.name}:\n${retMsgs.join('\n')}`;
                    }
                }
                break;
            }
            default:
                break;
        }
    }
}

const eventsListParticipants = (
    msg: discord.Message
): void => {
    const params: Command.EventsListParticipants = Command.parseParameters(
        Command.ALL.EVENTS_LIST_PARTICIPANTS,
        msg.content,
    );

    const eventListParticipantsConversation = new ListParticipantsConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventListParticipantsConversation
    );

    /*
    if (params.id === undefined) {
        msg.reply('You must specify an event.');
        return;
    }

    const event: Event.Event = {} as Event.Event; // get event
    if (Event.isTeamEvent(event)) {
        const formattedStr: string = event.teams.map(
            (team: Event.Team, idx: number): string => {
                const teamStr: string[] = team.linkedDiscordIds.map(
                    (discordId: string, idy: number): string => {
                        const displayName: string = getDisplayNameFromDiscordId(
                            msg.guild.id,
                            discordId
                        );
                        const participant: Event.Participant = Event.getParticipantByDiscordId(
                            event.participants,
                            discordId,
                        );
                        const accounts: string = participant.runescapeAccounts.map(
                            (account: Event.Account): string => account.rsn
                        ).join(', ');
                        return `\n\t${idy}: ${displayName} signed up ${accounts}`;
                    }
                );
                return `\n${idx}: team '${team.name}'${teamStr}`;
            }
        ).join('');
        const reply: string = event.participants.length > 0
            ? formattedStr
            : 'no participants';
        Utils.logger.debug('ListParticipants called');
    }
    */
};

export default eventsListParticipants;
