// deno-lint-ignore-file camelcase

import { Transport } from "./transport.ts";

export type Author = {
  id: string;
  username: string;
  identify_num: number;
  online: boolean;
  avatar: string;
  bot: boolean;
  nickname: string;
  roles: number[];
};

export type EventCommon = {
  channel_type: "GROUP";
  target_id: string;
  author_id: string;
  content: string;
  msg_id: string;
  msg_timestamp: number;
  nonce: string;
};

export type TextEvent = {
  // text message
  type: 1;
  extra: {
    type: 1;
    guild_id: string;
    channel_name: string;
    mention: string[];
    mention_all: boolean;
    mention_roles: number[];
    mention_here: boolean;
    author: Author;
  };
} & EventCommon;

export type Event = TextEvent;
