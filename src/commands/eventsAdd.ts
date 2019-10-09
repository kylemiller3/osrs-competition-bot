import * as discord from 'discord.js';
import { Command, } from './command';

const eventsAdd = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_ADD,
        msg.content,
    );

    /*
    {
        ending:null
        name:null
        starting:null
        teams:false
        type:null
    }
    */

};

export default eventsAdd;
