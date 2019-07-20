// Type definitions for osrs-json-api 1.1
// Project: https://github.com/Judaxx/osrs-json-api#readme
// Definitions by: Kyle Miller <https://github.com/kylemiller3>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'osrs-json-api' {
    namespace hiscores {
        export function getPlayer(name: string): Promise<JSON>

        export interface SkillsComponent extends Record<string, string | number> {
            rank: string
            level: number
            xp: number
        }
        export interface Skills extends Record<string, SkillsComponent> {
            overall: SkillsComponent
            attack: SkillsComponent
            defence: SkillsComponent
            strength: SkillsComponent
            hitpoints: SkillsComponent
            ranged: SkillsComponent
            prayer: SkillsComponent
            magic: SkillsComponent
            cooking: SkillsComponent
            woodcutting: SkillsComponent
            fletching: SkillsComponent
            fishing: SkillsComponent
            firemaking: SkillsComponent
            crafting: SkillsComponent
            smithing: SkillsComponent
            mining: SkillsComponent
            herblore: SkillsComponent
            agility: SkillsComponent
            thieving: SkillsComponent
            slayer: SkillsComponent
            farming: SkillsComponent
            runecraft: SkillsComponent
            hunter: SkillsComponent
            construction: SkillsComponent
        }

        export interface BountyHunterClueAndLMSComponent extends Record<string, number> {
            rank: number
            score: number
        }
        export interface BountyHunter extends Record<string, BountyHunterClueAndLMSComponent> {
            hunter: BountyHunterClueAndLMSComponent
            rogue: BountyHunterClueAndLMSComponent
        }

        export interface LastManStanding extends Record<string, BountyHunterClueAndLMSComponent> {
            lms: BountyHunterClueAndLMSComponent
        }

        export interface Clues extends Record<string, BountyHunterClueAndLMSComponent> {
            all: BountyHunterClueAndLMSComponent
            beginner: BountyHunterClueAndLMSComponent
            easy: BountyHunterClueAndLMSComponent
            medium: BountyHunterClueAndLMSComponent
            hard: BountyHunterClueAndLMSComponent
            elite: BountyHunterClueAndLMSComponent
            master: BountyHunterClueAndLMSComponent
        }

        export interface HiscoreResponse extends
            Record<string, Clues | BountyHunter | LastManStanding | Skills> {
            skills: Skills
            bh: BountyHunter
            lms: LastManStanding
            clues: Clues
        }
    }

    namespace ge {
        export function getItem(id: number): Promise<JSON>
        export function getGraph(id: number): Promise<JSON>
    }
}
