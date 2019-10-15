import * as discord from 'discord.js';
import { Command, } from '../command';
import { Event, } from '../event';
import { getDisplayNameFromDiscordId, } from '../main';
import { Utils, } from '../utils';

const eventsListParticipants = (
    msg: discord.Message
): void => {
    const params: Command.EventsListParticipants = Command.parseParameters(
        Command.ALL.EVENTS_LIST_PARTICIPANTS,
        msg.content,
    );

    /*
    if (params.id === undefined) {
        msg.reply('You must specify an event.');
        return;
    }

    const event: Event.Event = {} as Event.Event; // get event
    if (Event.isTeamEvent(event)) {
        const formattedStr: string = event.teams.map(
            (team: Event.Team, idx: number): string => {
                const teamStr: string[] = team.linkedDiscordIds.map(
                    (discordId: string, idy: number): string => {
                        const displayName: string = getDisplayNameFromDiscordId(
                            msg.guild.id,
                            discordId
                        );
                        const participant: Event.Participant = Event.getParticipantByDiscordId(
                            event.participants,
                            discordId,
                        );
                        const accounts: string = participant.runescapeAccounts.map(
                            (account: Event.Account): string => account.rsn
                        ).join(', ');
                        return `\n\t${idy}: ${displayName} signed up ${accounts}`;
                    }
                );
                return `\n${idx}: team '${team.name}'${teamStr}`;
            }
        ).join('');
        const reply: string = event.participants.length > 0
            ? formattedStr
            : 'no participants';
        Utils.logger.debug('ListParticipants called');
    }
    */
};

export default eventsListParticipants;
