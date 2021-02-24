import { Message, PlatformChannel } from "../../types.ts";
import { QQConfigType, TypeOf } from "../../config.ts";

type QQConfig = TypeOf<typeof QQConfigType>;

export class QQBot implements PlatformChannel {
  static async provideBot({ token }: QQConfig) {
    return new QQBot();
  }
  receiveMessage(): Promise<Message> {
    throw new Error("Method not implemented.");
  }
  sendMessage(message: Message): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
