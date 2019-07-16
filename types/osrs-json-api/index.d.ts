// Type definitions for osrs-json-api 1.1
// Project: https://github.com/Judaxx/osrs-json-api#readme
// Definitions by: Kyle Miller <https://github.com/me>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'osrs-json-api' {
    namespace hiscores {
        export function getPlayer(name: string): Promise<JSON>
    }

    namespace ge {
        export function getItem(id: number): Promise<JSON>
        export function getGraph(id: number): Promise<JSON>
    }
}
