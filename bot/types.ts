export type Image = Uint8Array;
export type TextContent = {
  type: "text";
  text: string;
};
export type ImageContent = {
  type: "picture";
  image: Image;
};

export type Content = (ImageContent)[];

export interface Message {
  content: Content;
}

export interface Provider {
  id: string;
  receiveMessage(): Message;
}
