// deno-lint-ignore-file camelcase

import Canvas, {
  CanvasRenderingContext2D,
  EmulatedCanvas2D,
} from "https://deno.land/x/canvas@v.1.0.5/mod.ts";
import { getCanvas, loadImage } from "./canvas.ts";
import type { SkImage } from "./canvas.ts";
import { format } from "https://deno.land/std@0.88.0/datetime/mod.ts";

const dataPath = new URL("data/", import.meta.url);

const StageSize = {
  w: 240,
  h: 138,
};
const CoopStageSize = {
  w: 240,
  h: 134,
};

export interface S2Stage {
  id: string;
  name: string;
  image: string;
}

export interface S2Weapon {
  id: string;
  name: string;
  image: string;
  special: {
    id: string;
    image_a: string;
    image_b: string;
  };
  sub: {
    id: string;
    image_a: string;
    image_b: string;
  };
}

export interface Splatoon2Data {
  weapons: S2Weapon[];
  stages: S2Stage[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RandomContext {
  weaponsTeamA: S2Weapon[];
  weaponsTeamB: S2Weapon[];
  stages: S2Stage[];
  id: number;
}

interface Stage {
  image: string;
  id: string;
  name: string;
}

type ModesType = "gachi" | "league" | "regular";
const ModeTranslate: Record<ModesType, string> = {
  "gachi": "单排",
  "league": "组排",
  "regular": "常规",
};

type RulesType =
  | "rainmaker"
  | "clam_blitz"
  | "tower_control"
  | "splat_zones"
  | "turf_war";
interface Rule {
  start_time: number;
  end_time: number;
  stage_a: Stage;
  stage_b: Stage;
  rule: {
    name: string;
    key: RulesType;
    multiline_name: string;
  };
  game_mode: {
    key: string;
    name: string;
  };
}
const RuleTranslate: Record<RulesType, string> = {
  "splat_zones": "区域",
  "tower_control": "塔",
  "clam_blitz": "蛤蜊",
  "rainmaker": "鱼",
  "turf_war": "涂地",
};

type StageTypes = "league" | "regular" | "gachi";

const colorMap: Record<StageTypes, string> = {
  regular: "#19d719",
  gachi: "#e3562c",
  league: "#f02d7d",
};
interface Schedules {
  league: Rule[];
  regular: Rule[];
  gachi: Rule[];
}

interface Schedule {
  league: Rule;
  regular: Rule;
  gachi: Rule;
}

interface CoopStage {
  image: string;
  name: string;
}
interface CoopWeapon {
  id?: string;
  image: string;
  name: string;
}

interface CoopSchedule {
  start_time: number;
  end_time: number;
  stage: CoopStage;
  weapons: {
    id: string;
    weapon?: CoopWeapon;
    coop_special_weapon?: CoopWeapon;
  }[];
}

interface CoopSchedules {
  details: CoopSchedule[];
}

export class Splatoon2 {
  stageCache: Schedules | null = null;
  stageCacheMsg: Map<number, Uint8Array> = new Map();
  coopCache: CoopSchedules | null = null;
  cacheImg: Map<string, Uint8Array> = new Map();
  groupRandom: Map<number, RandomContext> = new Map();
  id = "splatoon2";
  name = "Splatoon2";

  init() {
    console.log("preparing images...");
    this.getCurrentCoop();
    this.getCurrentStage(0);
    this.getCurrentStage(1);
  }
  // private async onStage(e: BotMessageEvent) {
  //   const message = e.message;
  //   const atCode = e.groupId
  //     ? new CQCode("at", { qq: e.userId.toString() })
  //     : "";
  //   if (message.includes("工")) {
  //     try {
  //       return cqStringify([atCode, ...await this.getCurrentCoop()]);
  //     } catch (e) {
  //       console.error(e);
  //       return `获取地图时出错, 请稍后再试`;
  //     }
  //   } else if (message.includes("图")) {
  //     let idx = 0;
  //     if (message.includes("下")) {
  //       let count = message.split("下").length - 1;
  //       if (count == 1) {
  //         let [_, suffix] = message.split("下");
  //         idx = parseInt(suffix);
  //         if (idx <= 0 || isNaN(idx)) {
  //           idx = 1;
  //         }
  //       } else {
  //         idx = count;
  //       }
  //     }
  //     // 一次查询N张图
  //     let picCount = message.split("图").length - 1;
  //     let result: CQMessageList = [];
  //     picCount = Math.min(2, picCount);
  //     for (let i = 0; i < picCount; i++) {
  //       result.push(...await this.getCurrentStage(idx + i));
  //     }
  //     try {
  //       return cqStringify([atCode, ...result]);
  //     } catch (e) {
  //       console.error(e);
  //       return `获取地图时出错, 请稍后再试`;
  //     }
  //   } else if (message.includes("排")) {
  //     // 查询下一场单排组排某模式，如“单排蛤蜊”、“组排鱼”
  //     const mode: ModesType =
  //       ModeReverseTranslate[`${message.replace(".", "").split("排")[0]}排`];
  //     if (!mode) {
  //       return `错误的关键词，请输入单排或组排~`;
  //     }
  //     const rule: RulesType = RuleReverseTranslate[
  //       message.replace(".", "").split("排")[1].trim().replace("们", "")
  //     ];
  //     if (!rule || rule === "turf_war") {
  //       return `错误的模式，请输入区域/塔/蛤蜊/鱼`;
  //     }
  //     let multiple = message.includes("们");
  //     try {
  //       return cqStringify([
  //         atCode,
  //         ...await this.getStagesByModeAndRule(mode, rule, multiple),
  //       ]);
  //     } catch (e) {
  //       console.error(e);
  //       return `获取地图时出错，请稍后再试`;
  //     }
  //   }
  // }

  private getURL(image: string): string {
    return `https://splatoon2.ink/assets/splatnet${image}`;
  }
  private async drawBackground(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    color: string,
    linesColor = "rgba(0,0,0,0.1)",
  ) {
    const patW = 60, patH = 60;
    const { x, y, w, h } = rect;
    const patCanvas = await getCanvas(patW, patH);
    const patCtx = patCanvas.getContext("2d");

    patCtx.fillStyle = color;
    patCtx.fillRect(0, 0, patW, patH);

    patCtx.fillStyle = linesColor;

    patCtx.beginPath();
    patCtx.moveTo(0, 0);
    patCtx.lineTo(patW / 2, 0);
    patCtx.lineTo(patW, patH / 2);
    patCtx.lineTo(patW, patH);
    patCtx.closePath();
    patCtx.fill();

    patCtx.beginPath();
    patCtx.moveTo(0, patH / 2);
    patCtx.lineTo(patW / 2, patH);
    patCtx.lineTo(0, patH);
    patCtx.closePath();
    patCtx.fill();
    const patImg = Canvas.MakeImageFromEncoded(patCanvas.toBuffer().buffer)!;

    this.roundPath(
      ctx,
      () => {
        const pat = ctx.createPattern(
          patImg,
          "repeat",
        )!;
        ctx.fillStyle = pat;
        ctx.fillRect(x, y, w, h);
      },
      rect,
      10,
    );
  }
  private drawVerticalMiddleText(
    ctx: CanvasRenderingContext2D,
    text: string,
    rect: Rect,
  ) {
    ctx.save();
    const { x, y, w, h } = rect;
    const textToFill = text.split("");
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // TODO: canvaskit don't support height
    const fontHeight = 45;
    const drawHeight = fontHeight * textToFill.length;

    for (let i = 0; i < textToFill.length; i++) {
      ctx.fillText(
        textToFill[i],
        x + w / 2 - 20,
        y + h / 2 + fontHeight * i,
      );
    }
    ctx.restore();
  }
  private async drawMode(
    ctx: CanvasRenderingContext2D,
    stageType: StageTypes,
    rule: Rule,
    x: number,
    y: number,
  ) {
    ctx.save();
    const ruleName = RuleTranslate[rule.rule.key];
    const ruleWidth = 55;
    ctx.fillStyle = "#FFF";
    this.drawVerticalMiddleText(ctx, ruleName, {
      x: x + 5,
      y: y + 5,
      w: ruleWidth,
      h: StageSize.h,
    });

    const r1 = await this.drawImage(ctx, rule.stage_a.image, {
      x: x + 5 + ruleWidth,
      y: y + 5,
      ...StageSize,
    }, 5);
    const r2 = await this.drawImage(ctx, rule.stage_b.image, {
      x: x + 5 + ruleWidth + StageSize.w + 10,
      y: y + 5,
      ...StageSize,
    }, 5);
    await this.drawRuleIcon(ctx, stageType, {
      x: r1.x,
      y: r1.y,
      w: r2.x + r2.w - r1.x,
      h: r1.h,
    }, 0.6);
    ctx.restore();
    return {
      x: x + 5,
      y: r1.y,
      w: r2.x + r2.w - 5,
      h: r1.h,
    };
  }
  private getTime(d: Date) {
    let h = d.getHours().toString();
    if (h.length === 1) {
      h = `0${h}`;
    }
    let m = d.getMinutes().toString();
    if (m.length === 1) {
      m = `0${m}`;
    }
    return `${h}:${m}`;
  }
  async drawSchedule(s: Schedule) {
    const [canvas, ctx] = await this.getCanvas(560, 495);
    const timeStart = new Date(s.regular.start_time * 1000);
    const timeEnd = new Date(s.regular.end_time * 1000);
    // const difEnd = new Date(s.regular.end_time * 1000).diff(moment());
    const timeRange = `${this.getTime(timeStart)} - ${this.getTime(timeEnd)}`;

    ctx.font = "40px HaiPai";
    await this.drawBackground(ctx, {
      x: 0,
      y: 0,
      w: 560,
      h: 495,
    }, "#444");

    let r: Rect;
    r = await this.drawMode(ctx, "regular", s.regular, 0, 5);
    r = await this.drawMode(ctx, "gachi", s.gachi, 0, r.y + r.h + 10);
    r = await this.drawMode(ctx, "league", s.league, 0, r.y + r.h + 10);
    const textY = r.y + r.h + 5;
    ctx.font = "28px Paintball";
    ctx.fillStyle = "#FFF";
    ctx.fillText(`${timeRange}`, 50, textY + 25);

    return canvas.toBuffer();
  }
  private async drawWeapons(
    ctx: CanvasRenderingContext2D,
    s: CoopSchedule,
    rect: Rect,
  ) {
    const { x, y, w, h } = rect;
    const weaponPadding = 5;
    const calcSize = Math.min(rect.w, rect.h);
    const weaponSize = (Math.min(calcSize) - weaponPadding * 3) / 2;
    const weaponUnit = weaponPadding + weaponSize + weaponPadding;
    const xy = [
      [weaponPadding, weaponPadding],
      [weaponUnit, weaponPadding],
      [weaponPadding, weaponUnit],
      [weaponUnit, weaponUnit],
    ];
    const [offsetX, offsetY] = [
      calcSize < w ? (w - calcSize) / 2 : 0,
      calcSize < h ? (h - calcSize) / 2 : 0,
    ];
    for (let i = 0; i < 4; i++) {
      let w = s.weapons[i].weapon;
      if (!w) {
        w = s.weapons[i].coop_special_weapon;
      }
      if (!w) {
        console.error(s.weapons[i]);
        throw new Error();
      }
      await this.drawImage(ctx, w.image, {
        x: x + offsetX + xy[i][0],
        y: y + offsetY + xy[i][1],
        w: weaponSize,
        h: weaponSize,
      });
    }
    return rect;
  }
  private async drawCoopLine(
    ctx: CanvasRenderingContext2D,
    s: CoopSchedule,
    x: number,
    y: number,
  ): Promise<Rect> {
    const textHeight = 30;
    ctx.fillText(
      `${format(new Date(1000 * s.start_time), "MM-DD HH:mm")} - ${
        format(new Date(1000 * s.end_time), "MM-DD HH:mm")
      }`,
      x + 5,
      y,
    );

    const weaponRect: Rect = {
      x: x + 5 + CoopStageSize.w + 5,
      y: y + textHeight,
      w: CoopStageSize.h,
      h: CoopStageSize.h,
    };

    await this.drawImage(ctx, s.stage.image, {
      x: x + 5,
      y: y + textHeight,
      ...CoopStageSize,
    }, 5);

    const r = await this.drawWeapons(ctx, s, weaponRect);
    return {
      x,
      y,
      w: r.x + r.w - x,
      h: textHeight + 5 + CoopStageSize.h,
    };
  }
  private difTimeToStr(dif: number) {
    let diff = Math.floor(dif / 1000 / 60); // minutes
    const minutes = diff % 60;
    diff -= minutes;
    diff = ~~(diff / 60);
    const hours = diff % 24;
    diff -= hours;
    diff = ~~(diff / 24);
    const days = diff;
    const hideZero = (n: number, post: string) =>
      n === 0 ? "" : n.toString() + post;
    const ary = [
      hideZero(days, "d"),
      hideZero(hours, "h"),
      hideZero(minutes, "m"),
    ];

    return ary.filter((i) => i.length > 0).join(" ");
  }
  async drawCoopSchedule(s: CoopSchedules) {
    const now = Math.floor(Date.now() / 1000);
    const [canvas, ctx] = await this.getCanvas(395, 390);
    const details = s.details;
    const { start_time, end_time } = details[0];
    let time = "";
    let dif: number;

    ctx.font = "24px Paintball";
    await this.drawBackground(ctx, {
      x: 0,
      y: 0,
      w: 395,
      h: 390,
    }, "#ee612b");

    if (start_time > now) {
      dif = start_time * 1000 - Date.now();
      time = "离开始还有";
    } else {
      dif = Date.now() - end_time * 1000;
      time = "离结束还有";
    }

    time = `${time} ${this.difTimeToStr(dif)}`;

    ctx.fillText(`${time}`, 5, 5);
    let r: Rect;
    r = await this.drawCoopLine(ctx, details[0], 5, 5 + 25 + 10);
    r = await this.drawCoopLine(ctx, details[1], 5, r.y + r.h + 5);

    return canvas.toBuffer();
  }
  private async drawWeapon(
    ctx: CanvasRenderingContext2D,
    w: S2Weapon,
    x: number,
    y: number,
    b: boolean,
  ): Promise<Rect> {
    await this.drawImage(ctx, w.image, { x, y, w: 130, h: 130 });
    let sub = w.sub.image_a;
    let special = w.special.image_a;
    if (b) {
      sub = w.sub.image_b;
      special = w.special.image_b;
    }
    await this.drawImage(ctx, sub, { x: x + 130 + 10, y, w: 60, h: 60 });
    const r = await this.drawImage(ctx, special, {
      x: x + 130 + 10,
      y: y + 60 + 10,
      w: 60,
      h: 60,
    });
    return {
      x,
      y,
      w: r.x + r.w - x,
      h: r.y + r.h - y,
    };
  }
  private async drawTeam(
    ctx: CanvasRenderingContext2D,
    team: {
      weapons: S2Weapon[];
      color: string;
      title: string;
      isBeta: boolean;
    },
    x: number,
    y: number,
  ) {
    ctx.save();
    let curTop = y + 10;
    const titleHeight = 60;
    const rect: Rect = {
      x,
      y,
      w: 240,
      h: 10 + titleHeight + team.weapons.length * 140 + 10 + 10,
    };
    this.drawBackground(ctx, rect, team.color);

    ctx.fillStyle = "#FFF";
    ctx.fillText(team.title, x + 10, curTop);
    curTop += titleHeight;

    this.roundPath(ctx, ({ x, y, w, h }) => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(x, y, w, h);
    }, {
      x: x + 10,
      y: curTop,
      w: rect.w - 20,
      h: rect.h - (curTop - y) - 10,
    }, 5);

    curTop += 10;
    for (let w of team.weapons) {
      const r = await this.drawWeapon(ctx, w, x + 20, curTop, team.isBeta);
      curTop += r.h + 10;
    }

    ctx.restore();
  }
  // private drawRandomHeader(
  //   ctx: CanvasRenderingContext2D,
  //   stage: S2Stage,
  //   id: number,
  // ) {
  //   ctx.save();

  //   const headerHeight = 176;
  //   const headerRect: Rect = {
  //     x: 0,
  //     y: 0,
  //     w: 490,
  //     h: headerHeight,
  //   };

  //   const Rules: RulesType[] = ["splat_zones", "tower_control", "rainmaker"];
  //   const randomRule = RuleTranslate[randomIn(Rules)];
  //   this.drawBackground(ctx, headerRect, "#444");
  //   ctx.fillStyle = "#FFF";
  //   ctx.fillText(`#${id}\n\n模式:${randomRule}`, 20, 20);

  //   this.drawImage(ctx, stage.image, { x: 236, y: 20, ...StageSize }, 5);

  //   ctx.restore();
  //   return headerRect;
  // }
  // async drawRandomWeapon(rctx: RandomContext) {
  //   const [canvas, ctx] = await this.getCanvas(490, 836);
  //   const { weapons } = splatoon2Data;

  //   ctx.font = "36px HaiPai";
  //   if (rctx.stages.length === 0) {
  //     rctx.stages = shuffle(splatoon2Data.stages);
  //   }
  //   if (rctx.weaponsTeamA.length < 4) {
  //     rctx.weaponsTeamA = [...rctx.weaponsTeamA, ...shuffle(weapons)];
  //   }
  //   if (rctx.weaponsTeamB.length < 4) {
  //     rctx.weaponsTeamB = [...rctx.weaponsTeamB, ...shuffle(weapons)];
  //   }

  //   const { h: headerHeight } = this.drawRandomHeader(
  //     ctx,
  //     rctx.stages.shift()!,
  //     rctx.id++,
  //   );
  //   const teamTop = headerHeight + 10;
  //   await this.drawTeam(
  //     ctx,
  //     {
  //       weapons: rctx.weaponsTeamA.splice(0, 4),
  //       color: "#de447d",
  //       title: "Alpha",
  //       isBeta: false,
  //     },
  //     0,
  //     teamTop,
  //   );

  //   await this.drawTeam(
  //     ctx,
  //     {
  //       weapons: rctx.weaponsTeamB.splice(0, 4),
  //       color: "#65d244",
  //       title: "Bravo",
  //       isBeta: true,
  //     },
  //     250,
  //     teamTop,
  //   );

  //   return canvas.toBuffer("image/png");
  // }
  // image: "/image/xxxx.png"
  private async drawImage(
    ctx: CanvasRenderingContext2D,
    image: string,
    rect: Rect,
    r = 0,
  ) {
    const { x, y, w, h } = rect;
    const dataFile = new URL(`.${image}`, dataPath);
    let img: SkImage;

    try {
      await Deno.stat(dataFile);
      img = loadImage(await Deno.readFile(dataFile));
    } catch {
      img = loadImage(await this.getImage(this.getURL(image)));
    }

    this.roundPath(
      ctx,
      () => {
        ctx.drawImage(img, x, y, w, h);
      },
      rect,
      r,
    );
    return rect;
  }
  private async drawRuleIcon(
    ctx: CanvasRenderingContext2D,
    type: StageTypes,
    rect: Rect,
    r = 1,
  ) {
    const imgPath = new URL(`images/stage_types/${type}.png`, dataPath);
    const img = await loadImage(await Deno.readFile(imgPath));
    const imgW = img.width() * r;
    const imgH = img.height() * r;
    const drawRect: Rect = {
      x: rect.x + (rect.w - imgW) / 2,
      y: rect.y + (rect.h - imgH) / 2,
      w: imgW,
      h: imgH,
    };
    ctx.drawImage(img, drawRect.x, drawRect.y, drawRect.w, drawRect.h);
    return drawRect;
  }
  private roundPath(
    ctx: CanvasRenderingContext2D,
    cb: (rect: Rect) => void,
    rect: Rect,
    r: number,
  ) {
    const { x, y, w, h } = rect;
    ctx.save();
    if (r > 0) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.clip();
    }
    cb(rect);
    ctx.restore();
  }
  private async getImage(url: string) {
    if (this.cacheImg.has(url)) {
      return this.cacheImg.get(url)!;
    } else {
      const buf = await (await fetch(url)).arrayBuffer();
      this.cacheImg.set(url, new Uint8Array(buf));
      return buf;
    }
  }
  private async getCurrentCoop(): Promise<ArrayBuffer> {
    const now = Math.floor(Date.now() / 1000);
    let coopCache = this.coopCache;
    if (!coopCache || coopCache.details[0].end_time < now) {
      console.log("splatoon2 coop cache not hit");
      coopCache = await (await fetch(
        "https://splatoon2.ink/data/coop-schedules.json",
      )).json();
      this.coopCache = coopCache;
    }

    console.log("coop start drawing");

    const startTime = Date.now();
    const buffer = await this.drawCoopSchedule(coopCache!);

    console.log(`drawing done, spend ${Date.now() - startTime}ms`);
    return buffer;
  }
  private async loadCurrentStages(): Promise<Schedules> {
    const now = Date.now();
    let cache = this.stageCache;
    if (!cache || cache.league[0].end_time < Math.floor(now / 1000)) {
      console.log("splatoon2 cache not hit");
      cache = await (await fetch(
        "https://splatoon2.ink/data/schedules.json",
      )).json();
      this.stageCache = cache;
      this.stageCacheMsg.clear();
    }
    return cache!;
  }
  async getCurrentStage(idx = 0): Promise<Uint8Array> {
    const cache = await this.loadCurrentStages();
    if (this.stageCacheMsg.has(idx)) {
      return this.stageCacheMsg.get(idx)!;
    }

    const regular = cache.regular[idx];
    const gachi = cache.gachi[idx];
    const league = cache.league[idx];

    console.log("msg not found in cache, start drawing");
    const startTime = Date.now();
    const buffer = await this.drawSchedule({ regular, gachi, league });

    console.log(`drawing done, spend ${Date.now() - startTime}ms`);

    this.stageCacheMsg.set(idx, buffer);
    return buffer;
  }
  // private async getStagesByModeAndRule(
  //   mode: ModesType,
  //   rule: RulesType,
  //   multiple: boolean,
  // ): Promise<CQMessageList> {
  //   const cache = await this.loadCurrentStages();
  //   const idxs = cache[mode].reduce(
  //     (arr: number[], it: Rule, idx: number) =>
  //       it.rule.key === rule ? [...arr, idx] : arr,
  //     [],
  //   );
  //   let msg: CQMessageList = [];
  //   if (idxs.length > 0) {
  //     msg = flatten(
  //       await Promise.all(
  //         idxs.filter((_, index) => multiple || index === 0).map((
  //           idx: number,
  //         ) => this.getCurrentStage(idx)),
  //       ),
  //     );
  //   } else {
  //     msg = [`最近没有${ModeTranslate[mode]}${RuleTranslate[rule]}~`];
  //   }
  //   return msg;
  // }
  private async getCanvas(
    width: number,
    height: number,
  ): Promise<[EmulatedCanvas2D, CanvasRenderingContext2D]> {
    const canvas = await getCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d Context not found");
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#FFF";
    ctx.font = "18px HaiPai, Paintball, Roboto";
    ctx.textBaseline = "top";
    return [canvas, ctx];
  }
}

await Deno.writeFile("test.png", await new Splatoon2().getCurrentStage(0));
