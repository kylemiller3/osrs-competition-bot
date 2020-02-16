// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Settings {
    export enum PAY_TIER {
        FREEMIUM = 0,
        TIER_ONE,
        TIER_TWO,
    }

    export interface GuildSettings {
        guildId: string;
        channelId: string;
        payTier: PAY_TIER;
    }
}
