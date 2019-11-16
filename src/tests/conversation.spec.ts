// import * as discord from 'discord.js';
// import {
//     describe, it, beforeEach, afterEach, before, after, utils,
// } from 'mocha';
// import { assert, expect, } from 'chai';
// import sinon from 'sinon';
// import { Subscription } from 'rxjs';
// import { Conversation, } from '../conversation';
// import { MessageWrapper, } from '../messageWrapper';

// describe('Conversation Component', (): void => {
    // let testMessage: discord.Message;
    // const testChannel: discord.TextChannel = {
    //     send: (content, options?):
    //     Promise<discord.Message | discord.Message[]> => Promise.resolve(
    //         {
    //             ...testMessage,
    //             content,
    //         } as discord.Message,
    //     ),
    // } as discord.TextChannel;
    // testMessage = {
    //     channel: testChannel,
    //     content: 'test',
    // } as discord.Message;
    // const nextStub: sinon.SinonStub = sinon.stub(MessageWrapper.sendMessage$, 'next');
    // it('should send a Discord message.', async ():
    // Promise<void> => {
    //     nextStub.returns(testMessage);
    //     const component = new Conversation.ConversationComponent(
    //         testMessage,
    //         'test',
    //     );
    //     component.send();
    //     assert(nextStub.callCount === 1);
    // });

    // let subscribed: Subscription;
    // beforeEach((): void => {
    //     subscribed = MessageWrapper.sentMessages$.subscribe(
    //         // (msgs: discord.Message[]): void => Utils.logger.fatal(msgs)
    //     );
    // });

    // afterEach((): void => {
    //     subscribed.unsubscribe();
    //     nextStub.reset();
    // });

    // after((): void => {
    //     nextStub.restore();
    // });
// });
