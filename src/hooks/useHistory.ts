/**
 * 历史记录的 React 绑定。
 *
 * 组件挂载时从 localStorage 读一次，save/remove/clear 操作后
 * 把最新的 records 同步回 React state，驱动列表重渲染。
 *
 * 不做防抖：保存是用户显式动作，频率低，写盘同步即可。
 */
import { useCallback, useEffect, useState } from "react";
import type { HistoryRecord } from "@/lib/types";
import {
  loadHistory,
  saveRecord,
  deleteRecord,
  renameRecord,
  clearHistory,
} from "@/lib/history";

const HISTORY_EVENT = "pinyin-prince-history-change";

export interface UseHistoryResult {
  records: HistoryRecord[];
  save: (rec: HistoryRecord) => void;
  remove: (id: string) => void;
  rename: (id: string, title: string) => void;
  clear: () => void;
  /** 兜底：组件需要时主动重读 localStorage（其它标签页写入了等场景）。 */
  refresh: () => void;
}

export function useHistory(): UseHistoryResult {
  const [records, setRecords] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    setRecords(loadHistory().records);
    const sync = () => setRecords(loadHistory().records);
    window.addEventListener(HISTORY_EVENT, sync);
    return () => window.removeEventListener(HISTORY_EVENT, sync);
  }, []);

  const save = useCallback((rec: HistoryRecord) => {
    const next = saveRecord(rec);
    setRecords(next.records);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  }, []);

  const remove = useCallback((id: string) => {
    const next = deleteRecord(id);
    setRecords(next.records);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  }, []);

  const rename = useCallback((id: string, title: string) => {
    const next = renameRecord(id, title);
    setRecords(next.records);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  }, []);

  const clear = useCallback(() => {
    const next = clearHistory();
    setRecords(next.records);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  }, []);

  const refresh = useCallback(() => {
    setRecords(loadHistory().records);
  }, []);

  return { records, save, remove, rename, clear, refresh };
}
