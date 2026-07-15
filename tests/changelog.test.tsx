import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "@/App";
import Changelog from "@/routes/Changelog";
import Home from "@/routes/Home";

describe("Changelog", () => {
  it("renders the latest user-facing update and contributor", () => {
    render(
      <MemoryRouter>
        <Changelog />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "我们又进步咯" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "更新动态看得见了" })).not.toBeNull();
    expect(screen.getByText("贡献人：兜兜")).not.toBeNull();
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
