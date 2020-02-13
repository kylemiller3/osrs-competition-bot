import { hiscores, } from 'osrs-json-api';
import * as discord from 'discord.js';
import { Utils, } from './utils';
import {
    gClient, getDisplayNameFromDiscordId, getTagFromDiscordId, getDiscordGuildName,
} from '..';
import { Network, } from './network';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Event {
    /**
     * All possible RuneScape Bosses to track
     * @category Tracking
     */
    export type Bosses = 'Abyssal Sire'
    | 'Alchemical Hydra'
    | 'Barrows Chests'
    | 'Bryophyta'
    | 'Callisto'
    | 'Cerberus'
    | 'Chambers of Xeric'
    | 'Chambers of Xeric: Challenge Mode'
    | 'Chaos Elemental'
    | 'Chaos Fanatic'
    | 'Commander Zilyana'
    | 'Corporeal Beast'
    | 'Crazy Archaeologist'
    | 'Dagannoth Prime'
    | 'Dagannoth Rex'
    | 'Dagannoth Supreme'
    | 'Deranged Archaeologist'
    | 'General Graardor'
    | 'Giant Mole'
    | 'Grotesque Guardians'
    | 'Hespori'
    | 'Kalphite Queen'
    | 'King Black Dragon'
    | 'Kraken'
    | 'Kree\'Arra'
    | 'K\'ril Tsutsaroth'
    | 'Mimic'
    | 'Nightmare'
    | 'Obor'
    | 'Sarachnis'
    | 'Scorpia'
    | 'Skotizo'
    | 'The Gauntlet'
    | 'The Corrupted Gauntlet'
    | 'Theatre of Blood'
    | 'Thermonuclear Smoke Devil'
    | 'TzKal-Zuk'
    | 'TzTok-Jad'
    | 'Venenatis'
    | 'Vet\'ion'
    | 'Vorkath'
    | 'Wintertodt'
    | 'Zalcano'
    | 'Zulrah'

    /**
     * All possible RuneScape Skills to track
     * @category Tracking
     */
    export type Skills = 'attack'
    | 'strength'
    | 'defense'
    | 'ranged'
    | 'prayer'
    | 'magic'
    | 'runecraft'
    | 'construction'
    | 'hitpoints'
    | 'agility'
    | 'herblore'
    | 'thieving'
    | 'crafting'
    | 'fletching'
    | 'slayer'
    | 'hunter'
    | 'mining'
    | 'smithing'
    | 'fishing'
    | 'cooking'
    | 'firemaking'
    | 'woodcutting'
    | 'farming'

    /**
     * All possible Bounty Hunter stats to track
     * @category Tracking
     */
    export type BountyHunter = 'rogue'
    | 'hunter'

    /**
     * All possible Clue stats to track
     * @category Tracking
     */
    export type Clues = 'all'
    | 'beginner'
    | 'easy'
    | 'medium'
    | 'hard'
    | 'elite'
    | 'master'

    /**
     * Enum of all possible [[Tracking]] options
     * @category Tracking
     */
    export type TrackingCategory = 'skills'
    | 'bh'
    | 'lms'
    | 'clues'
    | 'custom'
    | 'bosses'

    /**
     * Contract for an [[Event]]'s participant
     * @category Event
     */
    export interface Participant {
        userId: string // their discord id
        customScore: number
        runescapeAccounts: Account[]
    }

    /**
     * Extended contract of a [[Participant]]'s [[Account]]
     * for a competitive [[Event]]
     * @category Event
     */
    export interface Account {
        rsn: string
        starting?: hiscores.Player
        ending?: hiscores.Player
    }

    /**
     * Contract for information on a Team
     * @category Event
     */
    export interface Team {
        name: string
        guildId: string
        participants: Participant[]
    }

    /**
     * Contract for when the event takes place
     * @category Event
     */
    export interface When {
        start: Date
        end: Date
    }

    /**
     * Contract for what the event tracks
     * @category Event
     */
    export interface Tracking {
        category: TrackingCategory
        what: BountyHunter[] | Clues[] | Skills[] | Bosses[] | undefined
    }

    /**
     * Contract to track event messages
     * @category Event
     */
    export interface ChannelMessage {
        channelId: string
        messageId: string
    }

    /**
     * Contract of the information necessary to track a guild
     * @category Event
     */
    export interface Guild {
        guildId: string
        scoreboardMessages?: ChannelMessage[]
    }

    /**
     * Contract of the information necessary to keep track of
     * the creator guild and other competing guilds
     * @category Event
     */
    export interface CompetingGuilds {
        creator: Guild
        others?: Guild[]
    }

    // scoreboards

    /**
     * Contract of the information necessary to keep track of
     * individual stat scores
     * @category Scoreboard
     */
    export interface WhatScoreboard {
        lhs: string
        whatScore: number
    }

    /**
     * Contract of the information necessary to keep track of
     * individual account scores
     * @category Scoreboard
     */
    export interface AccountScoreboard {
        lhs: string
        accountScore: number
        whatsScores: WhatScoreboard[] | undefined
    }

    /**
     * Contract of the information necessary to keep track of
     * individual participant scores
     * @category Scoreboard
     */
    export interface ParticipantScoreboard {
        lhs: string
        customScore: number
        participantScore: number
        accountsScores: AccountScoreboard[]
    }

    /**
     * Contract of the top level information necessary to keep track of
     * each team's score
     * @category Scoreboard
     */
    export interface TeamScoreboard {
        lhs: string
        teamScore: number
        participantsScores: ParticipantScoreboard[]
    }

    /**
     * A non-global event base class
     */
    export class Standard {
        id?: number
        name: string
        when: When
        guilds: CompetingGuilds
        teams: Team[]
        tracking: Tracking
        global: boolean
        adminLocked: boolean

        constructor(
            id: number | undefined,
            name: string,
            start: Date,
            end: Date,
            guilds: CompetingGuilds,
            teams: Team[],
            tracking: Tracking,
            global: boolean,
            locked: boolean,
        ) {
            this.id = id;
            this.name = name;
            this.when = {
                start: new Date(start),
                end: new Date(end),
            };
            this.guilds = { ...guilds, };
            this.teams = [
                ...teams,
            ];
            this.tracking = { ...tracking, };
            this.global = global;
            this.adminLocked = locked;
        }

        getEventTracking(): TrackingCategory {
            return this.tracking.category;
        }

        isLongRunning(): boolean {
            return this.when.end >= Utils.distantFuture;
        }

        isCustom(): boolean {
            return this.tracking.category === 'custom';
        }

        validate(): ('the name is over 50 characters'
        | 'the name is blank'
        | 'the event ends before it starts'
        | 'the event ends within an hour from now'
        | 'the global event starts within 30 minutes'
        | 'custom events are not allowed for global events'
        | 'the global event is scheduled over a week in advance'
        | 'global events are limited to one week in duration')[] {
            const oneHourFromNow = new Date();
            oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

            const nameTooLong: boolean = this.name.length >= 50;
            const nameIsBlank: boolean = this.name.length === 0;
            const endingDateBeforeStart = this.when.start >= this.when.end;
            const endsTooSoon = this.when.end < oneHourFromNow;

            let failReasons: ('the name is over 50 characters'
            | 'the name is blank'
            | 'the event ends before it starts'
            | 'the event ends within an hour from now')[] = [];
            if (nameTooLong) {
                failReasons = failReasons.concat('the name is over 50 characters');
            }
            if (nameIsBlank) {
                failReasons = failReasons.concat('the name is blank');
            }
            if (endingDateBeforeStart) {
                failReasons = failReasons.concat('the event ends before it starts');
            }
            if (endsTooSoon) {
                failReasons = failReasons.concat('the event ends within an hour from now');
            }
            return failReasons;
        }

        addScore(scoreToAdd: number, participantId: string): boolean {
            let teamIdx = -1;
            let participantIdx = -1;
            this.teams.forEach(
                (team: Team, idx: number): void => {
                    team.participants.forEach(
                        (participant: Participant, idi: number): void => {
                            if (participant.userId === participantId) {
                                teamIdx = idx;
                                participantIdx = idi;
                            }
                        }
                    );
                }
            );
            if (teamIdx !== -1 && participantIdx !== -1) {
                this.teams[teamIdx].participants[participantIdx].customScore += scoreToAdd;
                return true;
            }
            return false;
        }

        end(): void {
            this.when.end = new Date();
        }

        signupParticipant(
            participantId: string,
            guildId: string,
            rsn: string,
            teamName?: string
        ): 'this rsn is already signed up'
            | 'osrs hiscores cannot be reached'
            | 'osrs account cannot be found'
            | 'team name needs to be supplied'
            | 'teams are locked 10 minutes before a global event starts'
            | 'teams have been locked by an administrator'
            | undefined {
            if (this.adminLocked) {
                return 'teams have been locked by an administrator';
            }

            const findRsn = (participant: Event.Participant):
            boolean => participant.runescapeAccounts.some(
                (account: Event.Account):
                boolean => account.rsn.toLowerCase() === rsn.toLowerCase()
            );

            const rsnIdx: number = this.teams.findIndex(
                (team: Event.Team):
                boolean => team.participants.some(
                    findRsn
                )
            );

            const rsnJdx: number = rsnIdx !== -1
                ? this.teams[rsnIdx].participants.findIndex(
                    findRsn
                ) : -1;

            if (rsnIdx !== -1 && rsnJdx !== -1) {
                // we found the rsn in use already
                return 'this rsn is already signed up';
            }

            // is the participant already on a team?
            const participantIdx: number = this.teams.findIndex(
                (team: Event.Team):
                boolean => team.participants.some(
                    (participant: Event.Participant):
                    boolean => participant.userId === participantId
                )
            );

            const participantJdx: number = participantIdx !== -1
                ? this.teams[participantIdx].participants.findIndex(
                    (participant: Event.Participant):
                    boolean => participant.userId === participantId
                ) : -1;

            if (participantIdx !== -1 && participantJdx !== -1) {
                // we know the team to signup for
                const participant: Event.Participant = this
                    .teams[participantIdx]
                    .participants[participantJdx];
                this
                    .teams[participantIdx]
                    .participants[participantJdx]
                    .runescapeAccounts = participant
                        .runescapeAccounts.concat({
                            rsn,
                        });
                return undefined;
            }

            // we need the teamname supplied
            if (teamName === undefined) {
                return 'team name needs to be supplied';
            }

            // we either add a new team or we add to the found team
            const teamIdx: number = this.teams.findIndex(
                (team: Event.Team):
                boolean => team.name.toLowerCase() === teamName.toLowerCase()
            );

            const participant: Participant = {
                userId: participantId,
                customScore: 0,
                runescapeAccounts: [
                    {
                        rsn,
                    },
                ],
            };
            if (teamIdx === -1) {
                // if we didn't find the team
                // create a new team
                const team: Team = {
                    name: teamName,
                    guildId,
                    participants: [
                        participant,
                    ],
                };
                this.teams = [
                    ...this.teams,
                    team,
                ];
                return undefined;
            }

            // we found the team
            // so add the participant to the team
            this.teams[teamIdx].participants = [
                ...this.teams[teamIdx].participants,
                participant,
            ];
            return undefined;


            // if (invited) {
            //     if (this.guilds.others === undefined) {
            //         this.guilds.others = [
            //             {
            //                 discordId: guildId,
            //             },
            //         ];
            //     } else {
            //         const invitedGuildIdx = this.guilds.others.findIndex(
            //             (invitedGuild: Guild): boolean => invitedGuild.discordId === guildId
            //         );
            //         if (invitedGuildIdx === -1) {
            //             this.guilds.others = [
            //                 ...this.guilds.others,
            //                 {
            //                     discordId: guildId,
            //                 },
            //             ];
            //         }
            //     }
            // }
            // return true;
        }

        unsignupParticipant(participantId: string): 'participant was not signed-up'
        | 'teams have been locked by an administrator'
        | undefined {
            if (this.adminLocked) {
                return 'teams have been locked by an administrator';
            }
            // did we find the user?
            const findUser = (participant: Event.Participant):
            boolean => participant.userId === participantId;

            const userIdx: number = this.teams.findIndex(
                (team: Event.Team):
                boolean => team.participants.some(
                    findUser
                )
            );
            const userJdx: number = userIdx !== -1
                ? this.teams[userIdx].participants.findIndex(
                    findUser
                ) : -1;
            if (userJdx === -1) {
                // participant not found
                return 'participant was not signed-up';
            }

            // remove the user
            this.teams[userIdx].participants.splice(
                userJdx, 1
            );
            // if no participants remove the team
            if (this.teams[userIdx].participants.length === 0) {
                this.teams.splice(
                    userIdx, 1
                );
            }
            return undefined;
        }

        /**
         * Gets the status string based on current time for the event
         * @returns A status string
         */
        getStatusString(): string {
            if (Utils.isInFuture(this.when.start)) {
                return 'sign-ups';
            }
            if (Utils.isInPast(this.when.end)) {
                return 'ended';
            }
            if (this.isLongRunning()) {
                return 'active (∞ hrs left)';
            }
            const now: Date = new Date();
            return `active (${Number(((this.when.end.getTime() - now.getTime()) / 3.6e6).toFixed(1)).toLocaleString('en-us')} hrs left)`;
        }

        async listParticipants(): Promise<string> {
            // need to get tag in some instances
            const retMsgsResolver: Promise<string>[] = this.teams.map(
                async (team: Event.Team): Promise<string> => {
                    const participantResolver:
                    Promise<discord.User | string>[] = team.participants.map(
                        (participant: Event.Participant):
                        Promise<discord.User | string> => gClient
                            .fetchUser(
                                participant.userId
                            ).catch(
                                (error: Error): string => {
                                    Utils.logger.error(`${error} when fetching player`);
                                    return participant.userId;
                                }
                            )
                    );
                    const discordUsers: (discord.User | string)[] = await Promise.all(
                        participantResolver
                    );

                    const participantStr: string = discordUsers.map(
                        (user: discord.User | string, idx: number): string => {
                            const participant:
                            Event.Participant = team.participants[idx];
                            const rsnStrs: string = participant.runescapeAccounts.map(
                                (account: Event.Account): string => `\t\trsn: ${account.rsn}`
                            ).join('\n');
                            if (user instanceof discord.User) {
                                return `\tDiscord: ${user.tag}\n${rsnStrs}\n`;
                            }
                            return `\tError: Discord Id: ${user}\n${rsnStrs}\n`;
                        }
                    ).join('\n');
                    return `Team ${team.name}:\n${participantStr}`;
                }
            );
            const retMsgs: string[] = await Promise.all(retMsgsResolver);
            return `Event ${this.name}:\n${retMsgs.join('\n')}`;
        }

        getTeamsScoreboards(): TeamScoreboard[] {
            // get the tracking category
            const categoryKey: TrackingCategory = this.tracking.category;

            // get the tracking what list
            const whatKeys: string[] | undefined = this.tracking.what;

            const add = (acc: number, x: number): number => acc + x;
            const teamsScores: TeamScoreboard[] | undefined = this.teams.map(
                (team: Team): TeamScoreboard => {
                    const participantsScores: ParticipantScoreboard[] = team.participants.map(
                        (participant: Participant): ParticipantScoreboard => {
                            const accountsScores:
                            AccountScoreboard[] = participant.runescapeAccounts.map(
                                (account: Account): AccountScoreboard => {
                                    const whatsScores:
                                    WhatScoreboard[] | undefined = whatKeys === undefined
                                        ? undefined
                                        : whatKeys.map(
                                            (whatKey: string): WhatScoreboard => {
                                                if (account.ending !== undefined
                                                            && account.starting !== undefined) {
                                                    // case of a new boss or skill or something
                                                    // we may not have the starting defined
                                                    if (account.ending[categoryKey] !== undefined
                                                                && account.ending[categoryKey][whatKey] !== undefined
                                                                && (account.starting[categoryKey] === undefined
                                                                    || account.starting[categoryKey][whatKey] === undefined)
                                                    ) {
                                                        if (categoryKey === 'skills') {
                                                            const ending = Math.max(account
                                                                .ending
                                                                .skills[whatKey]
                                                                .xp,
                                                            0);
                                                            return {
                                                                lhs: whatKey,
                                                                whatScore: ending,
                                                            };
                                                        }
                                                        const ending = Math.max(account
                                                            .ending[categoryKey][whatKey]
                                                            .score,
                                                        0);
                                                        return {
                                                            lhs: whatKey,
                                                            whatScore: ending,
                                                        };
                                                    }
                                                    if (categoryKey === 'skills') {
                                                        const ending = Math.max(account
                                                            .ending
                                                            .skills[whatKey]
                                                            .xp,
                                                        0);
                                                        const starting = Math.max(account
                                                            .starting
                                                            .skills[whatKey]
                                                            .xp,
                                                        0);
                                                        return {
                                                            lhs: whatKey,
                                                            whatScore: ending - starting,
                                                        };
                                                    }
                                                    const ending = Math.max(account
                                                        .ending[categoryKey][whatKey]
                                                        .score,
                                                    0);
                                                    const starting = Math.max(account
                                                        .starting[categoryKey][whatKey]
                                                        .score,
                                                    0);
                                                    return {
                                                        lhs: whatKey,
                                                        whatScore: ending - starting,
                                                    };
                                                }
                                                return {
                                                    lhs: whatKey,
                                                    whatScore: 0,
                                                };
                                            }
                                        ).sort(
                                            (a: WhatScoreboard, b: WhatScoreboard):
                                            number => b.whatScore - a.whatScore
                                        );
                                    const accountScore: number = whatsScores === undefined
                                        ? 0
                                        : whatsScores.map(
                                            (what: WhatScoreboard): number => what.whatScore
                                        ).reduce(add);
                                    return {
                                        lhs: account.rsn,
                                        accountScore,
                                        whatsScores,
                                    };
                                }
                            ).sort(
                                (a: AccountScoreboard, b: AccountScoreboard):
                                number => b.accountScore - a.accountScore
                            );
                            const customScore: number = participant.customScore;
                            const participantScore: number = accountsScores.map(
                                (account: AccountScoreboard): number => account.accountScore,
                                customScore,
                            ).reduce(add);

                            return {
                                lhs: participant.userId,
                                customScore,
                                participantScore,
                                accountsScores,
                            };
                        }
                    ).sort(
                        (a: ParticipantScoreboard, b: ParticipantScoreboard):
                        number => b.participantScore - a.participantScore
                    );
                    const teamScore: number = participantsScores.map(
                        (participant: ParticipantScoreboard):
                        number => participant.participantScore
                    ).reduce(add);

                    return {
                        lhs: team.name,
                        teamScore,
                        participantsScores,
                    };
                }
            ).sort(
                (a: TeamScoreboard, b: TeamScoreboard):
                number => b.teamScore - a.teamScore
            );
            return teamsScores;
        }

        async getEventScoreboardString(
            guildId: string,
            deleted: boolean,
            // granularity: 'teams' | 'participants' | 'accounts' | 'what',
            // inversion: boolean = false,
            // mode: 'regular' | 'shortened', // boss mode is likely too long make a special case
            // numEntries: number = 3,
        ): Promise<string> {
            // format the string here
            const tabLength = 1;
            const padding = 3;
            // const lhsPaddingLength = 6;
            // const diffPadding = 2;

            // const lhsPad: string = new Array(lhsPaddingLength + 1).join(' ');
            const tab: string = new Array(tabLength + 1).join(' ');
            const currentScoreboard: TeamScoreboard[] = this.getTeamsScoreboards();
            const promises: Promise<string>[] = currentScoreboard.flatMap(
                (team: TeamScoreboard):
                Promise<string>[] => team.participantsScores.flatMap(
                    (participant: ParticipantScoreboard):
                    Promise<string> => {
                        // const displayName: string | null = getDisplayNameFromDiscordId(
                        //     gClient,
                        //     guildId,
                        //     participant.lhs,
                        // );
                        const displayName = null;
                        if (displayName === null) {
                            return getTagFromDiscordId(
                                gClient,
                                participant.lhs,
                            );
                        }
                        return Promise.resolve(displayName);
                    }
                )
            );
            const tags: string[] = await Promise.all(promises);

            const getTeamPrefix = (
                idx: number,
                lastIdx: number,
            ): string => {
                switch (idx) {
                    case 0:
                        return '🥇 ';
                    case 1:
                        return '🥈 ';
                    case 2:
                        return '🥉 ';
                    case lastIdx:
                        return '🚮 ';
                    default:
                        return `${idx + 1} `;
                }
            };

            let idx = 0;
            const maxTeamsLen: number[] = currentScoreboard.map(
                (team: TeamScoreboard, idi: number): number => {
                    const teamLen: number = `${getTeamPrefix(idi, currentScoreboard.length - 1)}${team.lhs}${team.teamScore.toLocaleString('en-us')}`.length;
                    const participantsLen: number[] = team.participantsScores.flatMap(
                        (participant: ParticipantScoreboard): number => {
                            const participantLen: number = `${tab}${tags[idx]}${participant.participantScore.toLocaleString('en-us')}`.length;
                            idx += 1;
                            const accountsLen: number[] = participant.accountsScores.flatMap(
                                (account: AccountScoreboard): number => {
                                    const accountLen: number = `${tab}${tab}${account.lhs}${account.accountScore.toLocaleString('en-us')}`.length;
                                    if (account.whatsScores !== undefined) {
                                        const whatsLen: number[] = account.whatsScores.flatMap(
                                            (what: WhatScoreboard): number => {
                                                const whatLen: number = `${tab}${tab}${tab}${what.lhs}${what.whatScore.toLocaleString('en-us')}`.length;
                                                return whatLen;
                                            }
                                        );
                                        return Math.max(
                                            Math.max(...whatsLen),
                                            accountLen,
                                        );
                                    }
                                    return accountLen;
                                }
                            );
                            return Math.max(
                                Math.max(...accountsLen),
                                participantLen,
                            );
                        }
                    );
                    return Math.max(
                        Math.max(...participantsLen),
                        teamLen,
                    );
                }
            ).map(
                (maxTeamLen: number): number => maxTeamLen + padding
            );

            idx = 0;
            const maxTeamStrLen: number = Math.max(...maxTeamsLen);
            const dashesTeamSeparator: string = Number.isFinite(maxTeamStrLen)
                ? new Array(maxTeamStrLen + 1).join('-')
                : new Array(1).join('-');
            const str: string = `${dashesTeamSeparator}\n`.concat(currentScoreboard.map(
                (team: TeamScoreboard, idi: number): string => {
                    const teamStrLen: number = `${getTeamPrefix(idi, currentScoreboard.length - 1)}${team.lhs}${team.teamScore.toLocaleString('en-us')}`.length;
                    const spacesToInsertTeam: number = maxTeamStrLen - teamStrLen;
                    const spacesTeam: string = new Array(spacesToInsertTeam + 1).join(' ');
                    // const teamStr: string = team.teamScore > 0
                    //     ? `${prefix}${team.lhs}${spacesTeam}${team.teamScore}`
                    //     : `${prefix}${team.lhs}`;
                    const teamStr = `${getTeamPrefix(idi, currentScoreboard.length - 1)}${team.lhs}${spacesTeam}${team.teamScore.toLocaleString('en-us')}`;


                    const participantsStr = team.participantsScores.map(
                        (participant: ParticipantScoreboard): string => {
                            const participantStrLen: number = `${tab}${tags[idx]}${participant.participantScore.toLocaleString('en-us')}`.length;
                            const spacesToInsertParticipant: number = maxTeamStrLen - participantStrLen;
                            const spacesParticipant: string = new Array(spacesToInsertParticipant + 1).join(' ');
                            // const participantStr: string = participant.participantScore > 0
                            //     ? `${tab}${tags[idx]}${spacesParticipant}${participant.participantScore.toLocaleString('en-us')}`
                            //     : `${tab}${tags[idx]}`;
                            const participantStr = `${tab}${tags[idx]}${spacesParticipant}${participant.participantScore.toLocaleString('en-us')}`;
                            idx += 1;

                            const accountsStr: string = participant.accountsScores.map(
                                (account: AccountScoreboard): string => {
                                    const accountStrLen: number = `${tab}${tab}${account.lhs}${account.accountScore.toLocaleString('en-us')}`.length;
                                    const spacesToInsertAccount: number = maxTeamStrLen - accountStrLen;
                                    const spacesAccount: string = new Array(spacesToInsertAccount + 1).join(' ');
                                    // const accountStr: string = account.accountScore > 0
                                    //     ? `${tab}${tab}${account.lhs}${spacesAccount}${account.accountScore.toLocaleString('en-us')}`
                                    //     : `${tab}${tab}${account.lhs}`;
                                    const accountStr = `${tab}${tab}${account.lhs}${spacesAccount}${account.accountScore.toLocaleString('en-us')}`;

                                    if (account.whatsScores !== undefined) {
                                        const whatStr: string = account.whatsScores.map(
                                            (what: WhatScoreboard): string | null => {
                                                const whatStrLen: number = `${tab}${tab}${tab}${what.lhs}${what.whatScore.toLocaleString('en-us')}`.length;
                                                const spacesToInsertWhat: number = maxTeamStrLen - whatStrLen;
                                                const spacesWhat: string = new Array(spacesToInsertWhat + 1).join(' ');
                                                const ret: string | null = what.whatScore > 0
                                                    ? `${tab}${tab}${tab}${what.lhs}${spacesWhat}${what.whatScore.toLocaleString('en-us')}`
                                                    : null;
                                                return ret;
                                            }
                                        ).filter(Utils.isDefinedFilter).join('\n');
                                        const ret = whatStr.length > 0
                                            ? `${accountStr}\n${whatStr}`
                                            : `${accountStr}`;
                                        return ret;
                                    }
                                    return accountStr;
                                }
                            ).join('\n');
                            const ret = `${participantStr}\n${accountsStr}`;
                            return ret;
                        }
                    ).join('\n');
                    const ret = `${teamStr}\n${participantsStr}`;
                    return ret;
                }
            ).join(`\n${dashesTeamSeparator}\n`)).concat(`\n${dashesTeamSeparator}`);

            const status: string = !deleted
                ? this.getStatusString()
                : '(DELETED EVENT)';
            // if (error !== undefined) {
            //     ret = `Event ${event.name} (${event.tracking.category})\n#${event.id} ${event.when.start.toUTCString()} ${status}\n\n${str}\n\n${error}`;
            // } else {
            //     ret = `Event ${event.name} (${event.tracking.category})\n#${event.id} ${event.when.start.toUTCString()} ${status}\n\n${str}\n\nUpdated: ${new Date().toUTCString()}`;
            // }
            return `Event ${this.name} (${this.tracking.category})\n#${this.id} ${this.when.start.toUTCString()} ${status}\n\n${str}`;
        }
    }

    /**
     * Global type behavior subclass
     */
    export class Global extends Standard {
        invitations?: string[]

        constructor(
            id: number | undefined,
            name: string,
            start: Date,
            end: Date,
            guilds: CompetingGuilds,
            teams: Team[],
            tracking: Tracking,
            global: boolean,
            locked: boolean,
            invitations?: string[],
        ) {
            super(
                id,
                name,
                start,
                end,
                guilds,
                teams,
                tracking,
                global,
                locked,
            );

            this.invitations = invitations;
        }

        validate(): ('the name is over 50 characters'
        | 'the name is blank'
        | 'the event ends before it starts'
        | 'the event ends within an hour from now'
        | 'the global event starts within 30 minutes'
        | 'custom events are not allowed for global events'
        | 'the global event is scheduled over a week in advance'
        | 'global events are limited to one week in duration')[] {
            let failReasons: ('the name is over 50 characters'
            | 'the name is blank'
            | 'the event ends before it starts'
            | 'the event ends within an hour from now'
            | 'the global event starts within 30 minutes'
            | 'custom events are not allowed for global events'
            | 'the global event is scheduled over a week in advance'
            | 'global events are limited to one week in duration')[] = super.validate();

            const thirtyMinutesBeforeStart: Date = new Date(this.when.start);
            thirtyMinutesBeforeStart.setMinutes(thirtyMinutesBeforeStart.getMinutes() - 30);
            if (Utils.isInPast(thirtyMinutesBeforeStart)) {
                failReasons = failReasons.concat('the global event starts within 30 minutes');
            }

            const oneWeekBeforeStart: Date = new Date(this.when.start);
            oneWeekBeforeStart.setHours(oneWeekBeforeStart.getHours() - 24 * 7);
            if (Utils.isInFuture(oneWeekBeforeStart)) {
                failReasons = failReasons.concat('the global event is scheduled over a week in advance');
            }

            const oneWeekBeforeEnd: Date = new Date(this.when.end);
            oneWeekBeforeEnd.setHours(oneWeekBeforeEnd.getHours() - 24 * 7);
            if (oneWeekBeforeEnd > this.when.start) {
                failReasons = failReasons.concat('global events are limited to one week in duration');
            }

            return failReasons;
        }

        /* eslint-disable @typescript-eslint/no-unused-vars */
        /* eslint-disable class-methods-use-this */
        addScore(customScore: number): boolean {
            return false;
        }
        /* eslint-enable class-methods-use-this */
        /* eslint-enable @typescript-eslint/no-unused-vars */

        signupParticipant(
            participantId: string,
            guildId: string,
            rsn: string,
            teamName?: string
        ): 'this rsn is already signed up'
            | 'osrs hiscores cannot be reached'
            | 'osrs account cannot be found'
            | 'team name needs to be supplied'
            | 'teams are locked 10 minutes before a global event starts'
            | 'teams have been locked by an administrator'
            | undefined {
            // we may need to override the teamname for a cross guild event
            // before we pass it to super
            // find a team with the same guildId
            // we should actually take care of this with joinEvent
            // -1 should not be possible
            const teamIdx: number = this.teams.findIndex(
                (team: Team): boolean => team.guildId === guildId
            );
            const processedTeamName = teamIdx !== -1
                ? this.teams[teamIdx].name
                : teamName;

            // make sure teams are not locked
            const tenMinutesBeforeStart: Date = new Date(this.when.start);
            tenMinutesBeforeStart.setMinutes(tenMinutesBeforeStart.getMinutes() - 10);
            if (Utils.isInPast(tenMinutesBeforeStart)) {
                return 'teams are locked 10 minutes before a global event starts';
            }

            // this goes last since it mutates the event
            const failReason: 'this rsn is already signed up'
            | 'osrs hiscores cannot be reached'
            | 'osrs account cannot be found'
            | 'team name needs to be supplied'
            | 'teams are locked 10 minutes before a global event starts'
            | 'teams have been locked by an administrator'
            | undefined = super.signupParticipant(
                participantId,
                guildId,
                rsn,
                processedTeamName,
            );
            return failReason;
        }

        async getEventScoreboardString(
            guildId: string,
            deleted: boolean,
            // granularity: 'teams' | 'participants' | 'accounts' | 'what',
            // inversion: boolean = false,
            // mode: 'regular' | 'shortened', // boss mode is likely too long make a special case
            // numEntries: number = 3,
        ): Promise<string> {
            const scoreboard: string = await super.getEventScoreboardString(
                guildId,
                deleted,
            );

            const combinedGuilds = this.guilds.others !== undefined
                ? [
                    this.guilds.creator,
                    ...this.guilds.others,
                ]
                : [
                    this.guilds.creator,
                ];
            const competitors: string = combinedGuilds.map(
                (guild: Event.Guild): string => {
                    let guildName: string | null = getDiscordGuildName(
                        gClient,
                        guild.guildId,
                    );
                    guildName = guildName !== null
                        ? `${guildName} `
                        : '';
                    return `${guildName}(id: ${guild.guildId})`;
                }
            ).join('\n');
            getDiscordGuildName(gClient, guildId);
            return scoreboard.concat(`\n\n${competitors}`);
        }
    }
}
