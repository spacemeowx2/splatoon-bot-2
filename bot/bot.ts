import { Provider } from "./types.ts";

export class Bot {
  protected botProvider = new Map<string, Provider>();
  registerBotProvider(provider: Provider) {
    if (this.botProvider.has(provider.id)) {
      throw new Error(`Provider ${provider.id} is already registered.`);
    }
    this.botProvider.set(provider.id, provider);
  }
}
