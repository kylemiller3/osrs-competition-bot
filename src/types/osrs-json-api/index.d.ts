// Type definitions for osrs-json-api 1.1
// Project: https://github.com/Judaxx/osrs-json-api#readme
// Definitions by: Kyle Miller <https://github.com/kylemiller3>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'osrs-json-api' {
    namespace hiscores {
        export function getPlayer(name: string): Promise<JSON>

        export interface SkillComponent {
            rank: string
            level: number
            xp: number
        }
        export interface SkillsInfo {
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

        export interface RankAndScoreComponent {
            rank: number
            score: number
        }
        export interface BountyHunterInfo {
            hunter: RankAndScoreComponent
            rogue: RankAndScoreComponent
        }

        export interface CluesInfo {
            all: RankAndScoreComponent
            beginner: RankAndScoreComponent
            easy: RankAndScoreComponent
            medium: RankAndScoreComponent
            hard: RankAndScoreComponent
            elite: RankAndScoreComponent
            master: RankAndScoreComponent
        }

        export interface LookupResponse {
            skills: SkillsInfo
            bh: BountyHunterInfo
            lms: RankAndScoreComponent
            clues: CluesInfo
        }
    }

    namespace ge {
        export function getItem(id: number): Promise<JSON>
        export function getGraph(id: number): Promise<JSON>
    }
}
