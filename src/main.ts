import * as discord from 'discord.js';

import { EventEmitter, } from 'events';
import {
    fromEvent, Observable, Subject, merge, Subscription, timer, forkJoin,
} from 'rxjs';
import {
    filter, tap,
} from 'rxjs/operators';
import { hiscores, } from 'osrs-json-api';
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
import { async } from 'rxjs/internal/scheduler/async';

/**
 * Global discord client
 * @category Global
 */
export const gClient: discord.Client = new discord.Client();
Db.createTables();

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
            `${author.username} was not found in ${guild.name}'s member list. Returning false.`
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
 * Gets the user's [[discord.Guild]] display name from a Discord id
 * @param guildId The Guild id to use for display name lookup
 * @param discordId The Discord id to lookup
 * @returns The user's display name
 * @category Helper
 */
export const getDisplayNameFromDiscordId = (
    guildId: string,
    discordId: string
): string | null => {
    const guild: discord.Guild = gClient.guilds.get(
        guildId
    ) as discord.Guild;
    if (guild === undefined || !guild.available) return '(guild unavailable)';
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
                Utils.logger.debug(`author: ${msg.author.username}`);
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

gClient.login(privateKey);


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

// willSaveToDb$.subscribe(Db.willHandleSave);

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

// tick
setInterval(
    scheduleEventsTimers,
    1000 * 60 * 60 * 24,
);
scheduleEventsTimers();

// init
// find all events between distant past and now that are not ended
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
resumeRunningEvents();

// bot events
MessageWrapper.sentMessages$.subscribe(
    (response: MessageWrapper.Response): void => {
        Utils.logger.trace(`Message with tag ${response.tag} sent.`);
    },
    (err: Error): void => {
        Utils.logError(err);
    },
    (): void => {
        Utils.logger.trace('Finished sending messages.');
    }
);

willStartEvent$.subscribe(
    (event: Event.Object): void => {
        if (event.id === undefined) {
            throw new Error('event id is undefined');
        }
        startTimers[event.id] = undefined;

        if (!Event.isEventCasual(event)
            && !Event.isEventCustom(event)) {
            // auto score update
            willUpdateScores$.next(event);
            updateTimers[event.id] = setInterval(
                (): void => {
                    willUpdateScores$.next(event);
                }, 1000 * 60 * 10
            );
        }

        didStartEvent$.next(event);
    }
);

willEndEvent$.subscribe(
    (event: Event.Object): void => {
        if (event.id === undefined) {
            throw new Error('event id is undefined');
        }
        endTimers[event.id] = undefined;

        const updateTimer:
        NodeJS.Timeout | undefined = updateTimers[event.id];

        if (updateTimer !== undefined) {
            clearInterval(updateTimer);
            updateTimers[event.id] = undefined;
        }

        didEndEvent$.next(event);
    }
);

willUpdateScores$.subscribe(
    async (event: Event.Object): Promise<void> => {
        const participants: Event.Participant[] = event.teams.flatMap(
            (team: Event.Team): Event.Participant[] => team.participants
        );

        const accounts: Event.Account[] = participants.flatMap(
            (participant: Event.Participant):
            Event.Account[] => participant.runescapeAccounts
        );

        const observables: Observable<hiscores.Player | null>[] = accounts.flatMap(
            (account: Event.Account): Observable<hiscores.Player | null> => Network.hiscoresFetch$(
                account.rsn,
                false,
            )
        );

        // un-flatmap
        let idx = 0;
        forkJoin(observables).subscribe(
            (results: hiscores.Player[]):
            void => {
                event.teams.forEach(
                    (team: Event.Team, idi: number):
                    void => {
                        team.participants.forEach(
                            (participant: Event.Participant, idj: number):
                            void => participant.runescapeAccounts.forEach(
                                (_, idk: number):
                                void => {
                                    const account: Event.CompetitiveAccount = event
                                        .teams[idi]
                                        .participants[idj]
                                        .runescapeAccounts[idk] as Event.CompetitiveAccount;
                                    if (results[idx] !== null) {
                                        account.ending = results[idx];
                                        if (account.starting === undefined) {
                                            account.starting = account.ending;
                                        }
                                    }
                                    idx += 1;
                                }
                            )
                        );
                    }
                );
            }
        );
        didUpdateScores$.next(event);
    }
);

willAddEvent$.subscribe(
    async (event: Event.Object): Promise<void> => {
        scheduleEventsTimers();
        didAddEvent$.next(event);

        if (Utils.isInPast(event.when.start)) {
            willStartEvent$.next(event);
        }
        if (Utils.isInPast(event.when.end)) {
            willEndEvent$.next(event);
        }
    }
);

willSignUpPlayer$.subscribe(
    async (event: Event.Object): Promise<void> => {
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
