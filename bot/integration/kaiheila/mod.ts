import { Message, PlatformChannel } from "../../types.ts";
import { KhlConfigType, TypeOf } from "../../config.ts";
import { Transport } from "./transport.ts";
import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";
import * as log from "https://deno.land/std@0.88.0/log/mod.ts";

type KhlConfig = TypeOf<typeof KhlConfigType>;

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
    const data = await this.transport.recv();
    // @ts-ignore a
    console.log(data);

    // @ts-ignore a
    return data;
    // throw new Error("Method not implemented.");
  }
  sendMessage(message: Message): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
