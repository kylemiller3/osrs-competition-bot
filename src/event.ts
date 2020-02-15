import { hiscores } from 'osrs-json-api';
import * as discord from 'discord.js';
import { resolvePath } from 'object-resolve-path';
import { Utils } from './utils';
import {
    gClient, getDisplayNameFromDiscordId, getTagFromDiscordId, getDiscordGuildName,
} from '..';
import { Network } from './network';
import { TRACKING_COLUMNS } from './databaseMisc';

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
     * All possible LMS stats to track
     * @category Tracking
     */
    export type LastManStanding = 'lms'

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

    export type TrackingWhat = BountyHunter | Clues | Skills | Bosses | LastManStanding;

    /**
     * Contract for an [[Event]]'s participant
     * @category Event
     */
    export interface Participant {
        userId: string; // their discord id
        customScore: number;
        runescapeAccounts: Account[];
    }

    /**
     * Extended contract of a [[Participant]]'s [[Account]]
     * for a competitive [[Event]]
     * @category Event
     */
    export interface Account {
        rsn: string;
        starting?: hiscores.Player;
        ending?: hiscores.Player;
    }

    /**
     * Contract for information on a Team
     * @category Event
     */
    export interface Team {
        name: string;
        guildId: string;
        participants: Participant[];
    }

    /**
     * Contract for when the event takes place
     * @category Event
     */
    export interface When {
        start: Date;
        end: Date;
    }

    /**
     * Contract for what the event tracks
     * @category Event
     */
    export interface Tracking {
        category: TrackingCategory;
        what: TrackingWhat[];
    }

    /**
     * Contract to track event messages
     * @category Event
     */
    export interface ChannelMessage {
        channelId: string;
        messageId: string;
    }

    /**
     * Contract of the information necessary to track a guild
     * @category Event
     */
    export interface Guild {
        guildId: string;
        scoreboardMessages?: ChannelMessage[];
    }

    /**
     * Contract of the information necessary to keep track of
     * the creator guild and other competing guilds
     * @category Event
     */
    export interface CompetingGuilds {
        creator: Guild;
        others?: Guild[];
    }

    // scoreboards

    /**
     * Contract of the information necessary to keep track of
     * individual stat scores
     * @category Scoreboard
     */
    export interface WhatScoreboard {
        lhs: string;
        whatScore: number;
    }

    /**
     * Contract of the information necessary to keep track of
     * individual account scores
     * @category Scoreboard
     */
    export interface AccountScoreboard {
        lhs: string;
        accountScore: number;
        whatsScores: WhatScoreboard[] | undefined;
    }

    /**
     * Contract of the information necessary to keep track of
     * individual participant scores
     * @category Scoreboard
     */
    export interface ParticipantScoreboard {
        lhs: string;
        customScore: number;
        participantScore: number;
        accountsScores: AccountScoreboard[];
    }

    /**
     * Contract of the top level information necessary to keep track of
     * each team's score
     * @category Scoreboard
     */
    export interface TeamScoreboard {
        lhs: string;
        teamScore: number;
        participantsScores: ParticipantScoreboard[];
    }

    /**
     * A non-global event base class
     */
    export class Standard {
        protected _id?: number

        protected _name: string

        protected _start: Date

        protected _end: Date

        protected _tracking: Tracking

        protected _global: boolean

        protected _adminLocked: boolean

        protected _guilds: CompetingGuilds

        protected _teams: Team[]

        public constructor(
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

            // one hour in advance
            this.setTimeFrame(start, end);

            this._guilds = { ...guilds };
            this._teams = [
                ...teams,
            ];
            this._tracking = { ...tracking };
            this._global = global;
            this._adminLocked = locked;
        }

        public get id(): number | undefined {
            return this._id;
        }

        public set id(id: number | undefined) {
            if (this._id !== undefined) {
                this._id = id;
            }
        }

        public get name(): string {
            return this._name;
        }

        public set name(name: string) {
            if (name.length > 50) {
                const short: string = name.slice(0, 49).concat('…');
                this._name = short;
            } else {
                this._name = name;
            }
        }

        public setTimeFrame(start: Date, end: Date): void {
            const oneHourFromStart: Date = new Date(start);
            oneHourFromStart.setHours(oneHourFromStart.getHours() + 1);
            this._end = oneHourFromStart > end
                ? new Date(oneHourFromStart)
                : new Date(end);
        }

        public get startingDate(): Date {
            return new Date(this._start);
        }

        public get endingDate(): Date {
            return new Date(this._end);
        }

        public get creatingGuild(): Guild {
            return { ...this._guilds.creator };
        }

        // 'attack' -> 'skills.attack.xp' for event scoreboard
        private static scoreFromTracking(
            account: Account,
            starting: boolean,
            category: TrackingCategory,
            what: TrackingWhat,
        ): number {
            const startOrEndStr: string = starting ? 'starting' : 'ending';
            switch (category) {
                case 'bh': {
                    switch (what) {
                        case 'rogue':
                        case 'hunter': {
                            return resolvePath(account, `${startOrEndStr}.bh.${what}.xp`);
                        }
                        default: {
                            Utils.logger.error(`Tracking case not handled: ${category}.${what}`);
                            return 0;
                        }
                    }
                }
                case 'bosses': {
                    switch (what) {
                        case 'Abyssal Sire':
                        case 'Alchemical Hydra':
                        case 'Barrows Chests':
                        case 'Bryophyta':
                        case 'Callisto':
                        case 'Cerberus':
                        case 'Chambers of Xeric':
                        case 'Chambers of Xeric: Challenge Mode':
                        case 'Chaos Elemental':
                        case 'Chaos Fanatic':
                        case 'Commander Zilyana':
                        case 'Corporeal Beast':
                        case 'Crazy Archaeologist':
                        case 'Dagannoth Prime':
                        case 'Dagannoth Rex':
                        case 'Dagannoth Supreme':
                        case 'Deranged Archaeologist':
                        case 'General Graardor':
                        case 'Giant Mole':
                        case 'Grotesque Guardians':
                        case 'Hespori':
                        case 'Kalphite Queen':
                        case 'King Black Dragon':
                        case 'Kraken':
                        case 'Kree\'Arra':
                        case 'K\'ril Tsutsaroth':
                        case 'Mimic':
                        case 'Nightmare':
                        case 'Obor':
                        case 'Sarachnis':
                        case 'Scorpia':
                        case 'Skotizo':
                        case 'The Gauntlet':
                        case 'The Corrupted Gauntlet':
                        case 'Theatre of Blood':
                        case 'Thermonuclear Smoke Devil':
                        case 'TzKal-Zuk':
                        case 'TzTok-Jad':
                        case 'Venenatis':
                        case 'Vet\'ion':
                        case 'Vorkath':
                        case 'Wintertodt':
                        case 'Zalcano':
                        case 'Zulrah': {
                            return resolvePath(account, `${startOrEndStr}.bosses.${what}.score`);
                        }
                        default: {
                            Utils.logger.error(`Tracking case not handled: ${category}.${what}`);
                            return 0;
                        }
                    }
                }
                case 'clues': {
                    switch (what) {
                        case 'all':
                        case 'beginner':
                        case 'easy':
                        case 'medium':
                        case 'hard':
                        case 'elite':
                        case 'master': {
                            return resolvePath(account, `${startOrEndStr}.clues.${what}.score`);
                        }
                        default: {
                            Utils.logger.error(`Tracking case not handled: ${category}.${what}`);
                            return 0;
                        }
                    }
                }
                case 'skills': {
                    switch (what) {
                        case 'attack':
                        case 'strength':
                        case 'defense':
                        case 'ranged':
                        case 'prayer':
                        case 'magic':
                        case 'runecraft':
                        case 'construction':
                        case 'hitpoints':
                        case 'agility':
                        case 'herblore':
                        case 'thieving':
                        case 'crafting':
                        case 'fletching':
                        case 'slayer':
                        case 'hunter':
                        case 'mining':
                        case 'smithing':
                        case 'fishing':
                        case 'cooking':
                        case 'firemaking':
                        case 'woodcutting':
                        case 'farming': {
                            return resolvePath(account, `${startOrEndStr}.skills.${what}.xp`);
                        }
                        default: {
                            Utils.logger.error(`Tracking case not handled: ${category}.${what}`);
                            return 0;
                        }
                    }
                }
                case 'lms': {
                    return resolvePath(account, `${startOrEndStr}.lms.score`);
                }
                default: {
                    Utils.logger.error(`Tracking case not handled: ${category}.${what}`);
                    return 0;
                }
            }
        }

        // ['attack', ...] -> column true for event database
        private static dbColumnFromTracking(
            trackingCategory: TrackingCategory,
            trackingWhat: TrackingWhat,
        ): TRACKING_COLUMNS | null {
            switch (trackingCategory) {
                case 'bosses': {
                    switch (trackingWhat) {
                        case 'Abyssal Sire':
                            return TRACKING_COLUMNS.BOSSES_ABYSSAL_SIRE_SCORE;
                        case 'Alchemical Hydra':
                            return TRACKING_COLUMNS.BOSSES_ALCHEMICAL_HYDRA_SCORE;
                        case 'Barrows Chests':
                            return TRACKING_COLUMNS.BOSSES_BARROWS_CHESTS_SCORE;
                        case 'Bryophyta':
                            return TRACKING_COLUMNS.BOSSES_BRYOPHYTA_SCORE;
                        case 'Callisto':
                            return TRACKING_COLUMNS.BOSSES_CALLISTO_SCORE;
                        case 'Cerberus':
                            return TRACKING_COLUMNS.BOSSES_CERBERUS_SCORE;
                        case 'Chambers of Xeric':
                            return TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_SCORE;
                        case 'Chambers of Xeric: Challenge Mode':
                            return TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE;
                        case 'Chaos Elemental':
                            return TRACKING_COLUMNS.BOSSES_CHAOS_ELEMENTAL_SCORE;
                        case 'Chaos Fanatic':
                            return TRACKING_COLUMNS.BOSSES_CHAOS_FANATIC_SCORE;
                        case 'Commander Zilyana':
                            return TRACKING_COLUMNS.BOSSES_COMMANDER_ZILYANA_SCORE;
                        case 'Corporeal Beast':
                            return TRACKING_COLUMNS.BOSSES_CORPOREAL_BEAST_SCORE;
                        case 'Crazy Archaeologist':
                            return TRACKING_COLUMNS.BOSSES_CRAZY_ARCHAEOLOGIST_SCORE;
                        case 'Dagannoth Prime':
                            return TRACKING_COLUMNS.BOSSES_DAGANNOTH_PRIME_SCORE;
                        case 'Dagannoth Rex':
                            return TRACKING_COLUMNS.BOSSES_DAGANNOTH_REX_SCORE;
                        case 'Dagannoth Supreme':
                            return TRACKING_COLUMNS.BOSSES_DAGANNOTH_SUPREME_SCORE;
                        case 'Deranged Archaeologist':
                            return TRACKING_COLUMNS.BOSSES_DERANGED_ARCHAEOLOGIST_SCORE;
                        case 'General Graardor':
                            return TRACKING_COLUMNS.BOSSES_GENERAL_GRAARDOR_SCORE;
                        case 'Giant Mole':
                            return TRACKING_COLUMNS.BOSSES_GIANT_MOLE_SCORE;
                        case 'Grotesque Guardians':
                            return TRACKING_COLUMNS.BOSSES_GROTESQUE_GUARDIANS_SCORE;
                        case 'Hespori':
                            return TRACKING_COLUMNS.BOSSES_HESPORI_SCORE;
                        case 'Kalphite Queen':
                            return TRACKING_COLUMNS.BOSSES_KALPHITE_QUEEN_SCORE;
                        case 'King Black Dragon':
                            return TRACKING_COLUMNS.BOSSES_KING_BLACK_DRAGON_SCORE;
                        case 'Kraken':
                            return TRACKING_COLUMNS.BOSSES_KRAKEN_SCORE;
                        case 'Kree\'Arra':
                            return TRACKING_COLUMNS.BOSSES_KREEARRA_SCORE;
                        case 'K\'ril Tsutsaroth':
                            return TRACKING_COLUMNS.BOSSES_KRIL_TSUTSAROTH_SCORE;
                        case 'Mimic':
                            return TRACKING_COLUMNS.BOSSES_MIMIC_SCORE;
                        case 'Nightmare':
                            return TRACKING_COLUMNS.BOSSES_NIGHTMARE_SCORE;
                        case 'Obor':
                            return TRACKING_COLUMNS.BOSSES_OBOR_SCORE;
                        case 'Sarachnis':
                            return TRACKING_COLUMNS.BOSSES_SARACHNIS_SCORE;
                        case 'Scorpia':
                            return TRACKING_COLUMNS.BOSSES_SCORPIA_SCORE;
                        case 'Skotizo':
                            return TRACKING_COLUMNS.BOSSES_SKOTIZO_SCORE;
                        case 'The Gauntlet':
                            return TRACKING_COLUMNS.BOSSES_THE_GAUNTLET_SCORE;
                        case 'The Corrupted Gauntlet':
                            return TRACKING_COLUMNS.BOSSES_THE_CORRUPTED_GAUNTLET_SCORE;
                        case 'Theatre of Blood':
                            return TRACKING_COLUMNS.BOSSES_THEATRE_OF_BLOOD_SCORE;
                        case 'Thermonuclear Smoke Devil':
                            return TRACKING_COLUMNS.BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE;
                        case 'TzKal-Zuk':
                            return TRACKING_COLUMNS.BOSSES_TZKALZUK_SCORE;
                        case 'TzTok-Jad':
                            return TRACKING_COLUMNS.BOSSES_TZTOKJAD_SCORE;
                        case 'Venenatis':
                            return TRACKING_COLUMNS.BOSSES_VENENATIS_SCORE;
                        case 'Vet\'ion':
                            return TRACKING_COLUMNS.BOSSES_VETION_SCORE;
                        case 'Vorkath':
                            return TRACKING_COLUMNS.BOSSES_VORKATH_SCORE;
                        case 'Wintertodt':
                            return TRACKING_COLUMNS.BOSSES_WINTERTODT_SCORE;
                        case 'Zalcano':
                            return TRACKING_COLUMNS.BOSSES_ZALCANO_SCORE;
                        case 'Zulrah':
                            return TRACKING_COLUMNS.BOSSES_ZULRAH_SCORE;
                        default: {
                            Utils.logger.error(`Tracking case not handled: ${trackingCategory}.${trackingWhat}`);
                            return null;
                        }
                    }
                }
                case 'bh': {
                    switch (trackingWhat) {
                        case 'rogue':
                            return TRACKING_COLUMNS.BH_ROGUE_SCORE;
                        case 'hunter':
                            return TRACKING_COLUMNS.BH_HUNTER_SCORE;
                        default: {
                            Utils.logger.error(`Tracking case not handled: ${trackingCategory}.${trackingWhat}`);
                            return null;
                        }
                    }
                }
                case 'clues': {
                    switch (trackingWhat) {
                        case 'all':
                            return TRACKING_COLUMNS.CLUES_ALL_SCORE;
                        case 'beginner':
                            return TRACKING_COLUMNS.CLUES_BEGINNER_SCORE;
                        case 'easy':
                            return TRACKING_COLUMNS.CLUES_EASY_SCORE;
                        case 'medium':
                            return TRACKING_COLUMNS.CLUES_MEDIUM_SCORE;
                        case 'hard':
                            return TRACKING_COLUMNS.CLUES_HARD_SCORE;
                        case 'elite':
                            return TRACKING_COLUMNS.CLUES_ELITE_SCORE;
                        case 'master':
                            return TRACKING_COLUMNS.CLUES_MASTER_SCORE;
                        default: {
                            Utils.logger.error(`Tracking case not handled: ${trackingCategory}.${trackingWhat}`);
                            return null;
                        }
                    }
                }
                case 'lms':
                    return TRACKING_COLUMNS.LMS_SCORE;
                case 'skills': {
                    switch (trackingWhat) {
                        case 'attack':
                            return TRACKING_COLUMNS.SKILLS_ATTACK_XP;
                        case 'strength':
                            return TRACKING_COLUMNS.SKILLS_STRENGTH_XP;
                        case 'defense':
                            return TRACKING_COLUMNS.SKILLS_DEFENCE_XP;
                        case 'ranged':
                            return TRACKING_COLUMNS.SKILLS_RANGED_XP;
                        case 'prayer':
                            return TRACKING_COLUMNS.SKILLS_PRAYER_XP;
                        case 'magic':
                            return TRACKING_COLUMNS.SKILLS_MAGIC_XP;
                        case 'runecraft':
                            return TRACKING_COLUMNS.SKILLS_RUNECRAFT_XP;
                        case 'construction':
                            return TRACKING_COLUMNS.SKILLS_CONSTRUCTION_XP;
                        case 'hitpoints':
                            return TRACKING_COLUMNS.SKILLS_HITPOINTS_XP;
                        case 'agility':
                            return TRACKING_COLUMNS.SKILLS_AGILITY_XP;
                        case 'herblore':
                            return TRACKING_COLUMNS.SKILLS_HERBLORE_XP;
                        case 'thieving':
                            return TRACKING_COLUMNS.SKILLS_THIEVING_XP;
                        case 'crafting':
                            return TRACKING_COLUMNS.SKILLS_CRAFTING_XP;
                        case 'fletching':
                            return TRACKING_COLUMNS.SKILLS_FLETCHING_XP;
                        case 'slayer':
                            return TRACKING_COLUMNS.SKILLS_SLAYER_XP;
                        case 'hunter':
                            return TRACKING_COLUMNS.SKILLS_HUNTER_XP;
                        case 'mining':
                            return TRACKING_COLUMNS.SKILLS_MINING_XP;
                        case 'smithing':
                            return TRACKING_COLUMNS.SKILLS_SMITHING_XP;
                        case 'fishing':
                            return TRACKING_COLUMNS.SKILLS_FISHING_XP;
                        case 'cooking':
                            return TRACKING_COLUMNS.SKILLS_COOKING_XP;
                        case 'firemaking':
                            return TRACKING_COLUMNS.SKILLS_FIREMAKING_XP;
                        case 'woodcutting':
                            return TRACKING_COLUMNS.SKILLS_WOODCUTTING_XP;
                        case 'farming':
                            return TRACKING_COLUMNS.SKILLS_FARMING_XP;
                        default: {
                            Utils.logger.error(`Tracking case not handled: ${trackingCategory}.${trackingWhat}`);
                            return null;
                        }
                    }
                }
                default: {
                    Utils.logger.error(`Tracking case not handled: ${trackingCategory}.${trackingWhat}`);
                    return null;
                }
            }
        }

        public get teams(): Team[] {
            return [...this._teams];
        }

        public get tracking(): Tracking {
            return { ...this._tracking };
        }

        public get guilds(): CompetingGuilds {
            return { ...this._guilds };
        }

        // we need to check for tracking category before
        // we implement this
        // public addTracking(tracking:
        // TrackingWhat): void {
        //     if (!this._tracking.what.some(
        //         (tracker: TrackingWhat):
        //         boolean => tracker === tracking,
        //     )) {
        //         this._tracking.what.push(tracking);
        //     }
        // }

        // public removeTracking(tracking: TrackingWhat):
        // void {
        //     const idx: number = this._tracking.what.indexOf(tracking);
        //     if (idx !== -1) {
        //         this._tracking.what = this._tracking.what.splice(idx, 1);
        //     }
        // }

        public addScore(scoreToAdd: number, participantId: string): void {
            let teamIdx = -1;
            let participantIdx = -1;
            this._teams.forEach(
                (team: Team, idx: number): void => {
                    team.participants.forEach(
                        (participant: Participant, idi: number): void => {
                            if (participant.userId === participantId) {
                                teamIdx = idx;
                                participantIdx = idi;
                            }
                        },
                    );
                },
            );
            if (teamIdx !== -1 && participantIdx !== -1) {
                this._teams[teamIdx].participants[participantIdx].customScore += scoreToAdd;
            }
        }

        public isAdminLocked(): boolean {
            return this._adminLocked;
        }

        public isLongRunning(): boolean {
            return this._end >= Utils.distantFuture;
        }

        public isCustom(): boolean {
            return this._tracking.what.length === 0;
        }

        // eslint-disable-next-line class-methods-use-this
        public isGlobal(): boolean {
            return false;
        }

        public end(): void {
            this._end = new Date();
        }

        public participantFromRsn(rsn: string): Participant | null {
            const findRsn = (participant: Event.Participant):
            boolean => participant.runescapeAccounts.some(
                (account: Event.Account):
                boolean => account.rsn.toLowerCase() === rsn.toLowerCase(),
            );

            const rsnIdx: number = this._teams.findIndex(
                (team: Event.Team):
                boolean => team.participants.some(
                    findRsn,
                ),
            );

            const rsnJdx: number = rsnIdx !== -1
                ? this._teams[rsnIdx].participants.findIndex(
                    findRsn,
                ) : -1;

            if (rsnIdx !== -1 && rsnJdx !== -1) {
                // we found the rsn in use already
                return { ...this._teams[rsnIdx].participants[rsnJdx] };
            }
            return null;
        }

        public signupParticipant(
            participantId: string,
            guildId: string,
            rsn: string,
            teamName?: string,
        ): boolean {
            if (this._adminLocked) {
                return false;
            }

            const findRsn = (participant: Event.Participant):
            boolean => participant.runescapeAccounts.some(
                (account: Event.Account):
                boolean => account.rsn.toLowerCase() === rsn.toLowerCase(),
            );

            const rsnIdx: number = this._teams.findIndex(
                (team: Event.Team):
                boolean => team.participants.some(
                    findRsn,
                ),
            );

            const rsnJdx: number = rsnIdx !== -1
                ? this._teams[rsnIdx].participants.findIndex(
                    findRsn,
                ) : -1;

            if (rsnIdx !== -1 && rsnJdx !== -1) {
                // we found the rsn in use already
                return false;
            }

            // is the participant already on a team?
            const participantIdx: number = this._teams.findIndex(
                (team: Event.Team):
                boolean => team.participants.some(
                    (participant: Event.Participant):
                    boolean => participant.userId === participantId,
                ),
            );

            const participantJdx: number = participantIdx !== -1
                ? this._teams[participantIdx].participants.findIndex(
                    (participant: Event.Participant):
                    boolean => participant.userId === participantId,
                ) : -1;

            if (participantIdx !== -1 && participantJdx !== -1) {
                // we know the team to signup for
                const participant: Event.Participant = this
                    ._teams[participantIdx]
                    .participants[participantJdx];
                this
                    ._teams[participantIdx]
                    .participants[participantJdx]
                    .runescapeAccounts = participant
                        .runescapeAccounts.concat({
                            rsn,
                        });
                return false;
            }

            // we need the teamname supplied
            if (teamName === undefined) {
                return true;
            }

            // we either add a new team or we add to the found team
            const teamIdx: number = this._teams.findIndex(
                (team: Event.Team):
                boolean => team.name.toLowerCase() === teamName.toLowerCase(),
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
                this._teams = [
                    ...this._teams,
                    team,
                ];
                return false;
            }

            // we found the team
            // so add the participant to the team
            this._teams[teamIdx].participants = [
                ...this._teams[teamIdx].participants,
                participant,
            ];
            return false;


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

        public unsignupParticipant(participantId: string): void {
            if (this._adminLocked) {
                return;
            }
            // did we find the user?
            const findUser = (participant: Event.Participant):
            boolean => participant.userId === participantId;

            const userIdx: number = this._teams.findIndex(
                (team: Event.Team):
                boolean => team.participants.some(
                    findUser,
                ),
            );
            const userJdx: number = userIdx !== -1
                ? this._teams[userIdx].participants.findIndex(
                    findUser,
                ) : -1;
            if (userJdx === -1) {
                // participant not found
                return;
            }

            // remove the user
            this._teams[userIdx].participants.splice(
                userJdx, 1,
            );
            // if no participants remove the team
            if (this._teams[userIdx].participants.length === 0) {
                this._teams.splice(
                    userIdx, 1,
                );
            }
        }

        /**
         * Gets the status string based on current time for the event
         * @returns A status string
         */
        public getStatusString(): string {
            if (Utils.isInFuture(this._start)) {
                return 'sign-ups';
            }
            if (Utils.isInPast(this._end)) {
                return 'ended';
            }
            if (this.isLongRunning()) {
                return 'active (∞ hrs left)';
            }
            const now: Date = new Date();
            const msLeft = this._end.getTime() - now.getTime();
            const padToTwo = (number: number): string => (number <= 99 ? `0${number}`.slice(-2) : `${number}`);
            const hoursLeft: number = Math.floor(msLeft / (60 * 60));
            const minsLeft: number = Math.floor((msLeft / 60) - hoursLeft * 60);
            return `active (${padToTwo(hoursLeft)}:${padToTwo(minsLeft)})`;
        }

        public async listParticipants(): Promise<string> {
            // need to get tag in some instances
            const retMsgsResolver: Promise<string>[] = this._teams.map(
                async (team: Event.Team): Promise<string> => {
                    const participantResolver:
                    Promise<discord.User | string>[] = team.participants.map(
                        (participant: Event.Participant):
                        Promise<discord.User | string> => gClient
                            .fetchUser(
                                participant.userId,
                            ).catch(
                                (error: Error): string => {
                                    Utils.logger.error(`${error} when fetching player`);
                                    return participant.userId;
                                },
                            ),
                    );
                    const discordUsers: (discord.User | string)[] = await Promise.all(
                        participantResolver,
                    );

                    const participantStr: string = discordUsers.map(
                        (user: discord.User | string, idx: number): string => {
                            const participant:
                            Event.Participant = team.participants[idx];
                            const rsnStrs: string = participant.runescapeAccounts.map(
                                (account: Event.Account): string => `\t\trsn: ${account.rsn}`,
                            ).join('\n');
                            if (user instanceof discord.User) {
                                return `\tDiscord: ${user.tag}\n${rsnStrs}\n`;
                            }
                            return `\tError: Discord Id: ${user}\n${rsnStrs}\n`;
                        },
                    ).join('\n');
                    return `Team ${team.name}:\n${participantStr}`;
                },
            );
            const retMsgs: string[] = await Promise.all(retMsgsResolver);
            return `Event ${this.name}:\n${retMsgs.join('\n')}`;
        }

        public getTeamsScoreboards(): TeamScoreboard[] {
            const add = (acc: number, x: number): number => acc + x;
            const capFirst = (str: string): string => `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
            const teamsScores: TeamScoreboard[] | undefined = this._teams.map(
                (team: Team): TeamScoreboard => {
                    const participantsScores: ParticipantScoreboard[] = team.participants.map(
                        (participant: Participant): ParticipantScoreboard => {
                            const accountsScores:
                            AccountScoreboard[] = participant.runescapeAccounts.map(
                                (account: Account): AccountScoreboard => {
                                    const whatsScores:
                                    WhatScoreboard[] | undefined = this._tracking.what.length === 0
                                        ? undefined
                                        : this._tracking.what.map(
                                            (what: TrackingWhat): WhatScoreboard => {
                                                let startingScore = 0;
                                                let endingScore = 0;
                                                try {
                                                    startingScore = Standard.scoreFromTracking(
                                                        account,
                                                        true,
                                                        this._tracking.category,
                                                        what,
                                                    );
                                                    // eslint-disable-next-line no-empty
                                                } catch (e) { }
                                                try {
                                                    endingScore = Standard.scoreFromTracking(
                                                        account,
                                                        false,
                                                        this._tracking.category,
                                                        what,
                                                    );
                                                    // eslint-disable-next-line no-empty
                                                } catch (e) { }

                                                return {
                                                    lhs: capFirst(what),
                                                    whatScore: Math.max(endingScore, 0)
                                                                - Math.max(startingScore, 0),
                                                };
                                            },
                                        ).sort(
                                            (a: WhatScoreboard, b: WhatScoreboard):
                                            number => b.whatScore - a.whatScore,
                                        );
                                    const accountScore: number = whatsScores === undefined
                                        ? 0
                                        : whatsScores.map(
                                            (what: WhatScoreboard): number => what.whatScore,
                                        ).reduce(add);
                                    return {
                                        lhs: account.rsn,
                                        accountScore,
                                        whatsScores,
                                    };
                                },
                            ).sort(
                                (a: AccountScoreboard, b: AccountScoreboard):
                                number => b.accountScore - a.accountScore,
                            );
                            const { customScore } = participant;
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
                        },
                    ).sort(
                        (a: ParticipantScoreboard, b: ParticipantScoreboard):
                        number => b.participantScore - a.participantScore,
                    );
                    const teamScore: number = participantsScores.map(
                        (participant: ParticipantScoreboard):
                        number => participant.participantScore,
                    ).reduce(add);

                    return {
                        lhs: team.name,
                        teamScore,
                        participantsScores,
                    };
                },
            ).sort(
                (a: TeamScoreboard, b: TeamScoreboard):
                number => b.teamScore - a.teamScore,
            );
            return teamsScores;
        }

        public async getEventScoreboardString(
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
                    },
                ),
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
                                            },
                                        );
                                        return Math.max(
                                            Math.max(...whatsLen),
                                            accountLen,
                                        );
                                    }
                                    return accountLen;
                                },
                            );
                            return Math.max(
                                Math.max(...accountsLen),
                                participantLen,
                            );
                        },
                    );
                    return Math.max(
                        Math.max(...participantsLen),
                        teamLen,
                    );
                },
            ).map(
                (maxTeamLen: number): number => maxTeamLen + padding,
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
                            const spacesToInsertParticipant:
                            number = maxTeamStrLen - participantStrLen;
                            const spacesParticipant: string = new Array(spacesToInsertParticipant + 1).join(' ');
                            // const participantStr: string = participant.participantScore > 0
                            //     ? `${tab}${tags[idx]}${spacesParticipant}${participant.participantScore.toLocaleString('en-us')}`
                            //     : `${tab}${tags[idx]}`;
                            const participantStr = `${tab}${tags[idx]}${spacesParticipant}${participant.participantScore.toLocaleString('en-us')}`;
                            idx += 1;

                            const accountsStr: string = participant.accountsScores.map(
                                (account: AccountScoreboard): string => {
                                    const accountStrLen: number = `${tab}${tab}${account.lhs}${account.accountScore.toLocaleString('en-us')}`.length;
                                    const spacesToInsertAccount:
                                    number = maxTeamStrLen - accountStrLen;
                                    const spacesAccount: string = new Array(spacesToInsertAccount + 1).join(' ');
                                    // const accountStr: string = account.accountScore > 0
                                    //     ? `${tab}${tab}${account.lhs}${spacesAccount}${account.accountScore.toLocaleString('en-us')}`
                                    //     : `${tab}${tab}${account.lhs}`;
                                    const accountStr = `${tab}${tab}${account.lhs}${spacesAccount}${account.accountScore.toLocaleString('en-us')}`;

                                    if (account.whatsScores !== undefined) {
                                        const whatStr: string = account.whatsScores.map(
                                            (what: WhatScoreboard): string | null => {
                                                const whatStrLen: number = `${tab}${tab}${tab}${what.lhs}${what.whatScore.toLocaleString('en-us')}`.length;
                                                const spacesToInsertWhat:
                                                number = maxTeamStrLen - whatStrLen;
                                                const spacesWhat: string = new Array(spacesToInsertWhat + 1).join(' ');
                                                const ret: string | null = what.whatScore > 0
                                                    ? `${tab}${tab}${tab}${what.lhs}${spacesWhat}${what.whatScore.toLocaleString('en-us')}`
                                                    : null;
                                                return ret;
                                            },
                                        ).filter(Utils.isDefinedFilter).join('\n');
                                        const ret = whatStr.length > 0
                                            ? `${accountStr}\n${whatStr}`
                                            : `${accountStr}`;
                                        return ret;
                                    }
                                    return accountStr;
                                },
                            ).join('\n');
                            const ret = `${participantStr}\n${accountsStr}`;
                            return ret;
                        },
                    ).join('\n');
                    const ret = `${teamStr}\n${participantsStr}`;
                    return ret;
                },
            ).join(`\n${dashesTeamSeparator}\n`)).concat(`\n${dashesTeamSeparator}`);

            const status: string = !deleted
                ? this.getStatusString()
                : '(DELETED EVENT)';
            // if (error !== undefined) {
            //     ret = `Event ${event.name} (${event.tracking.category})\n#${event.id} ${event.when.start.toUTCString()} ${status}\n\n${str}\n\n${error}`;
            // } else {
            //     ret = `Event ${event.name} (${event.tracking.category})\n#${event.id} ${event.when.start.toUTCString()} ${status}\n\n${str}\n\nUpdated: ${new Date().toUTCString()}`;
            // }
            return `Event ${this.name}\n#${this.id} ${this._start.toUTCString()} ${status}\n\n${str}`;
        }
    }

    /**
     * Global type behavior subclass
     */
    export class Global extends Standard {
        private _invitations: string[]

        public constructor(
            id: number | undefined,
            name: string,
            start: Date,
            end: Date,
            guilds: CompetingGuilds,
            teams: Team[],
            tracking: Tracking,
            global: boolean,
            locked: boolean,
            invitations: string[],
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

            this._invitations = invitations;
        }

        public get invitations(): string[] {
            return [...this._invitations];
        }

        public addInvitation(guildId: string): void {
            if (this._invitations.indexOf(guildId) === -1) {
                this._invitations.push(guildId);
            }
        }

        public removeInvitation(guildId: string): void {
            const idx: number = this.invitations.indexOf(guildId);
            if (idx !== -1) {
                this._invitations.splice(idx, 1);
            }
        }

        /* eslint-disable @typescript-eslint/no-unused-vars */
        /* eslint-disable class-methods-use-this */
        public addScore(customScore: number): void { }

        public setTimeFrame(start: Date, end: Date): void { }

        public end(): void { }
        /* eslint-enable class-methods-use-this */
        /* eslint-enable @typescript-eslint/no-unused-vars */

        public addOtherGuild(guild: Guild): void {
            const thirtyMinutesBeforeStart: Date = new Date(this._start);
            thirtyMinutesBeforeStart.setMinutes(thirtyMinutesBeforeStart.getMinutes() - 30);
            if (Utils.isInPast(thirtyMinutesBeforeStart)) {
                return;
            }
            if (this._guilds.others !== undefined
                && !this._guilds.others.some(
                    (aGuild: Guild): boolean => aGuild.guildId === guild.guildId,
                )) {
                this._guilds.others.push(guild);
            }
        }

        public removeOtherGuild(guildId: string): void {
            const thirtyMinutesBeforeStart: Date = new Date(this._start);
            thirtyMinutesBeforeStart.setMinutes(thirtyMinutesBeforeStart.getMinutes() - 30);
            if (Utils.isInPast(thirtyMinutesBeforeStart)) {
                return;
            }
            if (this._guilds.others !== undefined) {
                const idx: number = this._guilds.others.findIndex(
                    (guild: Guild): boolean => guild.guildId === guildId,
                );
                if (idx !== -1) {
                    this._guilds.others = this._guilds.others.splice(idx, 1);
                }
            }
        }

        public signupParticipant(
            participantId: string,
            guildId: string,
            rsn: string,
            teamName?: string,
        ): boolean {
            // we may need to override the teamname for a cross guild event
            // before we pass it to super
            // find a team with the same guildId
            // we should actually take care of this with joinEvent
            // -1 should not be possible
            const teamIdx: number = this._teams.findIndex(
                (team: Team): boolean => team.guildId === guildId,
            );
            const processedTeamName = teamIdx !== -1
                ? this._teams[teamIdx].name
                : teamName;

            // make sure teams are not locked
            const tenMinutesBeforeStart: Date = new Date(this.startingDate);
            tenMinutesBeforeStart.setMinutes(tenMinutesBeforeStart.getMinutes() - 10);
            if (Utils.isInPast(tenMinutesBeforeStart)) {
                return false;
            }

            // make sure we are invited
            if (!this._invitations.some(
                (aGuildId: string): boolean => aGuildId === guildId,
            )) {
                return false;
            }

            // this goes last since it mutates the event
            const needsTeamName: boolean = super.signupParticipant(
                participantId,
                guildId,
                rsn,
                processedTeamName,
            );
            return needsTeamName;
        }

        public unsignupParticipant(participantId: string): void {
            // make sure teams are not locked
            const tenMinutesBeforeStart: Date = new Date(this.startingDate);
            tenMinutesBeforeStart.setMinutes(tenMinutesBeforeStart.getMinutes() - 10);
            if (Utils.isInPast(tenMinutesBeforeStart)) {
                return;
            }
            super.unsignupParticipant(participantId);
        }

        public async getEventScoreboardString(
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

            const combinedGuilds = this._guilds.others !== undefined
                ? [
                    this._guilds.creator,
                    ...this._guilds.others,
                ]
                : [
                    this._guilds.creator,
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
                },
            ).join('\n');
            getDiscordGuildName(gClient, guildId);
            return scoreboard.concat(`\n\n${competitors}`);
        }
    }
}
