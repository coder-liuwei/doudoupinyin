export interface ChangelogEntry {
  date: string;
  title: string;
  items: readonly string[];
  contributors: readonly string[];
}

export const changelogEntries: readonly ChangelogEntry[] = [
  {
    date: "2026-07-16",
    title: "拍照也能快速生成注音稿了",
    items: [
      "新增本地图片识字功能，支持拍照或上传课文图片，识别后可校对并填入正文；图片仅在当前设备处理，不会上传。",
    ],
    contributors: ["兜兜"],
  },
  {
    date: "2026-07-16",
    title: "多音字校对更直观了",
    items: [
      "新增多音字候选读音卡片，可直接选择正确读音；优化校对提醒，普通声调差异不再标红。",
    ],
    contributors: ["兜兜", "高老师"],
  },
  {
    date: "2026-07-15",
    title: "更新动态看得见了",
    items: ["新增更新日志页面，老师和家长可以查看最近的新功能、体验优化和贡献人。"],
    contributors: ["兜兜"],
  },
];
