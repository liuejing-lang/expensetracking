/* 和 Google Sheets 同步
 * 思路：手机上存一份「上次同步时云端的样子」(base)。每次同步时，把 base 和当前数据比一比，
 * 得到新增 / 修改 / 删除，打包发给 Apps Script；云端处理完返回最新的全部数据，再覆盖本机。
 * 断网时改动照样保存在手机上，联网后自动补发。
 */
import { useState, useEffect, useRef, useCallback } from "react";

export const SYNC_KEY = "expense-tracker-sync";
const COLS = ["categories", "incomeCats", "expenses", "income", "budgets", "recurring"];

export const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

const byId = (arr) => new Map((arr || []).map((x) => [x.id, x]));
function diffCol(a, b) {
  const A = byId(a), B = byId(b);
  const added = [], changed = [], removed = [];
  for (const [id, x] of B) {
    if (!A.has(id)) added.push(x);
    else if (JSON.stringify(A.get(id)) !== JSON.stringify(x)) changed.push({ before: A.get(id), after: x });
  }
  for (const [id, x] of A) if (!B.has(id)) removed.push(x);
  return { added, changed, removed };
}

/* 把「base → 当前」的差别翻译成 Apps Script 的操作 */
export function buildOps(base, cur) {
  const ops = [];
  // 设置放最前面：主货币会影响外币换算
  if (cur.currency !== base.currency) ops.push(["setSetting", { key: "currency", value: cur.currency }]);
  if (cur.currencyCode !== base.currencyCode) ops.push(["setSetting", { key: "currencyCode", value: cur.currencyCode }]);
  if (JSON.stringify(cur.rates || {}) !== JSON.stringify(base.rates || {})) ops.push(["setSetting", { key: "rates", value: cur.rates || {} }]);

  const c = diffCol(base.categories, cur.categories);
  [...c.added].sort((a, b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0)).forEach((x) => ops.push(["addCategory", x]));
  c.changed.forEach(({ after: x }) => ops.push(["updateCategory", { id: x.id, name: x.name, emoji: x.emoji, color: x.color, parent: x.parent || "" }]));
  c.removed.forEach((x) => ops.push(["archiveCategory", { id: x.id }]));

  const ic = diffCol(base.incomeCats, cur.incomeCats);
  ic.added.forEach((x) => ops.push(["addIncomeCategory", x]));
  ic.removed.forEach((x) => ops.push(["archiveIncomeCategory", { id: x.id }]));

  [["expenses", "expense"], ["income", "income"]].forEach(([col, kind]) => {
    const d = diffCol(base[col], cur[col]);
    d.added.forEach((x) => ops.push(["addRecord", { ...x, kind }]));
    d.changed.forEach(({ after: x }) => ops.push(["updateRecord", { ...x, kind, origCurrency: x.origCurrency || "" }]));
    d.removed.forEach((x) => ops.push(["deleteRecord", { id: x.id, kind }]));
  });

  const b = diffCol(base.budgets, cur.budgets);
  const fullBudget = (x) => ({ ...x, name: x.name || "", note: x.note || "", stoppedFrom: x.stoppedFrom || "", history: x.history || [], overrides: x.overrides || {} });
  b.added.forEach((x) => ops.push(["addBudget", fullBudget(x)]));
  b.changed.forEach(({ after: x }) => ops.push(["updateBudget", fullBudget(x)]));
  b.removed.forEach((x) => ops.push(["deleteBudget", { id: x.id }]));

  // 定期规则：界面上只有新增和停止；done 计数（已生成几笔）由云端自己维护，不用发
  const r = diffCol(base.recurring, cur.recurring);
  r.added.forEach((x) => ops.push(["addRecurring", x]));
  r.removed.forEach((x) => ops.push(["stopRecurring", { id: x.id }]));
  return ops;
}

const pick = (d) => {
  const o = {};
  COLS.forEach((k) => { o[k] = d[k] || []; });
  o.currency = d.currency; o.currencyCode = d.currencyCode; o.rates = d.rates || {};
  return o;
};

/* 同步期间本机又有新改动：在云端结果上补上这些改动，避免被覆盖 */
function applyLocal(S, L0, L1) {
  const out = { ...S };
  COLS.forEach((col) => {
    const d = diffCol(L0[col], L1[col]);
    if (!d.added.length && !d.changed.length && !d.removed.length) return;
    const m = byId(out[col]);
    d.added.forEach((x) => m.set(x.id, x));
    d.changed.forEach(({ after }) => m.set(after.id, after));
    d.removed.forEach((x) => m.delete(x.id));
    out[col] = [...m.values()];
  });
  ["currency", "currencyCode"].forEach((k) => { if (L1[k] !== L0[k]) out[k] = L1[k]; });
  if (JSON.stringify(L1.rates) !== JSON.stringify(L0.rates)) out.rates = L1.rates;
  return out;
}

async function api(cfg, action, data) {
  const r = await fetch(cfg.url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: cfg.token, action, data }),
    redirect: "follow",
  });
  let j;
  try { j = await r.json(); } catch { throw new Error("云端没有返回正确的数据，请检查网址"); }
  if (!j.ok) throw new Error(j.error === "unauthorized" ? "口令不对" : j.error);
  return j.data;
}

export function useSync(data, setData) {
  const [cfg, setCfg] = useState(() => LS.get(SYNC_KEY) || {});
  const [state, setState] = useState({ status: "idle", error: "", issues: [] });
  const dataRef = useRef(data);
  dataRef.current = data;
  const cfgRef = useRef(cfg);
  const busy = useRef(false), again = useRef(false), timer = useRef(null);

  const saveCfg = (c) => { cfgRef.current = c; LS.set(SYNC_KEY, c); setCfg(c); };

  const run = useCallback(async (force) => {
    const c = cfgRef.current, L0 = dataRef.current;
    if (!c.url || !L0) return;
    if (busy.current) { again.current = true; return; }
    const payload = c.base ? { ops: buildOps(c.base, L0) } : { importAll: pick(L0) };
    if (c.base && !payload.ops.length && !force) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setState((s) => ({ ...s, status: "offline" })); return; }
    busy.current = true;
    setState((s) => ({ ...s, status: "syncing" }));
    try {
      const res = await api(c, "sync", payload);
      const S = pick(res.all);
      const L1 = dataRef.current;
      const merged = L1 === L0 ? S : applyLocal(S, pick(L0), pick(L1));
      saveCfg({ ...cfgRef.current, base: S, last: Date.now() });
      setData((d) => ({ ...d, ...merged }));
      setState({ status: "ok", error: "", issues: (res.results || []).filter((x) => !x.ok) });
    } catch (e) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setState({ status: offline ? "offline" : "error", error: String(e.message || e), issues: [] });
    } finally {
      busy.current = false;
      if (again.current) { again.current = false; setTimeout(() => run(), 300); }
    }
  }, [setData]);

  // 改动后 1.5 秒自动同步
  useEffect(() => {
    if (!cfgRef.current.url || !data) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run(), 1500);
    return () => clearTimeout(timer.current);
  }, [data, run]);

  // 打开时、切回 App 时、重新联网时，拉取一次云端最新数据
  const loaded = !!data;
  useEffect(() => {
    if (!loaded) return;
    run(true);
    const onVis = () => { if (document.visibilityState === "visible") run(true); };
    const onOnline = () => run(true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("online", onOnline); };
  }, [loaded, run]);

  const connect = async (url, token) => {
    const c = { url: url.trim(), token: token.trim() };
    await api(c, "ping", {});
    saveCfg({ ...c, base: null });
    await run(true);
  };
  const disconnect = () => { saveCfg({}); setState({ status: "idle", error: "", issues: [] }); };
  const pending = cfg.url && cfg.base && data ? buildOps(cfg.base, data).length : 0;

  return { connected: !!cfg.url, url: cfg.url || "", last: cfg.last, pending, ...state, connect, disconnect, syncNow: () => run(true) };
}
