import * as discord from 'discord.js';
import { Command, } from '../command';
import { Event, } from '../event';

const eventsAmISignedUp = (
    msg: discord.Message
): void => {
    const params: Command.EventsAmISignedUp = Command.parseParameters(
        Command.ALL.EVENTS_AMISIGNEDUP,
        msg.content,
    );

    const event: Event.Event = undefined; // get event here (params.id)
    if (event !== undefined) {
        const signedUp = event.participants.find(
            (participant: Event.Participant):
            boolean => participant.discordId === msg.author.id
        );

        let signupStr = signedUp
            ? `You are signed up to ${event.name} (id=${event.uid}).`
            : `You are not signed up to ${event.name} (id=${event.uid}).`;

        if (event.teams !== undefined) {
            const teamName = event.teams.find(
                (team: Event.Team):
                boolean => team.linkedDiscordIds.includes(msg.author.id)
            );
            signupStr = teamName !== undefined
                ? signupStr.concat(` Your team is ${teamName}.`)
                : signupStr.concat(' You are not on a team.');
        }
    }
};

export default eventsAmISignedUp;
