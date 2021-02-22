type Data = string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
type Waiter<T> = {
  res: (v: T) => void;
  rej: (v: unknown) => void;
};
class WaitQueue<T> {
  private queue: T[] = [];
  private waiter: Waiter<T>[] = [];
  private error: unknown | undefined;
  err(e: unknown) {
    this.error = e;
    for (const i of this.waiter) {
      i.rej(e);
    }
  }
  push(v: T) {
    const w = this.waiter.shift();
    if (w !== undefined) {
      w.res(v);
    } else {
      this.queue.push(v);
    }
  }
  wait(w: Waiter<T>) {
    if (this.error) {
      w.rej(this.error);
      return;
    }
    const v = this.queue.shift();
    if (v !== undefined) {
      w.res(v);
    } else {
      this.waiter.push(w);
    }
  }
}

export class WS implements Deno.Closer {
  private data: WaitQueue<Data> = new WaitQueue();

  private constructor(private ws: WebSocket) {
    ws.onmessage = (e) => {
      this.data.push(e.data);
    };
    ws.onerror = (e) => {
      this.data.err(e);
    };
  }
  close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }
  static connect(url: string, protocols?: string | string[]): Promise<WS> {
    return new Promise<WS>((res, rej) => {
      const ws = new WebSocket(url, protocols);
      ws.binaryType = "arraybuffer";
      ws.onopen = () => {
        res(new WS(ws));
      };
      ws.onerror = (e) => {
        rej(e);
      };
    });
  }
  async send(
    data: Data,
  ) {
    await this.ws.send(data);
  }
  async recv(): Promise<
    Data
  > {
    return await new Promise((res, rej) => {
      this.data.wait({ res, rej });
    });
  }
}
