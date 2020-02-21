import * as discord from 'discord.js';
import { Event } from '../event';
import { MessageWrapper } from '../messageWrapper';
import { Db } from '../database';
import { gClient, getDiscordGuildName } from '../..';

const eventsListAll = async (msg: discord.Message): Promise<void> => {
  // const now: Date = new Date();
  const localEvents: Event.Standard[] | null = await Db.fetchAllGuildEvents(
    msg.guild.id,
    Db.mainDb,
  );
  const globalEvents: Event.Standard[] | null = await Db.fetchAllInvitedEvents(
    msg.guild.id,
  );
  if (localEvents === null && globalEvents === null) {
    MessageWrapper.sendMessage({
      message: msg,
      content: 'No events.',
    });
  } else {
    const localContent: string = localEvents !== null
      ? localEvents
        .map((event: Event.Standard): string => {
          const status: string = event.statusString();
          return `#${event.id} ${event.name} (${
            event.tracking.category
          })\n\t\tstatus: ${status}\n\t\tstarts: ${event.when.start.toUTCString()}\n\t\tends: ${event.when.end.toUTCString()}`;
        })
        .join('\n\t')
      : '';
    const globalContent: string = globalEvents !== null
      ? globalEvents
        .map((event: Event.Standard): string => {
          const status: string = event.statusString();
          let guildName: string | null = getDiscordGuildName(
            gClient,
            event.guilds[0].guildId,
          );
          guildName = guildName !== null ? ` ${guildName}` : '';
          return `#${event.id} ${event.name} (${
            event.tracking.category
          })\n\t\towner:${guildName} (${
            event.guilds[0].guildId
          })\n\t\tstatus: ${status}\n\t\tstarts: ${event.when.start.toUTCString()}\n\t\tends: ${event.when.end.toUTCString()}`;
        })
        .join('\n\t')
      : '';
    const content = `Your guild events:\n\t${localContent}\n\nGlobal events:\n\t${globalContent}`;
    MessageWrapper.sendMessage({
      message: msg,
      content,
      options: {
        reply: msg,
        code: true,
      },
    });
  }
};

export default eventsListAll;
