// deno-lint-ignore-file camelcase
import { Message, PlatformChannel } from "../../types.ts";
import { KhlConfigType, TypeOf } from "../../config.ts";
import { Transport } from "./transport.ts";
import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";
import * as log from "https://deno.land/std@0.88.0/log/mod.ts";

type KhlConfig = TypeOf<typeof KhlConfigType>;
type ChannelIdType = {
  target_id: string;
};

export const ConfigType = J.type({
  type: J.literal("kaiheila"),
  token: J.string,
});

export class KaiheilaBot implements PlatformChannel {
  private constructor(
    protected transport: Transport,
    protected token: string,
  ) {}

  static async provideBot({ token }: KhlConfig) {
    const ws = await Transport.connect(token);

    return new KaiheilaBot(ws, token);
  }

  async receiveMessage(): Promise<Message> {
    while (true) {
      const data = await this.transport.recv();
      const channelIdData: ChannelIdType = { target_id: data.target_id };
      const channelId = JSON.stringify(channelIdData);

      switch (data.type) {
        case 1:
          return {
            channelId,
            content: [{ type: "text", text: data.content }],
            inner: data,
          };
        default:
          console.warn(`Unkonwn message type ${data.type}. Message ignored`);
      }
    }
  }
  async sendMessage(message: Message): Promise<void> {
    const { target_id }: ChannelIdType = JSON.parse(message.channelId);

    for (const part of message.content) {
      switch (part.type) {
        case "text":
          await this.transport.sendTextMessage(target_id, part.text);
          break;
        case "image": {
          const { buffer, filename } = await part.image();
          await this.transport.sendImageMessage(target_id, buffer, filename);
          break;
        }
      }
    }
  }
}
