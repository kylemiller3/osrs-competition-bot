import * as discord from 'discord.js';
import { hiscores, } from 'osrs-json-api';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Network, } from '../network';
import { Command, } from '../command';
import { Event, } from '../event';
import { Db, } from '../database';
import { willSignUpPlayer$, } from '../main';
import { Utils, } from '../utils';

class EventsSignupConversation extends Conversation {
    id: number;
    rsn: string;
    teamName: string

    private async signupToEventWithRsnAndTeam(
        id: number,
        rsn: string,
        teamName?: string,
    ): Promise<CONVERSATION_STATE> {
        // p1
        if (Number.isNaN(id)) {
            return CONVERSATION_STATE.Q1E;
        }
        const event: Event.Object | null = await Db.fetchEvent(id);
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
        if (event === null || access === false
            || Utils.isInPast(event.when.end)) {
            return CONVERSATION_STATE.Q1E;
        }

        // p2
        const findRsn = (participant: Event.Participant):
        boolean => participant.runescapeAccounts.some(
            (account: Event.Account):
            boolean => account.rsn.toLowerCase() === rsn.toLowerCase()
        );

        const rsnIdx: number = event.teams.findIndex(
            (team: Event.Team):
            boolean => team.participants.some(
                findRsn
            )
        );

        const rsnJdx: number = rsnIdx !== -1
            ? event.teams[rsnIdx].participants.findIndex(
                findRsn
            ) : -1;

        if (rsnIdx !== -1 && rsnJdx !== -1) {
            // we found the rsn in use already
            const participant: Event.Participant = event.teams[rsnIdx]
                .participants[rsnJdx];
            const user: discord.User = await this.opMessage.client
                .fetchUser(participant.discordId);
            this.returnMessage = `This rsn is already signed up by ${user.tag}`;
            return CONVERSATION_STATE.DONE;
        }

        const hiscore: hiscores.Player | null = await Network.hiscoresFetch$(
            rsn,
            false
        ).toPromise();

        if (hiscore === null) {
            return CONVERSATION_STATE.Q2E;
        }

        // is the participant already on a team?
        const participantIdx: number = event.teams.findIndex(
            (team: Event.Team):
            boolean => team.participants.some(
                (participant: Event.Participant):
                boolean => participant.discordId === this.opMessage.author.id
            )
        );

        const participantJdx: number = participantIdx !== -1
            ? event.teams[participantIdx].participants.findIndex(
                (participant: Event.Participant):
                boolean => participant.discordId === this.opMessage.author.id
            ) : -1;

        const newEvent: Event.Object = { ...event, };
        if (participantIdx !== -1 && participantJdx !== -1) {
            // we know the team to signup for
            const participant: Event.Participant = newEvent
                .teams[participantIdx]
                .participants[participantJdx];
            newEvent
                .teams[participantIdx]
                .participants[participantJdx]
                .runescapeAccounts = participant
                    .runescapeAccounts.concat({
                        rsn,
                    });
            // save event
            const savedEvent: Event.Object = await Db.upsertEvent(newEvent);
            willSignUpPlayer$.next(savedEvent);

            this.returnMessage = 'Signed up for team';
            return CONVERSATION_STATE.DONE;
        } if (teamName === undefined) {
            // we should ask the user what team they are going to signup for
            return CONVERSATION_STATE.Q3;
        }

        // p3
        const teamIdx: number = event.teams.findIndex(
            (team: Event.Team):
            boolean => team.name.toLowerCase() === teamName.toLowerCase()
        );
        if (teamIdx === -1) {
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
                                rsn,
                            },
                        ],
                    },
                ],
            };
            newEvent.teams = event.teams.concat(team);
        } else {
            // we found the team
            // so add the participant to the new team
            const participant: Event.Participant = {
                discordId: this.opMessage.author.id,
                customScore: 0,
                runescapeAccounts: [
                    {
                        rsn,
                    },
                ],
            };
            newEvent
                .teams[teamIdx]
                .participants = event
                    .teams[teamIdx]
                    .participants.concat(
                        participant
                    );
        }

        // save event
        const savedEvent: Event.Object = await Db.upsertEvent(newEvent);
        willSignUpPlayer$.next(savedEvent);

        this.returnMessage = 'Signed up for team';
        return CONVERSATION_STATE.DONE;
    }

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        const id = this.params.id as number | undefined;
        const rsn = this.params.rsn as string | undefined;
        const team = this.params.team as string | undefined;

        if (id === undefined || rsn === undefined) {
            return Promise.resolve(false);
        }

        this.state = CONVERSATION_STATE.DONE;
        const stateCheck: CONVERSATION_STATE = await this.signupToEventWithRsnAndTeam(
            id,
            rsn,
            team,
        );

        if (stateCheck !== CONVERSATION_STATE.DONE) {
            this.returnMessage = 'No team specified';
        }

        return Promise.resolve(true);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event id would you like to signup for?';
            case CONVERSATION_STATE.Q1E:
                return 'Not found. Hint: try the \'!f events listall\' command. Please try again.';
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
            case CONVERSATION_STATE.Q1: {
                this.id = Number.parseInt(qa.answer.content, 10);
                this.state = CONVERSATION_STATE.Q2;
                break;
            }
            case CONVERSATION_STATE.Q2: {
                this.rsn = qa.answer.content;
                this.state = await this.signupToEventWithRsnAndTeam(
                    this.id,
                    this.rsn,
                    this.teamName,
                );
                break;
            }
            case CONVERSATION_STATE.Q3: {
                this.teamName = qa.answer.content;
                this.state = await this.signupToEventWithRsnAndTeam(
                    this.id,
                    this.rsn,
                    this.teamName,
                );
                break;
            }

            case CONVERSATION_STATE.Q1E: {
                this.id = Number.parseInt(qa.answer.content, 10);
                this.state = await this.signupToEventWithRsnAndTeam(
                    this.id,
                    this.rsn,
                    this.teamName,
                );
                break;
            }
            case CONVERSATION_STATE.Q2E: {
                this.rsn = qa.answer.content;
                this.state = await this.signupToEventWithRsnAndTeam(
                    this.id,
                    this.rsn,
                    this.teamName,
                );
                break;
            }
            case CONVERSATION_STATE.Q3E: {
                this.teamName = qa.answer.content;
                this.state = await this.signupToEventWithRsnAndTeam(
                    this.id,
                    this.rsn,
                    this.teamName,
                );
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
