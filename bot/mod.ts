import { Content } from "./types.ts";
export { Bot } from "./bot.ts";
export { fromConfig } from "./config.ts";

export const stringify = (content: Content): string => {
  return content.map((i) => i.type === "text" ? i.text : "").join("");
};
