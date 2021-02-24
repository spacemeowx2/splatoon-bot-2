import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";
import * as BotConfig from "./bot/config.ts";

export const ConfigType = J.type({
  bot: BotConfig.ConfigType,
});

export type Config = J.TypeOf<typeof ConfigType>;

export const Schema = J.print(ConfigType);
