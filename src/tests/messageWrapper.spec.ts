import {
    describe, it, beforeEach, afterEach, before, after, utils,
} from 'mocha';
import { assert, expect, } from 'chai';
import pgp from 'pg-promise';
import * as sinon from 'sinon';
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


const longStr = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Consectetur a erat nam at lectus urna. Tortor dignissim convallis aenean et tortor at. Et leo duis ut diam quam nulla porttitor massa id. Feugiat nibh sed pulvinar proin gravida hendrerit lectus a. In nisl nisi scelerisque eu. Ipsum faucibus vitae aliquet nec ullamcorper. Sed viverra ipsum nunc aliquet. Tempor id eu nisl nunc mi ipsum faucibus vitae aliquet. Mattis vulputate enim nulla aliquet. Sit amet massa vitae tortor condimentum lacinia. Scelerisque in dictum non consectetur a. Ac tortor vitae purus faucibus. Ac turpis egestas maecenas pharetra convallis posuere morbi leo. Mauris pharetra et ultrices neque ornare. Facilisis leo vel fringilla est ullamcorper eget nulla facilisi. Viverra accumsan in nisl nisi scelerisque eu ultrices vitae. Id aliquet lectus proin nibh nisl condimentum id venenatis a. Tellus id interdum velit laoreet id donec. Donec et odio pellentesque diam.\n\nViverra mauris in aliquam sem fringilla. Pellentesque dignissim enim sit amet venenatis urna. At in tellus integer feugiat scelerisque varius morbi enim. Erat imperdiet sed euismod nisi porta lorem. Nascetur ridiculus mus mauris vitae ultricies leo integer malesuada. Ut aliquam purus sit amet luctus venenatis lectus. Proin nibh nisl condimentum id venenatis a. Mi eget mauris pharetra et ultrices neque ornare aenean euismod. Purus in massa tempor nec feugiat nisl pretium fusce id. Penatibus et magnis dis parturient. Purus semper eget duis at tellus. Volutpat consequat mauris nunc congue nisi vitae suscipit tellus mauris. Sed turpis tincidunt id aliquet. Morbi tristique senectus et netus et malesuada fames ac turpis. Blandit turpis cursus in hac habitasse. Diam sit amet nisl suscipit adipiscing bibendum est. \n\n\nVenenatis cras sed felis eget velit aliquet sagittis id. Lacus sed viverra tellus in hac. Venenatis a condimentum vitae sapien pellentesque habitant morbi. Odio pellentesque diam volutpat commodo. Est lorem ipsum dolor sit amet consectetur adipiscing elit. Neque egestas congue quisque egestas diam in arcu. Lectus vestibulum mattis ullamcorper velit sed ullamcorper morbi tincidunt ornare. Ornare lectus sit amet est placerat in. Ultrices tincidunt arcu non sodales neque sodales. Egestas sed sed risus pretium quam vulputate. Id diam vel quam elementum pulvinar etiam non. Molestie ac feugiat sed lectus. Nec nam aliquam sem et tortor. Accumsan in nisl nisi scelerisque eu ultrices vitae auctor. \nUt morbi tincidunt augue interdum velit euismod in pellentesque massa. Et ligula ullamcorper malesuada proin libero nunc consequat. Amet consectetur adipiscing elit duis. Pharetra sit amet aliquam id diam maecenas ultricies. Pharetra et ultrices neque ornare aenean euismod elementum nisi. Tellus orci ac auctor augue mauris augue. Ultrices eros in cursus turpis massa tincidunt. Enim lobortis scelerisque fermentum dui faucibus in. Vestibulum lectus mauris ultrices eros in cursus turpis massa. Est ultricies integer quis auctor elit. Pharetra et ultrices neque ornare aenean euismod elementum nisi. Scelerisque purus semper eget duis at. Luctus accumsan tortor posuere ac ut consequat semper. Praesent semper feugiat nibh sed pulvinar proin gravida hendrerit. Elementum integer enim neque volutpat ac tincidunt vitae semper. Leo integer malesuada nunc vel risus commodo. Massa sapien faucibus et molestie ac feugiat. Fames ac turpis egestas sed tempus. Vulputate sapien nec sagittis aliquam malesuada bibendum arcu vitae elementum. Lectus arcu bibendum at varius. \nTortor aliquam nulla facilisi cras. Semper feugiat nibh sed pulvinar proin gravida hendrerit lectus a. Quisque id diam vel quam elementum pulvinar etiam. Vestibulum lectus mauris ultrices eros in cursus turpis massa tincidunt. Pulvinar neque laoreet suspendisse interdum. Ut placerat orci nulla pellentesque dignissim enim sit. Nibh mauris cursus mattis molestie a iaculis at. Dis parturient montes nascetur ridiculus mus mauris vitae ultricies leo. Pellentesque sit amet porttitor eget dolor morbi non. Amet aliquam id diam maecenas ultricies mi eget mauris pharetra. Pulvinar etiam non quam lacus suspendisse faucibus interdum posuere.';
describe('Message Wrapper', (): void => {
    Utils.logger.level = 'fatal';
    let testMessage: discord.Message;
    const mockChannel: discord.TextChannel = {
        send: (content, options?):
        Promise<discord.Message | discord.Message[]> => Promise.resolve(
            {
                ...testMessage,
                content,
            } as discord.Message,
        ),
    } as discord.TextChannel;
    testMessage = {
        channel: mockChannel,
        content: 'test',
    } as discord.Message;
    const sendStub: sinon.SinonStub = sinon.stub(mockChannel, 'send');
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
            MessageWrapper.sendMessage$.next(
                testMessage,
            );
            const sub = MessageWrapper.sentMessages$.subscribe(
                (): void => {
                    expect(sendStub.callCount).to.be.equal(1);
                    sub.unsubscribe();
                    done();
                }
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
            MessageWrapper.sendMessage$.next({
                ...testMessage,
                content: longStr,
            } as discord.Message);

            const sub = MessageWrapper.sentMessages$.subscribe(
                (): void => {
                    expect(sendStub.callCount).to.be.equal(3);
                    sub.unsubscribe();
                    done();
                }
            );
        });
        it('should evaluate promises in sequence.', (
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
                        }, 35);
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
            observe((): Observable<discord.Message[]> => obs);
            MessageWrapper.sendMessage$.next({
                ...testMessage,
                content: longStr,
            } as discord.Message);
            const sub = obs.subscribe((values: discord.Message[]): void => {
                expect(values[0].content).to.be.equal('msg1');
                expect(values[1].content).to.be.equal('msg2');
                expect(values[2].content).to.be.equal('msg3');
                expect(sendStub.callCount).to.be.equal(3);
                sub.unsubscribe();
                done();
            });
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
