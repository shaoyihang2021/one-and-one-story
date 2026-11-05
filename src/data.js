export const VIEW_W = 640;
export const VIEW_H = 480;
export const GRID = 32;
export const STEP = 1 / 60;

export const STORY_NUMBERS = [
  "", "I.1", "I.2", "I.3",
  "II.1", "II.2", "II.3",
  "III.1", "III.2", "III.3",
  "IV.1", "IV.2", "IV.3",
  "V.1", "V.2",
  "VI.1", "VI.2", "VI.3",
  "VII", "VIII",
];

export const COOP_NUMBERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

export const CHAPTERS = [
  { number: 1, roman: "I", title: "Once we were shadows.", start: 1 },
  { number: 2, roman: "II", title: "When she saw me, she ran to me.", start: 4 },
  { number: 3, roman: "III", title: "Then we walked together.", start: 7 },
  { number: 4, roman: "IV", title: "Sometimes we had different views.", start: 10 },
  { number: 5, roman: "V", title: "And she was running away.", start: 13 },
  { number: 6, roman: "VI", title: "Without her, I felt heavy like a rock.", start: 15 },
  { number: 7, roman: "VII", title: "And I realized..", start: 18 },
  { number: 8, roman: "VIII", title: "Once we were shadows", start: 19 },
];

export const TITLE_LEVELS = new Set([1, 4, 7, 10, 13, 15, 18, 19]);

export const TITLE_TEXT = {
  1: ["Once we were shadows."],
  4: ["When she saw me, she ran to me."],
  7: ["Then we walked together."],
  10: ["Sometimes we had different views."],
  13: ["And she was running away."],
  15: ["Without her, I felt heavy like a rock."],
  18: ["And I realized.."],
  19: ["Once we were shadows", "Now we are Lights"],
  111: ["Out of this world, in an endless fall."],
};

export const LEVEL_TEXT = {
  1: "     Once again, i remembered   \n    I must not fall from too high.",
};

export const CHAPTER_FOR_LEVEL = [
  1, 1, 1, 1,
  2, 2, 2, 3,
  3, 3, 4, 4,
  4, 5, 5, 6,
  6, 6, 7, 8,
];

export const BACKGROUND_BY_LEVEL = {
  0: { mood: "foggy", season: "winter", lights: false },
  1: { mood: "twilight", season: "winter", lights: true },
  2: { mood: "twilight", season: "winter", lights: true },
  3: { mood: "twilight", season: "winter", lights: true },
  4: { mood: "sunset", season: "winter", lights: true },
  5: { mood: "sunset", season: "winter", lights: true },
  6: { mood: "sunset", season: "winter", lights: true },
  7: { mood: "night", season: "winter", lights: true },
  8: { mood: "night", season: "winter", lights: true },
  9: { mood: "night", season: "winter", lights: true },
  10: { mood: "foggy", season: "other", lights: false },
  11: { mood: "foggy", season: "other", lights: false },
  12: { mood: "foggy", season: "other", lights: false },
  13: { mood: "night", season: "other", lights: true },
  14: { mood: "night", season: "other", lights: true },
  15: { mood: "dawn", season: "autumn", lights: true },
  16: { mood: "dawn", season: "autumn", lights: true },
  17: { mood: "dawn", season: "autumn", lights: true },
  18: { mood: "sunset", season: "autumn", lights: false },
  19: { mood: "dawn", season: "autumn", lights: true },
};

// The original picks a random backdrop for most bonus stages. The final stage
// has a fixed dawn palette so its ending reads consistently.
export const BACKGROUND_BY_COOP = {
  0: { mood: "foggy", season: "winter", lights: false },
  1: { mood: "twilight", season: "winter", lights: true },
  2: { mood: "sunset", season: "winter", lights: true },
  3: { mood: "night", season: "winter", lights: true },
  4: { mood: "foggy", season: "other", lights: false },
  5: { mood: "night", season: "other", lights: true },
  6: { mood: "dawn", season: "autumn", lights: true },
  7: { mood: "sunset", season: "autumn", lights: false },
  8: { mood: "twilight", season: "autumn", lights: true },
  9: { mood: "dawn", season: "autumn", lights: true },
  10: { mood: "dawn", season: "autumn", lights: true },
};

export function chapterForLevel(levelIndex) {
  if (levelIndex <= 0) return 1;
  return CHAPTER_FOR_LEVEL[Math.min(19, levelIndex)] ?? 8;
}

export function chapterStartFor(levelIndex) {
  const chapter = chapterForLevel(levelIndex);
  return CHAPTERS[chapter - 1]?.start ?? 1;
}

export function modeForStoryLevel(index) {
  if (index <= 0) return "tutorial";
  if (index <= 3) return "switch";
  if (index <= 6) return "follow";
  if (index <= 9) return "both";
  if (index <= 12) return "mirror";
  if (index <= 14) return "runaway";
  if (index <= 17) return "nojump";
  if (index === 18) return "light";
  return "end";
}

export const MOOD_DEFS = {
  foggy: {
    image: "mood-foggy", alpha: 0.7, tex: 0.4, grain: 0.2,
    windowAlpha: 0.5, lampAlpha: 0.5,
    spriteTint: "#fff3db", leavesTint: "#fffbf2",
    nightAmbience: false,
  },
  twilight: {
    image: "mood-twilight", alpha: 1, tex: 0, grain: 0.5,
    windowAlpha: 0.4, lampAlpha: 0.5,
    spriteTint: "#62b9dd", leavesTint: "#62b9dd",
    nightAmbience: true,
  },
  sunset: {
    image: "mood-sunset", alpha: 0.65, tex: 0.3, grain: 0.2,
    windowAlpha: 0.5, lampAlpha: 0.5,
    spriteTint: "#ffdab6", leavesTint: "#ffdab6",
    nightAmbience: false,
  },
  night: {
    image: "mood-night", alpha: 1, tex: 0.2, grain: 0.2,
    windowAlpha: 0.4, lampAlpha: 0.9,
    spriteTint: "#7b7360", leavesTint: "#b8ac8f",
    nightAmbience: true,
  },
  dawn: {
    image: "mood-dawn", alpha: 0.55, tex: 0.3, grain: 0.5,
    windowAlpha: 0.5, lampAlpha: 0.9,
    spriteTint: "#e4768b", leavesTint: "#f7aba2",
    nightAmbience: false,
  },
  noir: {
    image: "mood-noir", alpha: 0.55, tex: 0.3, grain: 0.5,
    windowAlpha: 0.5, lampAlpha: 0.9,
    spriteTint: "#e4768b", leavesTint: "#f7aba2",
    nightAmbience: true,
  },
};

export const WINDOW_OFFSETS = [
  [[0, 86, 23], [0, 98, 23], [0, 98, 41], [0, 78, 41], [0, 65, 23], [0, 86, 55], [1, 16, 36], [1, 16, 55], [1, 20, 44], [2, 46, 17], [2, 37, 27]],
  [[0, 13, 25], [0, 33, 38], [0, 62, 37], [1, 97, 43], [1, 67, 10], [2, 95, 21], [2, 68, 26]],
  [[0, 30, 30], [0, 42, 43], [1, 87, 39], [2, 90, 27]],
];
