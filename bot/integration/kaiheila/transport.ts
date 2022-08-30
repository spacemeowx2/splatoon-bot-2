import { WS } from "../../../lib/websocket.ts";
import { inflate } from "https://deno.land/x/compress@v0.3.6/mod.ts";
import { retry } from "./util.ts";
import { Event } from "./protocol.ts";

const decoder = new TextDecoder();
const Endpoint = "https://www.kaiheila.cn/api/v3";

export type Frame<T> = {
  type: FrameType;
  data: T;
  sequenceNumber?: number;
};

export enum FrameType {
  Event = 0,
  Hello = 1,
  Ping = 2,
  Pong = 3,
  Reconnect = 4,
  ResumeAck = 5,
}

export class ServerError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

type Response<T> = {
  code: number;
  message: string;
  data: T;
};

const request = async <T>(
  url: string,
  { body, token }: { token: string; body?: unknown },
) => {
  const headers = new Headers({
    Authorization: `Bot ${token}`,
  });
  let method: "GET" | "POST" = "GET";
  let reqBody: undefined | FormData | string = undefined;
  if (body) {
    method = "POST";
    if (body instanceof FormData) {
      reqBody = body;
    } else {
      headers.append("Content-Type", "application/json");
      reqBody = JSON.stringify(body);
    }
  }
  const resp = await fetch(`${Endpoint}${url}`, {
    method,
    headers,
    body: reqBody,
  });
  const { code, message, data }: Response<T> = await resp.json();

  if (code !== 0) {
    throw new ServerError(code, message);
  }

  return data;
};

export class Transport implements Deno.Closer {
  heartbeatId?: ReturnType<typeof setInterval>;
  snAck = 0;
  constructor(protected token: string, protected ws: WS) {
    this.heartbeatId = setInterval(() => this.sendHeatbeat(), 30 * 1000);
  }
  protected async sendHeatbeat() {
    await this.sendRaw(FrameType.Ping, undefined);
  }
  protected static async getGateway(token: string) {
    const data = await request<{ url: string }>("/gateway/index", { token });

    return data.url;
  }
  protected static async getInnerWS(token: string) {
    return await WS.connect(await retry(() => Transport.getGateway(token)));
  }
  static async connect(token: string) {
    const ws = await retry(() => Transport.getInnerWS(token));
    return new Transport(token, ws);
  }
  protected parseData<T = unknown>(
    d: { s: number; d: unknown; sn?: number },
  ): Frame<T> {
    return {
      type: d.s,
      data: d.d as T,
      sequenceNumber: d.sn,
    };
  }

  async recvRaw() {
    let out: Frame<unknown>;
    const data = await this.ws.recv();

    if (typeof data === "string") {
      out = this.parseData(JSON.parse(data));
    } else {
      const text = inflate(new Uint8Array(data));
      out = this.parseData(JSON.parse(decoder.decode(text)));
    }
    if (out.sequenceNumber !== undefined) {
      this.snAck = out.sequenceNumber;
    }

    return out;
  }
  // 接收 Event 并返回, 其他类型内部处理不返回.
  async recv(): Promise<Event> {
    while (true) {
      const out: Frame<unknown> = await this.recvRaw();
      switch (out.type) {
        case FrameType.Event:
          return out.data as Event;
        case FrameType.Hello:
        case FrameType.Pong:
          break;
        case FrameType.Reconnect:
          await this.reconnect();
          break;
      }
    }
  }
  async sendRaw(type: FrameType, data: unknown) {
    await this.ws.send(JSON.stringify({
      "s": type,
      "d": data,
      "sn": this.snAck,
    }));
  }
  async send(data: unknown) {
    await this.sendRaw(FrameType.Event, data);
  }
  async createAsset(filename: string, buf: ArrayBuffer) {
    const formData = new FormData();
    formData.append("file", new File([buf], filename));
    const data = await request<{ url: string }>("/asset/create", {
      token: this.token,
      body: formData,
    });

    return data.url;
  }
  async sendTextMessage(targetId: string, content: string, quote?: string) {
    await request<void>("/message/create", {
      token: this.token,
      body: { type: 1, target_id: targetId, content, quote },
    });
  }
  async sendImageMessage(
    targetId: string,
    buf: ArrayBuffer,
    filename: string,
    quote?: string,
  ) {
    const url = await this.createAsset(filename, buf);
    await request<void>("/message/create", {
      token: this.token,
      body: {
        // TODO: change to 2 when khl fix the bug on server
        type: 1,
        target_id: targetId,
        content: url,
        quote,
      },
    });
  }
  async reconnect() {
    this.close();
    this.ws = await Transport.getInnerWS(this.token);
  }
  close(): void {
    if (this.heartbeatId !== undefined) {
      clearInterval(this.heartbeatId);
      this.heartbeatId = undefined;
    }
    try {
      this.ws.close(3000, "close");
    } finally {
      // do nothing
    }
  }
}
