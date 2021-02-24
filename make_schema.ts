import { Schema } from "./config.ts";

await Deno.writeTextFile("config_schema.json", JSON.stringify(Schema, null, 2));
