import { messageReceived$, } from "./main";
import { Message, } from "discord.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Conversation {
    messageReceived$.subscribe(
        (msg: Message):
        void => {}
    );
}