import * as discord from 'discord.js';
import { Subject, GroupedObservable, Observable } from 'rxjs';
import {
    groupBy, mergeMap, tap, throttleTime,
} from 'rxjs/operators';
import {
    Conversation, ConversationManager, CONVERSATION_STATE, Qa,
} from '../conversation';
import { Command } from '../command';
import { Db } from '../database';
import { Event } from '../event';
import { Utils } from '../utils';
import { willUpdateScores$ } from '../..';
import { MessageWrapper } from '../messageWrapper';

const rateThrottle: Subject<[Event.Standard, discord.Message]> = new Subject();
rateThrottle.pipe(
    groupBy(
        (eventAndMessage: [Event.Standard, discord.Message]): number => {
            if (eventAndMessage[0].id !== undefined) {
                return eventAndMessage[0].id;
            }
            return -1;
        },
    ),
    mergeMap(
        (group: GroupedObservable<number, [Event.Standard, discord.Message]>):
        Observable<[Event.Standard, discord.Message]> => group.pipe(
            tap(
                (): void => {
                    Utils.logger.debug('force update request');
                },
            ),
            throttleTime(1000 * 60 * 15),
            tap(
                (eventAndMessage: [Event.Standard, discord.Message]):
                void => {
                    Utils.logger.debug('force update sending');
                    MessageWrapper.sendMessage({
                        message: eventAndMessage[1],
                        content: 'Forcing update... The scoreboard will be updated when done.',
                    });

                    willUpdateScores$.next([
                        eventAndMessage[0],
                        true,
                    ]);
                },
            ),
        ),
    ),
).subscribe();

class ForceUpdateConversation extends Conversation {
    private event: Event.Standard;

    // eslint-disable-next-line class-methods-use-this
    public async init(): Promise<boolean> {
        return Promise.resolve(false);
    }

    public produceQ(): string | null {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
                return 'Which event id would you like to force update? (type .exit to stop command)';
            case CONVERSATION_STATE.Q1C:
                return 'Are you SURE you want to update an event that has already ended? This cannot be undone and should only be used if the scoreboard failed to update when the event ended.';
            default:
                return null;
        }
    }

    protected async consumeQa(qa: Qa): Promise<void> {
        switch (this._state) {
            case CONVERSATION_STATE.Q1:
            case CONVERSATION_STATE.Q1E: {
                const eventId: number = Number.parseInt(qa.answer.content, 10);
                if (Number.isNaN(eventId)) {
                    this._state = CONVERSATION_STATE.Q1E;
                    break;
                } else {
                    const creatorEvent: Event.Standard | null = await Db.fetchLocallyCreatedEvent(
                        eventId,
                        this.opMessage.guild.id,
                    );
                    const invitedEvent: Event.Standard | null = await Db.fetchInvitedEvent(
                        eventId,
                        this.opMessage.guild.id,
                    );
                    const event: Event.Standard | null = creatorEvent !== null
                        ? creatorEvent
                        : invitedEvent;

                    if (event === null) {
                        this._lastErrorMessage = 'Could not find event. Hint: find the event id on the corresponding scoreboard.';
                        this._state = CONVERSATION_STATE.Q1E;
                        break;
                    } else if (Utils.isInPast(event.when.end)) {
                        if (event.isGlobal === true) {
                            // can't for globals
                            this._returnMessage = 'This command is disabled for global events after they end.';
                            this._state = CONVERSATION_STATE.DONE;
                            break;
                        } else {
                            // confirm if event already ended
                            this.event = event;
                            this._state = CONVERSATION_STATE.Q1C;
                            break;
                        }
                    } else {
                        // do it
                        rateThrottle.next([
                            this.event,
                            this.opMessage,
                        ]);
                        this._returnMessage = 'This command is rate limited to once every fifteen minutes per event. This request may be dropped. Please be patient as Runescape hiscores may be slow.';
                        this._state = CONVERSATION_STATE.DONE;
                        break;
                    }
                }
            }
            case CONVERSATION_STATE.Q1C: {
                const answer = qa.answer.content;
                if (!Utils.isYes(answer)) {
                    this._returnMessage = 'Will not force update.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                } else {
                    rateThrottle.next([
                        this.event,
                        this.opMessage,
                    ]);
                    this._returnMessage = 'This command is rate limited to once a minute per event. This request may be dropped. Please be patient as Runescape hiscores may be slow.';
                    this._state = CONVERSATION_STATE.DONE;
                    break;
                }
            }
            default:
                break;
        }
    }
}

const forceUpdate = (
    msg: discord.Message,
): void => {
    const params: Command.ForceUpdate = Command.parseParameters(
        Command.ALL.FORCE_UPDATE,
        msg.content,
    );

    const eventsForceUpdateConversation = new ForceUpdateConversation(
        msg,
        params,
    );
    ConversationManager.startNewConversation(
        msg,
        eventsForceUpdateConversation,
    );
};

export default forceUpdate;
