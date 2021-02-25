import {
  BotProvider,
  Message as SingleMessage,
  PlatformChannel,
} from "./types.ts";
import { KaiheilaBot } from "./integration/kaiheila/mod.ts";
import { QQBot } from "./integration/qq/mod.ts";
import { v4 } from "https://deno.land/std@0.88.0/uuid/mod.ts";

type Account = {
  type: string;
  config: unknown;
  bot: PlatformChannel;
};

type Message = SingleMessage & { accountId: string };

class AccountMux {
  accounts: Record<string, Account> = {};

  async *receiveMessage(): AsyncIterable<Message> {
    const recv = async (accountId: string) => ({
      ...await this.accounts[accountId].bot.receiveMessage(),
      accountId,
    });
    const waiter = Object.fromEntries(
      Object.entries(this.accounts).map(([k]) => [k, recv(k)] as const),
    );

    while (true) {
      const message = await Promise.race(Object.values(waiter));
      yield message;
      waiter[message.accountId] = recv(message.accountId);
    }
  }
  async sendMessage({ accountId, ...message }: Message): Promise<void> {
    await this.accounts[accountId].bot.sendMessage(message);
  }
  add(accountId: string, account: Account) {
    this.accounts[accountId] = account;
  }
}

export class Bot {
  protected botProvider = new Map<string, BotProvider>();
  accounts = new AccountMux();

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
    const accountId = v4.generate();
    this.accounts.add(accountId, {
      type,
      config,
      bot,
    });
    return accountId;
  }
}
