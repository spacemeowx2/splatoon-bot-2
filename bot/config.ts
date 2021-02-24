import { validate } from "https://deno.land/x/schema_validator@v0.0.3/src/validator.ts";
import * as J from "https://deno.land/x/jsonschema@v1.3.0/jsonschema.ts";

export type TypeOf<T> = J.TypeOf<T>;

export const KhlConfigType = J.type({
  type: J.literal("kaiheila"),
  token: J.string,
});
export const QQConfigType = J.type({
  type: J.literal("qq"),
  token: J.nullable(J.string),
  url: J.string,
});

const AccountType = J.intersect(
  J.union(KhlConfigType, QQConfigType),
  J.partial({
    group: J.string,
  }),
);

export const ConfigType = J.type({
  accounts: J.array(AccountType),
});

export type Config = TypeOf<typeof ConfigType>;

export function fromConfig(cfg: string) {
  const config = JSON.parse(cfg).bot as Config;

  const err = validate(config, J.print(ConfigType));
  if (err) {
    throw err;
  }

  return config;
}
