import * as discord from 'discord.js';
import { Command, } from '../command';

const eventsUpdateScore = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_UPDATE_SCORE,
        msg.content,
    );
};

export default eventsUpdateScore;
