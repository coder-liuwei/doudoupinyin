export interface ChangelogEntry {
  date: string;
  title: string;
  items: readonly string[];
  contributors: readonly string[];
}

export const changelogEntries: readonly ChangelogEntry[] = [
  {
    date: "2026-07-15",
    title: "更新动态看得见了",
    items: ["新增更新日志页面，老师和家长可以查看最近的新功能、体验优化和贡献人。"],
    contributors: ["兜兜"],
  },
];
