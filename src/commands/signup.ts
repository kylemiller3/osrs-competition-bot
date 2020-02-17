import * as discord from 'discord.js';
import {
    Conversation, CONVERSATION_STATE, Qa, ConversationManager,
} from '../conversation';
import { Command } from '../command';
import { Event } from '../event';
import { Db } from '../database';
import { willSignUpPlayer$, getTagFromDiscordId, gClient } from '../..';
import { Utils } from '../utils';

class EventsSignupConversation extends Conversation {
    private _event: Event.Standard;

    private _rsn: string;

    private _teamName: string | undefined;

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<boolean> {
        const id = this._params.id as number | undefined;
        const rsn = this._params.rsn as string | undefined;
        let team = this._params.team as string | undefined;

        if (id === undefined || rsn === undefined) {
            return Promise.resolve(false);
        }

        if (team === undefined) {
            team = this._opMessage.author.id;
        }

        const dummy: discord.Message = new discord.Message(
            this._opMessage.channel, {
                id: this._opMessage.id,
                type: this._opMessage.type,
                author: this._opMessage.author,
                content: `${id}`,
                member: this._opMessage.member,
                pinned: this._opMessage.pinned,
                tts: this._opMessage.tts,
                nonce: this._opMessage.nonce,
                system: this._opMessage.system,
                embeds: this._opMessage.embeds,
                attachments: this._opMessage.attachments,
                createdTimestamp: this._opMessage.createdTimestamp,
                editedTimestamp: this._opMessage.editedTimestamp,
                reactions: this._opMessage.reactions,
                webhookID: this._opMessage.webhookID,
                hit: this._opMessage.hit,
            }, gClient,
        );
        await this.consumeQa({
            questions: [],
            answer: dummy,
        });
        if (this._state === CONVERSATION_STATE.Q1E) {
            return Promise.resolve(false);
        }

        dummy.content = rsn;
        await this.consumeQa({
            questions: [],
            answer: dummy,
        });
        if (this._state === CONVERSATION_STATE.DONE) {
            return Promise.resolve(true);
        } if (this._state === CONVERSATION_STATE.Q2E) {
            return Promise.resolve(false);
        }

        dummy.content = 'yes';
        await this.consumeQa({
            questions: [],
            answer: dummy,
        });
        if (this._state !== CONVERSATION_STATE.Q3O) {
            return Promise.resolve(false);
        }

        dummy.content = team === undefined
            ? this._opMessage.author.id
            : team;
        await this.consumeQa({
            questions: [],
            answer: dummy,
        });
        // @ts-ignore
        if (this._state !== CONVERSATION_STATE.DONE) {
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    public produceQ(): string | null {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event id would you like to signup for? (type .exit to stop command)';
            case CONVERSATION_STATE.Q2:
                return 'What is your Runescape name?';
            case CONVERSATION_STATE.Q3:
                return 'Would you like to join a team?';
            case CONVERSATION_STATE.Q3O:
                return 'Which team would you like to join?';
            default:
                return null;
        }
    }

    protected async consumeQa(qa: Qa): Promise<void> {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const id = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(id)) {
                    this._lastErrorMessage = 'Cannot parse number.';
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                }
                const guildEvent: Event.Standard | null = await Db.fetchAnyGuildEvent(
                    id,
                    this._opMessage.guild.id,
                );
                if (guildEvent === null) {
                    this._lastErrorMessage = 'Event not found. Hint: find the event id on the corresponding scoreboard.';
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                }

                if (guildEvent.isGlobal === true) {
                    const teamIdx: number = guildEvent.teams.findIndex(
                        (team: Event.Team): boolean => team.guildId === qa.answer.guild.id,
                    );
                    if (teamIdx !== -1) {
                        this._teamName = guildEvent.teams[teamIdx].name;
                    }

                    // make sure teams are not locked
                    const tenMinutesBeforeStart: Date = new Date(guildEvent.when.start);
                    tenMinutesBeforeStart.setMinutes(tenMinutesBeforeStart.getMinutes() - 10);
                    if (Utils.isInPast(tenMinutesBeforeStart)) {
                        this._lastErrorMessage = 'Teams are locked 10 minutes before a global event starts.';
                        this._state = CONVERSATION_STATE.DONE;
                        break;
                    }
                } else if (guildEvent.isAdminLocked === true) {
                    this._returnMessage = 'Teams have been locked by an administrator.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                }
                this._event = guildEvent;
                this._state = CONVERSATION_STATE.Q2;
                break;
            }
            case CONVERSATION_STATE.Q2:
            case CONVERSATION_STATE.Q2E: {
                this._rsn = qa.answer.content;

                if (this._rsn.length === 0) {
                    this._lastErrorMessage = 'Rsn must not be blank.';
                    this._state = CONVERSATION_STATE.Q2E;
                    break;
                }

                if (this._rsn.length > 12) {
                    this._lastErrorMessage = 'Rsn must be less than or equal to 12 characters.';
                    this._state = CONVERSATION_STATE.Q2E;
                    break;
                }

                // eslint-disable-next-line no-control-regex
                const regex = /[^\x00-\x7F]/g;
                const matches = this._rsn.match(regex);
                if (matches !== null) {
                    this._lastErrorMessage = 'Rsn must be of ASCII characters.';
                    this._state = CONVERSATION_STATE.Q2E;
                    break;
                }

                const findRsn = (participant: Event.Participant):
                boolean => participant.runescapeAccounts.some(
                    (account: Event.Account):
                    boolean => account.rsn.toLowerCase() === this._rsn.toLowerCase(),
                );

                const rsnIdx: number = this._event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.participants.some(
                        findRsn,
                    ),
                );

                const rsnJdx: number = rsnIdx !== -1
                    ? this._event.teams[rsnIdx].participants.findIndex(
                        findRsn,
                    ) : -1;

                if (rsnIdx !== -1 && rsnJdx !== -1) {
                    // we found the rsn in use already
                    const tag: string = await getTagFromDiscordId(
                        gClient,
                        this._event.teams[rsnIdx].participants[rsnJdx].userId,
                    );
                    this._lastErrorMessage = `This rsn is already signed up by ${tag}.`;
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                }

                // is the participant already on a team?
                const participantIdx: number = this._event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.participants.some(
                        (participant: Event.Participant):
                        boolean => participant.userId === qa.answer.author.id,
                    ),
                );

                const participantJdx: number = participantIdx !== -1
                    ? this._event.teams[participantIdx].participants.findIndex(
                        (participant: Event.Participant):
                        boolean => participant.userId === qa.answer.author.id,
                    ) : -1;

                if (participantIdx !== -1 && participantJdx !== -1) {
                    // we know the team to signup for
                    const participant: Event.Participant = this
                        ._event
                        .teams[participantIdx]
                        .participants[participantJdx];
                    this
                        ._event
                        .teams[participantIdx]
                        .participants[participantJdx]
                        .runescapeAccounts = participant
                            .runescapeAccounts.concat({
                                rsn: this._rsn,
                            });
                    const savedEvent: Event.Standard = await Db.upsertEvent(this._event);
                    willSignUpPlayer$.next(savedEvent);

                    this._returnMessage = 'Successfully signed-up up for event.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else if (this._teamName !== undefined) {
                    // we need to create the team
                    // we either add a new team or we add to the found team
                    const teamIdx: number = this._event.teams.findIndex(
                        (team: Event.Team):
                        boolean => this._teamName !== undefined
                            && team.name.toLowerCase() === this._teamName.toLowerCase(),
                    );

                    const participant: Event.Participant = {
                        userId: this._opMessage.author.id,
                        customScore: 0,
                        runescapeAccounts: [
                            {
                                rsn: this._rsn,
                            },
                        ],
                    };
                    if (teamIdx === -1) {
                        const team: Event.Team = {
                            name: this._teamName,
                            guildId: this._opMessage.guild.id,
                            participants: [
                                participant,
                            ],
                        };
                        this._event.teams = [
                            ...this._event.teams,
                            team,
                        ];
                    }

                    // we found the team
                    // so add the participant to the team
                    this._event.teams[teamIdx].participants = [
                        ...this._event.teams[teamIdx].participants,
                        participant,
                    ];

                    const savedEvent: Event.Standard = await Db.upsertEvent(this._event);
                    willSignUpPlayer$.next(savedEvent);

                    this._returnMessage = 'Successfully signed-up up for event.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    this._state = CONVERSATION_STATE.Q3;
                    break;
                }
            }
            case CONVERSATION_STATE.Q3: {
                const answer = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    const participant: Event.Participant = {
                        userId: this._opMessage.author.id,
                        customScore: 0,
                        runescapeAccounts: [
                            {
                                rsn: this._rsn,
                            },
                        ],
                    };

                    this._teamName = this._opMessage.author.id;
                    const team: Event.Team = {
                        name: this._teamName,
                        guildId: this._opMessage.guild.id,
                        participants: [
                            participant,
                        ],
                    };
                    this._event.teams = [
                        ...this._event.teams,
                        team,
                    ];

                    const savedEvent: Event.Standard = await Db.upsertEvent(this._event);
                    willSignUpPlayer$.next(savedEvent);

                    this._returnMessage = 'Successfully signed-up up for event.';
                    this._state = CONVERSATION_STATE.DONE;
                } else {
                    this._state = CONVERSATION_STATE.Q3O;
                }
                break;
            }
            case CONVERSATION_STATE.Q3O:
            case CONVERSATION_STATE.Q3E: {
                const teamName: string = this._teamName !== undefined
                    ? this._teamName
                    : qa.answer.content;

                if (teamName.length === 0) {
                    this._lastErrorMessage = 'Team name must not be blank.';
                    this._state = CONVERSATION_STATE.Q3E;
                    break;
                }

                if (teamName.length > 30) {
                    this._lastErrorMessage = 'Team name must be shorter than 30 characters.';
                    this._state = CONVERSATION_STATE.Q3E;
                    break;
                }

                // we either add a new team or we add to the found team
                const teamIdx: number = this._event.teams.findIndex(
                    (team: Event.Team):
                    boolean => team.name.toLowerCase() === teamName.toLowerCase(),
                );

                const participant: Event.Participant = {
                    userId: qa.answer.author.id,
                    customScore: 0,
                    runescapeAccounts: [
                        {
                            rsn: this._rsn,
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
                    this._event.teams = [
                        ...this._event.teams,
                        team,
                    ];
                } else {
                // we found the team
                // so add the participant to the team
                    this._event.teams[teamIdx].participants = [
                        ...this._event.teams[teamIdx].participants,
                        participant,
                    ];
                }
                const savedEvent: Event.Standard = await Db.upsertEvent(this._event);
                willSignUpPlayer$.next(savedEvent);

                this._returnMessage = 'Successfully signed-up up for event.';
                this._state = CONVERSATION_STATE.DONE;
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
