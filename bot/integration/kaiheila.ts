import { Message, Provider } from "../types.ts";
import { KhlConfigType, TypeOf } from "../config.ts";
import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";

type KhlConfig = TypeOf<typeof KhlConfigType>;

export const ConfigType = J.type({
  type: J.literal("kaiheila"),
  token: J.string,
});

export class KaiheilaBotProvider implements Provider {
  readonly id: string = "kaiheila";
  readonly baseUrl = "https://www.kaiheila.cn/api/v3";
  private constructor(protected token: string) {}

  static create({ token }: KhlConfig) {
    return new KaiheilaBotProvider(token);
  }

  receiveMessage(): Promise<Message> {
    throw new Error("Method not implemented.");
  }
  sendMessage(message: Message): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
