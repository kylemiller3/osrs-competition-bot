import * as discord from 'discord.js';
import { Command, } from '../command';
import { Utils, } from '../utils';
import { Event, } from '../event';
import { getDisplayNameFromDiscordId, } from '../main';
import Error from '../strings';

const eventsAddScore = (
    msg: discord.Message
): void => {
    const params: Command.EventsAddScore = Command.parseParameters(
        Command.ALL.EVENTS_ADD_SCORE,
        msg.content,
    );

    /*

    let errors: string[] = [];
    if (msg.mentions.members.array().length === 0) {
        errors = [
            ...errors,
            Error.NO_USER_MENTION,
        ];
    }

    if (params.id === undefined) {
        errors = [
            ...errors,
            Error.NO_EVENT_SPECIFIED,
        ];
    }

    if (params.score === undefined) {
        errors = [
            ...errors,
            Error.NO_SCORE_SPECIFIED,
        ];
    }

    if (errors.length > 0) {
        Utils.logger.info(
            errors.join(' ')
        );
        return;
    }

    const event: Event.Event = {} as Event.Event; // get from db
    if (event === undefined) {
        errors = [
            ...errors,
            Error.EVENT_NOT_FOUND,
        ];
    }

    const mention: discord.User = msg.mentions.users.array()[0];
    const foundTeam: Event.Team = event.teams.find(
        (team: Event.Team):
        boolean => team.participants.some(
            (participant: Event.Participant):
            boolean => participant.discordId === mention.id
        )
    );
    if (foundTeam === undefined) {
        Utils.logger.debug(
            `Did not find participant '${getDisplayNameFromDiscordId(msg.guild.id, mention.id)}'`
        );
        msg.reply(
            `${getDisplayNameFromDiscordId(msg.guild.id, mention.id)} ${Error.USER_NOT_SIGNED_UP}`
        );
        return;
    }
    const foundParticipant: Event.Participant = foundTeam.participants.find(
        (participant: Event.Participant):
        boolean => participant.discordId === mention.id
    );
    const newParticipant: Event.Participant = { ...foundParticipant, };
    newParticipant.customScore += params.score;
    const newEvent: Event.Event = Event.updateEventParticipant(
        event,
        newParticipant,
    );
    msg.reply(`${mention} now has ${newParticipant.customScore} points`);
    Utils.logger.debug(newEvent);
    */
};

export default eventsAddScore;
