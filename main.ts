import { fromConfig } from "./bot/mod.ts";

const bot = await fromConfig(await Deno.readTextFile("config.json"));
while (1) {
  try {
    const msg = await bot.accounts[0].bot.receiveMessage();
    console.log(msg);
  } catch (e) {
    console.error(e);
    throw e;
  }
}
