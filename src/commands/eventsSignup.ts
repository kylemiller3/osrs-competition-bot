import * as discord from 'discord.js';
import { Command, } from '../command';
import { Event, } from '../event';
import { Utils, } from '../utils';
import Error from '../strings';

const eventsSignup = (
    msg: discord.Message
): void => {
    const params: Command.EventsSignup = Command.parseParameters(
        Command.ALL.EVENTS_SIGNUP,
        msg.content,
    );

    let errors: string[] = [];
    if (params.id === undefined) {
        errors = [
            ...errors,
            Error.NO_EVENT_SPECIFIED,
        ];
    }

    const event: Event.Event = {} as Event.Event;
    // grab stats?
    if (event === undefined) {
        msg.reply(Error.EVENT_NOT_FOUND);
        return;
    }

    if (params.rsn === undefined
        && (!Event.isEventCasual(event) && !Event.isEventCustom(event))) {
        errors = [
            ...errors,
            Error.NO_RSN_SPECIFIED,
        ];
    }

    if (params.team === undefined && Event.isTeamEvent(event)) {
        errors = [
            ...errors,
            Error.NO_TEAM_SPECIFIED,
        ];
    }

    if (errors.length > 0) {
        Utils.logger.info(
            errors.join(' ')
        );
        return;
    }

    if (!event.state.hasEnded) {
        if (Event.isEventCasual(event) || Event.isEventCustom(event)) {
            // mutate participants
        } else {
            // grab stats
        }
    }
};

export default eventsSignup;
