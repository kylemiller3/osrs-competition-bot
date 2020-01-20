import * as discord from 'discord.js';

import { EventEmitter, } from 'events';
import {
    fromEvent, Observable, Subject, merge, forkJoin, of,
} from 'rxjs';
import {
    filter, tap, mergeMap,
} from 'rxjs/operators';
import { hiscores, } from 'osrs-json-api';
import { async, } from 'rxjs/internal/scheduler/async';
import privateKey from './auth';
import { Command, } from './command';
import { Utils, } from './utils';
import adminSetChannel from './commands/adminSetChannel';
import eventsAdd from './commands/eventsAdd';
import eventsDelete from './commands/eventsDelete';
import eventsEndEvent from './commands/eventsEndEvent';
import eventsForceSignup from './commands/eventsForceSignup';
import eventsForceUnsignup from './commands/eventsForceUnsignup';
import eventsAddScore from './commands/eventsAddScore';
import eventsListActive from './commands/eventsListActive';
import eventsListAll from './commands/eventsListAll';
import eventsListParticipants from './commands/eventsListParticipants';
import eventsAmISignedUp from './commands/eventsAmISignedUp';
import eventsSignup from './commands/eventsSignup';
import eventsUnsignup from './commands/eventsUnsignup';
import usersStats from './commands/usersStats';
import help from './commands/help';
import { Db, } from './database';
import eventsEdit from './commands/eventsEdit';
import { MessageWrapper, } from './messageWrapper';
import { Event, } from './event';
import { Network, } from './network';
import { Settings, } from './settings';
import { ConversationManager, } from './conversation';

/**
 * Global discord client
 * @category Global
 */
export const gClient: discord.Client = new discord.Client();

/**
 * Observable of all Discord message events
 * @category Observable
 */
export const messageReceived$: Observable<discord.Message> = fromEvent(
    gClient as unknown as EventEmitter,
    'message'
);

/**
 * Observable of starting events
 * @category Observable
 */
export const willStartEvent$: Subject<Event.Object> = new Subject();
/**
 * Observable of started events
 * @category Observable
 */
export const didStartEvent$: Subject<Event.Object> = new Subject();

/**
 * Observable of ending events
 * @category Observable
 */
export const willEndEvent$: Subject<Event.Object> = new Subject();
/**
 * Observable of ended events
 * @category Observable
 */
export const didEndEvent$: Subject<Event.Object> = new Subject();

/**
 * Observable of updating scores
 * @category Observable
 */
export const willUpdateScores$: Subject<Event.Object> = new Subject();
/**
 * Observable of updated scores
 * @category Observable
 */
export const didUpdateScores$: Subject<Event.Object> = new Subject();

/**
 * Observable of signing up players
 * @category Observable
 */
export const willSignUpPlayer$: Subject<Event.Object> = new Subject();
/**
 * Observable of signed up player
 * @category Observable
 */
export const didSignupPlayer$: Subject<Event.Object> = new Subject();

/**
 * Observable of adding events
 * @category Observable
 */
export const willAddEvent$: Subject<Event.Object> = new Subject();
/**
 * Observable of added events
 * @category Observable
 */
export const didAddEvent$: Subject<Event.Object> = new Subject();

/**
 * Observable of deleting events
 * @category Observable
 */
export const willDeleteEvent$: Subject<Event.Object> = new Subject();
/**
 * Observable of deleted events
 * @category Observable
 */
export const didDeleteEvent$: Subject<Event.Object> = new Subject();

/**
 * Observable of editing events
 * @category Observable
 */
export const willEditEvent$: Subject<Event.Object> = new Subject();
/**
 * Observable of edited events
 * @category Observable
 */
export const didEditEvent$: Subject<Event.Object> = new Subject();

/**
 * Subject of injected Discord message events
 * @category Observable
 */
const messageInjector$: Subject<discord.Message> = new Subject();

const mergedMessage$: Observable<discord.Message> = merge(
    messageReceived$,
    messageInjector$,
);

/**
 * Helper function to determine if a user has access to the command
 * @param guild The Guild to use
 * @param author The Author to check
 * @returns True if the Author has admin access to the bot
 * @category Helper
 */
export const isAdmin = (
    guild: discord.Guild,
    author: discord.User,
): boolean => {
    const guildMember: discord.GuildMember | undefined = guild.members.get(
        author.id
    );
    if (guildMember === undefined) {
        Utils.logger.warn(
            `${author.tag} was not found in ${guild.name}'s member list. Returning false.`
        );
        return false;
    }
    if (discord.Permissions.FLAGS.ADMINISTRATOR) {
        return guildMember.permissions.has(
            discord.Permissions.FLAGS.ADMINISTRATOR
        ) || guildMember.roles.some(
            (role: discord.Role):
            boolean => role.name.toLowerCase() === 'osrs event manager'
        );
    }
    return false;
};

/**
 * Gets the [[discord.Guild]] object from a guildId
 * @param client The Discord Client object
 * @param guildId The Guild id to find
 * @returns the Guild object
 */
export const getGuildFromId = (
    client: discord.Client,
    guildId: string,
): discord.Guild | null => {
    const guild: discord.Guild | undefined = client.guilds.get(
        guildId,
    );
    if (guild === undefined || !guild.available) {
        return null;
    }
    return guild;
};

/**
 * Gets the [[discord.TextChannel]] object from a Guild and ChannelId
 * @param guild The Guild object to search
 * @param channelId The TextChannel id to find
 * @returns the TextChannel object
 */
export const getTextChannelFromId = (
    guild: discord.Guild,
    channelId: string,
): discord.TextChannel | null => {
    const channel: discord.Channel | undefined = guild.channels.get(
        channelId,
    );
    if (channel === undefined || channel.type !== 'text') {
        return null;
    }
    return channel as discord.TextChannel;
};

/**
 * Gets the user's [[discord.Guild]] tag from a Discord id
 * @param discordId The Discord id to lookup
 * @returns The user's display name
 * @category Helper
 */
export const getTagFromDiscordId = async (
    client: discord.Client,
    discordId: string
): Promise<string> => {
    const user: discord.User | null = await client.fetchUser(
        discordId
    ).catch(
        (): null => null
    );
    if (user === null) {
        return discordId;
    }
    return user.tag;
};

/**
 * Gets the user's [[discord.Guild]] display name from a Discord id
 * @param guildId The Guild id to use for display name lookup
 * @param discordId The Discord id to lookup
 * @returns The user's display name
 * @category Helper
 */
export const getDisplayNameFromDiscordId = (
    client: discord.Client,
    guildId: string,
    discordId: string
): string | null => {
    const guild: discord.Guild = client.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return null;
    const foundMember: discord.GuildMember = guild.members.find(
        (member: discord.GuildMember):
        boolean => member.id === discordId
    );
    if (foundMember === null) return null;
    return foundMember.displayName;
};

/**
 * Function that filters all Discord commands messages
 * @category Observable
 */
const commandReceived$ = (
    command: Command.ALL
): Observable<discord.Message> => mergedMessage$
    .pipe(
        tap(
            (msg: discord.Message):
            void => {
                if (msg.content.toLowerCase().startsWith('.exit')) {
                    ConversationManager.stopConversation(msg);
                }
            }
        ),
        filter(
            (msg: discord.Message):
            boolean => msg.guild
                && msg.guild.available
                && Command.isValid(
                    command,
                    msg.content
                )
        ),
        tap(
            (msg: discord.Message):
            void => {
                Utils.logger.debug(`message: ${msg.content}`);
                Utils.logger.debug(`author: ${msg.author.tag}`);
                Utils.logger.debug(`guild: ${msg.guild.name}`);
            }
        ),
        filter(
            (msg: discord.Message):
            boolean => Command.hasAccess(
                command,
                isAdmin(
                    msg.guild,
                    msg.author,
                )
            )
        ),
        tap(
            ():
            void => Utils.logger.debug('access: true')
        ),
    );

/**
 * Creates a spoofed Discord Message to process
 * See [[discord.Message]]
 * @param newCommand The new command to swap to
 * @param sourceMessage The old message source
 * @param spoofedAuthor The new author
 * @category Helper
 */
export const spoofMessage = (
    newCommand: Command.ALL,
    sourceMessage: discord.Message,
    spoofedAuthor: discord.User
): void => {
    const content = `${Command.getCommandString(newCommand)}${sourceMessage.content.replace(/<@!?[0-9]+>/gi, '')}`;
    const newMessage: discord.Message = new discord.Message(
        sourceMessage.channel,
        {
            id: sourceMessage.id,
            type: sourceMessage.type,
            content,
            author: spoofedAuthor,
            pinned: sourceMessage.pinned,
            tts: sourceMessage.tts,
            nonce: sourceMessage.nonce,
            embeds: sourceMessage.embeds,
            attachments: sourceMessage.attachments,
            timestamp: sourceMessage.createdTimestamp,
            // eslint-disable-next-line @typescript-eslint/camelcase
            edited_timestamp: sourceMessage.editedTimestamp,
            reactions: sourceMessage.reactions,
            // mentions: sourceMessage.mentions.users.array(),
            // eslint-disable-next-line @typescript-eslint/camelcase
            webhook_id: sourceMessage.webhookID,
            hit: sourceMessage.hit,
        },
        gClient
    );

    Utils.logger.info('Injecting new spoofed message.');
    Utils.logger.debug(newMessage);
    messageInjector$.next(
        newMessage,
    );
};

//--------------
// Global script
//
//--------------

const startTimers: Record<number, NodeJS.Timeout | undefined> = {};
const endTimers: Record<number, NodeJS.Timeout | undefined> = {};
const updateTimers: Record<number, NodeJS.Timeout | undefined> = {};

const scheduleEventsTimers = async (): Promise<void> => {
    const now: Date = new Date();
    const twentyFiveHours: Date = new Date();
    twentyFiveHours.setHours(twentyFiveHours.getHours() + 25);

    let events: Event.Object[] | null = await Db.fetchAllEventsBetweenDates(
        now, twentyFiveHours,
    );

    if (events === null) {
        events = [];
    }

    // schedule timers if not exists
    events.forEach(
        (event: Event.Object): void => {
            if (event.id === undefined) {
                throw new Error('event id is undefined');
            }

            if (startTimers[event.id] === undefined
                && event.when.start >= now
                && event.when.end < twentyFiveHours) {
                startTimers[event.id] = setTimeout(
                    (): void => {
                        willStartEvent$.next(event);
                    }, event.when.start.getTime() - now.getTime(),
                );
            }

            if (endTimers[event.id] === undefined
                && event.when.end >= now
                && event.when.end < twentyFiveHours) {
                endTimers[event.id] = setTimeout(
                    (): void => {
                        willEndEvent$.next(event);
                    }, event.when.end.getTime() - now.getTime()
                );
            }
        }
    );
};

/**
 * Helper function when the bot restarts
 * @category Helper
 */
const resumeRunningEvents = async (): Promise<void> => {
    const events: Event.Object[] | null = await Db.fetchAllCurrentlyRunningEvents();
    if (events === null) {
        return;
    }
    events.forEach(
        (event: Event.Object): void => {
            willStartEvent$.next(event);
        }
    );
};

/**
 * Helper function that deletes one [[Event.ChannelMessage]]
 * @param guild the Guild object to delete from
 * @param eventMessage the [[Event.ChannelMessage]]
 * @category Helper
 */
const deleteMessages = async (
    guild: discord.Guild,
    eventMessage: Event.ChannelMessage,
): Promise<MessageWrapper.Response[]> => {
    if (!guild.available) {
        return [];
    }

    const channel: discord.TextChannel | null = getTextChannelFromId(
        guild,
        eventMessage.channelId,
    );
    if (channel === null) {
        return [];
    }

    // get message objects
    const discordMessagesPromises:
    Promise<discord.Message | null>[] = eventMessage.messagesId.map(
        (messageId: string):
        Promise<discord.Message | null> => channel.fetchMessage(
            messageId,
        ).catch(
            (error: Error): null => {
                Utils.logger.warn(`Error fetching messages: ${error.message}`);
                return null;
            }
        )
    );
    const discordMessages: (discord.Message | null)[] = await Promise.all(
        discordMessagesPromises
    );

    // delete the old messages
    const validDiscordMessages: discord.Message[] = discordMessages.filter(
        Utils.isDefinedFilter
    );

    return Promise.all(
        validDiscordMessages.map(
            (message: discord.Message):
            Promise<MessageWrapper.Response> => MessageWrapper.deleteMessage({
                message,
            })
        )
    );
};

/** Refreshes a [[Event.ChannelMessage]]
    @param client the Discord Client
    @param guildId the Guild id
    @param oldMessage the old message to delete
    @param content new message string,
    @category Helper
    @returns a new [[Event.ChannelMessage]]
 */
const refreshMessage = async (
    client: discord.Client,
    guild: discord.Guild,
    oldMessage?: Event.ChannelMessage,
    content?: string,
    options?: discord.MessageOptions,
): Promise<Event.ChannelMessage | null> => {
    // sanity checks
    const settings: Settings.Object | null = await Db.fetchSettings(
        guild.id,
    );
    if (settings === null) {
        Utils.logger.info(`Looks like ${guild.id} has not set their settings.`);
        return null;
    }

    // get channel
    const channelToPostTo: discord.TextChannel | null = getTextChannelFromId(
        guild,
        settings.channelId,
    );

    if (channelToPostTo === null) {
        return null;
    }

    // delete old status message
    if (oldMessage !== undefined) {
        await deleteMessages(
            guild,
            oldMessage
        );
    }

    // post new status
    const dummyMessage: discord.Message = new discord.Message(
        channelToPostTo,
        null as unknown as Record<string, unknown>,
        client,
    );

    let messagePromise: Promise<MessageWrapper.Response | null> = Promise.resolve(null);
    if (content !== undefined && content.length > 0) {
        messagePromise = MessageWrapper.sendMessage({
            message: dummyMessage,
            content,
            options,
        });
    }
    const response: MessageWrapper.Response | null = await messagePromise;
    if (response === null) {
        return null;
    }

    const messagePart = {
        channelId: settings.channelId,
        messagesId: response.messages
            .filter(Utils.isDefinedFilter)
            .map((msg: discord.Message): string => msg.id),
    };
    return messagePart;
};

/**
 * Startup and initialization
 */
const init = async (): Promise<void> => {
    await gClient.login(privateKey);

    // register command listener
    commandReceived$(Command.ALL.ADMIN_SET_CHANNEL).subscribe(adminSetChannel);
    commandReceived$(Command.ALL.EVENTS_ADD).subscribe(eventsAdd);
    commandReceived$(Command.ALL.EVENTS_DELETE).subscribe(eventsDelete);
    commandReceived$(Command.ALL.EVENTS_EDIT).subscribe(eventsEdit);
    commandReceived$(Command.ALL.EVENTS_END_EVENT).subscribe(eventsEndEvent);
    commandReceived$(Command.ALL.EVENTS_FORCE_SIGNUP).subscribe(eventsForceSignup);
    commandReceived$(Command.ALL.EVENTS_FORCE_UNSIGNUP).subscribe(eventsForceUnsignup);
    commandReceived$(Command.ALL.EVENTS_ADD_SCORE).subscribe(eventsAddScore);
    commandReceived$(Command.ALL.EVENTS_LIST_ACTIVE).subscribe(eventsListActive);
    commandReceived$(Command.ALL.EVENTS_LIST_ALL).subscribe(eventsListAll);
    commandReceived$(Command.ALL.EVENTS_LIST_PARTICIPANTS).subscribe(eventsListParticipants);
    commandReceived$(Command.ALL.EVENTS_AMISIGNEDUP).subscribe(eventsAmISignedUp);
    commandReceived$(Command.ALL.EVENTS_SIGNUP).subscribe(eventsSignup);
    commandReceived$(Command.ALL.EVENTS_UNSIGNUP).subscribe(eventsUnsignup);
    commandReceived$(Command.ALL.USERS_STATS).subscribe(usersStats);
    commandReceived$(Command.ALL.HELP).subscribe(help);
    Utils.logger.info('Command listeners running');

    // When we receive a message
    MessageWrapper.sentMessages$.subscribe(
        (response: MessageWrapper.Response): void => {
            Utils.logger.trace(`Message with tag ${response.tag} sent.`);
        },
        (err: Error): void => {
            Utils.logger.error(`Message sending error: ${err.message}`);
        },
        (): void => {
            Utils.logger.trace('Finished sending messages.');
        }
    );

    // when an event will start
    willStartEvent$.subscribe(
        async (event: Event.Object): Promise<void> => {
            Utils.logger.debug(`Event ${event.id} is starting.`);
            if (event.id === undefined) {
                throw new Error('event id is undefined');
            }

            // release start timer
            // should already be expired
            startTimers[event.id] = undefined;

            // if we have a competitive event
            // track scoreboard automatically
            if (!Event.isEventCasual(event)
                && !Event.isEventCustom(event)) {
                Utils.logger.trace('Event is auto tracking score');
                updateTimers[event.id] = setInterval(
                    async (): Promise<void> => {
                        if (event.id === undefined) {
                            Utils.logger.error('This should never happen.');
                            return;
                        }
                        const updatedEvent: Event.Object | null = await Db.fetchEvent(event.id);
                        const timeout: NodeJS.Timeout | undefined = updateTimers[event.id];
                        if (updatedEvent === null && timeout !== undefined) {
                            clearInterval(timeout);
                            updateTimers[event.id] = undefined;
                        }

                        if (updatedEvent !== null) {
                            willUpdateScores$.next(updatedEvent);
                        }
                    }, 1000 * 60 * 1
                );
                willUpdateScores$.next(event);
            }

            // combine all guild objects
            const eventGuilds: Event.Guild[] = event.guilds.others !== undefined
                ? [
                    event.guilds.creator,
                    ...event.guilds.others,
                ]
                : [
                    event.guilds.creator,
                ];

            // update status and scoreboard promises
            const guildMessagesPromises:
            Promise<[
                Event.ChannelMessage | null,
                Event.ChannelMessage | null,
            ]>[] = eventGuilds.map(
                async (eventGuild: Event.Guild):
                Promise<[
                    Event.ChannelMessage | null,
                    Event.ChannelMessage | null,
                ]> => {
                    // get guild
                    const guild: discord.Guild | null = getGuildFromId(
                        gClient,
                        eventGuild.discordId,
                    );

                    if (guild === null) {
                        Utils.logger.warn('Discord guild not available');
                        return [
                            null,
                            null,
                        ];
                    }

                    const scoreboard:
                    Event.TeamScoreboard[] = Event.getEventTeamsScoreboards(
                        event,
                    );
                    const scoreboardStr: string = await Event.getEventScoreboardString(
                        event.name,
                        guild.id,
                        scoreboard,
                        scoreboard,
                        event.tracking.category,
                        'what',
                        false,
                        'regular',
                    );

                    const results = await Promise.all([
                        refreshMessage(
                            gClient,
                            guild,
                            eventGuild.statusMessage,
                            `${guild.name} is starting`,
                        ), refreshMessage(
                            gClient,
                            guild,
                            eventGuild.scoreboardMessage,
                            `${scoreboardStr}`,
                            {
                                code: true,
                            }
                        ),
                    ]);
                    return [
                        results[0],
                        results[1],
                    ];
                }
            );

            const guildMessages: [
                Event.ChannelMessage | null,
                Event.ChannelMessage | null,
            ][] = await Promise.all(guildMessagesPromises);

            // map these messages back to the original guild objects
            const newEvent: Event.Object = { ...event, };

            // first message belongs to the owner
            newEvent.guilds.creator.statusMessage = guildMessages[0][0] !== null
                ? guildMessages[0][0]
                : undefined;
            newEvent.guilds.creator.scoreboardMessage = guildMessages[0][1] !== null
                ? guildMessages[0][1]
                : undefined;

            // create others message array
            const othersMessages: [
                Event.ChannelMessage | null,
                Event.ChannelMessage | null,
            ][] = guildMessages.slice(1);

            // do the same thing for others as the creator guild
            othersMessages.forEach(
                (otherMessage: [
                    Event.ChannelMessage | null,
                    Event.ChannelMessage | null,
                ], idx: number): void => {
                    if (newEvent.guilds.others !== undefined) {
                        newEvent.guilds.others[idx].statusMessage = otherMessage[0] !== null
                            ? otherMessage[0]
                            : undefined;
                        newEvent.guilds.others[idx].scoreboardMessage = otherMessage[1] !== null
                            ? otherMessage[1]
                            : undefined;
                    }
                }
            );

            // save event
            await Db.upsertEvent(newEvent);
            didStartEvent$.next(newEvent);
        }
    );

    didStartEvent$.subscribe(
        (event: Event.Object): void => {
            Utils.logger.debug(`Event ${event.id} did start.`);
        }
    );

    willEndEvent$.subscribe(
        (event: Event.Object): void => {
            Utils.logger.debug(`Event ${event.id} will end.`);
            if (event.id === undefined) {
                throw new Error('event id is undefined');
            }

            // release timers
            endTimers[event.id] = undefined;

            // if this event is competitive
            // we need to unset these update timers
            const updateTimer:
            NodeJS.Timeout | undefined = updateTimers[event.id];
            if (updateTimer !== undefined) {
                clearInterval(updateTimer);
                updateTimers[event.id] = undefined;
            }

            // one last update to scoreboard
            if (!Event.isEventCasual(event)
                && !Event.isEventCustom(event)) {
                Utils.logger.trace('Event is auto tracking score');
                willUpdateScores$.next(event);
            }
            didEndEvent$.next(event);
        }
    );

    didEndEvent$.subscribe(
        (event: Event.Object): void => {
            Utils.logger.debug(`Event ${event.id} did end.`);
        }
    );

    willUpdateScores$.subscribe(
        async (event: Event.Object): Promise<void> => {
            Utils.logger.debug(`Event ${event.id} scores will update.`);
            const flattenedParticipants: Event.Participant[] = event.teams.flatMap(
                (team: Event.Team): Event.Participant[] => team.participants
            );

            const flattenedAccounts: Event.Account[] = flattenedParticipants.flatMap(
                (participant: Event.Participant):
                Event.Account[] => participant.runescapeAccounts
            );

            let observables: Observable<hiscores.Player | null>[] = flattenedAccounts.flatMap(
                (account: Event.Account):
                Observable<hiscores.Player | null> => Network.hiscoresFetch$(
                    account.rsn,
                    false,
                )
            );

            if (observables.length === 0) {
                observables = [
                    of(null),
                ];
            }

            // un-flatmap
            let idx = 0;
            forkJoin(observables).subscribe(
                async (results: hiscores.Player[]):
                Promise<void> => {
                    // prepare a new event
                    const newEvent: Event.Object = { ...event, };

                    // cascade remake of teams
                    const newTeams: Event.Team[] = newEvent.teams.map(
                        (team: Event.Team): Event.Team => {
                            const newTeam: Event.Team = { ...team, };
                            const newParticipants:
                            Event.Participant[] = newTeam.participants.map(
                                (participant: Event.Participant):
                                Event.Participant => {
                                    const newParticipant: Event.Participant = { ...participant, };
                                    const newAccounts:
                                    Event.CompetitiveAccount[] = newParticipant
                                        .runescapeAccounts.map(
                                            (account: Event.CompetitiveAccount):
                                            Event.CompetitiveAccount => {
                                                const newAccount = { ...account, };
                                                newAccount.ending = results[idx];
                                                idx += 1;
                                                return newAccount;
                                            }
                                        );
                                    newParticipant.runescapeAccounts = newAccounts;
                                    return newParticipant;
                                }
                            );
                            newTeam.participants = newParticipants;
                            return newTeam;
                        }
                    );
                    newEvent.teams = newTeams;

                    // combine all guild objects
                    const eventGuilds: Event.Guild[] = newEvent.guilds.others !== undefined
                        ? [
                            newEvent.guilds.creator,
                            ...newEvent.guilds.others,
                        ]
                        : [
                            newEvent.guilds.creator,
                        ];

                    // update scoreboard promises
                    const guildMessagesPromises:
                    Promise<Event.ChannelMessage | null>[] = eventGuilds.map(
                        async (eventGuild: Event.Guild):
                        Promise<Event.ChannelMessage | null> => {
                            // get guild
                            const guild: discord.Guild | null = getGuildFromId(
                                gClient,
                                eventGuild.discordId,
                            );

                            if (guild === null) {
                                Utils.logger.warn('Discord guild not available');
                                return null;
                            }

                            const scoreboard:
                            Event.TeamScoreboard[] = Event.getEventTeamsScoreboards(
                                newEvent,
                            );
                            const scoreboardStr: string = await Event.getEventScoreboardString(
                                newEvent.name,
                                guild.id,
                                scoreboard,
                                scoreboard,
                                newEvent.tracking.category,
                                'what',
                                false,
                                'regular',
                            );

                            return refreshMessage(
                                gClient,
                                guild,
                                eventGuild.scoreboardMessage,
                                `${scoreboardStr}`,
                                {
                                    code: true,
                                }
                            );
                        }
                    );
                    const guildMessages:
                    (Event.ChannelMessage | null)[] = await Promise.all(
                        guildMessagesPromises
                    );

                    // first message belongs to the owner
                    newEvent.guilds.creator.scoreboardMessage = guildMessages[0] !== null
                        ? guildMessages[0]
                        : undefined;

                    // create others message array
                    const othersMessages: (
                        Event.ChannelMessage | null
                    )[] = guildMessages.slice(1);

                    // do the same thing for others as the creator guild
                    othersMessages.forEach(
                        (otherMessages: Event.ChannelMessage | null, idy: number): void => {
                            if (newEvent.guilds.others !== undefined) {
                                newEvent.guilds.others[idy]
                                    .scoreboardMessage = otherMessages !== null
                                        ? otherMessages[0]
                                        : undefined;
                            }
                        }
                    );

                    // save event
                    await Db.upsertEvent(newEvent);
                    didUpdateScores$.next(newEvent);
                }
            );
        }
    );

    didUpdateScores$.subscribe(
        async (event: Event.Object): Promise<void> => {
            Utils.logger.debug(`Event ${event.id} scores did update.`);
        }
    );

    willAddEvent$.subscribe(
        async (event: Event.Object): Promise<void> => {
            Utils.logger.debug(`Event ${event.id} will be added.`);
            // fix all the event chains
            if (Utils.isInPast(event.when.start)) {
                Utils.logger.info('Event started in the past');
                willStartEvent$.next(event);
            }
            if (Utils.isInPast(event.when.end)) {
                Utils.logger.info('Event ended in the past');
                willEndEvent$.next(event);
            } else {
                scheduleEventsTimers();
            }
            didAddEvent$.next(event);
        }
    );

    didAddEvent$.subscribe(
        (event: Event.Object): void => {
            Utils.logger.debug(`Event ${event.id} has been added.`);
        }
    );

    willSignUpPlayer$.subscribe(
        async (event: Event.Object): Promise<void> => {
            Utils.logger.debug(`Event ${event.id} will signup player.`);
            const now: Date = new Date();
            if (event.when.start <= now
                && !Event.isEventCasual(event)
                && !Event.isEventCustom(event)) {
                // already started - update the scores
                willUpdateScores$.next(event);
            }

            didSignupPlayer$.next(event);
        }
    );

    didSignupPlayer$.subscribe(
        (event: Event.Object): void => {
            Utils.logger.debug(`Event ${event.id} did signup player.`);
        }
    );

    await Db.createTables();
    await resumeRunningEvents();
    await scheduleEventsTimers();

    // tick
    setInterval(
        scheduleEventsTimers,
        1000 * 60 * 60 * 24,
    );
};
init();


// TODO: work on bot events
// work on when event ends
// when unsigned up
// you can currently delete events cross guilds - fix this
// signup edit unsignup delete - any modification of events should not be cross guild
// contain these functions
