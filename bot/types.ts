export type Image = () => Promise<{ buffer: ArrayBuffer; filename: string }>;
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

export type ChannelId = string;

export interface Message {
  channelId: ChannelId;
  content: Content;
  inner?: unknown;
}

export interface PlatformChannel {
  receiveMessage(): Promise<Message>;
  sendMessage(message: Message): Promise<void>;
}

export interface BotProvider {
  provideBot(config: unknown): Promise<PlatformChannel>;
}
