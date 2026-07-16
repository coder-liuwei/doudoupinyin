import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { changelogEntries, type ChangelogEntry } from "@/data/changelog";

interface ChangelogProps {
  entries?: readonly ChangelogEntry[];
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

export default function Changelog({ entries = changelogEntries }: ChangelogProps) {
  const orderedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="changelog-shell">
      <nav className="changelog-backbar" aria-label="页面导航">
        <Link to="/" className="changelog-backlink">
          <ArrowLeft size={16} />
          返回拼音工具
        </Link>
      </nav>

      <header className="changelog-hero">
        <span className="changelog-kicker">每一次更新，都为了更好用一点</span>
        <h1>我们又进步咯</h1>
        <p>这里记录兜兜拼音最近的新功能和小优化，也感谢每一位帮助它变得更好的朋友。</p>
      </header>

      <section className="changelog-section" aria-labelledby="changelog-heading">
        <div className="changelog-section-head">
          <div>
            <span className="changelog-eyebrow">最近更新</span>
            <h2 id="changelog-heading">一点一点，变得更好</h2>
          </div>
          <span className="changelog-count">共 {entries.length} 次更新</span>
        </div>

        {entries.length === 0 ? (
          <p className="changelog-empty">还没有更新记录</p>
        ) : (
          <div className="changelog-scroll">
            <div className="changelog-timeline">
              {orderedEntries.map((entry, index) => (
                <article className="changelog-entry" key={`${entry.date}-${entry.title}`}>
                  <div className="changelog-entry-meta">
                    <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                    {index === 0 && <span className="changelog-latest">最新</span>}
                  </div>
                  <h3>{entry.title}</h3>
                  <ul>
                    {entry.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <p className="changelog-contributors">
                    贡献人：{entry.contributors.join("、")}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
