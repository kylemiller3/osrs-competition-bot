import { Event } from "./event";
import pgPromise, { PreparedStatement } from "pg-promise";

export enum TABLES {
    SETTINGS = 'settings',
    EVENTS = 'events',
    TEAMS = 'teams',
    PARTICIPANTS = 'participants',
    ACCOUNT = 'account',
    GUILDS = 'guilds',
    MESSAGES = 'messages',
}

export enum EVENT_COLUMNS {
    ID = 'id',
    NAME = 'name',
    WHEN_START = 'when_start',
    WHEN_END = 'when_end',
    GLOBAL = 'global',
    TRACKING_CATEGORY = 'tracking_category',
    TRACKING_WHAT = 'tracking_what',
    ADMIN_LOCKED = 'admin_locked',
}

const createTableEventsStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.EVENTS}(`
    + `${EVENT_COLUMNS.ID}                   SERIAL PRIMARY KEY, `
    + `${EVENT_COLUMNS.NAME}                 VARCHAR(50) NOT NULL, `
    + `${EVENT_COLUMNS.WHEN_START}           TIMESTAMPZ NOT NULL, `
    + `${EVENT_COLUMNS.WHEN_END}             TIMESTAMPZ NOT NULL, `
    + `${EVENT_COLUMNS.GLOBAL}               BOOLEAN NOT NULL, `
    + `${EVENT_COLUMNS.TRACKING_CATEGORY}    VARCHAR(30) NOT NULL, `
    + `${EVENT_COLUMNS.TRACKING_WHAT}        TEXT NOT NULL, `
    + `${EVENT_COLUMNS.ADMIN_LOCKED}          BOOLEAN NOT NULL `
    + ')';

export const createTableEventsStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Events Table',
    text: createTableEventsStr,
});

const upsertEventStr: string = `INSERT INTO ${TABLES.EVENTS}(`
    + `${EVENT_COLUMNS.NAME}, `
    + `${EVENT_COLUMNS.WHEN_START}, `
    + `${EVENT_COLUMNS.WHEN_END}, `
    + `${EVENT_COLUMNS.GLOBAL}, `
    + `${EVENT_COLUMNS.TRACKING_CATEGORY}, `
    + `${EVENT_COLUMNS.TRACKING_WHAT}, `
    + `${EVENT_COLUMNS.ADMIN_LOCKED}`
    + ') VALUES ('
    + '$1, $2, $3, $4, $5, $6, $7'
    + ') ON CONFLICT DO NOTHING';

export const upsertEventStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Event',
    text: upsertEventStr,
});

export enum TEAM_COLUMNS {
    ID = 'id',
    FK_EVENT_ID = 'fk_event_id',
    NAME = 'name',
}

const createTableTeamsStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.TEAMS}(`
    + `${TEAM_COLUMNS.ID}                          SERIAL PRIMARY KEY, `
    + `FOREIGN KEY(${TEAM_COLUMNS.FK_EVENT_ID})    REFERENCES ${TABLES.EVENTS}(${EVENT_COLUMNS.ID}), `
    + `${TEAM_COLUMNS.NAME}                        VARCHAR(50) NOT NULL`
    + ')';

export const createTableTeamsStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Event Teams Table',
    text: createTableTeamsStr,
});

const upsertTeamStr: string = `INSERT INTO ${TABLES.TEAMS}(`
    + `${TEAM_COLUMNS.FK_EVENT_ID}`
    + `${TEAM_COLUMNS.NAME}`
    + ') VALUES ('
    + '$1, $2'
    + ') ON CONFLICT DO NOTHING';

export const upsertTeamStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Event Team',
    text: upsertTeamStr,
});

export enum PARTICIPANT_COLUMNS {
    ID = 'id',
    FK_TEAM_ID = 'fk_team_id',
    USER_ID = 'user_id',
    CUSTOM_SCORE = 'custom_score',
}

const createTableParticipantsStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.PARTICIPANTS}(`
    + `${PARTICIPANT_COLUMNS.ID}                         SERIAL PRIMARY KEY, `
    + `FOREIGN KEY(${PARTICIPANT_COLUMNS.FK_TEAM_ID})    REFERENCES ${TABLES.TEAMS}(${TEAM_COLUMNS.ID}), `
    + `${PARTICIPANT_COLUMNS.USER_ID}                    VARCHAR(50) NOT NULL, `
    + `${PARTICIPANT_COLUMNS.CUSTOM_SCORE}               BIGINT NOT NULL`
    + ')';

export const createTableParticipantsStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Team Participants Table',
    text: createTableParticipantsStr,
});

const upsertParticipantStr: string = `INSERT INTO ${TABLES.PARTICIPANTS}(`
    + `${PARTICIPANT_COLUMNS.FK_TEAM_ID}`
    + `${PARTICIPANT_COLUMNS.USER_ID}`
    + `${PARTICIPANT_COLUMNS.CUSTOM_SCORE}`
    + ') VALUES ('
    + '$1, $2, $3'
    + ') ON CONFLICT DO NOTHING';

export const upsertParticipantStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Team Participant',
    text: upsertParticipantStr,
});

export enum ACCOUNT_COLUMNS {
    ID = 'id',
    FK_PARTICIPANT_ID = 'fk_participant_id',
    RSN = 'rsn',
    ENDING_BH_ROGUE_RANK = 'ending_bh_rogue_rank',
    ENDING_BH_ROGUE_SCORE = 'ending_bh_rogue_score',
    ENDING_BH_HUNTER_RANK = 'ending_bh_hunter_rank',
    ENDING_BH_HUNTER_SCORE = 'ending_bh_hunter_score',
    ENDING_LMS_RANK = 'ending_lms_rank',
    ENDING_LMS_SCORE = 'ending_lms_score',
    ENDING_CLUES_ALL_RANK = 'ending_clues_all_rank',
    ENDING_CLUES_ALL_SCORE = 'ending_clues_all_score',
    ENDING_CLUES_EASY_RANK = 'ending_clues_easy_rank',
    ENDING_CLUES_EASY_SCORE = 'ending_clues_easy_score',
    ENDING_CLUES_HARD_RANK = 'ending_clues_hard_rank',
    ENDING_CLUES_HARD_SCORE = 'ending_clues_hard_score',
    ENDING_CLUES_ELITE_RANK = 'ending_clues_elite_rank',
    ENDING_CLUES_ELITE_SCORE = 'ending_clues_elite_score',
    ENDING_CLUES_MASTER_RANK = 'ending_clues_master_rank',
    ENDING_CLUES_MASTER_SCORE = 'ending_clues_master_score',
    ENDING_CLUES_MEDIUM_RANK = 'ending_clues_medium_rank',
    ENDING_CLUES_MEDIUM_SCORE = 'ending_clues_medium_score',
    ENDING_CLUES_BEGINNER_RANK = 'ending_clues_beginner_rank',
    ENDING_CLUES_BEGINNER_SCORE = 'ending_clues_beginner_score',
    ENDING_BOSSES_OBOR_RANK = 'ending_bosses_obor_rank',
    ENDING_BOSSES_OBOR_SCORE = 'ending_bosses_obor_score',
    ENDING_BOSSES_MIMIC_RANK = 'ending_bosses_mimic_rank',
    ENDING_BOSSES_MIMIC_SCORE = 'ending_bosses_mimic_score',
    ENDING_BOSSES_KRAKEN_RANK = 'ending_bosses_kraken_rank',
    ENDING_BOSSES_KRAKEN_SCORE = 'ending_bosses_kraken_score',
    ENDING_BOSSES_ZULRAH_RANK = 'ending_bosses_zulrah_rank',
    ENDING_BOSSES_ZULRAH_SCORE = 'ending_bosses_zulrah_score',
    ENDING_BOSSES_HESPORI_RANK = 'ending_bosses_hespori_rank',
    ENDING_BOSSES_HESPORI_SCORE = 'ending_bosses_hespori_score',
    ENDING_BOSSES_SCORPIA_RANK = 'ending_bosses_scorpia_rank',
    ENDING_BOSSES_SCORPIA_SCORE = 'ending_bosses_scorpia_score',
    ENDING_BOSSES_SKOTIZO_RANK = 'ending_bosses_skotizo_rank',
    ENDING_BOSSES_SKOTIZO_SCORE = 'ending_bosses_skotizo_score',
    ENDING_BOSSES_VETION_RANK = 'ending_bosses_vetion_rank',
    ENDING_BOSSES_VETION_SCORE = 'ending_bosses_vetion_score',
    ENDING_BOSSES_VORKATH_RANK = 'ending_bosses_vorkath_rank',
    ENDING_BOSSES_VORKATH_SCORE = 'ending_bosses_vorkath_score',
    ENDING_BOSSES_ZALCANO_RANK = 'ending_bosses_zalcano_rank',
    ENDING_BOSSES_ZALCANO_SCORE = 'ending_bosses_zalcano_score',
    ENDING_BOSSES_CALLISTO_RANK = 'ending_bosses_callisto_rank',
    ENDING_BOSSES_CALLISTO_SCORE = 'ending_bosses_callisto_score',
    ENDING_BOSSES_CERBERUS_RANK = 'ending_bosses_cerberus_rank',
    ENDING_BOSSES_CERBERUS_SCORE = 'ending_bosses_cerberus_score',
    ENDING_BOSSES_BRYOPHYTA_RANK = 'ending_bosses_bryophyta_rank',
    ENDING_BOSSES_BRYOPHYTA_SCORE = 'ending_bosses_bryophyta_score',
    ENDING_BOSSES_KREEARRA_RANK = 'ending_bosses_kreearra_rank',
    ENDING_BOSSES_KREEARRA_SCORE = 'ending_bosses_kreearra_score',
    ENDING_BOSSES_SARACHNIS_RANK = 'ending_bosses_sarachnis_rank',
    ENDING_BOSSES_SARACHNIS_SCORE = 'ending_bosses_sarachnis_score',
    ENDING_BOSSES_TZKALZUK_RANK = 'ending_bosses_tzkalzuk_rank',
    ENDING_BOSSES_TZKALZUK_SCORE = 'ending_bosses_tzkalzuk_score',
    ENDING_BOSSES_TZTOKJAD_RANK = 'ending_bosses_tztokjad_rank',
    ENDING_BOSSES_TZTOKJAD_SCORE = 'ending_bosses_tztokjad_score',
    ENDING_BOSSES_VENENATIS_RANK = 'ending_bosses_venenatis_rank',
    ENDING_BOSSES_VENENATIS_SCORE = 'ending_bosses_venenatis_score',
    ENDING_BOSSES_GIANT_MOLE_RANK = 'ending_bosses_giant_mole_rank',
    ENDING_BOSSES_GIANT_MOLE_SCORE = 'ending_bosses_giant_mole_score',
    ENDING_BOSSES_WINTERTODT_RANK = 'ending_bosses_wintertodt_rank',
    ENDING_BOSSES_WINTERTODT_SCORE = 'ending_bosses_wintertodt_score',
    ENDING_BOSSES_ABYSSAL_SIRE_RANK = 'ending_bosses_abyssal_sire_rank',
    ENDING_BOSSES_ABYSSAL_SIRE_SCORE = 'ending_bosses_abyssal_sire_score',
    ENDING_BOSSES_THE_GAUNTLET_RANK = 'ending_bosses_the_gauntlet_rank',
    ENDING_BOSSES_THE_GAUNTLET_SCORE = 'ending_bosses_the_gauntlet_score',
    ENDING_BOSSES_CHAOS_FANATIC_RANK = 'ending_bosses_chaos_fanatic_rank',
    ENDING_BOSSES_CHAOS_FANATIC_SCORE = 'ending_bosses_chaos_fanatic_score',
    ENDING_BOSSES_DAGANNOTH_REX_RANK = 'ending_bosses_dagannoth_rex_rank',
    ENDING_BOSSES_DAGANNOTH_REX_SCORE = 'ending_bosses_dagannoth_rex_score',
    ENDING_BOSSES_BARROWS_CHESTS_RANK = 'ending_bosses_barrows_chests_rank',
    ENDING_BOSSES_BARROWS_CHESTS_SCORE = 'ending_bosses_barrows_chests_score',
    ENDING_BOSSES_KALPHITE_QUEEN_RANK = 'ending_bosses_kalphite_queen_rank',
    ENDING_BOSSES_KALPHITE_QUEEN_SCORE = 'ending_bosses_kalphite_queen_score',
    ENDING_BOSSES_CHAOS_ELEMENTAL_RANK = 'ending_bosses_chaos_elemental_rank',
    ENDING_BOSSES_CHAOS_ELEMENTAL_SCORE = 'ending_bosses_chaos_elemental_score',
    ENDING_BOSSES_CORPOREAL_BEAST_RANK = 'ending_bosses_corporeal_beast_rank',
    ENDING_BOSSES_CORPOREAL_BEAST_SCORE = 'ending_bosses_corporeal_beast_score',
    ENDING_BOSSES_DAGANNOTH_PRIME_RANK = 'ending_bosses_dagannoth_prime_rank',
    ENDING_BOSSES_DAGANNOTH_PRIME_SCORE = 'ending_bosses_dagannoth_prime_score',
    ENDING_BOSSES_ALCHEMICAL_HYDRA_RANK = 'ending_bosses_alchemical_hydra_rank',
    ENDING_BOSSES_ALCHEMICAL_HYDRA_SCORE = 'ending_bosses_alchemical_hydra_score',
    ENDING_BOSSES_GENERAL_GRAARDOR_RANK = 'ending_bosses_general_graardor_rank',
    ENDING_BOSSES_GENERAL_GRAARDOR_SCORE = 'ending_bosses_general_graardor_score',
    ENDING_BOSSES_KRIL_TSUTSAROTH_RANK = 'ending_bosses_kril_tsutsaroth_rank',
    ENDING_BOSSES_KRIL_TSUTSAROTH_SCORE = 'ending_bosses_kril_tsutsaroth_score',
    ENDING_BOSSES_THEATRE_OF_BLOOD_RANK = 'ending_bosses_theatre_of_blood_rank',
    ENDING_BOSSES_THEATRE_OF_BLOOD_SCORE = 'ending_bosses_theatre_of_blood_score',
    ENDING_BOSSES_CHAMBERS_OF_XERIC_RANK = 'ending_bosses_chambers_of_xeric_rank',
    ENDING_BOSSES_CHAMBERS_OF_XERIC_SCORE = 'ending_bosses_chambers_of_xeric_score',
    ENDING_BOSSES_COMMANDER_ZILYANA_RANK = 'ending_bosses_commander_zilyana_rank',
    ENDING_BOSSES_COMMANDER_ZILYANA_SCORE = 'ending_bosses_commander_zilyana_score',
    ENDING_BOSSES_DAGANNOTH_SUPREME_RANK = 'ending_bosses_dagannoth_supreme_rank',
    ENDING_BOSSES_DAGANNOTH_SUPREME_SCORE = 'ending_bosses_dagannoth_supreme_score',
    ENDING_BOSSES_KING_BLACK_DRAGON_RANK = 'ending_bosses_king_black_dragon_rank',
    ENDING_BOSSES_KING_BLACK_DRAGON_SCORE = 'ending_bosses_king_black_dragon_score',
    ENDING_BOSSES_CRAZY_ARCHAEOLOGIST_RANK = 'ending_bosses_crazy_archaeologist_rank',
    ENDING_BOSSES_CRAZY_ARCHAEOLOGIST_SCORE = 'ending_bosses_crazy_archaeologist_score',
    ENDING_BOSSES_GROTESQUE_GUARDIANS_RANK = 'ending_bosses_grotesque_guardians_rank',
    ENDING_BOSSES_GROTESQUE_GUARDIANS_SCORE = 'ending_bosses_grotesque_guardians_score',
    ENDING_BOSSES_DERANGED_ARCHAEOLOGIST_RANK = 'ending_bosses_deranged_archaeologist_rank',
    ENDING_BOSSES_DERANGED_ARCHAEOLOGIST_SCORE = 'ending_bosses_deranged_archaeologist_score',
    ENDING_BOSSES_THE_CORRUPTED_GAUNTLET_RANK = 'ending_bosses_the_corrupted_gauntlet_rank',
    ENDING_BOSSES_THE_CORRUPTED_GAUNTLET_SCORE = 'ending_bosses_the_corrupted_gauntlet_score',
    ENDING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK = 'ending_bosses_thermonuclear_smoke_devil_rank',
    ENDING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE = 'ending_bosses_thermonuclear_smoke_devil_score',
    ENDING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK = 'ending_bosses_chambers_of_xeric_challenge_mode_rank',
    ENDING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE = 'ending_bosses_chambers_of_xeric_challenge_mode_score',
    ENDING_SKILLS_MAGIC_XP = 'ending_skills_magic_xp',
    ENDING_SKILLS_MAGIC_RANK = 'ending_skills_magic_rank',
    ENDING_SKILLS_MAGIC_LEVEL = 'ending_skills_magic_level',
    ENDING_SKILLS_ATTACK_XP = 'ending_skills_attack_xp',
    ENDING_SKILLS_ATTACK_RANK = 'ending_skills_attack_rank',
    ENDING_SKILLS_ATTACK_LEVEL = 'ending_skills_attack_level',
    ENDING_SKILLS_HUNTER_XP = 'ending_skills_hunter_xp',
    ENDING_SKILLS_HUNTER_RANK = 'ending_skills_hunter_rank',
    ENDING_SKILLS_HUNTER_LEVEL = 'ending_skills_hunter_level',
    ENDING_SKILLS_MINING_XP = 'ending_skills_mining_xp',
    ENDING_SKILLS_MINING_RANK = 'ending_skills_mining_rank',
    ENDING_SKILLS_MINING_LEVEL = 'ending_skills_mining_level',
    ENDING_SKILLS_PRAYER_XP = 'ending_skills_prayer_xp',
    ENDING_SKILLS_PRAYER_RANK = 'ending_skills_prayer_rank',
    ENDING_SKILLS_PRAYER_LEVEL = 'ending_skills_prayer_level',
    ENDING_SKILLS_RANGED_XP = 'ending_skills_ranged_xp',
    ENDING_SKILLS_RANGED_RANK = 'ending_skills_ranged_rank',
    ENDING_SKILLS_RANGED_LEVEL = 'ending_skills_ranged_level',
    ENDING_SKILLS_SLAYER_XP = 'ending_skills_slayer_xp',
    ENDING_SKILLS_SLAYER_RANK = 'ending_skills_slayer_rank',
    ENDING_SKILLS_SLAYER_LEVEL = 'ending_skills_slayer_level',
    ENDING_SKILLS_AGILITY_XP = 'ending_skills_agility_xp',
    ENDING_SKILLS_AGILITY_RANK = 'ending_skills_agility_rank',
    ENDING_SKILLS_AGILITY_LEVEL = 'ending_skills_agility_level',
    ENDING_SKILLS_COOKING_XP = 'ending_skills_cooking_xp',
    ENDING_SKILLS_COOKING_RANK = 'ending_skills_cooking_rank',
    ENDING_SKILLS_COOKING_LEVEL = 'ending_skills_cooking_level',
    ENDING_SKILLS_DEFENCE_XP = 'ending_skills_defence_xp',
    ENDING_SKILLS_DEFENCE_RANK = 'ending_skills_defence_rank',
    ENDING_SKILLS_DEFENCE_LEVEL = 'ending_skills_defence_level',
    ENDING_SKILLS_FARMING_XP = 'ending_skills_farming_xp',
    ENDING_SKILLS_FARMING_RANK = 'ending_skills_farming_rank',
    ENDING_SKILLS_FARMING_LEVEL = 'ending_skills_farming_level',
    ENDING_SKILLS_FISHING_XP = 'ending_skills_fishing_xp',
    ENDING_SKILLS_FISHING_RANK = 'ending_skills_fishing_rank',
    ENDING_SKILLS_FISHING_LEVEL = 'ending_skills_fishing_level',
    ENDING_SKILLS_OVERALL_XP = 'ending_skills_overall_xp',
    ENDING_SKILLS_OVERALL_RANK = 'ending_skills_overall_rank',
    ENDING_SKILLS_OVERALL_LEVEL = 'ending_skills_overall_level',
    ENDING_SKILLS_CRAFTING_XP = 'ending_skills_crafting_xp',
    ENDING_SKILLS_CRAFTING_RANK = 'ending_skills_crafting_rank',
    ENDING_SKILLS_CRAFTING_LEVEL = 'ending_skills_crafting_level',
    ENDING_SKILLS_HERBLORE_XP = 'ending_skills_herblore_xp',
    ENDING_SKILLS_HERBLORE_RANK = 'ending_skills_herblore_rank',
    ENDING_SKILLS_HERBLORE_LEVEL = 'ending_skills_herblore_level',
    ENDING_SKILLS_SMITHING_XP = 'ending_skills_smithing_xp',
    ENDING_SKILLS_SMITHING_RANK = 'ending_skills_smithing_rank',
    ENDING_SKILLS_SMITHING_LEVEL = 'ending_skills_smithing_level',
    ENDING_SKILLS_STRENGTH_XP = 'ending_skills_strength_xp',
    ENDING_SKILLS_STRENGTH_RANK = 'ending_skills_strength_rank',
    ENDING_SKILLS_STRENGTH_LEVEL = 'ending_skills_strength_level',
    ENDING_SKILLS_THIEVING_XP = 'ending_skills_thieving_xp',
    ENDING_SKILLS_THIEVING_RANK = 'ending_skills_thieving_rank',
    ENDING_SKILLS_THIEVING_LEVEL = 'ending_skills_thieving_level',
    ENDING_SKILLS_FLETCHING_XP = 'ending_skills_fletching_xp',
    ENDING_SKILLS_FLETCHING_RANK = 'ending_skills_fletching_rank',
    ENDING_SKILLS_FLETCHING_LEVEL = 'ending_skills_fletching_level',
    ENDING_SKILLS_HITPOINTS_XP = 'ending_skills_hitpoints_xp',
    ENDING_SKILLS_HITPOINTS_RANK = 'ending_skills_hitpoints_rank',
    ENDING_SKILLS_HITPOINTS_LEVEL = 'ending_skills_hitpoints_level',
    ENDING_SKILLS_RUNECRAFT_XP = 'ending_skills_runecraft_xp',
    ENDING_SKILLS_RUNECRAFT_RANK = 'ending_skills_runecraft_rank',
    ENDING_SKILLS_RUNECRAFT_LEVEL = 'ending_skills_runecraft_level',
    ENDING_SKILLS_FIREMAKING_XP = 'ending_skills_firemaking_xp',
    ENDING_SKILLS_FIREMAKING_RANK = 'ending_skills_firemaking_rank',
    ENDING_SKILLS_FIREMAKING_LEVEL = 'ending_skills_firemaking_level',
    ENDING_SKILLS_WOODCUTTING_XP = 'ending_skills_woodcutting_xp',
    ENDING_SKILLS_WOODCUTTING_RANK = 'ending_skills_woodcutting_rank',
    ENDING_SKILLS_WOODCUTTING_LEVEL = 'ending_skills_woodcutting_level',
    ENDING_SKILLS_CONSTRUCTION_XP = 'ending_skills_construction_xp',
    ENDING_SKILLS_CONSTRUCTION_RANK = 'ending_skills_construction_rank',
    ENDING_SKILLS_CONSTRUCTION_LEVEL = 'ending_skills_construction_level',
    STARTING_BH_ROGUE_RANK = 'starting_bh_rogue_rank',
    STARTING_BH_ROGUE_SCORE = 'starting_bh_rogue_score',
    STARTING_BH_HUNTER_RANK = 'starting_bh_hunter_rank',
    STARTING_BH_HUNTER_SCORE = 'starting_bh_hunter_score',
    STARTING_LMS_RANK = 'starting_lms_rank',
    STARTING_LMS_SCORE = 'starting_lms_score',
    STARTING_CLUES_ALL_RANK = 'starting_clues_all_rank',
    STARTING_CLUES_ALL_SCORE = 'starting_clues_all_score',
    STARTING_CLUES_EASY_RANK = 'starting_clues_easy_rank',
    STARTING_CLUES_EASY_SCORE = 'starting_clues_easy_score',
    STARTING_CLUES_HARD_RANK = 'starting_clues_hard_rank',
    STARTING_CLUES_HARD_SCORE = 'starting_clues_hard_score',
    STARTING_CLUES_ELITE_RANK = 'starting_clues_elite_rank',
    STARTING_CLUES_ELITE_SCORE = 'starting_clues_elite_score',
    STARTING_CLUES_MASTER_RANK = 'starting_clues_master_rank',
    STARTING_CLUES_MASTER_SCORE = 'starting_clues_master_score',
    STARTING_CLUES_MEDIUM_RANK = 'starting_clues_medium_rank',
    STARTING_CLUES_MEDIUM_SCORE = 'starting_clues_medium_score',
    STARTING_CLUES_BEGINNER_RANK = 'starting_clues_beginner_rank',
    STARTING_CLUES_BEGINNER_SCORE = 'starting_clues_beginner_score',
    STARTING_BOSSES_OBOR_RANK = 'starting_bosses_obor_rank',
    STARTING_BOSSES_OBOR_SCORE = 'starting_bosses_obor_score',
    STARTING_BOSSES_MIMIC_RANK = 'starting_bosses_mimic_rank',
    STARTING_BOSSES_MIMIC_SCORE = 'starting_bosses_mimic_score',
    STARTING_BOSSES_KRAKEN_RANK = 'starting_bosses_kraken_rank',
    STARTING_BOSSES_KRAKEN_SCORE = 'starting_bosses_kraken_score',
    STARTING_BOSSES_ZULRAH_RANK = 'starting_bosses_zulrah_rank',
    STARTING_BOSSES_ZULRAH_SCORE = 'starting_bosses_zulrah_score',
    STARTING_BOSSES_HESPORI_RANK = 'starting_bosses_hespori_rank',
    STARTING_BOSSES_HESPORI_SCORE = 'starting_bosses_hespori_score',
    STARTING_BOSSES_SCORPIA_RANK = 'starting_bosses_scorpia_rank',
    STARTING_BOSSES_SCORPIA_SCORE = 'starting_bosses_scorpia_score',
    STARTING_BOSSES_SKOTIZO_RANK = 'starting_bosses_skotizo_rank',
    STARTING_BOSSES_SKOTIZO_SCORE = 'starting_bosses_skotizo_score',
    STARTING_BOSSES_VETION_RANK = 'starting_bosses_vetion_rank',
    STARTING_BOSSES_VETION_SCORE = 'starting_bosses_vetion_score',
    STARTING_BOSSES_VORKATH_RANK = 'starting_bosses_vorkath_rank',
    STARTING_BOSSES_VORKATH_SCORE = 'starting_bosses_vorkath_score',
    STARTING_BOSSES_ZALCANO_RANK = 'starting_bosses_zalcano_rank',
    STARTING_BOSSES_ZALCANO_SCORE = 'starting_bosses_zalcano_score',
    STARTING_BOSSES_CALLISTO_RANK = 'starting_bosses_callisto_rank',
    STARTING_BOSSES_CALLISTO_SCORE = 'starting_bosses_callisto_score',
    STARTING_BOSSES_CERBERUS_RANK = 'starting_bosses_cerberus_rank',
    STARTING_BOSSES_CERBERUS_SCORE = 'starting_bosses_cerberus_score',
    STARTING_BOSSES_BRYOPHYTA_RANK = 'starting_bosses_bryophyta_rank',
    STARTING_BOSSES_BRYOPHYTA_SCORE = 'starting_bosses_bryophyta_score',
    STARTING_BOSSES_KREEARRA_RANK = 'starting_bosses_kreearra_rank',
    STARTING_BOSSES_KREEARRA_SCORE = 'starting_bosses_kreearra_score',
    STARTING_BOSSES_SARACHNIS_RANK = 'starting_bosses_sarachnis_rank',
    STARTING_BOSSES_SARACHNIS_SCORE = 'starting_bosses_sarachnis_score',
    STARTING_BOSSES_TZKALZUK_RANK = 'starting_bosses_tzkalzuk_rank',
    STARTING_BOSSES_TZKALZUK_SCORE = 'starting_bosses_tzkalzuk_score',
    STARTING_BOSSES_TZTOKJAD_RANK = 'starting_bosses_tztokjad_rank',
    STARTING_BOSSES_TZTOKJAD_SCORE = 'starting_bosses_tztokjad_score',
    STARTING_BOSSES_VENENATIS_RANK = 'starting_bosses_venenatis_rank',
    STARTING_BOSSES_VENENATIS_SCORE = 'starting_bosses_venenatis_score',
    STARTING_BOSSES_GIANT_MOLE_RANK = 'starting_bosses_giant_mole_rank',
    STARTING_BOSSES_GIANT_MOLE_SCORE = 'starting_bosses_giant_mole_score',
    STARTING_BOSSES_WINTERTODT_RANK = 'starting_bosses_wintertodt_rank',
    STARTING_BOSSES_WINTERTODT_SCORE = 'starting_bosses_wintertodt_score',
    STARTING_BOSSES_ABYSSAL_SIRE_RANK = 'starting_bosses_abyssal_sire_rank',
    STARTING_BOSSES_ABYSSAL_SIRE_SCORE = 'starting_bosses_abyssal_sire_score',
    STARTING_BOSSES_THE_GAUNTLET_RANK = 'starting_bosses_the_gauntlet_rank',
    STARTING_BOSSES_THE_GAUNTLET_SCORE = 'starting_bosses_the_gauntlet_score',
    STARTING_BOSSES_CHAOS_FANATIC_RANK = 'starting_bosses_chaos_fanatic_rank',
    STARTING_BOSSES_CHAOS_FANATIC_SCORE = 'starting_bosses_chaos_fanatic_score',
    STARTING_BOSSES_DAGANNOTH_REX_RANK = 'starting_bosses_dagannoth_rex_rank',
    STARTING_BOSSES_DAGANNOTH_REX_SCORE = 'starting_bosses_dagannoth_rex_score',
    STARTING_BOSSES_BARROWS_CHESTS_RANK = 'starting_bosses_barrows_chests_rank',
    STARTING_BOSSES_BARROWS_CHESTS_SCORE = 'starting_bosses_barrows_chests_score',
    STARTING_BOSSES_KALPHITE_QUEEN_RANK = 'starting_bosses_kalphite_queen_rank',
    STARTING_BOSSES_KALPHITE_QUEEN_SCORE = 'starting_bosses_kalphite_queen_score',
    STARTING_BOSSES_CHAOS_ELEMENTAL_RANK = 'starting_bosses_chaos_elemental_rank',
    STARTING_BOSSES_CHAOS_ELEMENTAL_SCORE = 'starting_bosses_chaos_elemental_score',
    STARTING_BOSSES_CORPOREAL_BEAST_RANK = 'starting_bosses_corporeal_beast_rank',
    STARTING_BOSSES_CORPOREAL_BEAST_SCORE = 'starting_bosses_corporeal_beast_score',
    STARTING_BOSSES_DAGANNOTH_PRIME_RANK = 'starting_bosses_dagannoth_prime_rank',
    STARTING_BOSSES_DAGANNOTH_PRIME_SCORE = 'starting_bosses_dagannoth_prime_score',
    STARTING_BOSSES_ALCHEMICAL_HYDRA_RANK = 'starting_bosses_alchemical_hydra_rank',
    STARTING_BOSSES_ALCHEMICAL_HYDRA_SCORE = 'starting_bosses_alchemical_hydra_score',
    STARTING_BOSSES_GENERAL_GRAARDOR_RANK = 'starting_bosses_general_graardor_rank',
    STARTING_BOSSES_GENERAL_GRAARDOR_SCORE = 'starting_bosses_general_graardor_score',
    STARTING_BOSSES_KRIL_TSUTSAROTH_RANK = 'starting_bosses_kril_tsutsaroth_rank',
    STARTING_BOSSES_KRIL_TSUTSAROTH_SCORE = 'starting_bosses_kril_tsutsaroth_score',
    STARTING_BOSSES_THEATRE_OF_BLOOD_RANK = 'starting_bosses_theatre_of_blood_rank',
    STARTING_BOSSES_THEATRE_OF_BLOOD_SCORE = 'starting_bosses_theatre_of_blood_score',
    STARTING_BOSSES_CHAMBERS_OF_XERIC_RANK = 'starting_bosses_chambers_of_xeric_rank',
    STARTING_BOSSES_CHAMBERS_OF_XERIC_SCORE = 'starting_bosses_chambers_of_xeric_score',
    STARTING_BOSSES_COMMANDER_ZILYANA_RANK = 'starting_bosses_commander_zilyana_rank',
    STARTING_BOSSES_COMMANDER_ZILYANA_SCORE = 'starting_bosses_commander_zilyana_score',
    STARTING_BOSSES_DAGANNOTH_SUPREME_RANK = 'starting_bosses_dagannoth_supreme_rank',
    STARTING_BOSSES_DAGANNOTH_SUPREME_SCORE = 'starting_bosses_dagannoth_supreme_score',
    STARTING_BOSSES_KING_BLACK_DRAGON_RANK = 'starting_bosses_king_black_dragon_rank',
    STARTING_BOSSES_KING_BLACK_DRAGON_SCORE = 'starting_bosses_king_black_dragon_score',
    STARTING_BOSSES_CRAZY_ARCHAEOLOGIST_RANK = 'starting_bosses_crazy_archaeologist_rank',
    STARTING_BOSSES_CRAZY_ARCHAEOLOGIST_SCORE = 'starting_bosses_crazy_archaeologist_score',
    STARTING_BOSSES_GROTESQUE_GUARDIANS_RANK = 'starting_bosses_grotesque_guardians_rank',
    STARTING_BOSSES_GROTESQUE_GUARDIANS_SCORE = 'starting_bosses_grotesque_guardians_score',
    STARTING_BOSSES_DERANGED_ARCHAEOLOGIST_RANK = 'starting_bosses_deranged_archaeologist_rank',
    STARTING_BOSSES_DERANGED_ARCHAEOLOGIST_SCORE = 'starting_bosses_deranged_archaeologist_score',
    STARTING_BOSSES_THE_CORRUPTED_GAUNTLET_RANK = 'starting_bosses_the_corrupted_gauntlet_rank',
    STARTING_BOSSES_THE_CORRUPTED_GAUNTLET_SCORE = 'starting_bosses_the_corrupted_gauntlet_score',
    STARTING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK = 'starting_bosses_thermonuclear_smoke_devil_rank',
    STARTING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE = 'starting_bosses_thermonuclear_smoke_devil_score',
    STARTING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK = 'starting_bosses_chambers_of_xeric_challenge_mode_rank',
    STARTING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE = 'starting_bosses_chambers_of_xeric_challenge_mode_score',
    STARTING_SKILLS_MAGIC_XP = 'starting_skills_magic_xp',
    STARTING_SKILLS_MAGIC_RANK = 'starting_skills_magic_rank',
    STARTING_SKILLS_MAGIC_LEVEL = 'starting_skills_magic_level',
    STARTING_SKILLS_ATTACK_XP = 'starting_skills_attack_xp',
    STARTING_SKILLS_ATTACK_RANK = 'starting_skills_attack_rank',
    STARTING_SKILLS_ATTACK_LEVEL = 'starting_skills_attack_level',
    STARTING_SKILLS_HUNTER_XP = 'starting_skills_hunter_xp',
    STARTING_SKILLS_HUNTER_RANK = 'starting_skills_hunter_rank',
    STARTING_SKILLS_HUNTER_LEVEL = 'starting_skills_hunter_level',
    STARTING_SKILLS_MINING_XP = 'starting_skills_mining_xp',
    STARTING_SKILLS_MINING_RANK = 'starting_skills_mining_rank',
    STARTING_SKILLS_MINING_LEVEL = 'starting_skills_mining_level',
    STARTING_SKILLS_PRAYER_XP = 'starting_skills_prayer_xp',
    STARTING_SKILLS_PRAYER_RANK = 'starting_skills_prayer_rank',
    STARTING_SKILLS_PRAYER_LEVEL = 'starting_skills_prayer_level',
    STARTING_SKILLS_RANGED_XP = 'starting_skills_ranged_xp',
    STARTING_SKILLS_RANGED_RANK = 'starting_skills_ranged_rank',
    STARTING_SKILLS_RANGED_LEVEL = 'starting_skills_ranged_level',
    STARTING_SKILLS_SLAYER_XP = 'starting_skills_slayer_xp',
    STARTING_SKILLS_SLAYER_RANK = 'starting_skills_slayer_rank',
    STARTING_SKILLS_SLAYER_LEVEL = 'starting_skills_slayer_level',
    STARTING_SKILLS_AGILITY_XP = 'starting_skills_agility_xp',
    STARTING_SKILLS_AGILITY_RANK = 'starting_skills_agility_rank',
    STARTING_SKILLS_AGILITY_LEVEL = 'starting_skills_agility_level',
    STARTING_SKILLS_COOKING_XP = 'starting_skills_cooking_xp',
    STARTING_SKILLS_COOKING_RANK = 'starting_skills_cooking_rank',
    STARTING_SKILLS_COOKING_LEVEL = 'starting_skills_cooking_level',
    STARTING_SKILLS_DEFENCE_XP = 'starting_skills_defence_xp',
    STARTING_SKILLS_DEFENCE_RANK = 'starting_skills_defence_rank',
    STARTING_SKILLS_DEFENCE_LEVEL = 'starting_skills_defence_level',
    STARTING_SKILLS_FARMING_XP = 'starting_skills_farming_xp',
    STARTING_SKILLS_FARMING_RANK = 'starting_skills_farming_rank',
    STARTING_SKILLS_FARMING_LEVEL = 'starting_skills_farming_level',
    STARTING_SKILLS_FISHING_XP = 'starting_skills_fishing_xp',
    STARTING_SKILLS_FISHING_RANK = 'starting_skills_fishing_rank',
    STARTING_SKILLS_FISHING_LEVEL = 'starting_skills_fishing_level',
    STARTING_SKILLS_OVERALL_XP = 'starting_skills_overall_xp',
    STARTING_SKILLS_OVERALL_RANK = 'starting_skills_overall_rank',
    STARTING_SKILLS_OVERALL_LEVEL = 'starting_skills_overall_level',
    STARTING_SKILLS_CRAFTING_XP = 'starting_skills_crafting_xp',
    STARTING_SKILLS_CRAFTING_RANK = 'starting_skills_crafting_rank',
    STARTING_SKILLS_CRAFTING_LEVEL = 'starting_skills_crafting_level',
    STARTING_SKILLS_HERBLORE_XP = 'starting_skills_herblore_xp',
    STARTING_SKILLS_HERBLORE_RANK = 'starting_skills_herblore_rank',
    STARTING_SKILLS_HERBLORE_LEVEL = 'starting_skills_herblore_level',
    STARTING_SKILLS_SMITHING_XP = 'starting_skills_smithing_xp',
    STARTING_SKILLS_SMITHING_RANK = 'starting_skills_smithing_rank',
    STARTING_SKILLS_SMITHING_LEVEL = 'starting_skills_smithing_level',
    STARTING_SKILLS_STRENGTH_XP = 'starting_skills_strength_xp',
    STARTING_SKILLS_STRENGTH_RANK = 'starting_skills_strength_rank',
    STARTING_SKILLS_STRENGTH_LEVEL = 'starting_skills_strength_level',
    STARTING_SKILLS_THIEVING_XP = 'starting_skills_thieving_xp',
    STARTING_SKILLS_THIEVING_RANK = 'starting_skills_thieving_rank',
    STARTING_SKILLS_THIEVING_LEVEL = 'starting_skills_thieving_level',
    STARTING_SKILLS_FLETCHING_XP = 'starting_skills_fletching_xp',
    STARTING_SKILLS_FLETCHING_RANK = 'starting_skills_fletching_rank',
    STARTING_SKILLS_FLETCHING_LEVEL = 'starting_skills_fletching_level',
    STARTING_SKILLS_HITPOINTS_XP = 'starting_skills_hitpoints_xp',
    STARTING_SKILLS_HITPOINTS_RANK = 'starting_skills_hitpoints_rank',
    STARTING_SKILLS_HITPOINTS_LEVEL = 'starting_skills_hitpoints_level',
    STARTING_SKILLS_RUNECRAFT_XP = 'starting_skills_runecraft_xp',
    STARTING_SKILLS_RUNECRAFT_RANK = 'starting_skills_runecraft_rank',
    STARTING_SKILLS_RUNECRAFT_LEVEL = 'starting_skills_runecraft_level',
    STARTING_SKILLS_FIREMAKING_XP = 'starting_skills_firemaking_xp',
    STARTING_SKILLS_FIREMAKING_RANK = 'starting_skills_firemaking_rank',
    STARTING_SKILLS_FIREMAKING_LEVEL = 'starting_skills_firemaking_level',
    STARTING_SKILLS_WOODCUTTING_XP = 'starting_skills_woodcutting_xp',
    STARTING_SKILLS_WOODCUTTING_RANK = 'starting_skills_woodcutting_rank',
    STARTING_SKILLS_WOODCUTTING_LEVEL = 'starting_skills_woodcutting_level',
    STARTING_SKILLS_CONSTRUCTION_XP = 'starting_skills_construction_xp',
    STARTING_SKILLS_CONSTRUCTION_RANK = 'starting_skills_construction_rank',
    STARTING_SKILLS_CONSTRUCTION_LEVEL = 'starting_skills_construction_level',
}

const createTableAccountStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.ACCOUNT}(`
    + `${ACCOUNT_COLUMNS.ID}                                                         SERIAL PRIMARY KEY `
    + `FOREIGN KEY (${ACCOUNT_COLUMNS.FK_PARTICIPANT_ID})                            REFERENCES ${TABLES.PARTICIPANTS}(${PARTICIPANT_COLUMNS.ID}) `
    + `${ACCOUNT_COLUMNS.RSN}                                                        VARCHAR(15) NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BH_ROGUE_RANK}                                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BH_ROGUE_SCORE}                                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BH_HUNTER_RANK}                                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BH_HUNTER_SCORE}                                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_LMS_RANK}                                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_LMS_SCORE}                                           BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_ALL_RANK}                                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_ALL_SCORE}                                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_EASY_RANK}                                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_EASY_SCORE}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_HARD_RANK}                                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_HARD_SCORE}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_ELITE_RANK}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_ELITE_SCORE}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_MASTER_RANK}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_MASTER_SCORE}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_MEDIUM_RANK}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_MEDIUM_SCORE}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_BEGINNER_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_CLUES_BEGINNER_SCORE}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_OBOR_RANK}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_OBOR_SCORE}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_MIMIC_RANK}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_MIMIC_SCORE}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KRAKEN_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KRAKEN_SCORE}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_ZULRAH_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_ZULRAH_SCORE}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_HESPORI_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_HESPORI_SCORE}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_SCORPIA_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_SCORPIA_SCORE}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_SKOTIZO_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_SKOTIZO_SCORE}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_VETION_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_VETION_SCORE}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_VORKATH_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_VORKATH_SCORE}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_ZALCANO_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_ZALCANO_SCORE}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CALLISTO_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CALLISTO_SCORE}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CERBERUS_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CERBERUS_SCORE}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_BRYOPHYTA_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_BRYOPHYTA_SCORE}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KREEARRA_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KREEARRA_SCORE}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_SARACHNIS_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_SARACHNIS_SCORE}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_TZKALZUK_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_TZKALZUK_SCORE}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_TZTOKJAD_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_TZTOKJAD_SCORE}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_VENENATIS_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_VENENATIS_SCORE}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_GIANT_MOLE_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_GIANT_MOLE_SCORE}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_WINTERTODT_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_WINTERTODT_SCORE}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_ABYSSAL_SIRE_RANK}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_ABYSSAL_SIRE_SCORE}                           BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_THE_GAUNTLET_RANK}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_THE_GAUNTLET_SCORE}                           BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAOS_FANATIC_RANK}                           BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAOS_FANATIC_SCORE}                          BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_REX_RANK}                           BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_REX_SCORE}                          BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_BARROWS_CHESTS_RANK}                          BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_BARROWS_CHESTS_SCORE}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KALPHITE_QUEEN_RANK}                          BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KALPHITE_QUEEN_SCORE}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAOS_ELEMENTAL_RANK}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAOS_ELEMENTAL_SCORE}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CORPOREAL_BEAST_RANK}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CORPOREAL_BEAST_SCORE}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_PRIME_RANK}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_PRIME_SCORE}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_ALCHEMICAL_HYDRA_RANK}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_ALCHEMICAL_HYDRA_SCORE}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_GENERAL_GRAARDOR_RANK}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_GENERAL_GRAARDOR_SCORE}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KRIL_TSUTSAROTH_RANK}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KRIL_TSUTSAROTH_SCORE}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_THEATRE_OF_BLOOD_RANK}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_THEATRE_OF_BLOOD_SCORE}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAMBERS_OF_XERIC_RANK}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAMBERS_OF_XERIC_SCORE}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_COMMANDER_ZILYANA_RANK}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_COMMANDER_ZILYANA_SCORE}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_SUPREME_RANK}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_SUPREME_SCORE}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KING_BLACK_DRAGON_RANK}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_KING_BLACK_DRAGON_SCORE}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CRAZY_ARCHAEOLOGIST_RANK}                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CRAZY_ARCHAEOLOGIST_SCORE}                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_GROTESQUE_GUARDIANS_RANK}                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_GROTESQUE_GUARDIANS_SCORE}                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_DERANGED_ARCHAEOLOGIST_RANK}                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_DERANGED_ARCHAEOLOGIST_SCORE}                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_THE_CORRUPTED_GAUNTLET_RANK}                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_THE_CORRUPTED_GAUNTLET_SCORE}                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK}               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE}              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK}        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE}       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_MAGIC_XP}                                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_MAGIC_RANK}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_MAGIC_LEVEL}                                  SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_ATTACK_XP}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_ATTACK_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_ATTACK_LEVEL}                                 SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_HUNTER_XP}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_HUNTER_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_HUNTER_LEVEL}                                 SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_MINING_XP}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_MINING_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_MINING_LEVEL}                                 SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_PRAYER_XP}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_PRAYER_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_PRAYER_LEVEL}                                 SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_RANGED_XP}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_RANGED_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_RANGED_LEVEL}                                 SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_SLAYER_XP}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_SLAYER_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_SLAYER_LEVEL}                                 SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_AGILITY_XP}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_AGILITY_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_AGILITY_LEVEL}                                SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_COOKING_XP}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_COOKING_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_COOKING_LEVEL}                                SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_DEFENCE_XP}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_DEFENCE_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_DEFENCE_LEVEL}                                SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FARMING_XP}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FARMING_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FARMING_LEVEL}                                SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FISHING_XP}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FISHING_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FISHING_LEVEL}                                SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_OVERALL_XP}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_OVERALL_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_OVERALL_LEVEL}                                SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_CRAFTING_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_CRAFTING_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_CRAFTING_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_HERBLORE_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_HERBLORE_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_HERBLORE_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_SMITHING_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_SMITHING_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_SMITHING_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_STRENGTH_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_STRENGTH_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_STRENGTH_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_THIEVING_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_THIEVING_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_THIEVING_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FLETCHING_XP}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FLETCHING_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FLETCHING_LEVEL}                              SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_HITPOINTS_XP}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_HITPOINTS_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_HITPOINTS_LEVEL}                              SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_RUNECRAFT_XP}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_RUNECRAFT_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_RUNECRAFT_LEVEL}                              SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FIREMAKING_XP}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FIREMAKING_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_FIREMAKING_LEVEL}                             SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_WOODCUTTING_XP}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_WOODCUTTING_RANK}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_WOODCUTTING_LEVEL}                            SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_CONSTRUCTION_XP}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_CONSTRUCTION_RANK}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.ENDING_SKILLS_CONSTRUCTION_LEVEL}                           SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BH_ROGUE_RANK}                                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BH_ROGUE_SCORE}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BH_HUNTER_RANK}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BH_HUNTER_SCORE}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_LMS_RANK}                                          BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_LMS_SCORE}                                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_ALL_RANK}                                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_ALL_SCORE}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_EASY_RANK}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_EASY_SCORE}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_HARD_RANK}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_HARD_SCORE}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_ELITE_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_ELITE_SCORE}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_MASTER_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_MASTER_SCORE}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_MEDIUM_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_MEDIUM_SCORE}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_BEGINNER_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_CLUES_BEGINNER_SCORE}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_OBOR_RANK}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_OBOR_SCORE}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_MIMIC_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_MIMIC_SCORE}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KRAKEN_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KRAKEN_SCORE}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_ZULRAH_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_ZULRAH_SCORE}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_HESPORI_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_HESPORI_SCORE}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_SCORPIA_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_SCORPIA_SCORE}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_SKOTIZO_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_SKOTIZO_SCORE}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_VETION_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_VETION_SCORE}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_VORKATH_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_VORKATH_SCORE}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_ZALCANO_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_ZALCANO_SCORE}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CALLISTO_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CALLISTO_SCORE}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CERBERUS_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CERBERUS_SCORE}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_BRYOPHYTA_RANK}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_BRYOPHYTA_SCORE}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KREEARRA_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KREEARRA_SCORE}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_SARACHNIS_RANK}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_SARACHNIS_SCORE}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_TZKALZUK_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_TZKALZUK_SCORE}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_TZTOKJAD_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_TZTOKJAD_SCORE}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_VENENATIS_RANK}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_VENENATIS_SCORE}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_GIANT_MOLE_RANK}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_GIANT_MOLE_SCORE}                           BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_WINTERTODT_RANK}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_WINTERTODT_SCORE}                           BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_ABYSSAL_SIRE_RANK}                          BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_ABYSSAL_SIRE_SCORE}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_THE_GAUNTLET_RANK}                          BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_THE_GAUNTLET_SCORE}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAOS_FANATIC_RANK}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAOS_FANATIC_SCORE}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_REX_RANK}                         BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_REX_SCORE}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_BARROWS_CHESTS_RANK}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_BARROWS_CHESTS_SCORE}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KALPHITE_QUEEN_RANK}                        BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KALPHITE_QUEEN_SCORE}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAOS_ELEMENTAL_RANK}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAOS_ELEMENTAL_SCORE}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CORPOREAL_BEAST_RANK}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CORPOREAL_BEAST_SCORE}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_PRIME_RANK}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_PRIME_SCORE}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_ALCHEMICAL_HYDRA_RANK}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_ALCHEMICAL_HYDRA_SCORE}                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_GENERAL_GRAARDOR_RANK}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_GENERAL_GRAARDOR_SCORE}                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KRIL_TSUTSAROTH_RANK}                       BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KRIL_TSUTSAROTH_SCORE}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_THEATRE_OF_BLOOD_RANK}                      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_THEATRE_OF_BLOOD_SCORE}                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAMBERS_OF_XERIC_RANK}                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAMBERS_OF_XERIC_SCORE}                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_COMMANDER_ZILYANA_RANK}                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_COMMANDER_ZILYANA_SCORE}                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_SUPREME_RANK}                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_SUPREME_SCORE}                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KING_BLACK_DRAGON_RANK}                     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_KING_BLACK_DRAGON_SCORE}                    BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CRAZY_ARCHAEOLOGIST_RANK}                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CRAZY_ARCHAEOLOGIST_SCORE}                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_GROTESQUE_GUARDIANS_RANK}                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_GROTESQUE_GUARDIANS_SCORE}                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_DERANGED_ARCHAEOLOGIST_RANK}                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_DERANGED_ARCHAEOLOGIST_SCORE}               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_THE_CORRUPTED_GAUNTLET_RANK}                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_THE_CORRUPTED_GAUNTLET_SCORE}               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK}             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE}            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK}      BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE}     BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_MAGIC_XP}                                   BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_MAGIC_RANK}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_MAGIC_LEVEL}                                SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_ATTACK_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_ATTACK_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_ATTACK_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_HUNTER_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_HUNTER_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_HUNTER_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_MINING_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_MINING_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_MINING_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_PRAYER_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_PRAYER_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_PRAYER_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_RANGED_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_RANGED_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_RANGED_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_SLAYER_XP}                                  BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_SLAYER_RANK}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_SLAYER_LEVEL}                               SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_AGILITY_XP}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_AGILITY_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_AGILITY_LEVEL}                              SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_COOKING_XP}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_COOKING_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_COOKING_LEVEL}                              SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_DEFENCE_XP}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_DEFENCE_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_DEFENCE_LEVEL}                              SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FARMING_XP}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FARMING_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FARMING_LEVEL}                              SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FISHING_XP}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FISHING_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FISHING_LEVEL}                              SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_OVERALL_XP}                                 BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_OVERALL_RANK}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_OVERALL_LEVEL}                              SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_CRAFTING_XP}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_CRAFTING_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_CRAFTING_LEVEL}                             SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_HERBLORE_XP}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_HERBLORE_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_HERBLORE_LEVEL}                             SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_SMITHING_XP}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_SMITHING_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_SMITHING_LEVEL}                             SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_STRENGTH_XP}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_STRENGTH_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_STRENGTH_LEVEL}                             SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_THIEVING_XP}                                BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_THIEVING_RANK}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_THIEVING_LEVEL}                             SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FLETCHING_XP}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FLETCHING_RANK}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FLETCHING_LEVEL}                            SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_HITPOINTS_XP}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_HITPOINTS_RANK}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_HITPOINTS_LEVEL}                            SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_RUNECRAFT_XP}                               BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_RUNECRAFT_RANK}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_RUNECRAFT_LEVEL}                            SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FIREMAKING_XP}                              BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FIREMAKING_RANK}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_FIREMAKING_LEVEL}                           SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_WOODCUTTING_XP}                             BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_WOODCUTTING_RANK}                           BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_WOODCUTTING_LEVEL}                          SMALLINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_CONSTRUCTION_XP}                            BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_CONSTRUCTION_RANK}                          BIGINT  NOT NULL, `
    + `${ACCOUNT_COLUMNS.STARTING_SKILLS_CONSTRUCTION_LEVEL}                         SMALLINT  NOT NULL`
    + ')';

export const createTableAccountStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Participant Accounts Table',
    text: createTableAccountStr,
});

const upsertAccountStr: string = `INSERT INTO ${TABLES.ACCOUNT}(`
    + 'fk_participant_id, '
    + 'rsn, '
    + 'ending_bh_rogue_rank, '
    + 'ending_bh_rogue_score, '
    + 'ending_bh_hunter_rank, '
    + 'ending_bh_hunter_score, '
    + 'ending_lms_rank, '
    + 'ending_lms_score, '
    + 'ending_clues_all_rank, '
    + 'ending_clues_all_score, '
    + 'ending_clues_easy_rank, '
    + 'ending_clues_easy_score, '
    + 'ending_clues_hard_rank, '
    + 'ending_clues_hard_score, '
    + 'ending_clues_elite_rank, '
    + 'ending_clues_elite_score, '
    + 'ending_clues_master_rank, '
    + 'ending_clues_master_score, '
    + 'ending_clues_medium_rank, '
    + 'ending_clues_medium_score, '
    + 'ending_clues_beginner_rank, '
    + 'ending_clues_beginner_score, '
    + 'ending_bosses_Obor_rank, '
    + 'ending_bosses_Obor_score, '
    + 'ending_bosses_Mimic_rank, '
    + 'ending_bosses_Mimic_score, '
    + 'ending_bosses_Kraken_rank, '
    + 'ending_bosses_Kraken_score, '
    + 'ending_bosses_Zulrah_rank, '
    + 'ending_bosses_Zulrah_score, '
    + 'ending_bosses_Hespori_rank, '
    + 'ending_bosses_Hespori_score, '
    + 'ending_bosses_Scorpia_rank, '
    + 'ending_bosses_Scorpia_score, '
    + 'ending_bosses_Skotizo_rank, '
    + 'ending_bosses_Skotizo_score, '
    + 'ending_bosses_Vetion_rank, '
    + 'ending_bosses_Vetion_score, '
    + 'ending_bosses_Vorkath_rank, '
    + 'ending_bosses_Vorkath_score, '
    + 'ending_bosses_Zalcano_rank, '
    + 'ending_bosses_Zalcano_score, '
    + 'ending_bosses_Callisto_rank, '
    + 'ending_bosses_Callisto_score, '
    + 'ending_bosses_Cerberus_rank, '
    + 'ending_bosses_Cerberus_score, '
    + 'ending_bosses_Bryophyta_rank, '
    + 'ending_bosses_Bryophyta_score, '
    + 'ending_bosses_KreeArra_rank, '
    + 'ending_bosses_KreeArra_score, '
    + 'ending_bosses_Sarachnis_rank, '
    + 'ending_bosses_Sarachnis_score, '
    + 'ending_bosses_TzKalZuk_rank, '
    + 'ending_bosses_TzKalZuk_score, '
    + 'ending_bosses_TzTokJad_rank, '
    + 'ending_bosses_TzTokJad_score, '
    + 'ending_bosses_Venenatis_rank, '
    + 'ending_bosses_Venenatis_score, '
    + 'ending_bosses_Giant_Mole_rank, '
    + 'ending_bosses_Giant_Mole_score, '
    + 'ending_bosses_Wintertodt_rank, '
    + 'ending_bosses_Wintertodt_score, '
    + 'ending_bosses_Abyssal_Sire_rank, '
    + 'ending_bosses_Abyssal_Sire_score, '
    + 'ending_bosses_The_Gauntlet_rank, '
    + 'ending_bosses_The_Gauntlet_score, '
    + 'ending_bosses_Chaos_Fanatic_rank, '
    + 'ending_bosses_Chaos_Fanatic_score, '
    + 'ending_bosses_Dagannoth_Rex_rank, '
    + 'ending_bosses_Dagannoth_Rex_score, '
    + 'ending_bosses_Barrows_Chests_rank, '
    + 'ending_bosses_Barrows_Chests_score, '
    + 'ending_bosses_Kalphite_Queen_rank, '
    + 'ending_bosses_Kalphite_Queen_score, '
    + 'ending_bosses_Chaos_Elemental_rank, '
    + 'ending_bosses_Chaos_Elemental_score, '
    + 'ending_bosses_Corporeal_Beast_rank, '
    + 'ending_bosses_Corporeal_Beast_score, '
    + 'ending_bosses_Dagannoth_Prime_rank, '
    + 'ending_bosses_Dagannoth_Prime_score, '
    + 'ending_bosses_Alchemical_Hydra_rank, '
    + 'ending_bosses_Alchemical_Hydra_score, '
    + 'ending_bosses_General_Graardor_rank, '
    + 'ending_bosses_General_Graardor_score, '
    + 'ending_bosses_Kril_Tsutsaroth_rank, '
    + 'ending_bosses_Kril_Tsutsaroth_score, '
    + 'ending_bosses_Theatre_of_Blood_rank, '
    + 'ending_bosses_Theatre_of_Blood_score, '
    + 'ending_bosses_Chambers_of_Xeric_rank, '
    + 'ending_bosses_Chambers_of_Xeric_score, '
    + 'ending_bosses_Commander_Zilyana_rank, '
    + 'ending_bosses_Commander_Zilyana_score, '
    + 'ending_bosses_Dagannoth_Supreme_rank, '
    + 'ending_bosses_Dagannoth_Supreme_score, '
    + 'ending_bosses_King_Black_Dragon_rank, '
    + 'ending_bosses_King_Black_Dragon_score, '
    + 'ending_bosses_Crazy_Archaeologist_rank, '
    + 'ending_bosses_Crazy_Archaeologist_score, '
    + 'ending_bosses_Grotesque_Guardians_rank, '
    + 'ending_bosses_Grotesque_Guardians_score, '
    + 'ending_bosses_Deranged_Archaeologist_rank, '
    + 'ending_bosses_Deranged_Archaeologist_score, '
    + 'ending_bosses_The_Corrupted_Gauntlet_rank, '
    + 'ending_bosses_The_Corrupted_Gauntlet_score, '
    + 'ending_bosses_Thermonuclear_Smoke_Devil_rank, '
    + 'ending_bosses_Thermonuclear_Smoke_Devil_score, '
    + 'ending_bosses_Chambers_of_Xeric_Challenge_Mode_rank, '
    + 'ending_bosses_Chambers_of_Xeric_Challenge_Mode_score, '
    + 'ending_skills_magic_xp, '
    + 'ending_skills_magic_rank, '
    + 'ending_skills_magic_level, '
    + 'ending_skills_attack_xp, '
    + 'ending_skills_attack_rank, '
    + 'ending_skills_attack_level, '
    + 'ending_skills_hunter_xp, '
    + 'ending_skills_hunter_rank, '
    + 'ending_skills_hunter_level, '
    + 'ending_skills_mining_xp, '
    + 'ending_skills_mining_rank, '
    + 'ending_skills_mining_level, '
    + 'ending_skills_prayer_xp, '
    + 'ending_skills_prayer_rank, '
    + 'ending_skills_prayer_level, '
    + 'ending_skills_ranged_xp, '
    + 'ending_skills_ranged_rank, '
    + 'ending_skills_ranged_level, '
    + 'ending_skills_slayer_xp, '
    + 'ending_skills_slayer_rank, '
    + 'ending_skills_slayer_level, '
    + 'ending_skills_agility_xp, '
    + 'ending_skills_agility_rank, '
    + 'ending_skills_agility_level, '
    + 'ending_skills_cooking_xp, '
    + 'ending_skills_cooking_rank, '
    + 'ending_skills_cooking_level, '
    + 'ending_skills_defence_xp, '
    + 'ending_skills_defence_rank, '
    + 'ending_skills_defence_level, '
    + 'ending_skills_farming_xp, '
    + 'ending_skills_farming_rank, '
    + 'ending_skills_farming_level, '
    + 'ending_skills_fishing_xp, '
    + 'ending_skills_fishing_rank, '
    + 'ending_skills_fishing_level, '
    + 'ending_skills_overall_xp, '
    + 'ending_skills_overall_rank, '
    + 'ending_skills_overall_level, '
    + 'ending_skills_crafting_xp, '
    + 'ending_skills_crafting_rank, '
    + 'ending_skills_crafting_level, '
    + 'ending_skills_herblore_xp, '
    + 'ending_skills_herblore_rank, '
    + 'ending_skills_herblore_level, '
    + 'ending_skills_smithing_xp, '
    + 'ending_skills_smithing_rank, '
    + 'ending_skills_smithing_level, '
    + 'ending_skills_strength_xp, '
    + 'ending_skills_strength_rank, '
    + 'ending_skills_strength_level, '
    + 'ending_skills_thieving_xp, '
    + 'ending_skills_thieving_rank, '
    + 'ending_skills_thieving_level, '
    + 'ending_skills_fletching_xp, '
    + 'ending_skills_fletching_rank, '
    + 'ending_skills_fletching_level, '
    + 'ending_skills_hitpoints_xp, '
    + 'ending_skills_hitpoints_rank, '
    + 'ending_skills_hitpoints_level, '
    + 'ending_skills_runecraft_xp, '
    + 'ending_skills_runecraft_rank, '
    + 'ending_skills_runecraft_level, '
    + 'ending_skills_firemaking_xp, '
    + 'ending_skills_firemaking_rank, '
    + 'ending_skills_firemaking_level, '
    + 'ending_skills_woodcutting_xp, '
    + 'ending_skills_woodcutting_rank, '
    + 'ending_skills_woodcutting_level, '
    + 'ending_skills_construction_xp, '
    + 'ending_skills_construction_rank, '
    + 'ending_skills_construction_level, '
    + 'starting_bh_rogue_rank, '
    + 'starting_bh_rogue_score, '
    + 'starting_bh_hunter_rank, '
    + 'starting_bh_hunter_score, '
    + 'starting_lms_rank, '
    + 'starting_lms_score, '
    + 'starting_clues_all_rank, '
    + 'starting_clues_all_score, '
    + 'starting_clues_easy_rank, '
    + 'starting_clues_easy_score, '
    + 'starting_clues_hard_rank, '
    + 'starting_clues_hard_score, '
    + 'starting_clues_elite_rank, '
    + 'starting_clues_elite_score, '
    + 'starting_clues_master_rank, '
    + 'starting_clues_master_score, '
    + 'starting_clues_medium_rank, '
    + 'starting_clues_medium_score, '
    + 'starting_clues_beginner_rank, '
    + 'starting_clues_beginner_score, '
    + 'starting_bosses_Obor_rank, '
    + 'starting_bosses_Obor_score, '
    + 'starting_bosses_Mimic_rank, '
    + 'starting_bosses_Mimic_score, '
    + 'starting_bosses_Kraken_rank, '
    + 'starting_bosses_Kraken_score, '
    + 'starting_bosses_Zulrah_rank, '
    + 'starting_bosses_Zulrah_score, '
    + 'starting_bosses_Hespori_rank, '
    + 'starting_bosses_Hespori_score, '
    + 'starting_bosses_Scorpia_rank, '
    + 'starting_bosses_Scorpia_score, '
    + 'starting_bosses_Skotizo_rank, '
    + 'starting_bosses_Skotizo_score, '
    + 'starting_bosses_Vetion_rank, '
    + 'starting_bosses_Vetion_score, '
    + 'starting_bosses_Vorkath_rank, '
    + 'starting_bosses_Vorkath_score, '
    + 'starting_bosses_Zalcano_rank, '
    + 'starting_bosses_Zalcano_score, '
    + 'starting_bosses_Callisto_rank, '
    + 'starting_bosses_Callisto_score, '
    + 'starting_bosses_Cerberus_rank, '
    + 'starting_bosses_Cerberus_score, '
    + 'starting_bosses_Bryophyta_rank, '
    + 'starting_bosses_Bryophyta_score, '
    + 'starting_bosses_KreeArra_rank, '
    + 'starting_bosses_KreeArra_score, '
    + 'starting_bosses_Sarachnis_rank, '
    + 'starting_bosses_Sarachnis_score, '
    + 'starting_bosses_TzKalZuk_rank, '
    + 'starting_bosses_TzKalZuk_score, '
    + 'starting_bosses_TzTokJad_rank, '
    + 'starting_bosses_TzTokJad_score, '
    + 'starting_bosses_Venenatis_rank, '
    + 'starting_bosses_Venenatis_score, '
    + 'starting_bosses_Giant_Mole_rank, '
    + 'starting_bosses_Giant_Mole_score, '
    + 'starting_bosses_Wintertodt_rank, '
    + 'starting_bosses_Wintertodt_score, '
    + 'starting_bosses_Abyssal_Sire_rank, '
    + 'starting_bosses_Abyssal_Sire_score, '
    + 'starting_bosses_The_Gauntlet_rank, '
    + 'starting_bosses_The_Gauntlet_score, '
    + 'starting_bosses_Chaos_Fanatic_rank, '
    + 'starting_bosses_Chaos_Fanatic_score, '
    + 'starting_bosses_Dagannoth_Rex_rank, '
    + 'starting_bosses_Dagannoth_Rex_score, '
    + 'starting_bosses_Barrows_Chests_rank, '
    + 'starting_bosses_Barrows_Chests_score, '
    + 'starting_bosses_Kalphite_Queen_rank, '
    + 'starting_bosses_Kalphite_Queen_score, '
    + 'starting_bosses_Chaos_Elemental_rank, '
    + 'starting_bosses_Chaos_Elemental_score, '
    + 'starting_bosses_Corporeal_Beast_rank, '
    + 'starting_bosses_Corporeal_Beast_score, '
    + 'starting_bosses_Dagannoth_Prime_rank, '
    + 'starting_bosses_Dagannoth_Prime_score, '
    + 'starting_bosses_Alchemical_Hydra_rank, '
    + 'starting_bosses_Alchemical_Hydra_score, '
    + 'starting_bosses_General_Graardor_rank, '
    + 'starting_bosses_General_Graardor_score, '
    + 'starting_bosses_Kril_Tsutsaroth_rank, '
    + 'starting_bosses_Kril_Tsutsaroth_score, '
    + 'starting_bosses_Theatre_of_Blood_rank, '
    + 'starting_bosses_Theatre_of_Blood_score, '
    + 'starting_bosses_Chambers_of_Xeric_rank, '
    + 'starting_bosses_Chambers_of_Xeric_score, '
    + 'starting_bosses_Commander_Zilyana_rank, '
    + 'starting_bosses_Commander_Zilyana_score, '
    + 'starting_bosses_Dagannoth_Supreme_rank, '
    + 'starting_bosses_Dagannoth_Supreme_score, '
    + 'starting_bosses_King_Black_Dragon_rank, '
    + 'starting_bosses_King_Black_Dragon_score, '
    + 'starting_bosses_Crazy_Archaeologist_rank, '
    + 'starting_bosses_Crazy_Archaeologist_score, '
    + 'starting_bosses_Grotesque_Guardians_rank, '
    + 'starting_bosses_Grotesque_Guardians_score, '
    + 'starting_bosses_Deranged_Archaeologist_rank, '
    + 'starting_bosses_Deranged_Archaeologist_score, '
    + 'starting_bosses_The_Corrupted_Gauntlet_rank, '
    + 'starting_bosses_The_Corrupted_Gauntlet_score, '
    + 'starting_bosses_Thermonuclear_Smoke_Devil_rank, '
    + 'starting_bosses_Thermonuclear_Smoke_Devil_score, '
    + 'starting_bosses_Chambers_of_Xeric_Challenge_Mode_rank, '
    + 'starting_bosses_Chambers_of_Xeric_Challenge_Mode_score, '
    + 'starting_skills_magic_xp, '
    + 'starting_skills_magic_rank, '
    + 'starting_skills_magic_level, '
    + 'starting_skills_attack_xp, '
    + 'starting_skills_attack_rank, '
    + 'starting_skills_attack_level, '
    + 'starting_skills_hunter_xp, '
    + 'starting_skills_hunter_rank, '
    + 'starting_skills_hunter_level, '
    + 'starting_skills_mining_xp, '
    + 'starting_skills_mining_rank, '
    + 'starting_skills_mining_level, '
    + 'starting_skills_prayer_xp, '
    + 'starting_skills_prayer_rank, '
    + 'starting_skills_prayer_level, '
    + 'starting_skills_ranged_xp, '
    + 'starting_skills_ranged_rank, '
    + 'starting_skills_ranged_level, '
    + 'starting_skills_slayer_xp, '
    + 'starting_skills_slayer_rank, '
    + 'starting_skills_slayer_level, '
    + 'starting_skills_agility_xp, '
    + 'starting_skills_agility_rank, '
    + 'starting_skills_agility_level, '
    + 'starting_skills_cooking_xp, '
    + 'starting_skills_cooking_rank, '
    + 'starting_skills_cooking_level, '
    + 'starting_skills_defence_xp, '
    + 'starting_skills_defence_rank, '
    + 'starting_skills_defence_level, '
    + 'starting_skills_farming_xp, '
    + 'starting_skills_farming_rank, '
    + 'starting_skills_farming_level, '
    + 'starting_skills_fishing_xp, '
    + 'starting_skills_fishing_rank, '
    + 'starting_skills_fishing_level, '
    + 'starting_skills_overall_xp, '
    + 'starting_skills_overall_rank, '
    + 'starting_skills_overall_level, '
    + 'starting_skills_crafting_xp, '
    + 'starting_skills_crafting_rank, '
    + 'starting_skills_crafting_level, '
    + 'starting_skills_herblore_xp, '
    + 'starting_skills_herblore_rank, '
    + 'starting_skills_herblore_level, '
    + 'starting_skills_smithing_xp, '
    + 'starting_skills_smithing_rank, '
    + 'starting_skills_smithing_level, '
    + 'starting_skills_strength_xp, '
    + 'starting_skills_strength_rank, '
    + 'starting_skills_strength_level, '
    + 'starting_skills_thieving_xp, '
    + 'starting_skills_thieving_rank, '
    + 'starting_skills_thieving_level, '
    + 'starting_skills_fletching_xp, '
    + 'starting_skills_fletching_rank, '
    + 'starting_skills_fletching_level, '
    + 'starting_skills_hitpoints_xp, '
    + 'starting_skills_hitpoints_rank, '
    + 'starting_skills_hitpoints_level, '
    + 'starting_skills_runecraft_xp, '
    + 'starting_skills_runecraft_rank, '
    + 'starting_skills_runecraft_level, '
    + 'starting_skills_firemaking_xp, '
    + 'starting_skills_firemaking_rank, '
    + 'starting_skills_firemaking_level, '
    + 'starting_skills_woodcutting_xp, '
    + 'starting_skills_woodcutting_rank, '
    + 'starting_skills_woodcutting_level, '
    + 'starting_skills_construction_xp, '
    + 'starting_skills_construction_rank, '
    + 'starting_skills_construction_level'
    + ') VALUES ('
    + '$1, '
    + '$2, '
    + '$3, '
    + '$4, '
    + '$5, '
    + '$6, '
    + '$7, '
    + '$8, '
    + '$9, '
    + '$10, '
    + '$11, '
    + '$12, '
    + '$13, '
    + '$14, '
    + '$15, '
    + '$16, '
    + '$17, '
    + '$18, '
    + '$19, '
    + '$20, '
    + '$21, '
    + '$22, '
    + '$23, '
    + '$24, '
    + '$25, '
    + '$26, '
    + '$27, '
    + '$28, '
    + '$29, '
    + '$30, '
    + '$31, '
    + '$32, '
    + '$33, '
    + '$34, '
    + '$35, '
    + '$36, '
    + '$37, '
    + '$38, '
    + '$39, '
    + '$40, '
    + '$41, '
    + '$42, '
    + '$43, '
    + '$44, '
    + '$45, '
    + '$46, '
    + '$47, '
    + '$48, '
    + '$49, '
    + '$50, '
    + '$51, '
    + '$52, '
    + '$53, '
    + '$54, '
    + '$55, '
    + '$56, '
    + '$57, '
    + '$58, '
    + '$59, '
    + '$60, '
    + '$61, '
    + '$62, '
    + '$63, '
    + '$64, '
    + '$65, '
    + '$66, '
    + '$67, '
    + '$68, '
    + '$69, '
    + '$70, '
    + '$71, '
    + '$72, '
    + '$73, '
    + '$74, '
    + '$75, '
    + '$76, '
    + '$77, '
    + '$78, '
    + '$79, '
    + '$80, '
    + '$81, '
    + '$82, '
    + '$83, '
    + '$84, '
    + '$85, '
    + '$86, '
    + '$87, '
    + '$88, '
    + '$89, '
    + '$90, '
    + '$91, '
    + '$92, '
    + '$93, '
    + '$94, '
    + '$95, '
    + '$96, '
    + '$97, '
    + '$98, '
    + '$99, '
    + '$100, '
    + '$101, '
    + '$102, '
    + '$103, '
    + '$104, '
    + '$105, '
    + '$106, '
    + '$107, '
    + '$108, '
    + '$109, '
    + '$110, '
    + '$111, '
    + '$112, '
    + '$113, '
    + '$114, '
    + '$115, '
    + '$116, '
    + '$117, '
    + '$118, '
    + '$119, '
    + '$120, '
    + '$121, '
    + '$122, '
    + '$123, '
    + '$124, '
    + '$125, '
    + '$126, '
    + '$127, '
    + '$128, '
    + '$129, '
    + '$130, '
    + '$131, '
    + '$132, '
    + '$133, '
    + '$134, '
    + '$135, '
    + '$136, '
    + '$137, '
    + '$138, '
    + '$139, '
    + '$140, '
    + '$141, '
    + '$142, '
    + '$143, '
    + '$144, '
    + '$145, '
    + '$146, '
    + '$147, '
    + '$148, '
    + '$149, '
    + '$150, '
    + '$151, '
    + '$152, '
    + '$153, '
    + '$154, '
    + '$155, '
    + '$156, '
    + '$157, '
    + '$158, '
    + '$159, '
    + '$160, '
    + '$161, '
    + '$162, '
    + '$163, '
    + '$164, '
    + '$165, '
    + '$166, '
    + '$167, '
    + '$168, '
    + '$169, '
    + '$170, '
    + '$171, '
    + '$172, '
    + '$173, '
    + '$174, '
    + '$175, '
    + '$176, '
    + '$177, '
    + '$178, '
    + '$179, '
    + '$180, '
    + '$181, '
    + '$182, '
    + '$183, '
    + '$184, '
    + '$185, '
    + '$186, '
    + '$187, '
    + '$188, '
    + '$189, '
    + '$190, '
    + '$191, '
    + '$192, '
    + '$193, '
    + '$194, '
    + '$195, '
    + '$196, '
    + '$197, '
    + '$198, '
    + '$199, '
    + '$200, '
    + '$201, '
    + '$202, '
    + '$203, '
    + '$204, '
    + '$205, '
    + '$206, '
    + '$207, '
    + '$208, '
    + '$209, '
    + '$210, '
    + '$211, '
    + '$212, '
    + '$213, '
    + '$214, '
    + '$215, '
    + '$216, '
    + '$217, '
    + '$218, '
    + '$219, '
    + '$220, '
    + '$221, '
    + '$222, '
    + '$223, '
    + '$224, '
    + '$225, '
    + '$226, '
    + '$227, '
    + '$228, '
    + '$229, '
    + '$230, '
    + '$231, '
    + '$232, '
    + '$233, '
    + '$234, '
    + '$235, '
    + '$236, '
    + '$237, '
    + '$238, '
    + '$239, '
    + '$240, '
    + '$241, '
    + '$242, '
    + '$243, '
    + '$244, '
    + '$245, '
    + '$246, '
    + '$247, '
    + '$248, '
    + '$249, '
    + '$250, '
    + '$251, '
    + '$252, '
    + '$253, '
    + '$254, '
    + '$255, '
    + '$256, '
    + '$257, '
    + '$258, '
    + '$259, '
    + '$260, '
    + '$261, '
    + '$262, '
    + '$263, '
    + '$264, '
    + '$265, '
    + '$266, '
    + '$267, '
    + '$268, '
    + '$269, '
    + '$270, '
    + '$271, '
    + '$272, '
    + '$273, '
    + '$274, '
    + '$275, '
    + '$276, '
    + '$277, '
    + '$278, '
    + '$279, '
    + '$280, '
    + '$281, '
    + '$282, '
    + '$283, '
    + '$284, '
    + '$285, '
    + '$286, '
    + '$287, '
    + '$288, '
    + '$289, '
    + '$290, '
    + '$291, '
    + '$292, '
    + '$293, '
    + '$294, '
    + '$295, '
    + '$296, '
    + '$297, '
    + '$298, '
    + '$299, '
    + '$300, '
    + '$301, '
    + '$302, '
    + '$303, '
    + '$304, '
    + '$305, '
    + '$306, '
    + '$307, '
    + '$308, '
    + '$309, '
    + '$310, '
    + '$311, '
    + '$312, '
    + '$313, '
    + '$314, '
    + '$315, '
    + '$316, '
    + '$317, '
    + '$318, '
    + '$319, '
    + '$320, '
    + '$321, '
    + '$322, '
    + '$323, '
    + '$324, '
    + '$325, '
    + '$326, '
    + '$327, '
    + '$328, '
    + '$329, '
    + '$330, '
    + '$331, '
    + '$332, '
    + '$333, '
    + '$334, '
    + '$335, '
    + '$336, '
    + '$337, '
    + '$338, '
    + '$339, '
    + '$340, '
    + '$341, '
    + '$342, '
    + '$343, '
    + '$344, '
    + '$345, '
    + '$346, '
    + '$347, '
    + '$348, '
    + '$349, '
    + '$350, '
    + '$351, '
    + '$352, '
    + '$353, '
    + '$354, '
    + '$355, '
    + '$356, '
    + '$357'
    + ') ON CONFLICT DO NOTHING';

export const upsertAccountStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Participant Account',
    text: upsertAccountStr,
});

export enum GUILD_COLUMNS {
    ID = 'id',
    FK_EVENT_ID = 'fk_event_id',
    GUILD_ID = 'guild_id',
    IS_CREATOR = 'is_creator'
}

const createTableGuildsStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.GUILDS}(`
    + `${GUILD_COLUMNS.ID}                          SERIAL PRIMARY KEY, `
    + `FOREIGN KEY(${GUILD_COLUMNS.FK_EVENT_ID})    REFERENCES ${TABLES.EVENTS}(${EVENT_COLUMNS.ID}), `
    + `${GUILD_COLUMNS.GUILD_ID}                    VARCHAR(50) NOT NULL, `
    + `${GUILD_COLUMNS.IS_CREATOR}                  BOOLEAN DEFAULT FALSE`
    + ')';

export const createTableGuildStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Event Guilds Table',
    text: createTableGuildsStr,
});

const upsertGuildStr: string = `INSERT INTO ${TABLES.GUILDS}(`
    + `${GUILD_COLUMNS.FK_EVENT_ID}, `
    + `${GUILD_COLUMNS.GUILD_ID}, `
    + `${GUILD_COLUMNS.IS_CREATOR}`
    + ') VALUES ('
    + '$1, $2, $3'
    + ') ON CONFLICT DO NOTHING';

export const upsertGuildStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Event Guild',
    text: upsertGuildStr,
});

export enum MESSAGE_COLUMNS {
    ID = 'id',
    FK_GUILD_ID = 'fk_guild_id',
    CHANNEL_ID = 'channel_id',
    MESSAGE_ID = 'message_id',
}

const createTableMessagesStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.MESSAGES}(`
    + `${MESSAGE_COLUMNS.ID}                          SERIAL PRIMARY KEY, `
    + `FOREIGN KEY(${MESSAGE_COLUMNS.FK_GUILD_ID})    REFERENCES ${TABLES.GUILDS}(${GUILD_COLUMNS.ID}), `
    + `${MESSAGE_COLUMNS.CHANNEL_ID}                  VARCHAR(50) NOT NULL, `
    + `${MESSAGE_COLUMNS.MESSAGE_ID}                  VARCHAR(50) NOT NULL`
    + ')';

export const createTableMessageStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Guild Messages Table',
    text: createTableMessagesStr,
});

const upsertMessageStr: string = `INSERT INTO ${TABLES.MESSAGES}(`
    + `${MESSAGE_COLUMNS.FK_GUILD_ID}, `
    + `${MESSAGE_COLUMNS.CHANNEL_ID}, `
    + `${MESSAGE_COLUMNS.MESSAGE_ID}`
    + ') VALUES ('
    + '$1, $2, $3'
    + ') ON CONFLICT DO NOTHING';

export const upsertMessagesStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Guild Message',
    text: upsertMessageStr,
});
