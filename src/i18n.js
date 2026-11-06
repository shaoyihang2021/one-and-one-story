import {
  CHAPTERS,
  LEVEL_TEXT,
  LEVEL_TEXT_ZH,
  TITLE_TEXT,
  TITLE_TEXT_ZH,
} from "./data.js";

const rawLocale = globalThis.__ONE_AND_ONE_LOCALE
  || (typeof document !== "undefined" ? document.documentElement.lang : "")
  || "en";

export const isZh = String(rawLocale).toLowerCase().startsWith("zh");
export const locale = isZh ? "zh" : "en";

const STRINGS = {
  loading: ["loading", "载入中"],
  ready: ["ready", "就绪"],
  retry: ["Retry", "重试"],
  loadingAssets: ["Loading assets", "正在载入资源"],
  errorFile: ["Serve this folder over HTTP (npm start) and reload.", "请通过 HTTP 运行此文件夹（npm start）后刷新。"],
  errorHttp: ["The game could not load. Please reload.", "游戏无法载入，请重新载入。"],
  errorAssets: ["Some game files could not be loaded. Check your connection and retry.", "部分游戏文件加载失败。请检查网络后重试。"],
  toggleSound: ["Toggle sound", "开关声音"],
  soundOn: ["Turn sound on", "打开声音"],
  soundOff: ["Turn sound off", "关闭声音"],
  quit: ["Quit to menu", "返回主菜单"],
  restart: ["Restart level", "重新开始本关"],
  switchCharacter: ["Switch character", "切换角色"],
  guide: ["Open game guide", "打开游戏指南"],
  skip: ["Skip", "跳过"],
  menuStart: ["Start", "开始"],
  menuChapters: ["Chapter Selection", "章节选择"],
  menuBonus: ["Bonus Mode", "奖励模式"],
  menuCredits: ["Credits", "制作组"],
  menuBox: ["Finish the game to unlock this game mode.", "通关后解锁这个模式。"],
  menuTip: ["As the story proceeds, game mechanics will change according to the narrative.", "随着故事推进，游戏机制会随叙事改变。"],
  menuLogo: ["One and One Story", "一与一的故事"],
  sponsorArmor: ["Visit Armor Games", "访问 Armor Games"],
  sponsorFacebook: ["Like Armor Games on Facebook", "在 Facebook 关注 Armor Games"],
  creditsAuthor: ["Mattia Traverso's website", "Mattia Traverso 的网站"],
  creditsArtist: ["Gabriele Bonis' website", "Gabriele Bonis 的网站"],
  creditsMusic: ["David Carney's soundtrack on Bandcamp", "David Carney 的原声带（Bandcamp）"],
  soundtrack: ["Get the Soundtrack", "获取原声带"],
  achievement: ["Bonus Mode Unlocked", "奖励模式已解锁"],
  quote: ["Love is one soul in two bodies. Aristotle.", "爱是同一个灵魂，栖于两具身体。亚里士多德"],
  end: ["The End", "剧终"],
  lockedChapter: ["Locked chapter", "未解锁章节"],
  touchLeft: ["Move left", "向左移动"],
  touchRight: ["Move right", "向右移动"],
  touchJump: ["Jump", "跳跃"],
  rosieLeft: ["Rosie left", "罗茜向左"],
  rosieRight: ["Rosie right", "罗茜向右"],
  rosieJump: ["Rosie jump", "罗茜跳跃"],
  joshLeft: ["Josh left", "乔什向左"],
  joshRight: ["Josh right", "乔什向右"],
  joshJump: ["Josh jump", "乔什跳跃"],
  coopRosie: ["Rosie", "罗茜"],
  coopJosh: ["Josh", "乔什"],
};

export function t(key) {
  const entry = STRINGS[key];
  if (!entry) return key;
  return isZh ? entry[1] : entry[0];
}

export function bi(english, chinese) {
  return isZh ? chinese : english;
}

export function chapterTitle(chapterNumber) {
  const chapter = CHAPTERS.find((entry) => entry.number === chapterNumber);
  if (!chapter) return "";
  return isZh ? (chapter.titleZh || chapter.title) : chapter.title;
}

export function chapterAlt(chapterNumber) {
  return isZh ? `第${chapterNumber}章：${chapterTitle(chapterNumber)}` : `Chapter ${chapterNumber}`;
}

export function titleTexts(index) {
  const source = isZh ? TITLE_TEXT_ZH : TITLE_TEXT;
  return source[index] || TITLE_TEXT[index];
}

export function levelText(index) {
  const source = isZh ? LEVEL_TEXT_ZH : LEVEL_TEXT;
  return source[index] || LEVEL_TEXT[index];
}

export const tutorialText = isZh ? {
  initial: "于是，我在这里，\n靠着方向键移动。",
  fallen: "我摔死过……我不喜欢死亡。\n我又试了一次，按 X 或上方向键。",
  reveal: "她在那儿。\n我用 Z 或 C 想起了她。",
  box: "我真的很喜欢推箱子。",
  spikes: "她总是跳过尖刺。",
  meet: "她爱我，\n……我也爱她。我们总在那里相遇。",
} : {
  initial: "And there I was, moving thanks to the arrow keys.",
  fallen: "I died when i fell... I don't like dying.\nI tried again, pressing X or UP",
  reveal: "There she was.\nI Used Z or C to think of her.",
  box: "I Really Loved pushing boxes.",
  spikes: "She usually jumped over spikes.",
  meet: "She Loved me,\n            ...and i loved her. We always met there.",
};
