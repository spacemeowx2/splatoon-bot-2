import { Message, Provider } from "../types.ts";
import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";

export const ConfigType = J.type({
  type: J.literal("qq"),
  url: J.string,
  token: J.string,
});

export class QQBotProvider implements Provider {
  readonly id: string = "qq";

  receiveMessage(): Promise<Message> {
    throw new Error("Method not implemented.");
  }
  sendMessage(message: Message): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
