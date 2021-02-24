import { WS } from "../../../lib/websocket.ts";
import { unzlib } from "https://deno.land/x/denoflate@1.1/mod.ts";

const decoder = new TextDecoder();

export class ServerError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

export class Transport {
  constructor(protected ws: WS) {}
  static async connect(token: string) {
    const { code, message, data }: {
      code: number;
      message: string;
      data: { url: string };
    } = await (await fetch(`https://www.kaiheila.cn/api/v3/gateway/index`, {
      headers: new Headers({ Authorization: `Bot ${token}` }),
    })).json();

    if (code !== 0) {
      throw new ServerError(code, message);
    }

    return new Transport(await WS.connect(data.url));
  }
  async recv() {
    const data = await this.ws.recv();
    if (typeof data === "string") {
      return JSON.parse(data);
    } else {
      const text = unzlib(new Uint8Array(data));
      return JSON.parse(decoder.decode(text));
    }
  }
  async send(data: unknown) {
    await this.ws.send(JSON.stringify(data));
  }
}
