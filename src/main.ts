import * as discord from 'discord.js';

import { EventEmitter, } from 'events';
import {
    fromEvent, Observable, Subject, merge, forkJoin, of, from, concat, defer,
} from 'rxjs';
import {
    filter, tap, mergeMap, concatMap, map, combineAll, catchError, delay, toArray, retry,
} from 'rxjs/operators';
import { hiscores, } from 'osrs-json-api';
import { async, } from 'rxjs/internal/scheduler/async';
import { privateKey, } from './auth';
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
import forceUpdate from './commands/eventsForceUpdate';
import { Db, } from './database';
import eventsEdit from './commands/eventsEdit';
import { MessageWrapper, } from './messageWrapper';
import { Event, } from './event';
import { Network, } from './network';
import { Settings, } from './settings';
import { ConversationManager, } from './conversation';
import joinGlobal from './commands/eventsJoinGlobal';
import unjoinGlobal from './commands/eventsUnjoinGlobal';

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
export const willStartEvent$: Subject<Event.Standard> = new Subject();
/**
 * Observable of started events
 * @category Observable
 */
export const didStartEvent$: Subject<Event.Standard> = new Subject();

/**
 * Observable of ending events
 * @category Observable
 */
export const willEndEvent$: Subject<Event.Standard> = new Subject();
/**
 * Observable of ended events
 * @category Observable
 */
export const didEndEvent$: Subject<Event.Standard> = new Subject();

/**
 * Observable of updating scores
 * @category Observable
 */
export const willUpdateScores$: Subject<[Event.Standard, boolean]> = new Subject();
/**
 * Observable of updated scores
 * @category Observable
 */
export const didUpdateScores$: Subject<Event.Standard> = new Subject();

/**
 * Observable of signing up players
 * @category Observable
 */
export const willSignUpPlayer$: Subject<Event.Standard> = new Subject();
/**
 * Observable of signed up player
 * @category Observable
 */
export const didSignupPlayer$: Subject<Event.Standard> = new Subject();

/**
 * Observable of unsigning up player
 * @category Observable
 */
export const willUnsignupPlayer$: Subject<Event.Standard> = new Subject();

/**
 * Observable of unsigned up player
 * @category Observable
 */
export const didUnsignupPlayer$: Subject<Event.Standard> = new Subject();

/**
 * Observable of adding events
 * @category Observable
 */
export const willAddEvent$: Subject<Event.Standard> = new Subject();
/**
 * Observable of added events
 * @category Observable
 */
export const didAddEvent$: Subject<Event.Standard> = new Subject();

/**
 * Observable of deleting events
 * @category Observable
 */
export const willDeleteEvent$: Subject<Event.Standard> = new Subject();
/**
 * Observable of deleted events
 * @category Observable
 */
export const didDeleteEvent$: Subject<Event.Standard> = new Subject();

/**
 * Observable of editing events
 * @category Observable
 */
export const willEditEvent$: Subject<Event.Standard> = new Subject();
/**
 * Observable of edited events
 * @category Observable
 */
export const didEditEvent$: Subject<Event.Standard> = new Subject();

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
 * Gets the [[discord.Guild]]'s name from a Guild id
 * @param client The Discord Client object
 * @param guildId The Guild id to find
 * @returns A Guild Name string or null
 */
export const getDiscordGuildName = (
    client: discord.Client,
    guildId: string,
): string | null => {
    const guild: discord.Guild | undefined = gClient.guilds.get(
        guildId,
    );
    return guild !== undefined
        ? `${guild.name}`
        : null;
};

/**
 * Gets the [[discord.Guild]] object from a Guild id
 * @param client The Discord Client object
 * @param guildId The Guild id to find
 * @returns The Guild object
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

    Utils.logger.debug('Injecting new spoofed message.');
    Utils.logger.trace(newMessage);
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

/**
 * Helper function when the bot restarts
 * @category Helper
 */
const resumeRunningEvents = async (): Promise<void> => {
    const events: Event.Standard[] | null = await Db.fetchAllCurrentlyRunningEvents();
    if (events === null) {
        return;
    }
    events.forEach(
        (event: Event.Standard): void => {
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
    Promise<discord.Message | null>[] = eventMessage.messageId.map(
        (messageId: string):
        Promise<discord.Message | null> => channel.fetchMessage(
            messageId,
        ).catch(
            (error: Error): null => {
                Utils.logger.warn(`${error} during discord message fetch`);
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
    const settings: Settings.Obj | null = await Db.fetchSettings(
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

    // post new status
    const dummyMessage: discord.Message = new discord.Message(
        channelToPostTo,
        null as unknown as Record<string, unknown>,
        client,
    );


    // delete old status message
    let deleteMessagePromise: Promise<MessageWrapper.Response[] | null> = Promise.resolve(null);
    if (oldMessage !== undefined) {
        deleteMessagePromise = deleteMessages(
            guild,
            oldMessage
        );
    }

    let messagePromise: Promise<MessageWrapper.Response | null> = Promise.resolve(null);
    if (content !== undefined && content.length > 0) {
        messagePromise = MessageWrapper.sendMessage({
            message: dummyMessage,
            content,
            options,
        });
    }

    const responses: [
        (MessageWrapper.Response[] | null),
        (MessageWrapper.Response | null)
    ] = await Promise.all([
        deleteMessagePromise,
        messagePromise,
    ]);
    const response: MessageWrapper.Response | null = responses[1];
    if (response === null) {
        return null;
    }

    const messagePart: Event.ChannelMessage = {
        channelId: settings.channelId,
        messageId: response.messages
            .filter(Utils.isDefinedFilter)
            .map((msg: discord.Message): string => msg.id),
    };
    return messagePart;
};

const saveAndNotifyUpdatedEventScoreboard = (
    event: Event.Standard,
    lastError: Error | undefined,
): Observable<Event.Standard> => {
    const eventGuilds: Event.Guild[] = event.guilds.others !== undefined
        ? [
            event.guilds.creator,
            ...event.guilds.others,
        ]
        : [
            event.guilds.creator,
        ];
    const observables: Observable<Event.ChannelMessage | null>[] = eventGuilds.map(
        (eventGuild: Event.Guild):
        Observable<Event.ChannelMessage | null> => {
            const guild: discord.Guild | null = getGuildFromId(
                gClient,
                eventGuild.guildId
            );
            if (guild === null) {
                Utils.logger.warn('Discord guild not available');
                return of(null);
            }
            const deferredRefreshScoreboardObservable: Observable<Event.ChannelMessage | null> = defer(
                (): Observable<Event.ChannelMessage | null> => from(
                    event.getEventScoreboardString(
                        eventGuild.guildId,
                        false,
                    )
                ).pipe(
                    mergeMap(
                        (scoreboardStr: string):
                        Observable<Event.ChannelMessage | null> => {
                            const now: Date = new Date();
                            const footer: string = lastError === undefined
                                ? `\n\nLast updated ${now.toUTCString()}`
                                : `\n\nError ${lastError.message}`;

                            const msg2 = refreshMessage(
                                gClient,
                                guild,
                                eventGuild.scoreboardMessage,
                                `${scoreboardStr}${footer}`,
                                {
                                    code: true,
                                }
                            );
                            return from(msg2);
                        }
                    )
                )
            );
            return deferredRefreshScoreboardObservable;
        }
    );

    const newEvent: Event.Standard = event instanceof Event.Global
        ? new Event.Global(
            event.id,
            event.name,
            event.when.start,
            event.when.end,
            event.guilds,
            event.teams,
            event.tracking,
            event.global,
            event.invitations,
        )
        : new Event.Standard(
            event.id,
            event.name,
            event.when.start,
            event.when.end,
            event.guilds,
            event.teams,
            event.tracking,
            event.global,
        );
    const ret: Observable<Event.Standard> = concat(
        observables
    ).pipe(
        combineAll(),
        map(
            (channelMessages: (Event.ChannelMessage | null)[]):
            Event.Standard => {
                channelMessages.forEach(
                    (channelMessage: Event.ChannelMessage, idx: number):
                    void => {
                        if (idx === 0) {
                            // newEvent.guilds.creator.statusMessage = msg1 !== null
                            //     ? msg1
                            //     : undefined;
                            newEvent.guilds
                                .creator
                                .scoreboardMessage = channelMessage !== null
                                    ? channelMessage
                                    : undefined;
                        } else if (newEvent.guilds.others !== undefined) {
                            // newEvent.guilds.others[idx - 1].statusMessage = msg1 !== null
                            //     ? msg1
                            //     : undefined;
                            newEvent.guilds.others[idx - 1]
                                .scoreboardMessage = channelMessage !== null
                                    ? channelMessage
                                    : undefined;
                        }
                    }
                );
                return newEvent;
            }
        ),
        mergeMap(
            (eventToSave: Event.Standard): Observable<Event.Standard> => from(
                Db.upsertEvent(eventToSave)
            )
        ),
        tap(
            (savedEvent: Event.Standard): void => {
                didUpdateScores$.next(savedEvent);
            }
        ),
    );
    return ret;
};

const scheduleEvents = async (): Promise<void> => {
    const now: Date = new Date();
    const twentyFiveHours: Date = new Date();
    twentyFiveHours.setHours(twentyFiveHours.getHours() + 25);

    let events: Event.Standard[] | null = await Db.fetchAllEventsBetweenDates(
        now, twentyFiveHours,
    );

    if (events === null) {
        events = [];
    }

    // schedule timers if not exists
    events.forEach(
        (event: Event.Standard): void => {
            if (event.id === undefined) {
                Utils.logger.error('event id is undefined');
                return;
            }

            if (startTimers[event.id] === undefined
                && event.when.start >= now
                && event.when.start < twentyFiveHours) {
                startTimers[event.id] = setTimeout(
                    async (): Promise<void> => {
                        if (event.id !== undefined) {
                            const updatedEvent: Event.Standard | null = await Db.fetchEvent(event.id);
                            if (updatedEvent !== null) {
                                willStartEvent$.next(updatedEvent);
                            }
                        }
                    }, event.when.start.getTime() - now.getTime(),
                );
            }

            if (endTimers[event.id] === undefined
                && event.when.end >= now
                && event.when.end < twentyFiveHours) {
                endTimers[event.id] = setTimeout(
                    async (): Promise<void> => {
                        if (event.id !== undefined) {
                            const updatedEvent: Event.Standard | null = await Db.fetchEvent(event.id);
                            if (updatedEvent !== null) {
                                willEndEvent$.next(updatedEvent);
                            }
                        }
                    }, event.when.end.getTime() - now.getTime()
                );
            }
        }
    );
};

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
willStartEvent$.pipe(
    map(
        (event: Event.Standard): void => {
            Utils.logger.debug(`Event ${event.id} is starting.`);

            // release start timer
            // should already be expired
            if (event.id !== undefined) {
                startTimers[event.id] = undefined;
            }

            // if we have a competitive event
            // track scoreboard automatically
            if (!event.isCustom()) {
                Utils.logger.trace('Event is auto tracking score');
                willUpdateScores$.next([
                    event,
                    true,
                ]);
            }

            // // combine all guild objects
            // const eventGuilds: Event.Guild[] = event.guilds.others !== undefined
            //     ? [
            //         event.guilds.creator,
            //         ...event.guilds.others,
            //     ]
            //     : [
            //         event.guilds.creator,
            //     ];


            // updateEventScoreboard(
            //     eventGuilds,
            //     event,
            // ).subscribe(
            //     async (updatedEvent: Event.Standardect): Promise<void> => {
            //         // save event
            //         await Db.upsertEvent(updatedEvent);
            //         didUpdateScores$.next(updatedEvent);
            //     }
            // );
        }
    )
).subscribe();

// will update scoreboard
// and save updated event to db
willUpdateScores$.pipe(
    concatMap(
        (obj: [Event.Standard, boolean]): Observable<Event.Standard> => {
            const event: Event.Standard = obj[0];
            const forced: boolean = obj[1];
            Utils.logger.debug(`Event ${event.id} scores will update.`);

            if (Utils.isInFuture(event.when.start)) {
                return saveAndNotifyUpdatedEventScoreboard(
                    event,
                    undefined,
                );
            }

            const flattenedParticipants: Event.Participant[] = event.teams.flatMap(
                (team: Event.Team): Event.Participant[] => team.participants
            );

            const flattenedAccounts: Event.Account[] = flattenedParticipants.flatMap(
                (participant: Event.Participant):
                Event.Account[] => participant.runescapeAccounts
            );

            const observables: Observable<hiscores.Player | null>[] = flattenedAccounts.flatMap(
                (account: Event.Account):
                Observable<hiscores.Player | null> => Network.hiscoresFetch$(
                    account.rsn,
                    forced,
                ).pipe(
                    catchError((error: Error): Observable<null> => {
                        Utils.logger.error(`There was still an error for player: ${account.rsn} error: ${error.name}`);
                        return of(null);
                    }),
                ),
            );
            if (observables.length === 0) {
                return saveAndNotifyUpdatedEventScoreboard(
                    event,
                    undefined,
                );
            }

            // un-flatmap
            let idx = 0;
            const inner: Observable<Event.Standard> = forkJoin(observables).pipe(
                concatMap(
                    (results: (hiscores.Player | null)[]):
                    Observable<Event.Standard> => {
                        // prepare a new event
                        const newEvent: Event.Standard = event instanceof Event.Global
                            ? new Event.Global(
                                event.id,
                                event.name,
                                event.when.start,
                                event.when.end,
                                event.guilds,
                                event.teams,
                                event.tracking,
                                event.global,
                                event.invitations,
                            )
                            : new Event.Standard(
                                event.id,
                                event.name,
                                event.when.start,
                                event.when.end,
                                event.guilds,
                                event.teams,
                                event.tracking,
                                event.global,
                            );

                        // cascade remake of teams
                        const newTeams: Event.Team[] = newEvent.teams.map(
                            (team: Event.Team): Event.Team => {
                                const newTeam: Event.Team = { ...team, };
                                const newParticipants:
                                Event.Participant[] = newTeam.participants.map(
                                    (participant: Event.Participant):
                                    Event.Participant => {
                                        const newParticipant:
                                        Event.Participant = { ...participant, };
                                        const newAccounts:
                                        Event.Account[] = newParticipant
                                            .runescapeAccounts.map(
                                                (account: Event.Account):
                                                Event.Account => {
                                                    const newAccount = { ...account, };
                                                    const result: hiscores.Player | null = results[idx];
                                                    if (result !== null) {
                                                        newAccount.ending = result;
                                                        if (newAccount.starting === undefined) {
                                                            newAccount.starting = newAccount.ending;
                                                        }
                                                    }
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
                        return saveAndNotifyUpdatedEventScoreboard(
                            newEvent,
                            undefined,
                        );
                    }
                ),
            ).pipe(
                catchError(
                    (error: Error): Observable<Event.Standard> => saveAndNotifyUpdatedEventScoreboard(
                        event,
                        error,
                    )
                )
            );
            return inner;
        }
    ),
).subscribe();

didStartEvent$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} did start.`);
    }
);

willEndEvent$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} will end.`);
        if (event.id === undefined) {
            Utils.logger.error('event id is undefined');
            return;
        }

        endTimers[event.id] = undefined;

        // one last update to scoreboard
        willUpdateScores$.next([
            event,
            true,
        ]);
        didEndEvent$.next(event);
    }
);

didEndEvent$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} did end.`);
    }
);

didUpdateScores$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} scores did update.`);
    }
);

willAddEvent$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} will be added.`);
        // fix all the event chains
        if (Utils.isInPast(event.when.start)) {
            Utils.logger.info('Event started in the past.');
            willStartEvent$.next(event);
        }
        if (Utils.isInPast(event.when.end)) {
            Utils.logger.info('Event ended in the past.');
            willEndEvent$.next(event);
        }
        if (event.isCustom()) {
            Utils.logger.info('Custom event added.');
            willUpdateScores$.next([
                event,
                false,
            ]);
        }

        if (!Utils.isInPast(event.when.start)
            && !Utils.isInPast(event.when.end)) {
            scheduleEvents();
            // print the board
            willUpdateScores$.next([
                event,
                false,
            ]);
        }
        didAddEvent$.next(event);
    }
);

didAddEvent$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} has been added.`);
    }
);

willSignUpPlayer$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} will signup player.`);
        // update the board
        willUpdateScores$.next([
            event,
            false,
        ]);
        didSignupPlayer$.next(event);
    }
);

didSignupPlayer$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} did signup player.`);
    }
);

willUnsignupPlayer$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} will unsignup player.`);
        // update the board
        willUpdateScores$.next([
            event,
            false,
        ]);
        didUnsignupPlayer$.next(event);
    }
);

didUnsignupPlayer$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} did unsignup player.`);
    }
);

willDeleteEvent$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} will delete.`);
        const combinedGuilds = event.guilds.others !== undefined
            ? [
                event.guilds.creator,
                ...event.guilds.others,
            ]
            : [
                event.guilds.creator,
            ];
        combinedGuilds.forEach(
            async (guild: Event.Guild): Promise<void> => {
                const discordGuild: discord.Guild | null = getGuildFromId(
                    gClient,
                    guild.guildId,
                );
                if (discordGuild === null) {
                    return;
                }
                const content: string = await event.getEventScoreboardString(
                    guild.guildId,
                    true,
                );
                await refreshMessage(
                    gClient,
                    discordGuild,
                    guild.scoreboardMessage,
                    content,
                    {
                        code: true,
                    }
                );
            }
        );

        didDeleteEvent$.next(
            event,
        );
    }
);

didDeleteEvent$.subscribe(
    (event: Event.Standard): void => {
        Utils.logger.debug(`Event ${event.id} did delete`);
    }
);

/**
 * Startup and initialization
 */
const init = async (): Promise<void> => {
    await gClient.login(privateKey);

    // register command listener
    commandReceived$(Command.ALL.ADMIN_SET_CHANNEL).subscribe(adminSetChannel);
    commandReceived$(Command.ALL.EVENTS_ADD).subscribe(eventsAdd);
    commandReceived$(Command.ALL.EVENTS_DELETE).subscribe(eventsDelete);
    // commandReceived$(Command.ALL.EVENTS_EDIT).subscribe(eventsEdit);
    commandReceived$(Command.ALL.EVENTS_END_EVENT).subscribe(eventsEndEvent);
    commandReceived$(Command.ALL.EVENTS_FORCE_SIGNUP).subscribe(eventsForceSignup);
    commandReceived$(Command.ALL.EVENTS_FORCE_UNSIGNUP).subscribe(eventsForceUnsignup);
    // commandReceived$(Command.ALL.EVENTS_ADD_SCORE).subscribe(eventsAddScore);
    // commandReceived$(Command.ALL.EVENTS_LIST_ACTIVE).subscribe(eventsListActive);
    commandReceived$(Command.ALL.EVENTS_LIST_ALL).subscribe(eventsListAll);
    // commandReceived$(Command.ALL.EVENTS_LIST_PARTICIPANTS).subscribe(eventsListParticipants);
    // commandReceived$(Command.ALL.EVENTS_AMISIGNEDUP).subscribe(eventsAmISignedUp);
    commandReceived$(Command.ALL.EVENTS_SIGNUP).subscribe(eventsSignup);
    commandReceived$(Command.ALL.EVENTS_UNSIGNUP).subscribe(eventsUnsignup);
    // commandReceived$(Command.ALL.USERS_STATS).subscribe(usersStats);
    commandReceived$(Command.ALL.HELP).subscribe(help);
    commandReceived$(Command.ALL.FORCE_UPDATE).subscribe(forceUpdate);
    commandReceived$(Command.ALL.JOIN_GLOBAL).subscribe(joinGlobal);
    commandReceived$(Command.ALL.UNJOIN_GLOBAL).subscribe(unjoinGlobal);
    Utils.logger.info('Command listeners running');

    await Db.createTables();
    await resumeRunningEvents();
    await scheduleEvents();

    // tick tock
    setInterval(
        scheduleEvents,
        1000 * 60 * 60 * 24,
    );

    // updates
    setInterval(
        async (): Promise<void> => {
            const runningEvents:
            (Event.Standard[] | null) = await Db.fetchAllCurrentlyRunningEvents();
            if (runningEvents === null) {
                return;
            }
            const filteredEvents: Event.Standard[] = runningEvents.filter(
                Utils.isDefinedFilter
            );
            const autoUpdateEvents: Event.Standard[] = filteredEvents.filter(
                (eventToFilter: Event.Standard): boolean => !eventToFilter.isCustom()
            );
            autoUpdateEvents.forEach(
                (autoEvent: Event.Standard): void => {
                    willUpdateScores$.next([
                        autoEvent,
                        false,
                    ]);
                }
            );
        }, 1000 * 60 * 6
    );
};
init();

// TODO:
// Update add command code
// Change global join to specify team name immediately
