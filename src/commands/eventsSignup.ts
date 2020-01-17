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
import { willSignUpPlayer$ } from '../main';

class EventsSignupConversation extends Conversation {
    event: Event.Object;
    rsn: string;
    hiscore: hiscores.Player;

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<void> {
        return Promise.resolve();
    }

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
                    const event: Event.Object | null = await Db.fetchEvent(eventId);
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
                this.rsn = qa.answer.content;

                const findRsn = (participant: Event.Participant):
                boolean => participant.runescapeAccounts.some(
                    (account: Event.Account):
                    boolean => account.rsn.toLowerCase() === this.rsn.toLowerCase()
                );

                const rsnIdx: number = this.event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.participants.some(
                        findRsn
                    )
                );

                const rsnJdx: number = rsnIdx !== -1
                    ? this.event.teams[rsnIdx].participants.findIndex(
                        findRsn
                    ) : -1;

                if (rsnIdx !== -1 && rsnJdx !== -1) {
                    // we found the rsn in use already
                    const participant: Event.Participant = this.event.teams[rsnIdx]
                        .participants[rsnJdx];
                    const user: discord.User = await this.opMessage.client
                        .fetchUser(participant.discordId);
                    this.returnMessage = `This rsn is already signed up by ${user.tag}`;
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                }

                const hiscore: hiscores.Player | null = await Network.hiscoresFetch$(
                    this.rsn,
                    false
                ).toPromise();

                if (hiscore === null) {
                    this.state = CONVERSATION_STATE.Q2E;
                    break;
                }

                // is the user already on a team?
                // use that team
                const findUser = (participant: Event.Participant):
                boolean => participant.discordId.toLowerCase()
                    === this.opMessage.author.id.toLowerCase();

                const userIdx: number = this.event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.participants.some(
                        findUser
                    )
                );
                const userJdx: number = userIdx !== -1
                    ? this.event.teams[userIdx].participants.findIndex(
                        findUser
                    ) : -1;

                if (userIdx !== -1 && userJdx !== -1) {
                    // we found the user
                    // add to the participant rsn accounts and finish
                    const newAccount: Event.Account = {
                        rsn: this.rsn,
                    };

                    const newAccounts: Event.Account[] = this.event
                        .teams[userIdx]
                        .participants[userJdx]
                        .runescapeAccounts
                        .concat(
                            newAccount,
                        );
                    this.event
                        .teams[userIdx]
                        .participants[userJdx]
                        .runescapeAccounts = newAccounts;

                    await Db.upsertEvent(this.event);
                    this.state = CONVERSATION_STATE.DONE;
                    this.returnMessage = 'Signed up for team';
                } else {
                    this.state = CONVERSATION_STATE.Q3;
                }
                break;
            }
            case CONVERSATION_STATE.Q3:
            case CONVERSATION_STATE.Q3E: {
                const teamName: string = qa.answer.content;

                const teamIdx: number = this.event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.name.toLowerCase() === teamName.toLowerCase()
                );
                const foundTeam: Event.Team | undefined = teamIdx !== -1
                    ? this.event.teams[teamIdx]
                    : undefined;
                if (foundTeam === undefined) {
                    // if we didn't find the team
                    // create a new team
                    const team: Event.Team = {
                        name: teamName,
                        participants: [
                            {
                                discordId: this.opMessage.author.id,
                                customScore: 0,
                                runescapeAccounts: [
                                    {
                                        rsn: this.rsn,
                                        starting: this.hiscore,
                                        ending: this.hiscore,
                                    } as Event.CompetitiveAccount,
                                ],
                            },
                        ],
                    };
                    this.event.teams = this.event.teams.concat(team);
                } else {
                    // we found the team
                    // so add the participant to the new team
                    const participant: Event.Participant = {
                        discordId: this.opMessage.author.id,
                        customScore: 0,
                        runescapeAccounts: [
                            {
                                rsn: this.rsn,
                                starting: this.hiscore,
                                ending: this.hiscore,
                            } as Event.CompetitiveAccount,
                        ],
                    };
                    this.event
                        .teams[teamIdx]
                        .participants = this.event
                            .teams[teamIdx]
                            .participants.concat(
                                participant
                            );
                }

                // save event
                willSignUpPlayer$.next(this.event);
                await Db.upsertEvent(this.event);
                this.state = CONVERSATION_STATE.DONE;
                this.returnMessage = 'Signed up for team';
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
