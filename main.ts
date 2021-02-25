import { fromConfig, stringify } from "./bot/mod.ts";
import { Splatoon2 } from "./module/splatoon/stage.ts";

const bot = await fromConfig(await Deno.readTextFile("config.json"));
const splatoon = new Splatoon2();
try {
  for await (
    const { accountId, content, channelId } of bot.accounts.receiveMessage()
  ) {
    console.log(content);
    const txt = stringify(content);
    if (txt.trim() === ".图") {
      bot.accounts.sendMessage({
        accountId,
        channelId,
        content: [{
          type: "image",
          image: async () => ({
            buffer: (await splatoon.getCurrentStage(0)).buffer,
            filename: "stage.png",
          }),
        }],
      });
    } else {
      bot.accounts.sendMessage({
        accountId,
        channelId,
        content: [{ type: "text", text: txt }],
      });
    }
  }
} catch (e) {
  console.error(e);
  throw e;
}
