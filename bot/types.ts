export type Image = () => Promise<Uint8Array>;
export type TextContent = {
  type: "text";
  text: string;
};
export type ImageContent = {
  type: "image";
  image: Image;
};

export type Content = (TextContent | ImageContent)[];

export interface Replyable {
  reply(): Promise<void>;
}

export interface Message {
  content: Content;
}

export interface PlatformChannel {
  receiveMessage(): Promise<Message>;
  sendMessage(message: Message): Promise<void>;
}

export interface BotProvider {
  provideBot(config: unknown): Promise<PlatformChannel>;
}
