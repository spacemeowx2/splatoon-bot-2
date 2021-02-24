import { BotProvider, PlatformChannel } from "./types.ts";
import { KaiheilaBot } from "./integration/kaiheila/mod.ts";
import { QQBot } from "./integration/qq/mod.ts";

type Account = {
  type: string;
  config: unknown;
  bot: PlatformChannel;
};

export class Bot {
  protected botProvider = new Map<string, BotProvider>();
  public accounts: Account[] = [];

  constructor() {
    this.registerBotProvider("kaiheila", KaiheilaBot);
    this.registerBotProvider("qq", QQBot);
  }
  registerBotProvider(id: string, provider: BotProvider) {
    if (this.botProvider.has(id)) {
      throw new Error(`Provider ${id} is already registered.`);
    }
    this.botProvider.set(id, provider);
  }
  async login(type: string, config: unknown) {
    const provider = this.botProvider.get(type);
    if (!provider) throw new Error("type not exists");

    const bot = await provider.provideBot(config);
    this.accounts.push({
      type,
      config,
      bot,
    });
  }
  async run() {
  }
}
