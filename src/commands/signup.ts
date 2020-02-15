import * as discord from 'discord.js';
import { hiscores } from 'osrs-json-api';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Network } from '../network';
import { Command } from '../command';
import { Event } from '../event';
import { Db } from '../database';
import { willSignUpPlayer$, getTagFromDiscordId, gClient } from '../..';
import { Utils } from '../utils';

class EventsSignupConversation extends Conversation {
    event: Event.Standard;

    rsn: string;

    teamName: string | null = null;

    // eslint-disable-next-line class-methods-use-this
    async init(): Promise<boolean> {
        const id = this.params.id as number | undefined;
        const rsn = this.params.rsn as string | undefined;
        const teamName = this.params.team as string | undefined;

        if (id === undefined || rsn === undefined) {
            return Promise.resolve(false);
        }

        const dummy: discord.Message = new discord.Message(
            this.opMessage.channel, {
                id: this.opMessage.id,
                type: this.opMessage.type,
                author: this.opMessage.author,
                content: `${id}`,
                member: this.opMessage.member,
                pinned: this.opMessage.pinned,
                tts: this.opMessage.tts,
                nonce: this.opMessage.nonce,
                system: this.opMessage.system,
                embeds: this.opMessage.embeds,
                attachments: this.opMessage.attachments,
                createdTimestamp: this.opMessage.createdTimestamp,
                editedTimestamp: this.opMessage.editedTimestamp,
                reactions: this.opMessage.reactions,
                webhookID: this.opMessage.webhookID,
                hit: this.opMessage.hit,
            }, gClient,
        );
        await this.consumeQa({
            questions: [],
            answer: dummy,
        });
        if (this.state === CONVERSATION_STATE.Q1E) {
            return Promise.resolve(false);
        }

        dummy.content = rsn;
        await this.consumeQa({
            questions: [],
            answer: dummy,
        });
        if (this.state === CONVERSATION_STATE.DONE) {
            return Promise.resolve(true);
        }

        if (teamName !== undefined) {
            dummy.content = teamName;
            await this.consumeQa({
                questions: [],
                answer: dummy,
            });
            if (this.state === CONVERSATION_STATE.Q3E) {
                return Promise.resolve(false);
            }
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }

    produceQ(): string | null {
        switch (this.state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event id would you like to signup for? (type .exit to stop command)';
            case CONVERSATION_STATE.Q2:
                return 'What is your Runescape name?';
            case CONVERSATION_STATE.Q3:
                return 'Which team would you like to join?';
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
                    this.lastErrorMessage = 'Cannot parse number.';
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                }
                const guildEvent: Event.Standard | null = await Db.fetchAnyGuildEvent(
                    id,
                    this.opMessage.guild.id,
                );
                if (guildEvent === null) {
                    this.lastErrorMessage = 'Event not found. Hint: find the event id on the corresponding scoreboard.';
                    this.state = CONVERSATION_STATE.Q1E;
                    break;
                }

                if (guildEvent.global === true) {
                    const teamIdx: number = guildEvent.teams.findIndex(
                        (team: Event.Team): boolean => team.guildId === qa.answer.guild.id,
                    );
                    if (teamIdx !== -1) {
                        this.teamName = guildEvent.teams[teamIdx].name;
                    }

                    // make sure teams are not locked
                    const tenMinutesBeforeStart: Date = new Date(guildEvent.when.start);
                    tenMinutesBeforeStart.setMinutes(tenMinutesBeforeStart.getMinutes() - 10);
                    if (Utils.isInPast(tenMinutesBeforeStart)) {
                        this.lastErrorMessage = 'Teams are locked 10 minutes before a global event starts.';
                        this.state = CONVERSATION_STATE.DONE;
                        break;
                    }
                } else if (guildEvent.adminLocked === true) {
                    this.returnMessage = 'Teams have been locked by an administrator.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                }
                this.event = guildEvent;
                this.state = CONVERSATION_STATE.Q2;
                break;
            }
            case CONVERSATION_STATE.Q2:
            case CONVERSATION_STATE.Q2E: {
                this.rsn = qa.answer.content;

                if (this.rsn.length === 0) {
                    this.lastErrorMessage = 'Rsn must not be blank.';
                    this.state = CONVERSATION_STATE.Q2E;
                    break;
                }

                if (this.rsn.length > 12) {
                    this.lastErrorMessage = 'Rsn must be less than or equal to 12 characters.';
                    this.state = CONVERSATION_STATE.Q2E;
                    break;
                }

                // eslint-disable-next-line no-control-regex
                const regex = /[^\x00-\x7F]/g;
                const matches = this.rsn.match(regex);
                if (matches !== null) {
                    this.lastErrorMessage = 'Rsn must be of ASCII characters.';
                    this.state = CONVERSATION_STATE.Q2E;
                    break;
                }

                const findRsn = (participant: Event.Participant):
                boolean => participant.runescapeAccounts.some(
                    (account: Event.Account):
                    boolean => account.rsn.toLowerCase() === this.rsn.toLowerCase(),
                );

                const rsnIdx: number = this.event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.participants.some(
                        findRsn,
                    ),
                );

                const rsnJdx: number = rsnIdx !== -1
                    ? this.event.teams[rsnIdx].participants.findIndex(
                        findRsn,
                    ) : -1;

                if (rsnIdx !== -1 && rsnJdx !== -1) {
                    // we found the rsn in use already
                    const tag: string = await getTagFromDiscordId(
                        gClient,
                        this.event.teams[rsnIdx].participants[rsnJdx].userId,
                    );
                    this.lastErrorMessage = `This rsn is already signed up by ${tag}.`;
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                }

                // is the participant already on a team?
                const participantIdx: number = this.event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.participants.some(
                        (participant: Event.Participant):
                        boolean => participant.userId === qa.answer.author.id,
                    ),
                );

                const participantJdx: number = participantIdx !== -1
                    ? this.event.teams[participantIdx].participants.findIndex(
                        (participant: Event.Participant):
                        boolean => participant.userId === qa.answer.author.id,
                    ) : -1;

                if (participantIdx !== -1 && participantJdx !== -1) {
                // we know the team to signup for
                    const participant: Event.Participant = this
                        .event
                        .teams[participantIdx]
                        .participants[participantJdx];
                    this
                        .event
                        .teams[participantIdx]
                        .participants[participantJdx]
                        .runescapeAccounts = participant
                            .runescapeAccounts.concat({
                                rsn: this.rsn,
                            });
                    const savedEvent: Event.Standard = await Db.upsertEvent(this.event);
                    willSignUpPlayer$.next(savedEvent);

                    this.returnMessage = 'Successfully signed-up up for event.';
                    this.state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    this.state = CONVERSATION_STATE.Q3;
                    break;
                }
            }
            case CONVERSATION_STATE.Q3:
            case CONVERSATION_STATE.Q3E: {
                const teamName: string = this.teamName !== null
                    ? this.teamName
                    : qa.answer.content;

                if (teamName.length === 0) {
                    this.lastErrorMessage = 'Team name must not be blank.';
                    this.state = CONVERSATION_STATE.Q3E;
                    break;
                }

                if (teamName.length > 30) {
                    this.lastErrorMessage = 'Team name must be shorter than 30 characters.';
                    this.state = CONVERSATION_STATE.Q3E;
                    break;
                }

                // we either add a new team or we add to the found team
                const teamIdx: number = this.event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.name.toLowerCase() === teamName.toLowerCase(),
                );

                const participant: Event.Participant = {
                    userId: qa.answer.author.id,
                    customScore: 0,
                    runescapeAccounts: [
                        {
                            rsn: this.rsn,
                        },
                    ],
                };
                if (teamIdx === -1) {
                // if we didn't find the team
                // create a new team
                    const team: Event.Team = {
                        name: teamName,
                        guildId: qa.answer.guild.id,
                        participants: [
                            participant,
                        ],
                    };
                    this.event.teams = [
                        ...this.event.teams,
                        team,
                    ];
                } else {
                // we found the team
                // so add the participant to the team
                    this.event.teams[teamIdx].participants = [
                        ...this.event.teams[teamIdx].participants,
                        participant,
                    ];
                }
                const savedEvent: Event.Standard = await Db.upsertEvent(this.event);
                willSignUpPlayer$.next(savedEvent);

                this.returnMessage = 'Successfully signed-up up for event.';
                this.state = CONVERSATION_STATE.DONE;
                break;
            }
            default:
                break;
        }
    }
}

const eventsSignup = (
    msg: discord.Message,
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
        eventsSignupConversation,
    );
};

export default eventsSignup;
