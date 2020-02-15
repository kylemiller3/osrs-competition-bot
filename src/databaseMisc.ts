import pgPromise, { PreparedStatement } from 'pg-promise';

export enum TABLES {
    SETTING = 'setting',
    EVENT = 'event',
    TEAM = 'team',
    PARTICIPANT = 'participant',
    STARTING_ACCOUNT = 'starting_account',
    CURRENT_ACCOUNT = 'current_account',
    GUILD = 'guild',
    MESSAGE = 'message',
    TRACKING = 'tracking'
}

export enum EVENT_COLUMNS {
    ID = 'id',
    NAME = 'name',
    WHEN_START = 'when_start',
    WHEN_END = 'when_end',
    GLOBAL = 'global',
    ADMIN_LOCKED = 'admin_locked',
}

export interface EventRow {
    id: number;
    name: string;
    when_start: Date;
    when_end: Date;
    global: boolean;
    admin_locked: boolean;
}

export enum TEAM_COLUMNS {
    ID = 'id',
    FK_EVENT_ID = 'fk_event_id',
    NAME = 'name',
    GUILD_ID = 'guild_id',
}

export interface TeamRow {
    id: number;
    fk_event_id: number;
    name: string;
    guild_id: string;
}

export enum PARTICIPANT_COLUMNS {
    ID = 'id',
    FK_TEAM_ID = 'fk_team_id',
    USER_ID = 'user_id',
    CUSTOM_SCORE = 'custom_score',
}

export interface ParticipantRow {
    id: number;
    fk_team_id: number;
    user_id: string;
    custom_score: number;
}

export enum ACCOUNT_COLUMNS {
    ID = 'id',
    FK_PARTICIPANT_ID = 'fk_participant_id',
    RSN = 'rsn',
    BH_ROGUE_RANK = 'bh_rogue_rank',
    BH_ROGUE_SCORE = 'bh_rogue_score',
    BH_HUNTER_RANK = 'bh_hunter_rank',
    BH_HUNTER_SCORE = 'bh_hunter_score',
    LMS_RANK = 'lms_rank',
    LMS_SCORE = 'lms_score',
    CLUES_ALL_RANK = 'clues_all_rank',
    CLUES_ALL_SCORE = 'clues_all_score',
    CLUES_EASY_RANK = 'clues_easy_rank',
    CLUES_EASY_SCORE = 'clues_easy_score',
    CLUES_HARD_RANK = 'clues_hard_rank',
    CLUES_HARD_SCORE = 'clues_hard_score',
    CLUES_ELITE_RANK = 'clues_elite_rank',
    CLUES_ELITE_SCORE = 'clues_elite_score',
    CLUES_MASTER_RANK = 'clues_master_rank',
    CLUES_MASTER_SCORE = 'clues_master_score',
    CLUES_MEDIUM_RANK = 'clues_medium_rank',
    CLUES_MEDIUM_SCORE = 'clues_medium_score',
    CLUES_BEGINNER_RANK = 'clues_beginner_rank',
    CLUES_BEGINNER_SCORE = 'clues_beginner_score',
    BOSSES_OBOR_RANK = 'bosses_obor_rank',
    BOSSES_OBOR_SCORE = 'bosses_obor_score',
    BOSSES_MIMIC_RANK = 'bosses_mimic_rank',
    BOSSES_MIMIC_SCORE = 'bosses_mimic_score',
    BOSSES_KRAKEN_RANK = 'bosses_kraken_rank',
    BOSSES_KRAKEN_SCORE = 'bosses_kraken_score',
    BOSSES_ZULRAH_RANK = 'bosses_zulrah_rank',
    BOSSES_ZULRAH_SCORE = 'bosses_zulrah_score',
    BOSSES_HESPORI_RANK = 'bosses_hespori_rank',
    BOSSES_HESPORI_SCORE = 'bosses_hespori_score',
    BOSSES_SCORPIA_RANK = 'bosses_scorpia_rank',
    BOSSES_SCORPIA_SCORE = 'bosses_scorpia_score',
    BOSSES_SKOTIZO_RANK = 'bosses_skotizo_rank',
    BOSSES_SKOTIZO_SCORE = 'bosses_skotizo_score',
    BOSSES_VETION_RANK = 'bosses_vetion_rank',
    BOSSES_VETION_SCORE = 'bosses_vetion_score',
    BOSSES_VORKATH_RANK = 'bosses_vorkath_rank',
    BOSSES_VORKATH_SCORE = 'bosses_vorkath_score',
    BOSSES_ZALCANO_RANK = 'bosses_zalcano_rank',
    BOSSES_ZALCANO_SCORE = 'bosses_zalcano_score',
    BOSSES_CALLISTO_RANK = 'bosses_callisto_rank',
    BOSSES_CALLISTO_SCORE = 'bosses_callisto_score',
    BOSSES_CERBERUS_RANK = 'bosses_cerberus_rank',
    BOSSES_CERBERUS_SCORE = 'bosses_cerberus_score',
    BOSSES_BRYOPHYTA_RANK = 'bosses_bryophyta_rank',
    BOSSES_BRYOPHYTA_SCORE = 'bosses_bryophyta_score',
    BOSSES_KREEARRA_RANK = 'bosses_kreearra_rank',
    BOSSES_KREEARRA_SCORE = 'bosses_kreearra_score',
    BOSSES_SARACHNIS_RANK = 'bosses_sarachnis_rank',
    BOSSES_SARACHNIS_SCORE = 'bosses_sarachnis_score',
    BOSSES_TZKALZUK_RANK = 'bosses_tzkalzuk_rank',
    BOSSES_TZKALZUK_SCORE = 'bosses_tzkalzuk_score',
    BOSSES_TZTOKJAD_RANK = 'bosses_tztokjad_rank',
    BOSSES_TZTOKJAD_SCORE = 'bosses_tztokjad_score',
    BOSSES_VENENATIS_RANK = 'bosses_venenatis_rank',
    BOSSES_VENENATIS_SCORE = 'bosses_venenatis_score',
    BOSSES_GIANT_MOLE_RANK = 'bosses_giant_mole_rank',
    BOSSES_GIANT_MOLE_SCORE = 'bosses_giant_mole_score',
    BOSSES_WINTERTODT_RANK = 'bosses_wintertodt_rank',
    BOSSES_WINTERTODT_SCORE = 'bosses_wintertodt_score',
    BOSSES_ABYSSAL_SIRE_RANK = 'bosses_abyssal_sire_rank',
    BOSSES_ABYSSAL_SIRE_SCORE = 'bosses_abyssal_sire_score',
    BOSSES_THE_GAUNTLET_RANK = 'bosses_the_gauntlet_rank',
    BOSSES_THE_GAUNTLET_SCORE = 'bosses_the_gauntlet_score',
    BOSSES_CHAOS_FANATIC_RANK = 'bosses_chaos_fanatic_rank',
    BOSSES_CHAOS_FANATIC_SCORE = 'bosses_chaos_fanatic_score',
    BOSSES_DAGANNOTH_REX_RANK = 'bosses_dagannoth_rex_rank',
    BOSSES_DAGANNOTH_REX_SCORE = 'bosses_dagannoth_rex_score',
    BOSSES_BARROWS_CHESTS_RANK = 'bosses_barrows_chests_rank',
    BOSSES_BARROWS_CHESTS_SCORE = 'bosses_barrows_chests_score',
    BOSSES_KALPHITE_QUEEN_RANK = 'bosses_kalphite_queen_rank',
    BOSSES_KALPHITE_QUEEN_SCORE = 'bosses_kalphite_queen_score',
    BOSSES_CHAOS_ELEMENTAL_RANK = 'bosses_chaos_elemental_rank',
    BOSSES_CHAOS_ELEMENTAL_SCORE = 'bosses_chaos_elemental_score',
    BOSSES_CORPOREAL_BEAST_RANK = 'bosses_corporeal_beast_rank',
    BOSSES_CORPOREAL_BEAST_SCORE = 'bosses_corporeal_beast_score',
    BOSSES_DAGANNOTH_PRIME_RANK = 'bosses_dagannoth_prime_rank',
    BOSSES_DAGANNOTH_PRIME_SCORE = 'bosses_dagannoth_prime_score',
    BOSSES_ALCHEMICAL_HYDRA_RANK = 'bosses_alchemical_hydra_rank',
    BOSSES_ALCHEMICAL_HYDRA_SCORE = 'bosses_alchemical_hydra_score',
    BOSSES_GENERAL_GRAARDOR_RANK = 'bosses_general_graardor_rank',
    BOSSES_GENERAL_GRAARDOR_SCORE = 'bosses_general_graardor_score',
    BOSSES_KRIL_TSUTSAROTH_RANK = 'bosses_kril_tsutsaroth_rank',
    BOSSES_KRIL_TSUTSAROTH_SCORE = 'bosses_kril_tsutsaroth_score',
    BOSSES_THEATRE_OF_BLOOD_RANK = 'bosses_theatre_of_blood_rank',
    BOSSES_THEATRE_OF_BLOOD_SCORE = 'bosses_theatre_of_blood_score',
    BOSSES_CHAMBERS_OF_XERIC_RANK = 'bosses_chambers_of_xeric_rank',
    BOSSES_CHAMBERS_OF_XERIC_SCORE = 'bosses_chambers_of_xeric_score',
    BOSSES_COMMANDER_ZILYANA_RANK = 'bosses_commander_zilyana_rank',
    BOSSES_COMMANDER_ZILYANA_SCORE = 'bosses_commander_zilyana_score',
    BOSSES_DAGANNOTH_SUPREME_RANK = 'bosses_dagannoth_supreme_rank',
    BOSSES_DAGANNOTH_SUPREME_SCORE = 'bosses_dagannoth_supreme_score',
    BOSSES_KING_BLACK_DRAGON_RANK = 'bosses_king_black_dragon_rank',
    BOSSES_KING_BLACK_DRAGON_SCORE = 'bosses_king_black_dragon_score',
    BOSSES_CRAZY_ARCHAEOLOGIST_RANK = 'bosses_crazy_archaeologist_rank',
    BOSSES_CRAZY_ARCHAEOLOGIST_SCORE = 'bosses_crazy_archaeologist_score',
    BOSSES_GROTESQUE_GUARDIANS_RANK = 'bosses_grotesque_guardians_rank',
    BOSSES_GROTESQUE_GUARDIANS_SCORE = 'bosses_grotesque_guardians_score',
    BOSSES_DERANGED_ARCHAEOLOGIST_RANK = 'bosses_deranged_archaeologist_rank',
    BOSSES_DERANGED_ARCHAEOLOGIST_SCORE = 'bosses_deranged_archaeologist_score',
    BOSSES_THE_CORRUPTED_GAUNTLET_RANK = 'bosses_the_corrupted_gauntlet_rank',
    BOSSES_THE_CORRUPTED_GAUNTLET_SCORE = 'bosses_the_corrupted_gauntlet_score',
    BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK = 'bosses_thermonuclear_smoke_devil_rank',
    BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE = 'bosses_thermonuclear_smoke_devil_score',
    BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK = 'bosses_chambers_of_xeric_challenge_mode_rank',
    BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE = 'bosses_chambers_of_xeric_challenge_mode_score',
    SKILLS_MAGIC_XP = 'skills_magic_xp',
    SKILLS_MAGIC_RANK = 'skills_magic_rank',
    SKILLS_MAGIC_LEVEL = 'skills_magic_level',
    SKILLS_ATTACK_XP = 'skills_attack_xp',
    SKILLS_ATTACK_RANK = 'skills_attack_rank',
    SKILLS_ATTACK_LEVEL = 'skills_attack_level',
    SKILLS_HUNTER_XP = 'skills_hunter_xp',
    SKILLS_HUNTER_RANK = 'skills_hunter_rank',
    SKILLS_HUNTER_LEVEL = 'skills_hunter_level',
    SKILLS_MINING_XP = 'skills_mining_xp',
    SKILLS_MINING_RANK = 'skills_mining_rank',
    SKILLS_MINING_LEVEL = 'skills_mining_level',
    SKILLS_PRAYER_XP = 'skills_prayer_xp',
    SKILLS_PRAYER_RANK = 'skills_prayer_rank',
    SKILLS_PRAYER_LEVEL = 'skills_prayer_level',
    SKILLS_RANGED_XP = 'skills_ranged_xp',
    SKILLS_RANGED_RANK = 'skills_ranged_rank',
    SKILLS_RANGED_LEVEL = 'skills_ranged_level',
    SKILLS_SLAYER_XP = 'skills_slayer_xp',
    SKILLS_SLAYER_RANK = 'skills_slayer_rank',
    SKILLS_SLAYER_LEVEL = 'skills_slayer_level',
    SKILLS_AGILITY_XP = 'skills_agility_xp',
    SKILLS_AGILITY_RANK = 'skills_agility_rank',
    SKILLS_AGILITY_LEVEL = 'skills_agility_level',
    SKILLS_COOKING_XP = 'skills_cooking_xp',
    SKILLS_COOKING_RANK = 'skills_cooking_rank',
    SKILLS_COOKING_LEVEL = 'skills_cooking_level',
    SKILLS_DEFENCE_XP = 'skills_defence_xp',
    SKILLS_DEFENCE_RANK = 'skills_defence_rank',
    SKILLS_DEFENCE_LEVEL = 'skills_defence_level',
    SKILLS_FARMING_XP = 'skills_farming_xp',
    SKILLS_FARMING_RANK = 'skills_farming_rank',
    SKILLS_FARMING_LEVEL = 'skills_farming_level',
    SKILLS_FISHING_XP = 'skills_fishing_xp',
    SKILLS_FISHING_RANK = 'skills_fishing_rank',
    SKILLS_FISHING_LEVEL = 'skills_fishing_level',
    SKILLS_OVERALL_XP = 'skills_overall_xp',
    SKILLS_OVERALL_RANK = 'skills_overall_rank',
    SKILLS_OVERALL_LEVEL = 'skills_overall_level',
    SKILLS_CRAFTING_XP = 'skills_crafting_xp',
    SKILLS_CRAFTING_RANK = 'skills_crafting_rank',
    SKILLS_CRAFTING_LEVEL = 'skills_crafting_level',
    SKILLS_HERBLORE_XP = 'skills_herblore_xp',
    SKILLS_HERBLORE_RANK = 'skills_herblore_rank',
    SKILLS_HERBLORE_LEVEL = 'skills_herblore_level',
    SKILLS_SMITHING_XP = 'skills_smithing_xp',
    SKILLS_SMITHING_RANK = 'skills_smithing_rank',
    SKILLS_SMITHING_LEVEL = 'skills_smithing_level',
    SKILLS_STRENGTH_XP = 'skills_strength_xp',
    SKILLS_STRENGTH_RANK = 'skills_strength_rank',
    SKILLS_STRENGTH_LEVEL = 'skills_strength_level',
    SKILLS_THIEVING_XP = 'skills_thieving_xp',
    SKILLS_THIEVING_RANK = 'skills_thieving_rank',
    SKILLS_THIEVING_LEVEL = 'skills_thieving_level',
    SKILLS_FLETCHING_XP = 'skills_fletching_xp',
    SKILLS_FLETCHING_RANK = 'skills_fletching_rank',
    SKILLS_FLETCHING_LEVEL = 'skills_fletching_level',
    SKILLS_HITPOINTS_XP = 'skills_hitpoints_xp',
    SKILLS_HITPOINTS_RANK = 'skills_hitpoints_rank',
    SKILLS_HITPOINTS_LEVEL = 'skills_hitpoints_level',
    SKILLS_RUNECRAFT_XP = 'skills_runecraft_xp',
    SKILLS_RUNECRAFT_RANK = 'skills_runecraft_rank',
    SKILLS_RUNECRAFT_LEVEL = 'skills_runecraft_level',
    SKILLS_FIREMAKING_XP = 'skills_firemaking_xp',
    SKILLS_FIREMAKING_RANK = 'skills_firemaking_rank',
    SKILLS_FIREMAKING_LEVEL = 'skills_firemaking_level',
    SKILLS_WOODCUTTING_XP = 'skills_woodcutting_xp',
    SKILLS_WOODCUTTING_RANK = 'skills_woodcutting_rank',
    SKILLS_WOODCUTTING_LEVEL = 'skills_woodcutting_level',
    SKILLS_CONSTRUCTION_XP = 'skills_construction_xp',
    SKILLS_CONSTRUCTION_RANK = 'skills_construction_rank',
    SKILLS_CONSTRUCTION_LEVEL = 'skills_construction_level',
    BOSSES_NIGHTMARE_RANK = 'bosses_nightmare_rank',
    BOSSES_NIGHTMARE_SCORE = 'bosses_nightmare_score',
}

export interface AccountRow {
    id: number;
    fk_participant_id: number;
    rsn: string;
    bh_rogue_rank: number;
    bh_rogue_score: number;
    bh_hunter_rank: number;
    bh_hunter_score: number;
    lms_rank: number;
    lms_score: number;
    clues_all_rank: number;
    clues_all_score: number;
    clues_easy_rank: number;
    clues_easy_score: number;
    clues_hard_rank: number;
    clues_hard_score: number;
    clues_elite_rank: number;
    clues_elite_score: number;
    clues_master_rank: number;
    clues_master_score: number;
    clues_medium_rank: number;
    clues_medium_score: number;
    clues_beginner_rank: number;
    clues_beginner_score: number;
    bosses_obor_rank: number;
    bosses_obor_score: number;
    bosses_mimic_rank: number;
    bosses_mimic_score: number;
    bosses_kraken_rank: number;
    bosses_kraken_score: number;
    bosses_zulrah_rank: number;
    bosses_zulrah_score: number;
    bosses_hespori_rank: number;
    bosses_hespori_score: number;
    bosses_scorpia_rank: number;
    bosses_scorpia_score: number;
    bosses_skotizo_rank: number;
    bosses_skotizo_score: number;
    bosses_vetion_rank: number;
    bosses_vetion_score: number;
    bosses_vorkath_rank: number;
    bosses_vorkath_score: number;
    bosses_zalcano_rank: number;
    bosses_zalcano_score: number;
    bosses_callisto_rank: number;
    bosses_callisto_score: number;
    bosses_cerberus_rank: number;
    bosses_cerberus_score: number;
    bosses_bryophyta_rank: number;
    bosses_bryophyta_score: number;
    bosses_kreearra_rank: number;
    bosses_kreearra_score: number;
    bosses_sarachnis_rank: number;
    bosses_sarachnis_score: number;
    bosses_tzkalzuk_rank: number;
    bosses_tzkalzuk_score: number;
    bosses_tztokjad_rank: number;
    bosses_tztokjad_score: number;
    bosses_venenatis_rank: number;
    bosses_venenatis_score: number;
    bosses_giant_mole_rank: number;
    bosses_giant_mole_score: number;
    bosses_wintertodt_rank: number;
    bosses_wintertodt_score: number;
    bosses_abyssal_sire_rank: number;
    bosses_abyssal_sire_score: number;
    bosses_the_gauntlet_rank: number;
    bosses_the_gauntlet_score: number;
    bosses_chaos_fanatic_rank: number;
    bosses_chaos_fanatic_score: number;
    bosses_dagannoth_rex_rank: number;
    bosses_dagannoth_rex_score: number;
    bosses_barrows_chests_rank: number;
    bosses_barrows_chests_score: number;
    bosses_kalphite_queen_rank: number;
    bosses_kalphite_queen_score: number;
    bosses_chaos_elemental_rank: number;
    bosses_chaos_elemental_score: number;
    bosses_corporeal_beast_rank: number;
    bosses_corporeal_beast_score: number;
    bosses_dagannoth_prime_rank: number;
    bosses_dagannoth_prime_score: number;
    bosses_alchemical_hydra_rank: number;
    bosses_alchemical_hydra_score: number;
    bosses_general_graardor_rank: number;
    bosses_general_graardor_score: number;
    bosses_kril_tsutsaroth_rank: number;
    bosses_kril_tsutsaroth_score: number;
    bosses_theatre_of_blood_rank: number;
    bosses_theatre_of_blood_score: number;
    bosses_chambers_of_xeric_rank: number;
    bosses_chambers_of_xeric_score: number;
    bosses_commander_zilyana_rank: number;
    bosses_commander_zilyana_score: number;
    bosses_dagannoth_supreme_rank: number;
    bosses_dagannoth_supreme_score: number;
    bosses_king_black_dragon_rank: number;
    bosses_king_black_dragon_score: number;
    bosses_crazy_archaeologist_rank: number;
    bosses_crazy_archaeologist_score: number;
    bosses_grotesque_guardians_rank: number;
    bosses_grotesque_guardians_score: number;
    bosses_deranged_archaeologist_rank: number;
    bosses_deranged_archaeologist_score: number;
    bosses_the_corrupted_gauntlet_rank: number;
    bosses_the_corrupted_gauntlet_score: number;
    bosses_thermonuclear_smoke_devil_rank: number;
    bosses_thermonuclear_smoke_devil_score: number;
    bosses_chambers_of_xeric_challenge_mode_rank: number;
    bosses_chambers_of_xeric_challenge_mode_score: number;
    skills_magic_xp: number;
    skills_magic_rank: number;
    skills_magic_level: number;
    skills_attack_xp: number;
    skills_attack_rank: number;
    skills_attack_level: number;
    skills_hunter_xp: number;
    skills_hunter_rank: number;
    skills_hunter_level: number;
    skills_mining_xp: number;
    skills_mining_rank: number;
    skills_mining_level: number;
    skills_prayer_xp: number;
    skills_prayer_rank: number;
    skills_prayer_level: number;
    skills_ranged_xp: number;
    skills_ranged_rank: number;
    skills_ranged_level: number;
    skills_slayer_xp: number;
    skills_slayer_rank: number;
    skills_slayer_level: number;
    skills_agility_xp: number;
    skills_agility_rank: number;
    skills_agility_level: number;
    skills_cooking_xp: number;
    skills_cooking_rank: number;
    skills_cooking_level: number;
    skills_defence_xp: number;
    skills_defence_rank: number;
    skills_defence_level: number;
    skills_farming_xp: number;
    skills_farming_rank: number;
    skills_farming_level: number;
    skills_fishing_xp: number;
    skills_fishing_rank: number;
    skills_fishing_level: number;
    skills_overall_xp: number;
    skills_overall_rank: number;
    skills_overall_level: number;
    skills_crafting_xp: number;
    skills_crafting_rank: number;
    skills_crafting_level: number;
    skills_herblore_xp: number;
    skills_herblore_rank: number;
    skills_herblore_level: number;
    skills_smithing_xp: number;
    skills_smithing_rank: number;
    skills_smithing_level: number;
    skills_strength_xp: number;
    skills_strength_rank: number;
    skills_strength_level: number;
    skills_thieving_xp: number;
    skills_thieving_rank: number;
    skills_thieving_level: number;
    skills_fletching_xp: number;
    skills_fletching_rank: number;
    skills_fletching_level: number;
    skills_hitpoints_xp: number;
    skills_hitpoints_rank: number;
    skills_hitpoints_level: number;
    skills_runecraft_xp: number;
    skills_runecraft_rank: number;
    skills_runecraft_level: number;
    skills_firemaking_xp: number;
    skills_firemaking_rank: number;
    skills_firemaking_level: number;
    skills_woodcutting_xp: number;
    skills_woodcutting_rank: number;
    skills_woodcutting_level: number;
    skills_construction_xp: number;
    skills_construction_rank: number;
    skills_construction_level: number;
    bosses_nightmare_rank: number;
    bosses_nightmare_score: number;
}

export enum GUILD_COLUMNS {
    ID = 'id',
    FK_EVENT_ID = 'fk_event_id',
    GUILD_ID = 'guild_id',
    IS_CREATOR = 'is_creator'
}

export interface GuildRow {
    id: number;
    fk_event_id: number;
    guild_id: string;
    is_creator: boolean;
}

export enum MESSAGE_COLUMNS {
    ID = 'id',
    FK_GUILD_ID = 'fk_guild_id',
    CHANNEL_ID = 'channel_id',
    MESSAGE_ID = 'message_id',
}

export interface MessageRow {
    id: number;
    fk_guild_id: number;
    channel_id: string;
    message_id: string;
}

export enum TRACKING_COLUMNS {
    ID = 'id',
    FK_EVENT_ID = 'fk_event_id',
    BH_ROGUE_RANK = 'bh_rogue_rank',
    BH_ROGUE_SCORE = 'bh_rogue_score',
    BH_HUNTER_RANK = 'bh_hunter_rank',
    BH_HUNTER_SCORE = 'bh_hunter_score',
    LMS_RANK = 'lms_rank',
    LMS_SCORE = 'lms_score',
    CLUES_ALL_RANK = 'clues_all_rank',
    CLUES_ALL_SCORE = 'clues_all_score',
    CLUES_EASY_RANK = 'clues_easy_rank',
    CLUES_EASY_SCORE = 'clues_easy_score',
    CLUES_HARD_RANK = 'clues_hard_rank',
    CLUES_HARD_SCORE = 'clues_hard_score',
    CLUES_ELITE_RANK = 'clues_elite_rank',
    CLUES_ELITE_SCORE = 'clues_elite_score',
    CLUES_MASTER_RANK = 'clues_master_rank',
    CLUES_MASTER_SCORE = 'clues_master_score',
    CLUES_MEDIUM_RANK = 'clues_medium_rank',
    CLUES_MEDIUM_SCORE = 'clues_medium_score',
    CLUES_BEGINNER_RANK = 'clues_beginner_rank',
    CLUES_BEGINNER_SCORE = 'clues_beginner_score',
    BOSSES_OBOR_RANK = 'bosses_obor_rank',
    BOSSES_OBOR_SCORE = 'bosses_obor_score',
    BOSSES_MIMIC_RANK = 'bosses_mimic_rank',
    BOSSES_MIMIC_SCORE = 'bosses_mimic_score',
    BOSSES_KRAKEN_RANK = 'bosses_kraken_rank',
    BOSSES_KRAKEN_SCORE = 'bosses_kraken_score',
    BOSSES_ZULRAH_RANK = 'bosses_zulrah_rank',
    BOSSES_ZULRAH_SCORE = 'bosses_zulrah_score',
    BOSSES_HESPORI_RANK = 'bosses_hespori_rank',
    BOSSES_HESPORI_SCORE = 'bosses_hespori_score',
    BOSSES_SCORPIA_RANK = 'bosses_scorpia_rank',
    BOSSES_SCORPIA_SCORE = 'bosses_scorpia_score',
    BOSSES_SKOTIZO_RANK = 'bosses_skotizo_rank',
    BOSSES_SKOTIZO_SCORE = 'bosses_skotizo_score',
    BOSSES_VETION_RANK = 'bosses_vetion_rank',
    BOSSES_VETION_SCORE = 'bosses_vetion_score',
    BOSSES_VORKATH_RANK = 'bosses_vorkath_rank',
    BOSSES_VORKATH_SCORE = 'bosses_vorkath_score',
    BOSSES_ZALCANO_RANK = 'bosses_zalcano_rank',
    BOSSES_ZALCANO_SCORE = 'bosses_zalcano_score',
    BOSSES_CALLISTO_RANK = 'bosses_callisto_rank',
    BOSSES_CALLISTO_SCORE = 'bosses_callisto_score',
    BOSSES_CERBERUS_RANK = 'bosses_cerberus_rank',
    BOSSES_CERBERUS_SCORE = 'bosses_cerberus_score',
    BOSSES_BRYOPHYTA_RANK = 'bosses_bryophyta_rank',
    BOSSES_BRYOPHYTA_SCORE = 'bosses_bryophyta_score',
    BOSSES_KREEARRA_RANK = 'bosses_kreearra_rank',
    BOSSES_KREEARRA_SCORE = 'bosses_kreearra_score',
    BOSSES_SARACHNIS_RANK = 'bosses_sarachnis_rank',
    BOSSES_SARACHNIS_SCORE = 'bosses_sarachnis_score',
    BOSSES_TZKALZUK_RANK = 'bosses_tzkalzuk_rank',
    BOSSES_TZKALZUK_SCORE = 'bosses_tzkalzuk_score',
    BOSSES_TZTOKJAD_RANK = 'bosses_tztokjad_rank',
    BOSSES_TZTOKJAD_SCORE = 'bosses_tztokjad_score',
    BOSSES_VENENATIS_RANK = 'bosses_venenatis_rank',
    BOSSES_VENENATIS_SCORE = 'bosses_venenatis_score',
    BOSSES_GIANT_MOLE_RANK = 'bosses_giant_mole_rank',
    BOSSES_GIANT_MOLE_SCORE = 'bosses_giant_mole_score',
    BOSSES_WINTERTODT_RANK = 'bosses_wintertodt_rank',
    BOSSES_WINTERTODT_SCORE = 'bosses_wintertodt_score',
    BOSSES_ABYSSAL_SIRE_RANK = 'bosses_abyssal_sire_rank',
    BOSSES_ABYSSAL_SIRE_SCORE = 'bosses_abyssal_sire_score',
    BOSSES_THE_GAUNTLET_RANK = 'bosses_the_gauntlet_rank',
    BOSSES_THE_GAUNTLET_SCORE = 'bosses_the_gauntlet_score',
    BOSSES_CHAOS_FANATIC_RANK = 'bosses_chaos_fanatic_rank',
    BOSSES_CHAOS_FANATIC_SCORE = 'bosses_chaos_fanatic_score',
    BOSSES_DAGANNOTH_REX_RANK = 'bosses_dagannoth_rex_rank',
    BOSSES_DAGANNOTH_REX_SCORE = 'bosses_dagannoth_rex_score',
    BOSSES_BARROWS_CHESTS_RANK = 'bosses_barrows_chests_rank',
    BOSSES_BARROWS_CHESTS_SCORE = 'bosses_barrows_chests_score',
    BOSSES_KALPHITE_QUEEN_RANK = 'bosses_kalphite_queen_rank',
    BOSSES_KALPHITE_QUEEN_SCORE = 'bosses_kalphite_queen_score',
    BOSSES_CHAOS_ELEMENTAL_RANK = 'bosses_chaos_elemental_rank',
    BOSSES_CHAOS_ELEMENTAL_SCORE = 'bosses_chaos_elemental_score',
    BOSSES_CORPOREAL_BEAST_RANK = 'bosses_corporeal_beast_rank',
    BOSSES_CORPOREAL_BEAST_SCORE = 'bosses_corporeal_beast_score',
    BOSSES_DAGANNOTH_PRIME_RANK = 'bosses_dagannoth_prime_rank',
    BOSSES_DAGANNOTH_PRIME_SCORE = 'bosses_dagannoth_prime_score',
    BOSSES_ALCHEMICAL_HYDRA_RANK = 'bosses_alchemical_hydra_rank',
    BOSSES_ALCHEMICAL_HYDRA_SCORE = 'bosses_alchemical_hydra_score',
    BOSSES_GENERAL_GRAARDOR_RANK = 'bosses_general_graardor_rank',
    BOSSES_GENERAL_GRAARDOR_SCORE = 'bosses_general_graardor_score',
    BOSSES_KRIL_TSUTSAROTH_RANK = 'bosses_kril_tsutsaroth_rank',
    BOSSES_KRIL_TSUTSAROTH_SCORE = 'bosses_kril_tsutsaroth_score',
    BOSSES_THEATRE_OF_BLOOD_RANK = 'bosses_theatre_of_blood_rank',
    BOSSES_THEATRE_OF_BLOOD_SCORE = 'bosses_theatre_of_blood_score',
    BOSSES_CHAMBERS_OF_XERIC_RANK = 'bosses_chambers_of_xeric_rank',
    BOSSES_CHAMBERS_OF_XERIC_SCORE = 'bosses_chambers_of_xeric_score',
    BOSSES_COMMANDER_ZILYANA_RANK = 'bosses_commander_zilyana_rank',
    BOSSES_COMMANDER_ZILYANA_SCORE = 'bosses_commander_zilyana_score',
    BOSSES_DAGANNOTH_SUPREME_RANK = 'bosses_dagannoth_supreme_rank',
    BOSSES_DAGANNOTH_SUPREME_SCORE = 'bosses_dagannoth_supreme_score',
    BOSSES_KING_BLACK_DRAGON_RANK = 'bosses_king_black_dragon_rank',
    BOSSES_KING_BLACK_DRAGON_SCORE = 'bosses_king_black_dragon_score',
    BOSSES_CRAZY_ARCHAEOLOGIST_RANK = 'bosses_crazy_archaeologist_rank',
    BOSSES_CRAZY_ARCHAEOLOGIST_SCORE = 'bosses_crazy_archaeologist_score',
    BOSSES_GROTESQUE_GUARDIANS_RANK = 'bosses_grotesque_guardians_rank',
    BOSSES_GROTESQUE_GUARDIANS_SCORE = 'bosses_grotesque_guardians_score',
    BOSSES_DERANGED_ARCHAEOLOGIST_RANK = 'bosses_deranged_archaeologist_rank',
    BOSSES_DERANGED_ARCHAEOLOGIST_SCORE = 'bosses_deranged_archaeologist_score',
    BOSSES_THE_CORRUPTED_GAUNTLET_RANK = 'bosses_the_corrupted_gauntlet_rank',
    BOSSES_THE_CORRUPTED_GAUNTLET_SCORE = 'bosses_the_corrupted_gauntlet_score',
    BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK = 'bosses_thermonuclear_smoke_devil_rank',
    BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE = 'bosses_thermonuclear_smoke_devil_score',
    BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK = 'bosses_chambers_of_xeric_challenge_mode_rank',
    BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE = 'bosses_chambers_of_xeric_challenge_mode_score',
    SKILLS_MAGIC_XP = 'skills_magic_xp',
    SKILLS_MAGIC_RANK = 'skills_magic_rank',
    SKILLS_MAGIC_LEVEL = 'skills_magic_level',
    SKILLS_ATTACK_XP = 'skills_attack_xp',
    SKILLS_ATTACK_RANK = 'skills_attack_rank',
    SKILLS_ATTACK_LEVEL = 'skills_attack_level',
    SKILLS_HUNTER_XP = 'skills_hunter_xp',
    SKILLS_HUNTER_RANK = 'skills_hunter_rank',
    SKILLS_HUNTER_LEVEL = 'skills_hunter_level',
    SKILLS_MINING_XP = 'skills_mining_xp',
    SKILLS_MINING_RANK = 'skills_mining_rank',
    SKILLS_MINING_LEVEL = 'skills_mining_level',
    SKILLS_PRAYER_XP = 'skills_prayer_xp',
    SKILLS_PRAYER_RANK = 'skills_prayer_rank',
    SKILLS_PRAYER_LEVEL = 'skills_prayer_level',
    SKILLS_RANGED_XP = 'skills_ranged_xp',
    SKILLS_RANGED_RANK = 'skills_ranged_rank',
    SKILLS_RANGED_LEVEL = 'skills_ranged_level',
    SKILLS_SLAYER_XP = 'skills_slayer_xp',
    SKILLS_SLAYER_RANK = 'skills_slayer_rank',
    SKILLS_SLAYER_LEVEL = 'skills_slayer_level',
    SKILLS_AGILITY_XP = 'skills_agility_xp',
    SKILLS_AGILITY_RANK = 'skills_agility_rank',
    SKILLS_AGILITY_LEVEL = 'skills_agility_level',
    SKILLS_COOKING_XP = 'skills_cooking_xp',
    SKILLS_COOKING_RANK = 'skills_cooking_rank',
    SKILLS_COOKING_LEVEL = 'skills_cooking_level',
    SKILLS_DEFENCE_XP = 'skills_defence_xp',
    SKILLS_DEFENCE_RANK = 'skills_defence_rank',
    SKILLS_DEFENCE_LEVEL = 'skills_defence_level',
    SKILLS_FARMING_XP = 'skills_farming_xp',
    SKILLS_FARMING_RANK = 'skills_farming_rank',
    SKILLS_FARMING_LEVEL = 'skills_farming_level',
    SKILLS_FISHING_XP = 'skills_fishing_xp',
    SKILLS_FISHING_RANK = 'skills_fishing_rank',
    SKILLS_FISHING_LEVEL = 'skills_fishing_level',
    SKILLS_OVERALL_XP = 'skills_overall_xp',
    SKILLS_OVERALL_RANK = 'skills_overall_rank',
    SKILLS_OVERALL_LEVEL = 'skills_overall_level',
    SKILLS_CRAFTING_XP = 'skills_crafting_xp',
    SKILLS_CRAFTING_RANK = 'skills_crafting_rank',
    SKILLS_CRAFTING_LEVEL = 'skills_crafting_level',
    SKILLS_HERBLORE_XP = 'skills_herblore_xp',
    SKILLS_HERBLORE_RANK = 'skills_herblore_rank',
    SKILLS_HERBLORE_LEVEL = 'skills_herblore_level',
    SKILLS_SMITHING_XP = 'skills_smithing_xp',
    SKILLS_SMITHING_RANK = 'skills_smithing_rank',
    SKILLS_SMITHING_LEVEL = 'skills_smithing_level',
    SKILLS_STRENGTH_XP = 'skills_strength_xp',
    SKILLS_STRENGTH_RANK = 'skills_strength_rank',
    SKILLS_STRENGTH_LEVEL = 'skills_strength_level',
    SKILLS_THIEVING_XP = 'skills_thieving_xp',
    SKILLS_THIEVING_RANK = 'skills_thieving_rank',
    SKILLS_THIEVING_LEVEL = 'skills_thieving_level',
    SKILLS_FLETCHING_XP = 'skills_fletching_xp',
    SKILLS_FLETCHING_RANK = 'skills_fletching_rank',
    SKILLS_FLETCHING_LEVEL = 'skills_fletching_level',
    SKILLS_HITPOINTS_XP = 'skills_hitpoints_xp',
    SKILLS_HITPOINTS_RANK = 'skills_hitpoints_rank',
    SKILLS_HITPOINTS_LEVEL = 'skills_hitpoints_level',
    SKILLS_RUNECRAFT_XP = 'skills_runecraft_xp',
    SKILLS_RUNECRAFT_RANK = 'skills_runecraft_rank',
    SKILLS_RUNECRAFT_LEVEL = 'skills_runecraft_level',
    SKILLS_FIREMAKING_XP = 'skills_firemaking_xp',
    SKILLS_FIREMAKING_RANK = 'skills_firemaking_rank',
    SKILLS_FIREMAKING_LEVEL = 'skills_firemaking_level',
    SKILLS_WOODCUTTING_XP = 'skills_woodcutting_xp',
    SKILLS_WOODCUTTING_RANK = 'skills_woodcutting_rank',
    SKILLS_WOODCUTTING_LEVEL = 'skills_woodcutting_level',
    SKILLS_CONSTRUCTION_XP = 'skills_construction_xp',
    SKILLS_CONSTRUCTION_RANK = 'skills_construction_rank',
    SKILLS_CONSTRUCTION_LEVEL = 'skills_construction_level',
    BOSSES_NIGHTMARE_RANK = 'bosses_nightmare_rank',
    BOSSES_NIGHTMARE_SCORE = 'bosses_nightmare_score',
}

export interface TrackingRow {
    bh_rogue_rank: boolean;
    bh_rogue_score: boolean;
    bh_hunter_rank: boolean;
    bh_hunter_score: boolean;
    lms_rank: boolean;
    lms_score: boolean;
    clues_all_rank: boolean;
    clues_all_score: boolean;
    clues_easy_rank: boolean;
    clues_easy_score: boolean;
    clues_hard_rank: boolean;
    clues_hard_score: boolean;
    clues_elite_rank: boolean;
    clues_elite_score: boolean;
    clues_master_rank: boolean;
    clues_master_score: boolean;
    clues_medium_rank: boolean;
    clues_medium_score: boolean;
    clues_beginner_rank: boolean;
    clues_beginner_score: boolean;
    bosses_obor_rank: boolean;
    bosses_obor_score: boolean;
    bosses_mimic_rank: boolean;
    bosses_mimic_score: boolean;
    bosses_kraken_rank: boolean;
    bosses_kraken_score: boolean;
    bosses_zulrah_rank: boolean;
    bosses_zulrah_score: boolean;
    bosses_hespori_rank: boolean;
    bosses_hespori_score: boolean;
    bosses_scorpia_rank: boolean;
    bosses_scorpia_score: boolean;
    bosses_skotizo_rank: boolean;
    bosses_skotizo_score: boolean;
    bosses_vetion_rank: boolean;
    bosses_vetion_score: boolean;
    bosses_vorkath_rank: boolean;
    bosses_vorkath_score: boolean;
    bosses_zalcano_rank: boolean;
    bosses_zalcano_score: boolean;
    bosses_callisto_rank: boolean;
    bosses_callisto_score: boolean;
    bosses_cerberus_rank: boolean;
    bosses_cerberus_score: boolean;
    bosses_bryophyta_rank: boolean;
    bosses_bryophyta_score: boolean;
    bosses_kreearra_rank: boolean;
    bosses_kreearra_score: boolean;
    bosses_sarachnis_rank: boolean;
    bosses_sarachnis_score: boolean;
    bosses_tzkalzuk_rank: boolean;
    bosses_tzkalzuk_score: boolean;
    bosses_tztokjad_rank: boolean;
    bosses_tztokjad_score: boolean;
    bosses_venenatis_rank: boolean;
    bosses_venenatis_score: boolean;
    bosses_giant_mole_rank: boolean;
    bosses_giant_mole_score: boolean;
    bosses_wintertodt_rank: boolean;
    bosses_wintertodt_score: boolean;
    bosses_abyssal_sire_rank: boolean;
    bosses_abyssal_sire_score: boolean;
    bosses_the_gauntlet_rank: boolean;
    bosses_the_gauntlet_score: boolean;
    bosses_chaos_fanatic_rank: boolean;
    bosses_chaos_fanatic_score: boolean;
    bosses_dagannoth_rex_rank: boolean;
    bosses_dagannoth_rex_score: boolean;
    bosses_barrows_chests_rank: boolean;
    bosses_barrows_chests_score: boolean;
    bosses_kalphite_queen_rank: boolean;
    bosses_kalphite_queen_score: boolean;
    bosses_chaos_elemental_rank: boolean;
    bosses_chaos_elemental_score: boolean;
    bosses_corporeal_beast_rank: boolean;
    bosses_corporeal_beast_score: boolean;
    bosses_dagannoth_prime_rank: boolean;
    bosses_dagannoth_prime_score: boolean;
    bosses_alchemical_hydra_rank: boolean;
    bosses_alchemical_hydra_score: boolean;
    bosses_general_graardor_rank: boolean;
    bosses_general_graardor_score: boolean;
    bosses_kril_tsutsaroth_rank: boolean;
    bosses_kril_tsutsaroth_score: boolean;
    bosses_theatre_of_blood_rank: boolean;
    bosses_theatre_of_blood_score: boolean;
    bosses_chambers_of_xeric_rank: boolean;
    bosses_chambers_of_xeric_score: boolean;
    bosses_commander_zilyana_rank: boolean;
    bosses_commander_zilyana_score: boolean;
    bosses_dagannoth_supreme_rank: boolean;
    bosses_dagannoth_supreme_score: boolean;
    bosses_king_black_dragon_rank: boolean;
    bosses_king_black_dragon_score: boolean;
    bosses_crazy_archaeologist_rank: boolean;
    bosses_crazy_archaeologist_score: boolean;
    bosses_grotesque_guardians_rank: boolean;
    bosses_grotesque_guardians_score: boolean;
    bosses_deranged_archaeologist_rank: boolean;
    bosses_deranged_archaeologist_score: boolean;
    bosses_the_corrupted_gauntlet_rank: boolean;
    bosses_the_corrupted_gauntlet_score: boolean;
    bosses_thermonuclear_smoke_devil_rank: boolean;
    bosses_thermonuclear_smoke_devil_score: boolean;
    bosses_chambers_of_xeric_challenge_mode_rank: boolean;
    bosses_chambers_of_xeric_challenge_mode_score: boolean;
    skills_magic_xp: boolean;
    skills_magic_rank: boolean;
    skills_magic_level: boolean;
    skills_attack_xp: boolean;
    skills_attack_rank: boolean;
    skills_attack_level: boolean;
    skills_hunter_xp: boolean;
    skills_hunter_rank: boolean;
    skills_hunter_level: boolean;
    skills_mining_xp: boolean;
    skills_mining_rank: boolean;
    skills_mining_level: boolean;
    skills_prayer_xp: boolean;
    skills_prayer_rank: boolean;
    skills_prayer_level: boolean;
    skills_ranged_xp: boolean;
    skills_ranged_rank: boolean;
    skills_ranged_level: boolean;
    skills_slayer_xp: boolean;
    skills_slayer_rank: boolean;
    skills_slayer_level: boolean;
    skills_agility_xp: boolean;
    skills_agility_rank: boolean;
    skills_agility_level: boolean;
    skills_cooking_xp: boolean;
    skills_cooking_rank: boolean;
    skills_cooking_level: boolean;
    skills_defence_xp: boolean;
    skills_defence_rank: boolean;
    skills_defence_level: boolean;
    skills_farming_xp: boolean;
    skills_farming_rank: boolean;
    skills_farming_level: boolean;
    skills_fishing_xp: boolean;
    skills_fishing_rank: boolean;
    skills_fishing_level: boolean;
    skills_overall_xp: boolean;
    skills_overall_rank: boolean;
    skills_overall_level: boolean;
    skills_crafting_xp: boolean;
    skills_crafting_rank: boolean;
    skills_crafting_level: boolean;
    skills_herblore_xp: boolean;
    skills_herblore_rank: boolean;
    skills_herblore_level: boolean;
    skills_smithing_xp: boolean;
    skills_smithing_rank: boolean;
    skills_smithing_level: boolean;
    skills_strength_xp: boolean;
    skills_strength_rank: boolean;
    skills_strength_level: boolean;
    skills_thieving_xp: boolean;
    skills_thieving_rank: boolean;
    skills_thieving_level: boolean;
    skills_fletching_xp: boolean;
    skills_fletching_rank: boolean;
    skills_fletching_level: boolean;
    skills_hitpoints_xp: boolean;
    skills_hitpoints_rank: boolean;
    skills_hitpoints_level: boolean;
    skills_runecraft_xp: boolean;
    skills_runecraft_rank: boolean;
    skills_runecraft_level: boolean;
    skills_firemaking_xp: boolean;
    skills_firemaking_rank: boolean;
    skills_firemaking_level: boolean;
    skills_woodcutting_xp: boolean;
    skills_woodcutting_rank: boolean;
    skills_woodcutting_level: boolean;
    skills_construction_xp: boolean;
    skills_construction_rank: boolean;
    skills_construction_level: boolean;
    bosses_nightmare_rank: boolean;
    bosses_nightmare_score: boolean;
}

const createTableEventsStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.EVENT}(`
    + `${EVENT_COLUMNS.ID}                   SERIAL PRIMARY KEY, `
    + `${EVENT_COLUMNS.NAME}                 VARCHAR(50) NOT NULL, `
    + `${EVENT_COLUMNS.WHEN_START}           TIMESTAMP NOT NULL, `
    + `${EVENT_COLUMNS.WHEN_END}             TIMESTAMP NOT NULL, `
    + `${EVENT_COLUMNS.GLOBAL}               BOOLEAN NOT NULL, `
    + `${EVENT_COLUMNS.ADMIN_LOCKED}         BOOLEAN NOT NULL `
    + ')';

export const createTableEventsStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Events Table',
    text: createTableEventsStr,
});

const upsertEventStr: string = `INSERT INTO ${TABLES.EVENT}(`
    + `${EVENT_COLUMNS.NAME}, `
    + `${EVENT_COLUMNS.WHEN_START}, `
    + `${EVENT_COLUMNS.WHEN_END}, `
    + `${EVENT_COLUMNS.GLOBAL}, `
    + `${EVENT_COLUMNS.ADMIN_LOCKED}`
    + ') VALUES ('
    + '$1, $2, $3, $4, $5'
    + ') ON CONFLICT DO NOTHING '
    + `RETURNING ${EVENT_COLUMNS.ID}`;

export const upsertEventStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Event',
    text: upsertEventStr,
});

const createTableTeamsStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.TEAM}(`
    + `${TEAM_COLUMNS.ID}             SERIAL PRIMARY KEY, `
    + `${TEAM_COLUMNS.FK_EVENT_ID}    INTEGER REFERENCES ${TABLES.EVENT}(${EVENT_COLUMNS.ID}), `
    + `${TEAM_COLUMNS.NAME}           VARCHAR(50) NOT NULL, `
    + `${TEAM_COLUMNS.GUILD_ID}       VARCHAR(50) NOT NULL`
    + ')';

export const createTableTeamsStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Event Teams Table',
    text: createTableTeamsStr,
});

const upsertTeamStr: string = `INSERT INTO ${TABLES.TEAM}(`
    + `${TEAM_COLUMNS.FK_EVENT_ID}, `
    + `${TEAM_COLUMNS.NAME}, `
    + `${TEAM_COLUMNS.GUILD_ID}`
    + ') VALUES ('
    + '$1, $2, $3'
    + ') ON CONFLICT DO NOTHING '
    + `RETURNING ${TEAM_COLUMNS.ID}`;

export const upsertTeamStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Event Team',
    text: upsertTeamStr,
});

const createTableParticipantsStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.PARTICIPANT}(`
    + `${PARTICIPANT_COLUMNS.ID}              SERIAL PRIMARY KEY, `
    + `${PARTICIPANT_COLUMNS.FK_TEAM_ID}      INTEGER REFERENCES ${TABLES.TEAM}(${TEAM_COLUMNS.ID}), `
    + `${PARTICIPANT_COLUMNS.USER_ID}         VARCHAR(50) NOT NULL, `
    + `${PARTICIPANT_COLUMNS.CUSTOM_SCORE}    BIGINT NOT NULL`
    + ')';

export const createTableParticipantsStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Team Participants Table',
    text: createTableParticipantsStr,
});

const upsertParticipantStr: string = `INSERT INTO ${TABLES.PARTICIPANT}(`
    + `${PARTICIPANT_COLUMNS.FK_TEAM_ID}, `
    + `${PARTICIPANT_COLUMNS.USER_ID}, `
    + `${PARTICIPANT_COLUMNS.CUSTOM_SCORE}`
    + ') VALUES ('
    + '$1, $2, $3'
    + ') ON CONFLICT DO NOTHING '
    + `RETURNING ${PARTICIPANT_COLUMNS.ID}`;

export const upsertParticipantStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Team Participant',
    text: upsertParticipantStr,
});

const createTableAccountStr = (which: string): string => `CREATE TABLE IF NOT EXISTS ${which}(`
    + `${ACCOUNT_COLUMNS.ID}                                                SERIAL PRIMARY KEY, `
    + `${ACCOUNT_COLUMNS.FK_PARTICIPANT_ID}                                 UNIQUE INTEGER REFERENCES ${TABLES.PARTICIPANT}(${PARTICIPANT_COLUMNS.ID}), `
    + `${ACCOUNT_COLUMNS.RSN}                                               VARCHAR(15) NOT NULL, `
    + `${ACCOUNT_COLUMNS.BH_ROGUE_RANK}                                     BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BH_ROGUE_SCORE}                                    BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BH_HUNTER_RANK}                                    BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BH_HUNTER_SCORE}                                   BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.LMS_RANK}                                          BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.LMS_SCORE}                                         BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_ALL_RANK}                                    BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_ALL_SCORE}                                   BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_EASY_RANK}                                   BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_EASY_SCORE}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_HARD_RANK}                                   BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_HARD_SCORE}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_ELITE_RANK}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_ELITE_SCORE}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_MASTER_RANK}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_MASTER_SCORE}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_MEDIUM_RANK}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_MEDIUM_SCORE}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_BEGINNER_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.CLUES_BEGINNER_SCORE}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_OBOR_RANK}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_OBOR_SCORE}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_MIMIC_RANK}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_MIMIC_SCORE}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KRAKEN_RANK}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KRAKEN_SCORE}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_ZULRAH_RANK}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_ZULRAH_SCORE}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_HESPORI_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_HESPORI_SCORE}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_SCORPIA_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_SCORPIA_SCORE}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_SKOTIZO_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_SKOTIZO_SCORE}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_VETION_RANK}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_VETION_SCORE}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_VORKATH_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_VORKATH_SCORE}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_ZALCANO_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_ZALCANO_SCORE}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CALLISTO_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CALLISTO_SCORE}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CERBERUS_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CERBERUS_SCORE}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_BRYOPHYTA_RANK}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_BRYOPHYTA_SCORE}                            BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KREEARRA_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KREEARRA_SCORE}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_SARACHNIS_RANK}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_SARACHNIS_SCORE}                            BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_TZKALZUK_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_TZKALZUK_SCORE}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_TZTOKJAD_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_TZTOKJAD_SCORE}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_VENENATIS_RANK}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_VENENATIS_SCORE}                            BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_GIANT_MOLE_RANK}                            BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_GIANT_MOLE_SCORE}                           BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_WINTERTODT_RANK}                            BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_WINTERTODT_SCORE}                           BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_ABYSSAL_SIRE_RANK}                          BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_ABYSSAL_SIRE_SCORE}                         BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_THE_GAUNTLET_RANK}                          BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_THE_GAUNTLET_SCORE}                         BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAOS_FANATIC_RANK}                         BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAOS_FANATIC_SCORE}                        BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_REX_RANK}                         BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_REX_SCORE}                        BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_BARROWS_CHESTS_RANK}                        BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_BARROWS_CHESTS_SCORE}                       BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KALPHITE_QUEEN_RANK}                        BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KALPHITE_QUEEN_SCORE}                       BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAOS_ELEMENTAL_RANK}                       BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAOS_ELEMENTAL_SCORE}                      BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CORPOREAL_BEAST_RANK}                       BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CORPOREAL_BEAST_SCORE}                      BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_PRIME_RANK}                       BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_PRIME_SCORE}                      BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_ALCHEMICAL_HYDRA_RANK}                      BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_ALCHEMICAL_HYDRA_SCORE}                     BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_GENERAL_GRAARDOR_RANK}                      BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_GENERAL_GRAARDOR_SCORE}                     BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KRIL_TSUTSAROTH_RANK}                       BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KRIL_TSUTSAROTH_SCORE}                      BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_THEATRE_OF_BLOOD_RANK}                      BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_THEATRE_OF_BLOOD_SCORE}                     BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_RANK}                     BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_SCORE}                    BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_COMMANDER_ZILYANA_RANK}                     BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_COMMANDER_ZILYANA_SCORE}                    BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_SUPREME_RANK}                     BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_SUPREME_SCORE}                    BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KING_BLACK_DRAGON_RANK}                     BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_KING_BLACK_DRAGON_SCORE}                    BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CRAZY_ARCHAEOLOGIST_RANK}                   BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CRAZY_ARCHAEOLOGIST_SCORE}                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_GROTESQUE_GUARDIANS_RANK}                   BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_GROTESQUE_GUARDIANS_SCORE}                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_DERANGED_ARCHAEOLOGIST_RANK}                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_DERANGED_ARCHAEOLOGIST_SCORE}               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_THE_CORRUPTED_GAUNTLET_RANK}                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_THE_CORRUPTED_GAUNTLET_SCORE}               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK}             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE}            BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK}      BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE}     BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_MAGIC_XP}                                   BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_MAGIC_RANK}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_MAGIC_LEVEL}                                SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_ATTACK_XP}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_ATTACK_RANK}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_ATTACK_LEVEL}                               SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_HUNTER_XP}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_HUNTER_RANK}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_HUNTER_LEVEL}                               SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_MINING_XP}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_MINING_RANK}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_MINING_LEVEL}                               SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_PRAYER_XP}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_PRAYER_RANK}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_PRAYER_LEVEL}                               SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_RANGED_XP}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_RANGED_RANK}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_RANGED_LEVEL}                               SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_SLAYER_XP}                                  BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_SLAYER_RANK}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_SLAYER_LEVEL}                               SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_AGILITY_XP}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_AGILITY_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_AGILITY_LEVEL}                              SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_COOKING_XP}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_COOKING_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_COOKING_LEVEL}                              SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_DEFENCE_XP}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_DEFENCE_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_DEFENCE_LEVEL}                              SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FARMING_XP}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FARMING_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FARMING_LEVEL}                              SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FISHING_XP}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FISHING_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FISHING_LEVEL}                              SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_OVERALL_XP}                                 BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_OVERALL_RANK}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_OVERALL_LEVEL}                              SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_CRAFTING_XP}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_CRAFTING_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_CRAFTING_LEVEL}                             SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_HERBLORE_XP}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_HERBLORE_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_HERBLORE_LEVEL}                             SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_SMITHING_XP}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_SMITHING_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_SMITHING_LEVEL}                             SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_STRENGTH_XP}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_STRENGTH_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_STRENGTH_LEVEL}                             SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_THIEVING_XP}                                BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_THIEVING_RANK}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_THIEVING_LEVEL}                             SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FLETCHING_XP}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FLETCHING_RANK}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FLETCHING_LEVEL}                            SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_HITPOINTS_XP}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_HITPOINTS_RANK}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_HITPOINTS_LEVEL}                            SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_RUNECRAFT_XP}                               BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_RUNECRAFT_RANK}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_RUNECRAFT_LEVEL}                            SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FIREMAKING_XP}                              BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FIREMAKING_RANK}                            BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_FIREMAKING_LEVEL}                           SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_WOODCUTTING_XP}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_WOODCUTTING_RANK}                           BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_WOODCUTTING_LEVEL}                          SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_CONSTRUCTION_XP}                            BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_CONSTRUCTION_RANK}                          BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.SKILLS_CONSTRUCTION_LEVEL}                         SMALLINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_NIGHTMARE_RANK}                             BIGINT NOT NULL, `
    + `${ACCOUNT_COLUMNS.BOSSES_NIGHTMARE_SCORE}                            BIGINT NOT NULL`
    + ')';

export const createTableStartingAccountStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Participant Accounts Starting Table',
    text: createTableAccountStr(TABLES.STARTING_ACCOUNT),
});

export const createTableCurrentAccountStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Participant Accounts Current Table',
    text: createTableAccountStr(TABLES.CURRENT_ACCOUNT),
});

const upsertAccountStr = (which: string): string => `INSERT INTO ${which}(`
    + `${ACCOUNT_COLUMNS.FK_PARTICIPANT_ID}, `
    + `${ACCOUNT_COLUMNS.RSN}, `
    + `${ACCOUNT_COLUMNS.BH_ROGUE_RANK}, `
    + `${ACCOUNT_COLUMNS.BH_ROGUE_SCORE}, `
    + `${ACCOUNT_COLUMNS.BH_HUNTER_RANK}, `
    + `${ACCOUNT_COLUMNS.BH_HUNTER_SCORE}, `
    + `${ACCOUNT_COLUMNS.LMS_RANK}, `
    + `${ACCOUNT_COLUMNS.LMS_SCORE}, `
    + `${ACCOUNT_COLUMNS.CLUES_ALL_RANK}, `
    + `${ACCOUNT_COLUMNS.CLUES_ALL_SCORE}, `
    + `${ACCOUNT_COLUMNS.CLUES_EASY_RANK}, `
    + `${ACCOUNT_COLUMNS.CLUES_EASY_SCORE}, `
    + `${ACCOUNT_COLUMNS.CLUES_HARD_RANK}, `
    + `${ACCOUNT_COLUMNS.CLUES_HARD_SCORE}, `
    + `${ACCOUNT_COLUMNS.CLUES_ELITE_RANK}, `
    + `${ACCOUNT_COLUMNS.CLUES_ELITE_SCORE}, `
    + `${ACCOUNT_COLUMNS.CLUES_MASTER_RANK}, `
    + `${ACCOUNT_COLUMNS.CLUES_MASTER_SCORE}, `
    + `${ACCOUNT_COLUMNS.CLUES_MEDIUM_RANK}, `
    + `${ACCOUNT_COLUMNS.CLUES_MEDIUM_SCORE}, `
    + `${ACCOUNT_COLUMNS.CLUES_BEGINNER_RANK}, `
    + `${ACCOUNT_COLUMNS.CLUES_BEGINNER_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_OBOR_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_OBOR_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_MIMIC_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_MIMIC_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KRAKEN_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KRAKEN_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_ZULRAH_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_ZULRAH_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_HESPORI_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_HESPORI_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_SCORPIA_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_SCORPIA_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_SKOTIZO_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_SKOTIZO_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_VETION_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_VETION_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_VORKATH_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_VORKATH_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_ZALCANO_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_ZALCANO_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CALLISTO_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CALLISTO_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CERBERUS_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CERBERUS_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_BRYOPHYTA_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_BRYOPHYTA_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KREEARRA_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KREEARRA_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_SARACHNIS_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_SARACHNIS_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_TZKALZUK_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_TZKALZUK_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_TZTOKJAD_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_TZTOKJAD_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_VENENATIS_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_VENENATIS_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_GIANT_MOLE_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_GIANT_MOLE_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_WINTERTODT_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_WINTERTODT_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_ABYSSAL_SIRE_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_ABYSSAL_SIRE_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_THE_GAUNTLET_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_THE_GAUNTLET_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAOS_FANATIC_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAOS_FANATIC_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_REX_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_REX_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_BARROWS_CHESTS_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_BARROWS_CHESTS_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KALPHITE_QUEEN_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KALPHITE_QUEEN_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAOS_ELEMENTAL_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAOS_ELEMENTAL_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CORPOREAL_BEAST_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CORPOREAL_BEAST_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_PRIME_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_PRIME_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_ALCHEMICAL_HYDRA_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_ALCHEMICAL_HYDRA_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_GENERAL_GRAARDOR_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_GENERAL_GRAARDOR_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KRIL_TSUTSAROTH_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KRIL_TSUTSAROTH_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_THEATRE_OF_BLOOD_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_THEATRE_OF_BLOOD_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_COMMANDER_ZILYANA_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_COMMANDER_ZILYANA_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_SUPREME_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_DAGANNOTH_SUPREME_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KING_BLACK_DRAGON_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_KING_BLACK_DRAGON_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CRAZY_ARCHAEOLOGIST_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CRAZY_ARCHAEOLOGIST_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_GROTESQUE_GUARDIANS_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_GROTESQUE_GUARDIANS_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_DERANGED_ARCHAEOLOGIST_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_DERANGED_ARCHAEOLOGIST_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_THE_CORRUPTED_GAUNTLET_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_THE_CORRUPTED_GAUNTLET_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE}, `
    + `${ACCOUNT_COLUMNS.SKILLS_MAGIC_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_MAGIC_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_MAGIC_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_ATTACK_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_ATTACK_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_ATTACK_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_HUNTER_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_HUNTER_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_HUNTER_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_MINING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_MINING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_MINING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_PRAYER_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_PRAYER_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_PRAYER_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_RANGED_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_RANGED_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_RANGED_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_SLAYER_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_SLAYER_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_SLAYER_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_AGILITY_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_AGILITY_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_AGILITY_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_COOKING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_COOKING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_COOKING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_DEFENCE_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_DEFENCE_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_DEFENCE_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FARMING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FARMING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FARMING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FISHING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FISHING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FISHING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_OVERALL_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_OVERALL_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_OVERALL_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_CRAFTING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_CRAFTING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_CRAFTING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_HERBLORE_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_HERBLORE_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_HERBLORE_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_SMITHING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_SMITHING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_SMITHING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_STRENGTH_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_STRENGTH_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_STRENGTH_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_THIEVING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_THIEVING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_THIEVING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FLETCHING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FLETCHING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FLETCHING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_HITPOINTS_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_HITPOINTS_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_HITPOINTS_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_RUNECRAFT_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_RUNECRAFT_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_RUNECRAFT_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FIREMAKING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FIREMAKING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_FIREMAKING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_WOODCUTTING_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_WOODCUTTING_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_WOODCUTTING_LEVEL}, `
    + `${ACCOUNT_COLUMNS.SKILLS_CONSTRUCTION_XP}, `
    + `${ACCOUNT_COLUMNS.SKILLS_CONSTRUCTION_RANK}, `
    + `${ACCOUNT_COLUMNS.SKILLS_CONSTRUCTION_LEVEL}, `
    + `${ACCOUNT_COLUMNS.BOSSES_NIGHTMARE_RANK}, `
    + `${ACCOUNT_COLUMNS.BOSSES_NIGHTMARE_SCORE}`
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
    + '$182'
    + ') ON CONFLICT DO NOTHING '
    + `RETURNING ${ACCOUNT_COLUMNS.ID}`;

export const upsertStartingAccountStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Participant Starting Account',
    text: upsertAccountStr(TABLES.STARTING_ACCOUNT),
});

export const upsertCurrentAccountStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Participant Current Account',
    text: upsertAccountStr(TABLES.CURRENT_ACCOUNT),
});

const createTableGuildsStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.GUILD}(`
    + `${GUILD_COLUMNS.ID}             SERIAL PRIMARY KEY, `
    + `${GUILD_COLUMNS.FK_EVENT_ID}    INTEGER REFERENCES ${TABLES.EVENT}(${EVENT_COLUMNS.ID}), `
    + `${GUILD_COLUMNS.GUILD_ID}       VARCHAR(50) NOT NULL, `
    + `${GUILD_COLUMNS.IS_CREATOR}     BOOLEAN DEFAULT FALSE`
    + ')';

export const createTableGuildStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Event Guilds Table',
    text: createTableGuildsStr,
});

const upsertGuildStr: string = `INSERT INTO ${TABLES.GUILD}(`
    + `${GUILD_COLUMNS.FK_EVENT_ID}, `
    + `${GUILD_COLUMNS.GUILD_ID}, `
    + `${GUILD_COLUMNS.IS_CREATOR}`
    + ') VALUES ('
    + '$1, $2, $3'
    + ') ON CONFLICT DO NOTHING '
    + `RETURNING ${GUILD_COLUMNS.ID}`;

export const upsertGuildStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Event Guild',
    text: upsertGuildStr,
});

const createTableMessagesStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.MESSAGE}(`
    + `${MESSAGE_COLUMNS.ID}              SERIAL PRIMARY KEY, `
    + `${MESSAGE_COLUMNS.FK_GUILD_ID}     INTEGER REFERENCES ${TABLES.GUILD}(${GUILD_COLUMNS.ID}), `
    + `${MESSAGE_COLUMNS.CHANNEL_ID}      VARCHAR(50) NOT NULL, `
    + `${MESSAGE_COLUMNS.MESSAGE_ID}      VARCHAR(50) NOT NULL`
    + ')';

export const createTableMessageStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Guild Messages Table',
    text: createTableMessagesStr,
});

const upsertMessageStr: string = `INSERT INTO ${TABLES.MESSAGE}(`
    + `${MESSAGE_COLUMNS.FK_GUILD_ID}, `
    + `${MESSAGE_COLUMNS.CHANNEL_ID}, `
    + `${MESSAGE_COLUMNS.MESSAGE_ID}`
    + ') VALUES ('
    + '$1, $2, $3'
    + ') ON CONFLICT DO NOTHING '
    + `RETURNING ${MESSAGE_COLUMNS.ID}`;

export const upsertMessagesStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Guild Message',
    text: upsertMessageStr,
});

const createTableTrackingStr: string = `CREATE TABLE IF NOT EXISTS ${TABLES.TRACKING}(`
    + `${TRACKING_COLUMNS.ID} SERIAL PRIMARY KEY, `
    + `${TRACKING_COLUMNS.FK_EVENT_ID} UNIQUE INTEGER REFERENCES ${TABLES.EVENT}(${EVENT_COLUMNS.ID}), `
    + `${TRACKING_COLUMNS.BH_ROGUE_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BH_ROGUE_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BH_HUNTER_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BH_HUNTER_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.LMS_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.LMS_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_ALL_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_ALL_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_EASY_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_EASY_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_HARD_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_HARD_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_ELITE_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_ELITE_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_MASTER_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_MASTER_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_MEDIUM_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_MEDIUM_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_BEGINNER_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.CLUES_BEGINNER_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_OBOR_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_OBOR_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_MIMIC_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_MIMIC_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KRAKEN_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KRAKEN_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_ZULRAH_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_ZULRAH_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_HESPORI_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_HESPORI_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_SCORPIA_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_SCORPIA_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_SKOTIZO_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_SKOTIZO_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_VETION_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_VETION_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_VORKATH_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_VORKATH_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_ZALCANO_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_ZALCANO_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CALLISTO_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CALLISTO_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CERBERUS_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CERBERUS_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_BRYOPHYTA_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_BRYOPHYTA_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KREEARRA_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KREEARRA_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_SARACHNIS_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_SARACHNIS_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_TZKALZUK_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_TZKALZUK_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_TZTOKJAD_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_TZTOKJAD_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_VENENATIS_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_VENENATIS_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_GIANT_MOLE_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_GIANT_MOLE_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_WINTERTODT_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_WINTERTODT_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_ABYSSAL_SIRE_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_ABYSSAL_SIRE_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_THE_GAUNTLET_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_THE_GAUNTLET_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CHAOS_FANATIC_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CHAOS_FANATIC_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_REX_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_REX_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_BARROWS_CHESTS_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_BARROWS_CHESTS_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KALPHITE_QUEEN_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KALPHITE_QUEEN_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CHAOS_ELEMENTAL_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CHAOS_ELEMENTAL_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CORPOREAL_BEAST_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CORPOREAL_BEAST_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_PRIME_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_PRIME_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_ALCHEMICAL_HYDRA_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_ALCHEMICAL_HYDRA_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_GENERAL_GRAARDOR_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_GENERAL_GRAARDOR_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KRIL_TSUTSAROTH_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KRIL_TSUTSAROTH_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_THEATRE_OF_BLOOD_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_THEATRE_OF_BLOOD_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_COMMANDER_ZILYANA_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_COMMANDER_ZILYANA_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_SUPREME_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_SUPREME_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KING_BLACK_DRAGON_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_KING_BLACK_DRAGON_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CRAZY_ARCHAEOLOGIST_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CRAZY_ARCHAEOLOGIST_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_GROTESQUE_GUARDIANS_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_GROTESQUE_GUARDIANS_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_DERANGED_ARCHAEOLOGIST_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_DERANGED_ARCHAEOLOGIST_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_THE_CORRUPTED_GAUNTLET_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_THE_CORRUPTED_GAUNTLET_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_MAGIC_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_MAGIC_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_MAGIC_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_ATTACK_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_ATTACK_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_ATTACK_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_HUNTER_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_HUNTER_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_HUNTER_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_MINING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_MINING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_MINING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_PRAYER_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_PRAYER_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_PRAYER_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_RANGED_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_RANGED_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_RANGED_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_SLAYER_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_SLAYER_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_SLAYER_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_AGILITY_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_AGILITY_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_AGILITY_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_COOKING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_COOKING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_COOKING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_DEFENCE_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_DEFENCE_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_DEFENCE_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FARMING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FARMING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FARMING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FISHING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FISHING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FISHING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_OVERALL_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_OVERALL_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_OVERALL_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_CRAFTING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_CRAFTING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_CRAFTING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_HERBLORE_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_HERBLORE_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_HERBLORE_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_SMITHING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_SMITHING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_SMITHING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_STRENGTH_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_STRENGTH_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_STRENGTH_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_THIEVING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_THIEVING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_THIEVING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FLETCHING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FLETCHING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FLETCHING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_HITPOINTS_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_HITPOINTS_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_HITPOINTS_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_RUNECRAFT_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_RUNECRAFT_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_RUNECRAFT_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FIREMAKING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FIREMAKING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_FIREMAKING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_WOODCUTTING_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_WOODCUTTING_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_WOODCUTTING_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_CONSTRUCTION_XP} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_CONSTRUCTION_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.SKILLS_CONSTRUCTION_LEVEL} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_NIGHTMARE_RANK} BOOLEAN NOT NULL, `
    + `${TRACKING_COLUMNS.BOSSES_NIGHTMARE_SCORE} BOOLEAN NOT NULL `
    + ')';

export const createTableTrackingStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Create Event Tracking Table',
    text: createTableTrackingStr,
});

const upsertTrackingStr = `INSERT INTO ${TABLES.TRACKING}(`
    + 'fk_participant_id, '
    + `${TRACKING_COLUMNS.BH_ROGUE_RANK}, `
    + `${TRACKING_COLUMNS.BH_ROGUE_SCORE}, `
    + `${TRACKING_COLUMNS.BH_HUNTER_RANK}, `
    + `${TRACKING_COLUMNS.BH_HUNTER_SCORE}, `
    + `${TRACKING_COLUMNS.LMS_RANK}, `
    + `${TRACKING_COLUMNS.LMS_SCORE}, `
    + `${TRACKING_COLUMNS.CLUES_ALL_RANK}, `
    + `${TRACKING_COLUMNS.CLUES_ALL_SCORE}, `
    + `${TRACKING_COLUMNS.CLUES_EASY_RANK}, `
    + `${TRACKING_COLUMNS.CLUES_EASY_SCORE}, `
    + `${TRACKING_COLUMNS.CLUES_HARD_RANK}, `
    + `${TRACKING_COLUMNS.CLUES_HARD_SCORE}, `
    + `${TRACKING_COLUMNS.CLUES_ELITE_RANK}, `
    + `${TRACKING_COLUMNS.CLUES_ELITE_SCORE}, `
    + `${TRACKING_COLUMNS.CLUES_MASTER_RANK}, `
    + `${TRACKING_COLUMNS.CLUES_MASTER_SCORE}, `
    + `${TRACKING_COLUMNS.CLUES_MEDIUM_RANK}, `
    + `${TRACKING_COLUMNS.CLUES_MEDIUM_SCORE}, `
    + `${TRACKING_COLUMNS.CLUES_BEGINNER_RANK}, `
    + `${TRACKING_COLUMNS.CLUES_BEGINNER_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_OBOR_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_OBOR_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_MIMIC_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_MIMIC_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_KRAKEN_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_KRAKEN_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_ZULRAH_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_ZULRAH_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_HESPORI_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_HESPORI_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_SCORPIA_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_SCORPIA_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_SKOTIZO_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_SKOTIZO_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_VETION_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_VETION_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_VORKATH_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_VORKATH_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_ZALCANO_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_ZALCANO_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_CALLISTO_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_CALLISTO_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_CERBERUS_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_CERBERUS_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_BRYOPHYTA_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_BRYOPHYTA_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_KREEARRA_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_KREEARRA_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_SARACHNIS_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_SARACHNIS_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_TZKALZUK_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_TZKALZUK_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_TZTOKJAD_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_TZTOKJAD_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_VENENATIS_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_VENENATIS_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_GIANT_MOLE_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_GIANT_MOLE_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_WINTERTODT_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_WINTERTODT_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_ABYSSAL_SIRE_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_ABYSSAL_SIRE_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_THE_GAUNTLET_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_THE_GAUNTLET_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_CHAOS_FANATIC_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_CHAOS_FANATIC_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_REX_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_REX_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_BARROWS_CHESTS_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_BARROWS_CHESTS_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_KALPHITE_QUEEN_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_KALPHITE_QUEEN_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_CHAOS_ELEMENTAL_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_CHAOS_ELEMENTAL_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_CORPOREAL_BEAST_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_CORPOREAL_BEAST_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_PRIME_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_PRIME_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_ALCHEMICAL_HYDRA_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_ALCHEMICAL_HYDRA_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_GENERAL_GRAARDOR_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_GENERAL_GRAARDOR_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_KRIL_TSUTSAROTH_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_KRIL_TSUTSAROTH_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_THEATRE_OF_BLOOD_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_THEATRE_OF_BLOOD_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_COMMANDER_ZILYANA_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_COMMANDER_ZILYANA_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_SUPREME_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_DAGANNOTH_SUPREME_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_KING_BLACK_DRAGON_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_KING_BLACK_DRAGON_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_CRAZY_ARCHAEOLOGIST_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_CRAZY_ARCHAEOLOGIST_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_GROTESQUE_GUARDIANS_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_GROTESQUE_GUARDIANS_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_DERANGED_ARCHAEOLOGIST_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_DERANGED_ARCHAEOLOGIST_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_THE_CORRUPTED_GAUNTLET_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_THE_CORRUPTED_GAUNTLET_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE}, `
    + `${TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE}, `
    + `${TRACKING_COLUMNS.SKILLS_MAGIC_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_MAGIC_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_MAGIC_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_ATTACK_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_ATTACK_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_ATTACK_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_HUNTER_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_HUNTER_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_HUNTER_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_MINING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_MINING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_MINING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_PRAYER_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_PRAYER_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_PRAYER_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_RANGED_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_RANGED_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_RANGED_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_SLAYER_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_SLAYER_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_SLAYER_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_AGILITY_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_AGILITY_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_AGILITY_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_COOKING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_COOKING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_COOKING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_DEFENCE_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_DEFENCE_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_DEFENCE_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_FARMING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_FARMING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_FARMING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_FISHING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_FISHING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_FISHING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_OVERALL_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_OVERALL_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_OVERALL_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_CRAFTING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_CRAFTING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_CRAFTING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_HERBLORE_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_HERBLORE_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_HERBLORE_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_SMITHING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_SMITHING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_SMITHING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_STRENGTH_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_STRENGTH_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_STRENGTH_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_THIEVING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_THIEVING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_THIEVING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_FLETCHING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_FLETCHING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_FLETCHING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_HITPOINTS_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_HITPOINTS_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_HITPOINTS_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_RUNECRAFT_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_RUNECRAFT_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_RUNECRAFT_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_FIREMAKING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_FIREMAKING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_FIREMAKING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_WOODCUTTING_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_WOODCUTTING_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_WOODCUTTING_LEVEL}, `
    + `${TRACKING_COLUMNS.SKILLS_CONSTRUCTION_XP}, `
    + `${TRACKING_COLUMNS.SKILLS_CONSTRUCTION_RANK}, `
    + `${TRACKING_COLUMNS.SKILLS_CONSTRUCTION_LEVEL}, `
    + `${TRACKING_COLUMNS.BOSSES_NIGHTMARE_RANK}, `
    + `${TRACKING_COLUMNS.BOSSES_NIGHTMARE_SCORE}`
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
    + '$181'
    + ') ON CONFLICT DO NOTHING '
    + `RETURNING ${TRACKING_COLUMNS.ID}`;

export const upsertTrackingStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Upsert Event Tracking',
    text: upsertTrackingStr,
});

const fetchEventJsonStr = 'SELECT jsonb_build_object('
    + `'id', e.${EVENT_COLUMNS.ID}, `
    + `'name', e.${EVENT_COLUMNS.NAME}, `
    + '\'when\', jsonb_build_object('
    + `'start', e.${EVENT_COLUMNS.WHEN_START}, `
    + `'end', e.${EVENT_COLUMNS.WHEN_END} `
    + '), '
    + `'global', e.${EVENT_COLUMNS.GLOBAL}, `
    + '\'tracking\', json_build_object( '
    + `'category', e.${EVENT_COLUMNS.TRACKING_CATEGORY},`
    + `'what', e.${EVENT_COLUMNS.TRACKING_WHAT}), `
    + `'adminLocked', e.${EVENT_COLUMNS.ADMIN_LOCKED}, `
    + '\'guilds\', jsonb_build_object( '
    + '\'creator\', creator_guild, '
    + '\'others\', other_guilds '
    + '), '
    + '\'teams\', teams '
    + ') '
    + 'FROM event e '
    // left join creator guild
    + 'LEFT JOIN ('
    + 'SELECT fk_event_id, jsonb_object_agg('
    + `'guildId', g_creator.${GUILD_COLUMNS.GUILD_ID} `
    + ') || jsonb_object_agg( '
    + '\'scoreboardMessages\', scoreboard_creator '
    + ') creator_guild '
    + 'FROM guild g_creator '
    // creator guild's messages
    + 'LEFT JOIN ( '
    + 'SELECT fk_guild_id, jsonb_agg( '
    + 'jsonb_build_object( '
    + `'channelId', m_creator.${MESSAGE_COLUMNS.CHANNEL_ID}, `
    + `'messageId', m_creator.${MESSAGE_COLUMNS.MESSAGE_ID} `
    + ')'
    + ') scoreboard_creator '
    + 'FROM message m_creator '
    + 'GROUP BY fk_guild_id '
    + `) m_creator ON g_creator.${GUILD_COLUMNS.ID} = m_creator.${MESSAGE_COLUMNS.FK_GUILD_ID} `
    + `WHERE g_creator.${GUILD_COLUMNS.IS_CREATOR} = TRUE `
    + 'GROUP BY fk_event_id '
    + `) g_creator ON e.${EVENT_COLUMNS.ID} = g_creator.${GUILD_COLUMNS.FK_EVENT_ID} `
    // left join other guilds
    + 'LEFT JOIN ( '
    + 'SELECT fk_event_id, jsonb_agg( '
    + 'jsonb_build_object( '
    + `'guildId', g_others.${GUILD_COLUMNS.GUILD_ID}, `
    + '\'scoreboardMessages\', scoreboard_others '
    + ') '
    + ') other_guilds '
    + '    FROM guild g_others '
    // others' messages
    + 'LEFT JOIN ( '
    + 'SELECT fk_guild_id, jsonb_agg( '
    + 'jsonb_build_object( '
    + `'channelId', m_others.${MESSAGE_COLUMNS.CHANNEL_ID}, `
    + `'messageId', m_others.${MESSAGE_COLUMNS.MESSAGE_ID} `
    + ') '
    + ') scoreboard_others '
    + 'FROM message m_others '
    + 'GROUP BY fk_guild_id '
    + `) m_others ON g_others.${GUILD_COLUMNS.ID} = m_others.${MESSAGE_COLUMNS.FK_GUILD_ID} `
    + `WHERE g_others.${GUILD_COLUMNS.IS_CREATOR} = FALSE `
    + 'GROUP BY fk_event_id '
    + `) g_others ON e.${EVENT_COLUMNS.ID} = g_others.${GUILD_COLUMNS.FK_EVENT_ID} `
    // left join teams
    + 'LEFT JOIN ( '
    + 'SELECT fk_event_id, jsonb_agg( '
    + 'json_build_object( '
    + `'name', t.${TEAM_COLUMNS.NAME}, `
    + `'guildId', t.${TEAM_COLUMNS.GUILD_ID}, `
    + '\'participants\', participants '
    + ') '
    + ') teams '
    + 'FROM team t '
    // teams' participants
    + 'LEFT JOIN ( '
    + 'SELECT fk_team_id, jsonb_agg( '
    + 'json_build_object( '
    + `'userId', p.${PARTICIPANT_COLUMNS.USER_ID}, `
    + `'customScore', p.${PARTICIPANT_COLUMNS.USER_ID}, `
    + '\'runescapeAccounts\', runescape_accounts '
    + ') '
    + ') participants '
    + 'FROM participant p '
    // participants' accounts
    + 'LEFT JOIN ( '
    + 'SELECT fk_participant_id, jsonb_agg( '
    + 'jsonb_build_object( '
    + `'rsn', a.${ACCOUNT_COLUMNS.RSN}, `
    + '\'ending\', jsonb_build_object( '
    + '\'bh\', jsonb_build_object( '
    + '\'rogue\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BH_ROGUE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BH_ROGUE_SCORE} `
    + '), '
    + '\'hunter\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BH_HUNTER_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BH_HUNTER_SCORE} `
    + ') '
    + '), '
    + '\'lms\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_LMS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_LMS_SCORE} `
    + '), '
    + '\'clues\', jsonb_build_object( '
    + '\'all\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_CLUES_ALL_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_CLUES_ALL_SCORE} `
    + '), '
    + '\'easy\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_CLUES_EASY_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_CLUES_EASY_SCORE} `
    + '), '
    + '\'hard\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_CLUES_HARD_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_CLUES_HARD_SCORE} `
    + '), '
    + '\'elite\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_CLUES_ELITE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_CLUES_ELITE_SCORE} `
    + '), '
    + '\'master\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_CLUES_MASTER_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_CLUES_MASTER_SCORE} `
    + '), '
    + '\'medium\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_CLUES_MEDIUM_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_CLUES_MEDIUM_SCORE} `
    + '), '
    + '\'beginner\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_CLUES_BEGINNER_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_CLUES_BEGINNER_SCORE} `
    + ') '
    + '), '
    + '\'bosses\', jsonb_build_object( '
    + '\'Obor\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_OBOR_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_OBOR_SCORE} `
    + '), '
    + '\'Mimic\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_MIMIC_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_MIMIC_SCORE} `
    + '), '
    + '\'Kraken\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KRAKEN_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KRAKEN_SCORE} `
    + '), '
    + '\'Zulrah\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_ZULRAH_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_ZULRAH_SCORE} `
    + '), '
    + '\'Hespori\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_HESPORI_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_HESPORI_SCORE} `
    + '), '
    + '\'Scorpia\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_SCORPIA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_SCORPIA_SCORE} `
    + '), '
    + '\'Skotizo\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_SKOTIZO_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_SKOTIZO_SCORE} `
    + '), '
    + '\'Vet\'\'ion\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_VETION_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_VETION_SCORE} `
    + '), '
    + '\'Vorkath\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_VORKATH_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_VORKATH_SCORE} `
    + '), '
    + '\'Zalcano\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_ZALCANO_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_ZALCANO_SCORE} `
    + '), '
    + '\'Callisto\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CALLISTO_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CALLISTO_SCORE} `
    + '), '
    + '\'Cerberus\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CERBERUS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CERBERUS_SCORE} `
    + '), '
    + '\'Bryophyta\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_BRYOPHYTA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_BRYOPHYTA_SCORE} `
    + '), '
    + '\'Kree\'\'Arra\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KREEARRA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KREEARRA_SCORE} `
    + '), '
    + '\'Sarachnis\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_SARACHNIS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_SARACHNIS_SCORE} `
    + '), '
    + '\'TzKal-Zuk\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_TZKALZUK_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_TZKALZUK_SCORE} `
    + '), '
    + '\'TzTok-Jad\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_TZTOKJAD_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_TZTOKJAD_SCORE} `
    + '), '
    + '\'Venenatis\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_VENENATIS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_VENENATIS_SCORE} `
    + '), '
    + '\'Giant Mole\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_GIANT_MOLE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_GIANT_MOLE_SCORE} `
    + '), '
    + '\'Wintertodt\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_WINTERTODT_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_WINTERTODT_SCORE} `
    + '), '
    + '\'Abyssal Sire\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_ABYSSAL_SIRE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_ABYSSAL_SIRE_SCORE} `
    + '), '
    + '\'The Gauntlet\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_THE_GAUNTLET_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_THE_GAUNTLET_SCORE} `
    + '), '
    + '\'Chaos Fanatic\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAOS_FANATIC_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAOS_FANATIC_SCORE} `
    + '), '
    + '\'Dagannoth Rex\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_REX_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_REX_SCORE} `
    + '), '
    + '\'Barrows Chests\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_BARROWS_CHESTS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_BARROWS_CHESTS_SCORE} `
    + '), '
    + '\'Kalphite Queen\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KALPHITE_QUEEN_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KALPHITE_QUEEN_SCORE} `
    + '), '
    + '\'Chaos Elemental\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAOS_ELEMENTAL_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAOS_ELEMENTAL_SCORE} `
    + '), '
    + '\'Corporeal Beast\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CORPOREAL_BEAST_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CORPOREAL_BEAST_SCORE} `
    + '), '
    + '\'Dagannoth Prime\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_PRIME_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_PRIME_SCORE} `
    + '), '
    + '\'Alchemical Hydra\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_ALCHEMICAL_HYDRA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_ALCHEMICAL_HYDRA_SCORE} `
    + '), '
    + '\'General Graardor\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_GENERAL_GRAARDOR_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_GENERAL_GRAARDOR_SCORE} `
    + '), '
    + '\'K\'\'ril Tsutsaroth\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KRIL_TSUTSAROTH_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KRIL_TSUTSAROTH_SCORE} `
    + '), '
    + '\'Theatre of Blood\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_THEATRE_OF_BLOOD_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_THEATRE_OF_BLOOD_SCORE} `
    + '), '
    + '\'Chambers of Xeric\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAMBERS_OF_XERIC_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAMBERS_OF_XERIC_SCORE} `
    + '), '
    + '\'Commander Zilyana\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_COMMANDER_ZILYANA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_COMMANDER_ZILYANA_SCORE} `
    + '), '
    + '\'Dagannoth Supreme\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_SUPREME_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_DAGANNOTH_SUPREME_SCORE} `
    + '), '
    + '\'King Black Dragon\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KING_BLACK_DRAGON_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_KING_BLACK_DRAGON_SCORE} `
    + '), '
    + '\'Crazy Archaeologist\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CRAZY_ARCHAEOLOGIST_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CRAZY_ARCHAEOLOGIST_SCORE} `
    + '), '
    + '\'Grotesque Guardians\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_GROTESQUE_GUARDIANS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_GROTESQUE_GUARDIANS_SCORE} `
    + '), '
    + '\'Deranged Archaeologist\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_DERANGED_ARCHAEOLOGIST_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_DERANGED_ARCHAEOLOGIST_SCORE} `
    + '), '
    + '\'The Corrupted Gauntlet\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_THE_CORRUPTED_GAUNTLET_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_THE_CORRUPTED_GAUNTLET_SCORE} `
    + '), '
    + '\'Thermonuclear Smoke Devil\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE} `
    + '), '
    + '\'Chambers of Xeric: Challenge Mode\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.ENDING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE} `
    + ') '
    + '), '
    + '\'skills\', jsonb_build_object( '
    + '\'magic\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_MAGIC_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_MAGIC_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_MAGIC_LEVEL} `
    + '), '
    + '\'attack\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_ATTACK_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_ATTACK_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_ATTACK_LEVEL} `
    + '), '
    + '\'hunter\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_HUNTER_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_HUNTER_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_HUNTER_LEVEL} `
    + '), '
    + '\'mining\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_MINING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_MINING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_MINING_LEVEL} `
    + '), '
    + '\'prayer\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_PRAYER_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_PRAYER_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_PRAYER_LEVEL} `
    + '), '
    + '\'ranged\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_RANGED_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_RANGED_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_RANGED_LEVEL} `
    + '), '
    + '\'slayer\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_SLAYER_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_SLAYER_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_SLAYER_LEVEL} `
    + '), '
    + '\'agility\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_AGILITY_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_AGILITY_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_AGILITY_LEVEL} `
    + '), '
    + '\'cooking\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_COOKING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_COOKING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_COOKING_LEVEL} `
    + '), '
    + '\'defence\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_DEFENCE_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_DEFENCE_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_DEFENCE_LEVEL} `
    + '), '
    + '\'farming\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FARMING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FARMING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FARMING_LEVEL} `
    + '), '
    + '\'fishing\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FISHING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FISHING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FISHING_LEVEL} `
    + '), '
    + '\'overall\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_OVERALL_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_OVERALL_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_OVERALL_LEVEL} `
    + '), '
    + '\'crafting\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_CRAFTING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_CRAFTING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_CRAFTING_LEVEL} `
    + '), '
    + '\'herblore\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_HERBLORE_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_HERBLORE_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_HERBLORE_LEVEL} `
    + '), '
    + '\'smithing\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_SMITHING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_SMITHING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_SMITHING_LEVEL} `
    + '), '
    + '\'strength\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_STRENGTH_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_STRENGTH_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_STRENGTH_LEVEL} `
    + '), '
    + '\'thieving\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_THIEVING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_THIEVING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_THIEVING_LEVEL} `
    + '), '
    + '\'fletching\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FLETCHING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FLETCHING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FLETCHING_LEVEL} `
    + '), '
    + '\'hitpoints\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_HITPOINTS_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_HITPOINTS_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_HITPOINTS_LEVEL} `
    + '), '
    + '\'runecraft\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_RUNECRAFT_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_RUNECRAFT_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_RUNECRAFT_LEVEL} `
    + '), '
    + '\'firemaking\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FIREMAKING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FIREMAKING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_FIREMAKING_LEVEL} `
    + '), '
    + '\'woodcutting\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_WOODCUTTING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_WOODCUTTING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_WOODCUTTING_LEVEL} `
    + '), '
    + '\'construction\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_CONSTRUCTION_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_CONSTRUCTION_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.ENDING_SKILLS_CONSTRUCTION_LEVEL} `
    + ') '
    + ') '
    + '), '
    + '\'starting\', jsonb_build_object( '
    + '\'bh\', jsonb_build_object( '
    + '\'rogue\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BH_ROGUE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BH_ROGUE_SCORE} `
    + '), '
    + '\'hunter\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BH_HUNTER_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BH_HUNTER_SCORE} `
    + ') '
    + '), '
    + '\'lms\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_LMS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_LMS_SCORE} `
    + '), '
    + '\'clues\', jsonb_build_object( '
    + '\'all\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_CLUES_ALL_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_CLUES_ALL_SCORE} `
    + '), '
    + '\'easy\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_CLUES_EASY_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_CLUES_EASY_SCORE} `
    + '), '
    + '\'hard\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_CLUES_HARD_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_CLUES_HARD_SCORE} `
    + '), '
    + '\'elite\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_CLUES_ELITE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_CLUES_ELITE_SCORE} `
    + '), '
    + '\'master\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_CLUES_MASTER_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_CLUES_MASTER_SCORE} `
    + '), '
    + '\'medium\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_CLUES_MEDIUM_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_CLUES_MEDIUM_SCORE} `
    + '), '
    + '\'beginner\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_CLUES_BEGINNER_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_CLUES_BEGINNER_SCORE} `
    + ') '
    + '), '
    + '\'bosses\', jsonb_build_object( '
    + '\'Obor\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_OBOR_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_OBOR_SCORE} `
    + '), '
    + '\'Mimic\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_MIMIC_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_MIMIC_SCORE} `
    + '), '
    + '\'Kraken\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KRAKEN_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KRAKEN_SCORE} `
    + '), '
    + '\'Zulrah\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_ZULRAH_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_ZULRAH_SCORE} `
    + '), '
    + '\'Hespori\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_HESPORI_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_HESPORI_SCORE} `
    + '), '
    + '\'Scorpia\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_SCORPIA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_SCORPIA_SCORE} `
    + '), '
    + '\'Skotizo\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_SKOTIZO_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_SKOTIZO_SCORE} `
    + '), '
    + '\'Vet\'\'ion\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_VETION_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_VETION_SCORE} `
    + '), '
    + '\'Vorkath\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_VORKATH_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_VORKATH_SCORE} `
    + '), '
    + '\'Zalcano\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_ZALCANO_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_ZALCANO_SCORE} `
    + '), '
    + '\'Callisto\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CALLISTO_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CALLISTO_SCORE} `
    + '), '
    + '\'Cerberus\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CERBERUS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CERBERUS_SCORE} `
    + '), '
    + '\'Bryophyta\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_BRYOPHYTA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_BRYOPHYTA_SCORE} `
    + '), '
    + '\'Kree\'\'Arra\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KREEARRA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KREEARRA_SCORE} `
    + '), '
    + '\'Sarachnis\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_SARACHNIS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_SARACHNIS_SCORE} `
    + '), '
    + '\'TzKal-Zuk\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_TZKALZUK_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_TZKALZUK_SCORE} `
    + '), '
    + '\'TzTok-Jad\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_TZTOKJAD_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_TZTOKJAD_SCORE} `
    + '), '
    + '\'Venenatis\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_VENENATIS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_VENENATIS_SCORE} `
    + '), '
    + '\'Giant Mole\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_GIANT_MOLE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_GIANT_MOLE_SCORE} `
    + '), '
    + '\'Wintertodt\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_WINTERTODT_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_WINTERTODT_SCORE} `
    + '), '
    + '\'Abyssal Sire\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_ABYSSAL_SIRE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_ABYSSAL_SIRE_SCORE} `
    + '), '
    + '\'The Gauntlet\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_THE_GAUNTLET_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_THE_GAUNTLET_SCORE} `
    + '), '
    + '\'Chaos Fanatic\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAOS_FANATIC_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAOS_FANATIC_SCORE} `
    + '), '
    + '\'Dagannoth Rex\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_REX_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_REX_SCORE} `
    + '), '
    + '\'Barrows Chests\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_BARROWS_CHESTS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_BARROWS_CHESTS_SCORE} `
    + '), '
    + '\'Kalphite Queen\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KALPHITE_QUEEN_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KALPHITE_QUEEN_SCORE} `
    + '), '
    + '\'Chaos Elemental\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAOS_ELEMENTAL_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAOS_ELEMENTAL_SCORE} `
    + '), '
    + '\'Corporeal Beast\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CORPOREAL_BEAST_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CORPOREAL_BEAST_SCORE} `
    + '), '
    + '\'Dagannoth Prime\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_PRIME_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_PRIME_SCORE} `
    + '), '
    + '\'Alchemical Hydra\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_ALCHEMICAL_HYDRA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_ALCHEMICAL_HYDRA_SCORE} `
    + '), '
    + '\'General Graardor\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_GENERAL_GRAARDOR_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_GENERAL_GRAARDOR_SCORE} `
    + '), '
    + '\'K\'\'ril Tsutsaroth\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KRIL_TSUTSAROTH_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KRIL_TSUTSAROTH_SCORE} `
    + '), '
    + '\'Theatre of Blood\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_THEATRE_OF_BLOOD_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_THEATRE_OF_BLOOD_SCORE} `
    + '), '
    + '\'Chambers of Xeric\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAMBERS_OF_XERIC_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAMBERS_OF_XERIC_SCORE} `
    + '), '
    + '\'Commander Zilyana\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_COMMANDER_ZILYANA_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_COMMANDER_ZILYANA_SCORE} `
    + '), '
    + '\'Dagannoth Supreme\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_SUPREME_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_DAGANNOTH_SUPREME_SCORE} `
    + '), '
    + '\'King Black Dragon\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KING_BLACK_DRAGON_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_KING_BLACK_DRAGON_SCORE} `
    + '), '
    + '\'Crazy Archaeologist\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CRAZY_ARCHAEOLOGIST_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CRAZY_ARCHAEOLOGIST_SCORE} `
    + '), '
    + '\'Grotesque Guardians\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_GROTESQUE_GUARDIANS_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_GROTESQUE_GUARDIANS_SCORE} `
    + '), '
    + '\'Deranged Archaeologist\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_DERANGED_ARCHAEOLOGIST_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_DERANGED_ARCHAEOLOGIST_SCORE} `
    + '), '
    + '\'The Corrupted Gauntlet\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_THE_CORRUPTED_GAUNTLET_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_THE_CORRUPTED_GAUNTLET_SCORE} `
    + '), '
    + '\'Thermonuclear Smoke Devil\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_THERMONUCLEAR_SMOKE_DEVIL_SCORE} `
    + '), '
    + '\'Chambers of Xeric: Challenge Mode\', jsonb_build_object( '
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_RANK}, `
    + `'score', a.${ACCOUNT_COLUMNS.STARTING_BOSSES_CHAMBERS_OF_XERIC_CHALLENGE_MODE_SCORE} `
    + ') '
    + '), '
    + '\'skills\', jsonb_build_object( '
    + '\'magic\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_MAGIC_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_MAGIC_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_MAGIC_LEVEL} `
    + '), '
    + '\'attack\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_ATTACK_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_ATTACK_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_ATTACK_LEVEL} `
    + '), '
    + '\'hunter\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_HUNTER_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_HUNTER_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_HUNTER_LEVEL} `
    + '), '
    + '\'mining\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_MINING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_MINING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_MINING_LEVEL} `
    + '), '
    + '\'prayer\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_PRAYER_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_PRAYER_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_PRAYER_LEVEL} `
    + '), '
    + '\'ranged\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_RANGED_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_RANGED_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_RANGED_LEVEL} `
    + '), '
    + '\'slayer\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_SLAYER_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_SLAYER_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_SLAYER_LEVEL} `
    + '), '
    + '\'agility\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_AGILITY_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_AGILITY_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_AGILITY_LEVEL} `
    + '), '
    + '\'cooking\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_COOKING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_COOKING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_COOKING_LEVEL} `
    + '), '
    + '\'defence\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_DEFENCE_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_DEFENCE_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_DEFENCE_LEVEL} `
    + '), '
    + '\'farming\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FARMING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FARMING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FARMING_LEVEL} `
    + '), '
    + '\'fishing\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FISHING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FISHING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FISHING_LEVEL} `
    + '), '
    + '\'overall\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_OVERALL_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_OVERALL_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_OVERALL_LEVEL} `
    + '), '
    + '\'crafting\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_CRAFTING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_CRAFTING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_CRAFTING_LEVEL} `
    + '), '
    + '\'herblore\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_HERBLORE_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_HERBLORE_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_HERBLORE_LEVEL} `
    + '), '
    + '\'smithing\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_SMITHING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_SMITHING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_SMITHING_LEVEL} `
    + '), '
    + '\'strength\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_STRENGTH_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_STRENGTH_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_STRENGTH_LEVEL} `
    + '), '
    + '\'thieving\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_THIEVING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_THIEVING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_THIEVING_LEVEL} `
    + '), '
    + '\'fletching\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FLETCHING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FLETCHING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FLETCHING_LEVEL} `
    + '), '
    + '\'hitpoints\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_HITPOINTS_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_HITPOINTS_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_HITPOINTS_LEVEL} `
    + '), '
    + '\'runecraft\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_RUNECRAFT_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_RUNECRAFT_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_RUNECRAFT_LEVEL} `
    + '), '
    + '\'firemaking\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FIREMAKING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FIREMAKING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_FIREMAKING_LEVEL} `
    + '), '
    + '\'woodcutting\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_WOODCUTTING_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_WOODCUTTING_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_WOODCUTTING_LEVEL} `
    + '), '
    + '\'construction\', jsonb_build_object( '
    + `'xp', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_CONSTRUCTION_XP}, `
    + `'rank', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_CONSTRUCTION_RANK}, `
    + `'level', a.${ACCOUNT_COLUMNS.STARTING_SKILLS_CONSTRUCTION_LEVEL} `
    + ') '
    + ') '
    + ') '
    + ') '
    + ') runescape_accounts '
    + 'FROM account a '
    + 'GROUP BY fk_participant_id '
    + `) a ON p.${PARTICIPANT_COLUMNS.ID} = a.${ACCOUNT_COLUMNS.FK_PARTICIPANT_ID} `
    + 'GROUP BY fk_team_id '
    + `) p ON t.${TEAM_COLUMNS.ID} = p.${PARTICIPANT_COLUMNS.FK_TEAM_ID} `
    + 'GROUP BY fk_event_id '
    + `) t ON e.${EVENT_COLUMNS.ID} = t.${TEAM_COLUMNS.FK_EVENT_ID} `
    + `WHERE e.${EVENT_COLUMNS.ID} = $1`;

export const fetchEventJsonStmt: pgPromise.PreparedStatement = new PreparedStatement({
    name: 'Fetch Event',
    text: fetchEventJsonStr,
});
