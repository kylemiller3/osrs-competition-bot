import * as discord from 'discord.js';
import { hiscores, } from 'osrs-json-api';
import { Utils, } from '../utils';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Network, } from '../network';
import { Command, } from '../command';
import { Event, } from '../event';
import { Db, } from '../database';

class EventsSignupConversation extends Conversation {
    event: Event.Object;
    hiscore: hiscores.LookupResponse;
    command: Command.EventsSignup = {
        id: -1,
        rsn: '',
    };

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event id would you like to signup for?';
            case CONVERSATION_STATE.Q1E:
                return 'Could not find event id. Hint: find the event id with the list events command. Please try again.';
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
                const eventIdStr: string = qa.answer.content;
                const eventId: number = Number.parseInt(eventIdStr, 10);
                if (Number.isNaN(eventId)) {
                    this.state = CONVERSATION_STATE.Q1E;
                } else {
                    this.command.id = eventId;
                    const event: Event.Object | null = await Db.fetchEvent(eventId);
                    if (event === null) {
                        this.state = CONVERSATION_STATE.Q1E;
                    } else {
                        this.state = CONVERSATION_STATE.Q2;
                        this.event = event;
                    }
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
                    this.command.rsn = rsn;
                    this.hiscore = hiscore;
                }
                break;
            }
            case CONVERSATION_STATE.Q3: {
                const answer: string = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this.state = CONVERSATION_STATE.DONE;
                    this.returnMessage = 'Signed up for event';
                    const team: Event.Team = {
                        name: this.command.rsn,
                        participants: [
                            {
                                discordId: this.opMessage.author.id,
                                customScore: 0,
                                runescapeAccounts: [
                                    {
                                        rsn: this.command.rsn,
                                        starting: this.hiscore,
                                        ending: this.hiscore,
                                    } as Event.CompetitiveAccount,
                                ],
                            },
                        ],
                    };
                    const newTeams: Event.Team[] = this.event.teams.concat(team);
                    this.event.teams = newTeams;
                    await Db.upsertEvent(this.event);
                } else {
                    this.state = CONVERSATION_STATE.Q3O;
                }
                break;
            }
            case CONVERSATION_STATE.Q3O:
            case CONVERSATION_STATE.Q3E: {
                const teamStr: string = qa.answer.content;
                this.command.team = teamStr;

                let foundTeam: Event.Team | undefined;
                const foundIndex: number = this.event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.name.toLowerCase() === teamStr.toLowerCase()
                );
                if (foundIndex !== -1) {
                    foundTeam = this.event.teams[foundIndex];
                }
                if (foundTeam === undefined) {
                    const team: Event.Team = {
                        name: teamStr,
                        participants: [
                            {
                                discordId: this.opMessage.author.id,
                                customScore: 0,
                                runescapeAccounts: [
                                    {
                                        rsn: this.command.rsn,
                                        starting: this.hiscore,
                                        ending: this.hiscore,
                                    } as Event.CompetitiveAccount,
                                ],
                            },
                        ],
                    };
                    const newTeams: Event.Team[] = this.event.teams.concat(team);
                    this.event.teams = newTeams;
                } else {
                    const participant: Event.Participant = {
                        discordId: this.opMessage.author.id,
                        customScore: 0,
                        runescapeAccounts: [
                            {
                                rsn: this.command.rsn,
                                starting: this.hiscore,
                                ending: this.hiscore,
                            } as Event.CompetitiveAccount,
                        ],
                    };
                    const newTeam: Event.Team = { ...foundTeam, };
                    const newParticipants: Event.Participant[] = newTeam.participants.concat(
                        participant
                    );
                    newTeam.participants = newParticipants;
                    this.event.teams[foundIndex] = newTeam;
                }
                this.state = CONVERSATION_STATE.DONE;
                this.returnMessage = 'Signed up for team';
                await Db.upsertEvent(this.event);
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
