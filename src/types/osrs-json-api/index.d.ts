// Type definitions for osrs-json-api 1.1
// Project: https://github.com/Judaxx/osrs-json-api#readme
// Definitions by: Kyle Miller <https://github.com/kylemiller3>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'osrs-json-api' {
    namespace hiscores {
        export function getPlayer(name: string): Promise<JSON>

        export interface SkillComponent extends Record<string, string | number> {
            rank: string
            level: number
            xp: number
        }
        export interface SkillsInfo extends Record<string, SkillComponent> {
            overall: SkillComponent
            attack: SkillComponent
            defence: SkillComponent
            strength: SkillComponent
            hitpoints: SkillComponent
            ranged: SkillComponent
            prayer: SkillComponent
            magic: SkillComponent
            cooking: SkillComponent
            woodcutting: SkillComponent
            fletching: SkillComponent
            fishing: SkillComponent
            firemaking: SkillComponent
            crafting: SkillComponent
            smithing: SkillComponent
            mining: SkillComponent
            herblore: SkillComponent
            agility: SkillComponent
            thieving: SkillComponent
            slayer: SkillComponent
            farming: SkillComponent
            runecraft: SkillComponent
            hunter: SkillComponent
            construction: SkillComponent
        }

        export interface RankAndScoreComponent extends Record<string, number> {
            rank: number
            score: number
        }
        export interface BountyHunterInfo extends Record<string, RankAndScoreComponent> {
            hunter: RankAndScoreComponent
            rogue: RankAndScoreComponent
        }

        export interface LastManStandingInfo extends Record<string, RankAndScoreComponent> {
            lms: RankAndScoreComponent
        }

        export interface CluesInfo extends Record<string, RankAndScoreComponent> {
            all: RankAndScoreComponent
            beginner: RankAndScoreComponent
            easy: RankAndScoreComponent
            medium: RankAndScoreComponent
            hard: RankAndScoreComponent
            elite: RankAndScoreComponent
            master: RankAndScoreComponent
        }

        export interface LookupResponse extends
            Record<string, CluesInfo | BountyHunterInfo | LastManStandingInfo | SkillsInfo> {
            skills: SkillsInfo
            bh: BountyHunterInfo
            lms: LastManStandingInfo
            clues: CluesInfo
        }
    }

    namespace ge {
        export function getItem(id: number): Promise<JSON>
        export function getGraph(id: number): Promise<JSON>
    }
}
