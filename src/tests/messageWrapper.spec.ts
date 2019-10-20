/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names */
/* eslint-disable no-unused-expressions */
import {
    describe, it, beforeEach, afterEach, before, after, utils,
} from 'mocha';
import { assert, expect, } from 'chai';
import pgp from 'pg-promise';
import sinon from 'sinon';
import * as discord from 'discord.js';
import { async, } from 'rxjs/internal/scheduler/async';
import {
    take, last, tap, observeOn, map, toArray,
} from 'rxjs/operators';
import Rx, {
    Subscription, defer, concat, Observable, of, from, observable, Subject,
} from 'rxjs';
import { observe, DoneFunction, } from 'rxjs-marbles/mocha';
import { Event, } from '../event';
import { Db2, } from '../database';
import { Utils, } from '../utils';
import { MessageWrapper, } from '../messageWrapper';


const longStr = 'Denote simple fat denied add worthy little use. As some he so high down am week. Conduct esteems by cottage to pasture we winding. On assistance he cultivated considered frequently. Person how having tended direct own day man. Saw sufficient indulgence one own you inquietude sympathize. '
+ 'Both rest of know draw fond post as. It agreement defective to excellent. Feebly do engage of narrow. Extensive repulsive belonging depending if promotion be zealously as. Preference inquietude ask now are dispatched led appearance. Small meant in so doubt hopes. Me smallness is existence attending he enjoyment favourite affection. Delivered is to ye belonging enjoyment preferred. Astonished and acceptance men two discretion. Law education recommend did objection how old.\n'
+ 'Arrived totally in as between private. Favour of so as on pretty though elinor direct. Reasonable estimating be alteration we themselves entreaties me of reasonably. Direct wished so be expect polite valley. Whose asked stand it sense no spoil to. Prudent you too his conduct feeling limited and. Side he lose paid as hope so face upon be. Goodness did suitable learning put.\n'
+ 'However venture pursuit he am mr cordial. Forming musical am hearing studied be luckily. Ourselves for determine attending how led gentleman sincerity. Valley afford uneasy joy she thrown though bed set. In me forming general prudent on country carried. Behaved an or suppose justice. Seemed whence how son rather easily and change missed. Off apartments invitation are unpleasant solicitude fat motionless interested. Hardly suffer wisdom wishes valley as an. As friendship advantages resolution it alteration stimulated he or increasing.\n'
+ 'Throwing consider dwelling bachelor joy her proposal laughter. Raptures returned disposed one entirely her men ham. By to admire vanity county an mutual as roused. Of an thrown am warmly merely result depart supply. Required honoured trifling eat pleasure man relation. Assurance yet bed was improving furniture man. Distrusts delighted she listening mrs extensive admitting far.\n'
+ 'Cottage out enabled was entered greatly prevent message. No procured unlocked an likewise. Dear but what she been over gay felt body. Six principles advantages and use entreaties decisively. Eat met has dwelling unpacked see whatever followed. Court in of leave again as am. Greater sixteen to forming colonel no on be. So an advice hardly barton. He be turned sudden engage manner spirit.\n'
+ 'He share of first to worse. Weddings and any opinions suitable smallest nay. My he houses or months settle remove ladies appear. Engrossed suffering supposing he recommend do eagerness. Commanded no of depending extremity recommend attention tolerably. Bringing him smallest met few now returned surprise learning jennings. Objection delivered eagerness he exquisite at do in. Warmly up he nearer mr merely me.\n'
+ 'Of recommend residence education be on difficult repulsive offending. Judge views had mirth table seems great him for her. Alone all happy asked begin fully stand own get. Excuse ye seeing result of we. See scale dried songs old may not. Promotion did disposing you household any instantly. Hills we do under times at first short an.\n'
+ 'Her old collecting she considered discovered. So at parties he warrant oh staying. Square new horses and put better end. Sincerity collected happiness do is contented. Sigh ever way now many. Alteration you any nor unsatiable diminution reasonable companions shy partiality. Leaf by left deal mile oh if easy. Added woman first get led joy not early jokes.\n'
+ 'Up is opinion message manners correct hearing husband my. Disposing commanded dashwoods cordially depending at at. Its strangers who you certainty earnestly resources suffering she. Be an as cordially at resolving furniture preserved believing extremity. Easy mr pain felt in. Too northward affection additions nay. He no an nature ye talent houses wisdom vanity denied.';

describe('Message Wrapper', (): void => {
    Utils.logger.level = 'fatal';
    let testMessage: discord.Message;
    const testChannel: discord.TextChannel = {
        send: (content, options?):
        Promise<discord.Message | discord.Message[]> => Promise.resolve(
            {
                ...testMessage,
                content,
            } as discord.Message,
        ),
    } as discord.TextChannel;
    testMessage = {
        channel: testChannel,
        content: 'test',
    } as discord.Message;
    const sendStub: sinon.SinonStub = sinon.stub(testChannel, 'send');
    describe('Send message', (): void => {
        it('should not throw an error.', (): void => {
            sendStub.onFirstCall().resolves({
                ...testMessage,
                content: 'msg1',
            });
            MessageWrapper.sendMessage$.next(
                testMessage,
            );
        });
        it('should call send once.', (
            done: DoneFunction
        ): void => {
            sendStub.onFirstCall().resolves(
                {
                    ...testMessage,
                    content: 'msg1',
                }
            );

            const sub = MessageWrapper.sentMessages$.subscribe(
                (): void => {
                    expect(sendStub.callCount).to.equal(1);
                    sub.unsubscribe();
                    done();
                }
            );

            MessageWrapper.sendMessage$.next(
                testMessage,
            );
        });
        it('should call send three times.', (
            done: DoneFunction
        ): void => {
            sendStub.onFirstCall().resolves({
                ...testMessage,
                content: 'msg1',
            });
            sendStub.onSecondCall().resolves({
                ...testMessage,
                content: 'msg2',
            });
            sendStub.onThirdCall().resolves({
                ...testMessage,
                content: 'msg3',
            });

            const sub = MessageWrapper.sentMessages$.subscribe(
                (): void => {
                    expect(sendStub.callCount).to.equal(3);
                    sub.unsubscribe();
                    done();
                }
            );

            MessageWrapper.sendMessage$.next({
                ...testMessage,
                content: longStr,
            } as discord.Message);
        });
        it('should evaluate promises in correct sequence.', (
            done: DoneFunction
        ): void => {
            sendStub.onFirstCall().returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg1',
                            });
                        }, 150);
                    }
                )
            );
            sendStub.onSecondCall().returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg2',
                            });
                        }, 25);
                    }
                )
            );
            sendStub.onThirdCall().returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg3',
                            });
                        }, 15);
                    }
                )
            );

            const obs = MessageWrapper.sentMessages$;
            observe((): Observable<(discord.Message | null)[]> => obs);
            const sub = obs.subscribe((values: discord.Message[]): void => {
                expect(values[0].content).to.equal('msg1');
                expect(values[1].content).to.equal('msg2');
                expect(values[2].content).to.equal('msg3');
                expect(sendStub.callCount).to.equal(3);
                sub.unsubscribe();
                done();
            });

            MessageWrapper.sendMessage$.next({
                ...testMessage,
                content: longStr,
            } as discord.Message);
        });
        it('should execute concurrently.', (
            done: DoneFunction,
        ): void => {
            sendStub.onFirstCall().returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg1',
                            });
                        }, 1500);
                    }
                )
            );
            sendStub.onSecondCall().returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg2',
                            });
                        }, 500);
                    }
                )
            );
            sendStub.onThirdCall().returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg3',
                            });
                        }, 300);
                    }
                )
            );

            sendStub.onCall(3).returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg4',
                            });
                        }, 35);
                    }
                )
            );
            sendStub.onCall(4).returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg5',
                            });
                        }, 25);
                    }
                )
            );
            sendStub.onCall(5).returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg6',
                            });
                        }, 15);
                    }
                )
            );
            sendStub.onCall(6).returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg7',
                            });
                        }, 1);
                    }
                )
            );
            sendStub.onCall(7).returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg8',
                            });
                        }, 15);
                    }
                )
            );
            sendStub.onCall(8).returns(
                new Promise(
                    (resolve): void => {
                        setTimeout((): void => {
                            resolve({
                                ...testMessage,
                                content: 'msg9',
                            });
                        }, 400);
                    }
                )
            );

            let count = 0;
            const sub = MessageWrapper.sentMessages$.subscribe(
                (values: discord.Message[]): void => {
                    switch (count) {
                        case 0:
                            expect(values[0].content).to.be.equal('msg4');
                            expect(values[1].content).to.be.equal('msg5');
                            expect(values[2].content).to.be.equal('msg6');
                            break;
                        case 1:
                            expect(values[0].content).to.be.equal('msg7');
                            expect(values[1].content).to.be.equal('msg8');
                            expect(values[2].content).to.be.equal('msg9');
                            break;

                        case 2:
                            expect(values[0].content).to.be.equal('msg1');
                            expect(values[1].content).to.be.equal('msg2');
                            expect(values[2].content).to.be.equal('msg3');
                            sub.unsubscribe();
                            done();
                            break;
                        default:
                            throw (new Error('Default case reached.'));
                    }
                    count += 1;
                },
            );

            MessageWrapper.sendMessage$.next({
                ...testMessage,
                content: longStr,
            } as discord.Message);

            MessageWrapper.sendMessage$.next({
                ...testMessage,
                content: longStr,
            } as discord.Message);

            MessageWrapper.sendMessage$.next({
                ...testMessage,
                content: longStr,
            } as discord.Message);
        });
        it('should return array of two values and one null when third promise fails.', function (
            done: DoneFunction,
        ): void {
            this.timeout(35000);
            sendStub.rejects({
                ...testMessage,
                content: 'rejectedx',
            });
            sendStub.onFirstCall().resolves({
                ...testMessage,
                content: 'resolved1',
            });
            sendStub.onSecondCall().resolves({
                ...testMessage,
                content: 'resolved2',
            });


            const sub = MessageWrapper.sentMessages$.subscribe(
                (values: discord.Message[]): void => {
                    expect(values[0].content).to.be.equal('resolved1');
                    expect(values[1].content).to.be.equal('resolved2');
                    expect(values[2]).to.be.null;
                    expect(values.length).to.be.equal(3);
                    sub.unsubscribe();
                    done();
                },
            );

            MessageWrapper.sendMessage$.next({
                ...testMessage,
                content: longStr,
            } as discord.Message);
        });
        it('should send text correctly.', (
            done: DoneFunction
        ): void => {
            sendStub.onFirstCall().resolves(
                (longStr.match(
                    /[\s\S]{1,1975}(?:\n|$)/g
                ) || []).map(
                    (chunk: string):
                    discord.Message => ({
                        content: chunk,
                    } as discord.Message)
                )[0]
            );
            sendStub.onSecondCall().resolves(
                (longStr.match(
                    /[\s\S]{1,1975}(?:\n|$)/g
                ) || []).map(
                    (chunk: string):
                    discord.Message => ({
                        content: chunk,
                    } as discord.Message)
                )[1]
            );
            sendStub.onThirdCall().resolves(
                (longStr.match(
                    /[\s\S]{1,1975}(?:\n|$)/g
                ) || []).map(
                    (chunk: string):
                    discord.Message => ({
                        content: chunk,
                    } as discord.Message)
                )[2]
            );

            const sub = MessageWrapper.sentMessages$.subscribe(
                (values: discord.Message[]): void => {
                    expect(values[0].content.length).to.be.lessThan(2000);
                    expect(values[1].content.length).to.be.lessThan(2000);
                    expect(values[2].content.length).to.be.lessThan(2000);
                    expect(values.length).to.be.equal(3);
                    sub.unsubscribe();
                    done();
                },
            );

            MessageWrapper.sendMessage$.next({
                ...testMessage,
                content: longStr,

            } as discord.Message);
        });
    });

    let subscribed: Subscription;
    beforeEach((): void => {
        subscribed = MessageWrapper.sentMessages$.subscribe(
            // (msgs: discord.Message[]): void => Utils.logger.fatal(msgs)
        );
    });

    afterEach((): void => {
        subscribed.unsubscribe();
        sendStub.reset();
    });
});
