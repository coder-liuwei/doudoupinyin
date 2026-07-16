import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "@/App";
import Changelog from "@/routes/Changelog";
import Home from "@/routes/Home";
import { useEditorStore } from "@/store/useEditorStore";

describe("Changelog", () => {
  it("renders the latest user-facing update and contributor", () => {
    render(
      <MemoryRouter>
        <Changelog />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "我们又进步咯" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "多音字校对更直观了" })).not.toBeNull();
    expect(
      screen.getByText(
        "新增多音字候选读音卡片，可直接选择正确读音；优化校对提醒，普通声调差异不再标红。",
      ),
    ).not.toBeNull();
    expect(screen.getByText("贡献人：兜兜、高老师")).not.toBeNull();
    expect(screen.getAllByText("最新")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "返回拼音工具" }).getAttribute("href")).toBe("/");
    expect(document.querySelector(".changelog-scroll")).not.toBeNull();
  });

  it("shows a friendly empty state", () => {
    render(
      <MemoryRouter>
        <Changelog entries={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("还没有更新记录")).not.toBeNull();
    expect(screen.queryByText("最新")).toBeNull();
  });

  it("orders entries by date and marks the newest entry", () => {
    const older = {
      date: "2026-06-01",
      title: "较早更新",
      items: ["较早内容"],
      contributors: ["兜兜"],
    };
    const newer = {
      date: "2026-07-01",
      title: "较新更新",
      items: ["较新内容"],
      contributors: ["兜兜"],
    };

    render(
      <MemoryRouter>
        <Changelog entries={[older, newer]} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent))
      .toEqual(["较新更新", "较早更新"]);

    const newerArticle = screen.getByRole("heading", { name: "较新更新" }).closest("article");
    const olderArticle = screen.getByRole("heading", { name: "较早更新" }).closest("article");
    expect(newerArticle).not.toBeNull();
    expect(olderArticle).not.toBeNull();
    expect(within(newerArticle!).getByText("最新")).not.toBeNull();
    expect(within(olderArticle!).queryByText("最新")).toBeNull();
  });
});

describe("changelog routing", () => {
  it("renders the changelog route", () => {
    render(
      <MemoryRouter initialEntries={["/changelog"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "我们又进步咯" })).not.toBeNull();
  });

  it("protects an unsaved draft while the changelog route is open", () => {
    useEditorStore.setState({ input: "未保存草稿", currentId: null });
    const { unmount } = render(
      <MemoryRouter initialEntries={["/changelog"]}>
        <App />
      </MemoryRouter>,
    );

    try {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    } finally {
      unmount();
      useEditorStore.setState({ input: "", currentId: null });
    }
  });

  it("links to the changelog from the home hero", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "更新日志" });
    expect(link.getAttribute("href")).toBe("/changelog");
  });
});
