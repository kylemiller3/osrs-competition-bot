import {
    describe, it, beforeEach, afterEach,
} from 'mocha';
import { assert, } from 'chai';
import pgp from 'pg-promise';
import * as sinon from 'sinon';
import * as discord from 'discord.js';
import { async, } from 'rxjs/internal/scheduler/async';
import { take, last, } from 'rxjs/operators';
import { Subscription, } from 'rxjs';
import { Event, } from '../event';
import { Db2, } from '../database';
import { Utils, } from '../utils';
import { MessageWrapper, } from '../messageWrapper';


describe('Message Wrapper', (): void => {
    Utils.logger.level = 'error';
    let mockMessage: discord.Message;
    const mockChannel: discord.TextChannel = {
        send: (content, options?):
        Promise<discord.Message | discord.Message[]> => Promise.resolve(mockMessage),
    } as discord.TextChannel;
    mockMessage = {
        channel: mockChannel,
        content: 'test',
    } as discord.Message;
    const stubChannel: sinon.SinonStub = sinon.stub(mockChannel, 'send');
    describe('Send message', (): void => {
        it('should not throw an error.', (): void => {
            MessageWrapper.sendMessage.next([
                mockMessage,
                true,
            ]);
        });
        it('should call send once.', async (): Promise<void> => {
            stubChannel.returns(Promise.resolve(mockMessage));
            MessageWrapper.sendMessage.next([
                mockMessage,
                true,
            ]);
            assert(stubChannel.callCount === 1);
        });
        it('should call send four times.', async (): Promise<void> => {
            stubChannel.returns(Promise.resolve(mockMessage));
            const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Consectetur a erat nam at lectus urna. Tortor dignissim convallis aenean et tortor at. Et leo duis ut diam quam nulla porttitor massa id. Feugiat nibh sed pulvinar proin gravida hendrerit lectus a. In nisl nisi scelerisque eu. Ipsum faucibus vitae aliquet nec ullamcorper. Sed viverra ipsum nunc aliquet. Tempor id eu nisl nunc mi ipsum faucibus vitae aliquet. Mattis vulputate enim nulla aliquet. Sit amet massa vitae tortor condimentum lacinia. Scelerisque in dictum non consectetur a. Ac tortor vitae purus faucibus. Ac turpis egestas maecenas pharetra convallis posuere morbi leo. Mauris pharetra et ultrices neque ornare. Facilisis leo vel fringilla est ullamcorper eget nulla facilisi. Viverra accumsan in nisl nisi scelerisque eu ultrices vitae. Id aliquet lectus proin nibh nisl condimentum id venenatis a. Tellus id interdum velit laoreet id donec. Donec et odio pellentesque diam.\n\nViverra mauris in aliquam sem fringilla. Pellentesque dignissim enim sit amet venenatis urna. At in tellus integer feugiat scelerisque varius morbi enim. Erat imperdiet sed euismod nisi porta lorem. Nascetur ridiculus mus mauris vitae ultricies leo integer malesuada. Ut aliquam purus sit amet luctus venenatis lectus. Proin nibh nisl condimentum id venenatis a. Mi eget mauris pharetra et ultrices neque ornare aenean euismod. Purus in massa tempor nec feugiat nisl pretium fusce id. Penatibus et magnis dis parturient. Purus semper eget duis at tellus. Volutpat consequat mauris nunc congue nisi vitae suscipit tellus mauris. Sed turpis tincidunt id aliquet. Morbi tristique senectus et netus et malesuada fames ac turpis. Blandit turpis cursus in hac habitasse. Diam sit amet nisl suscipit adipiscing bibendum est. \n\n\nVenenatis cras sed felis eget velit aliquet sagittis id. Lacus sed viverra tellus in hac. Venenatis a condimentum vitae sapien pellentesque habitant morbi. Odio pellentesque diam volutpat commodo. Est lorem ipsum dolor sit amet consectetur adipiscing elit. Neque egestas congue quisque egestas diam in arcu. Lectus vestibulum mattis ullamcorper velit sed ullamcorper morbi tincidunt ornare. Ornare lectus sit amet est placerat in. Ultrices tincidunt arcu non sodales neque sodales. Egestas sed sed risus pretium quam vulputate. Id diam vel quam elementum pulvinar etiam non. Molestie ac feugiat sed lectus. Nec nam aliquam sem et tortor. Accumsan in nisl nisi scelerisque eu ultrices vitae auctor. \nUt morbi tincidunt augue interdum velit euismod in pellentesque massa. Et ligula ullamcorper malesuada proin libero nunc consequat. Amet consectetur adipiscing elit duis. Pharetra sit amet aliquam id diam maecenas ultricies. Pharetra et ultrices neque ornare aenean euismod elementum nisi. Tellus orci ac auctor augue mauris augue. Ultrices eros in cursus turpis massa tincidunt. Enim lobortis scelerisque fermentum dui faucibus in. Vestibulum lectus mauris ultrices eros in cursus turpis massa. Est ultricies integer quis auctor elit. Pharetra et ultrices neque ornare aenean euismod elementum nisi. Scelerisque purus semper eget duis at. Luctus accumsan tortor posuere ac ut consequat semper. Praesent semper feugiat nibh sed pulvinar proin gravida hendrerit. Elementum integer enim neque volutpat ac tincidunt vitae semper. Leo integer malesuada nunc vel risus commodo. Massa sapien faucibus et molestie ac feugiat. Fames ac turpis egestas sed tempus. Vulputate sapien nec sagittis aliquam malesuada bibendum arcu vitae elementum. Lectus arcu bibendum at varius. \nTortor aliquam nulla facilisi cras. Semper feugiat nibh sed pulvinar proin gravida hendrerit lectus a. Quisque id diam vel quam elementum pulvinar etiam. Vestibulum lectus mauris ultrices eros in cursus turpis massa tincidunt. Pulvinar neque laoreet suspendisse interdum. Ut placerat orci nulla pellentesque dignissim enim sit. Nibh mauris cursus mattis molestie a iaculis at. Dis parturient montes nascetur ridiculus mus mauris vitae ultricies leo. Pellentesque sit amet porttitor eget dolor morbi non. Amet aliquam id diam maecenas ultricies mi eget mauris pharetra. Pulvinar etiam non quam lacus suspendisse faucibus interdum posuere. awfhe9q3249fq290hyf89 34q98fy39q22yhf923h 9f8h q298fhq9whef9hsadfha0p9woehf aowshf9a8whe 9fhasioudfha9wefgh 98a7 gfaw9fgh a9w78f gaw9eghf9aw faf\n\n\n\ndosai fhj98awhe f9ahw984f yhga9udfhasdhpfahsd9f hapsdf\n sdhfawu ehf9ahfsd 9aw hef9ashdfh \n';
            MessageWrapper.sendMessage.next([
                {
                    ...mockMessage,
                    content,
                } as discord.Message,
                true,
            ]);
            assert(stubChannel.callCount === 4);
        });
    });

    let subscribed: Subscription;
    beforeEach((): void => {
        stubChannel.returns(Promise.resolve(mockMessage));
        subscribed = MessageWrapper.sendMessage.subscribe();
    });

    afterEach((): void => {
        subscribed.unsubscribe();
        stubChannel.reset();
    });
});
