import * as discord from 'discord.js';
import { Command, } from './command';

const eventsAdd = (msg: discord.Message):
void => {
    const params: Record<string, string | number | boolean> = Command.parseParameters(
        Command.ALL.EVENTS_ADD,
        msg.content,
    );

    const required: string[] = [
        'name',
        'type',
    ];

    const error: string = required
        .map(
            (key: string):
            string => {
                if (params[key] === null) {
                    return `'${key}' is required but got null.`;
                }
                return '';
            }
        )
        .join('\n')
        .trim();

    if (error !== '') {
        msg.reply(error);
        return;
    }

    

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
