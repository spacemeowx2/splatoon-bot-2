export type Image = Uint8Array;
export type TextContent = {
  type: "text";
  text: string;
};
export type ImageContent = {
  type: "picture";
  image: Image;
};

export type Content = (TextContent | ImageContent)[];

export interface Replyable {
  reply(): Promise<void>;
}

export interface Message {
  content: Content;
}

export interface Provider {
  readonly id: string;
  receiveMessage(): Promise<Message>;
  sendMessage(message: Message): Promise<void>;
}
