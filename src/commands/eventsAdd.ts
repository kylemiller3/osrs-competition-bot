import * as discord from 'discord.js';
import { Command, } from '../command';
import { Event, } from '../event';
import { Utils, } from '../utils';
import Error from '../strings';

/**
 * Validates and prepares an event
 * @param msg the input Discord message
 */
const eventsAdd = (
    msg: discord.Message
): void => {
    // const params: Command.EventsAdd = Command.parseParameters(
    //     Command.ALL.EVENTS_ADD,
    //     msg.content,
    // );

    // let errors: string[] = [];
    // if (params.name === undefined) {
    //     errors = [
    //         ...errors,
    //         '\'name\' is required but was undefined.',
    //     ];
    // }

    // if (params.type === undefined) {
    //     errors = [
    //         ...errors,
    //         '\'type\' is required but was undefined.',
    //     ];
    // }

    // const start: Date = params.starting !== undefined
    //     ? new Date(
    //         params.starting
    //     )
    //     : new Date();
    // const end: Date = params.ending !== undefined
    //     ? new Date(
    //         params.ending
    //     )
    //     : new Date('9999-12-31Z');

    // if (!Utils.isValidDate(start)) {
    //     errors = [
    //         ...errors,
    //         '\'start\' date is invalid.',
    //     ];
    // }
    // if (!Utils.isValidDate(end)) {
    //     errors = [
    //         ...errors,
    //         '\'end\' date is invalid.',
    //     ];
    // }

    // if (Utils.isValidDate(start) && Utils.isValidDate(end)) {
    //     if (start >= end) {
    //         errors = [
    //             ...errors,
    //             '\'starting\' date is later than or equal to \'ending\' date.',
    //         ];
    //     }

    //     if (Utils.isInPast(end)) {
    //         errors = [
    //             ...errors,
    //             '\'end\' date is in the past.',
    //         ];
    //     }
    // }

    // let tracker: Event.Tracker;
    // const tracking: Event.Tracking | undefined = Object.values(
    //     Event.Tracking
    // ).find(
    //     (value: string):
    //     boolean => params.type
    //         .toLowerCase()
    //         .trim()
    //         .startsWith(value)
    // );

    // let what: Event.BountyHunter[] | Event.Clues[] | Event.Skills[];
    // if (tracking !== undefined) {
    //     const tracks: string = params.type
    //         .toLowerCase()
    //         .trim()
    //         .split(tracking)[1];
    //     const keys: string[] = tracks.split(' ');
    //     const filteredKeys = keys.filter(
    //         (key: string):
    //         boolean => key !== ''
    //     );

    //     // our enum keys are in upper case
    //     switch (tracking) {
    //         case Event.Tracking.BH:
    //             what = filteredKeys
    //                 .map(
    //                     (key: string):
    //                     Event.BountyHunter => Event.BountyHunter[key.toUpperCase()]
    //                 )
    //                 .filter(
    //                     (value: string):
    //                     boolean => value !== undefined
    //                 );
    //             // default HUNTER
    //             if (what.length === 0) {
    //                 what = [
    //                     Event.BountyHunter.HUNTER,
    //                 ];
    //             }
    //             break;
    //         case Event.Tracking.CLUES:
    //             what = filteredKeys
    //                 .map(
    //                     (key: string):
    //                     Event.Clues => Event.Clues[key.toUpperCase()]
    //                 )
    //                 .filter(
    //                     (value: string):
    //                     boolean => value !== undefined
    //                 );
    //             // default ALL
    //             if (what.length === 0) {
    //                 what = [
    //                     Event.Clues.ALL,
    //                 ];
    //             }
    //             break;
    //         case Event.Tracking.SKILLS: {
    //             what = filteredKeys
    //                 .map(
    //                     (key: string):
    //                     Event.Skills => Event.Skills[key.toUpperCase()]
    //                 )
    //                 .filter(
    //                     (value: string):
    //                     boolean => value !== undefined
    //                 );
    //             // default undefined
    //             if (what.length === 0) {
    //                 errors = [
    //                     ...errors,
    //                     Error.NO_TRACKING_SPECIFIED,
    //                 ];
    //             }
    //             break;
    //         }
    //         default:
    //             break;
    //     }
    // }

    
    // if (tracking !== Event.Tracking.NONE) {
    //     tracker = {
    //         tracking,
    //         what,
    //     };
    // }

    // if (errors.length > 0) {
    //     Utils.logger.info(
    //         errors.join(' ')
    //     );
    //     return;
    // }

    // const newEvent: Event.Event = {
    //     id: undefined,
    //     competingGuilds: [
    //         {
    //             discordId: msg.guild.id,
    //         },
    //     ],
    //     name: params.name,
    //     when: {
    //         start,
    //         end,
    //     },
    //     teams: [],
    //     tracker,
    // };
    // Utils.logger.debug(newEvent);

    // // confirmation here

    // // Db.saveNewEvent
    // msg.reply('event added.');
};

export default eventsAdd;
