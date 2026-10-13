import { useState, useEffect, useMemo, useRef } from "react";
import { useSync, LS } from "./sync.js";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, LineChart, Line } from "recharts";
import {
  ScrollText, BarChart3, LayoutGrid, Settings, Plus, X, Delete, ChevronLeft, ChevronRight, ChevronDown,
  ChevronsUpDown, AlignLeft, Calendar, Trash2, Check, Download, Upload, Search, Repeat, Minus, SlidersHorizontal, RefreshCw, Cloud,
} from "lucide-react";

/* ---------- 视觉 ---------- */
const C = {
  bg: "#FFFFFF", ink: "#1C1C1E", dark: "#2C2C2E", sub: "#6E6E73", muted: "#A1A1A6",
  faint: "#C7C7CC", card: "#F5F5F7", line: "#ECECEF", ok: "#1FB57A", warn: "#F2A20C", over: "#F0524F",
};
const PALETTE = ["#F08A6C", "#F4C542", "#4DA3F7", "#EF7FA0", "#8E7CF0", "#5CC8A8", "#C4935F", "#9AA4B2", "#6BBF59", "#F29E4C"];

/* 两层类目：parent 为空是大类，否则是子类。大类预算包含所有子类。 */
const DEFAULT_CATS = [
  { id: "food", name: "餐饮", emoji: "🍜", color: "#F08A6C", parent: "" },
  { id: "food-daily", name: "日常吃饭", emoji: "🍚", color: "#F08A6C", parent: "food" },
  { id: "food-out", name: "外出餐厅", emoji: "🍽️", color: "#F08A6C", parent: "food" },
  { id: "food-snack", name: "饮品零食", emoji: "🧋", color: "#F08A6C", parent: "food" },
  { id: "transport", name: "交通", emoji: "🚌", color: "#4DA3F7", parent: "" },
  { id: "transport-public", name: "公共交通", emoji: "🚇", color: "#4DA3F7", parent: "transport" },
  { id: "transport-taxi", name: "打车", emoji: "🚕", color: "#4DA3F7", parent: "transport" },
  { id: "home", name: "居住", emoji: "🏡", color: "#5CC8A8", parent: "" },
  { id: "home-rent", name: "房租", emoji: "🔑", color: "#5CC8A8", parent: "home" },
  { id: "home-utility", name: "水电网", emoji: "💡", color: "#5CC8A8", parent: "home" },
  { id: "shopping", name: "购物", emoji: "🛍️", color: "#8E7CF0", parent: "" },
  { id: "shopping-daily", name: "日用品", emoji: "🧻", color: "#8E7CF0", parent: "shopping" },
  { id: "shopping-online", name: "网购", emoji: "📦", color: "#8E7CF0", parent: "shopping" },
  { id: "shopping-clothes", name: "服饰", emoji: "👕", color: "#8E7CF0", parent: "shopping" },
  { id: "fun", name: "娱乐", emoji: "🎬", color: "#F4C542", parent: "" },
  { id: "health", name: "健康", emoji: "💊", color: "#EF7FA0", parent: "" },
  { id: "other", name: "其他", emoji: "🗂️", color: "#9AA4B2", parent: "" },
];
const INCOME_CATS = [
  { id: "inc-salary", name: "工资", emoji: "💼", color: "#1FB57A" },
  { id: "inc-bonus", name: "奖金", emoji: "🎉", color: "#5CC8A8" },
  { id: "inc-refund", name: "报销退款", emoji: "🧾", color: "#4DA3F7" },
  { id: "inc-invest", name: "理财", emoji: "📈", color: "#F4C542" },
  { id: "inc-other", name: "其他收入", emoji: "💰", color: "#9AA4B2" },
];
const FREQS = [
  { id: "day", label: "每天", unit: "天" },
  { id: "week", label: "每周", unit: "周" },
  { id: "month", label: "每月", unit: "个月" },
  { id: "year", label: "每年", unit: "年" },
];
const PERIODS = [
  { id: "day", label: "每天", noun: "今天" },
  { id: "week", label: "每周", noun: "本周" },
  { id: "month", label: "每月", noun: "本月" },
  { id: "year", label: "每年", noun: "今年" },
  { id: "custom", label: "自定义", noun: "本期" },
];
const VIEW = { week: "本周", month: "本月", year: "今年" };
const VIEW_SHORT = { week: "周", month: "月", year: "年" };
const NEXT = { week: "month", month: "year", year: "week" };
const WD = ["日", "一", "二", "三", "四", "五", "六"];
const STORE_KEY = "expense-tracker-v1";
const SRC_LABEL = { mine: "我的汇率", custom: "本笔汇率", market: "市场汇率" };

const CURRENCIES = [
  { code: "SGD", name: "新加坡元", symbol: "S$" },
  { code: "CNY", name: "人民币", symbol: "¥" },
  { code: "USD", name: "美元", symbol: "$" },
  { code: "HKD", name: "港币", symbol: "HK$" },
  { code: "TWD", name: "新台币", symbol: "NT$" },
  { code: "MYR", name: "马来西亚林吉特", symbol: "RM" },
  { code: "IDR", name: "印尼盾", symbol: "Rp" },
  { code: "THB", name: "泰铢", symbol: "฿" },
  { code: "VND", name: "越南盾", symbol: "₫" },
  { code: "PHP", name: "菲律宾比索", symbol: "₱" },
  { code: "JPY", name: "日元", symbol: "JP¥" },
  { code: "KRW", name: "韩元", symbol: "₩" },
  { code: "INR", name: "印度卢比", symbol: "₹" },
  { code: "AUD", name: "澳元", symbol: "A$" },
  { code: "EUR", name: "欧元", symbol: "€" },
  { code: "GBP", name: "英镑", symbol: "£" },
  { code: "BRL", name: "巴西雷亚尔", symbol: "R$" },
  { code: "MXN", name: "墨西哥比索", symbol: "MX$" },
  { code: "COP", name: "哥伦比亚比索", symbol: "COL$" },
  { code: "CLP", name: "智利比索", symbol: "CLP$" },
];
const curInfo = (code) => CURRENCIES.find((c) => c.code === code);
const symOf = (code) => curInfo(code)?.symbol || code;
const baseCodeOf = (data) => (CURRENCIES.find((c) => c.code === data.currencyCode) || CURRENCIES.find((c) => c.symbol === data.currency) || CURRENCIES[0]).code;

/* ---------- 工具 ---------- */
const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayDate = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7));
const daysBetween = (a, b) => Math.round((b - a) / 86400000) + 1;
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
const round = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;
const clamp = (n) => Math.max(0, Math.min(1, n));
const sum = (arr) => arr.reduce((a, x) => a + x.amount, 0);
const inRange = (x, s, e) => x.date >= fmt(s) && x.date <= fmt(e);
const md = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
const fmtNum = (n) => { const r = round(Math.abs(n)); return r.toLocaleString("en-US", { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
const nounOf = (p) => PERIODS.find((x) => x.id === p).noun;
const cleanNum = (v) => v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

/* 类目关系 */
function makeCats(categories) {
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const isSub = (c) => !!(c.parent && byId[c.parent]);
  const parents = new Set(categories.filter(isSub).map((c) => c.parent));
  return {
    byId,
    tops: categories.filter((c) => !isSub(c)),
    kids: (id) => categories.filter((c) => c.parent === id && byId[id]),
    leaves: categories.filter((c) => !parents.has(c.id)),
    hasKids: (id) => parents.has(id),
    isSub: (id) => !!byId[id] && isSub(byId[id]),
    topOf: (id) => (byId[id] && isSub(byId[id]) ? byId[id].parent : id),
    of: (id) => byId[id] || { id, name: "已删除", emoji: "❔", color: "#9AA4B2" },
  };
}
const matchCat = (b, x, K) => b.cat === "all" || x.cat === b.cat || K.topOf(x.cat) === b.cat;

function statRange(mode, offset) {
  const t = todayDate();
  if (mode === "week") { const s = addDays(startOfWeek(t), offset * 7); return [s, addDays(s, 6)]; }
  if (mode === "month") return [new Date(t.getFullYear(), t.getMonth() + offset, 1), new Date(t.getFullYear(), t.getMonth() + offset + 1, 0)];
  return [new Date(t.getFullYear() + offset, 0, 1), new Date(t.getFullYear() + offset, 11, 31)];
}
function budgetRange(b, ref = todayDate()) {
  if (b.period === "day") return [ref, ref];
  if (b.period === "custom") return [parse(b.start), parse(b.end)];
  return statRange(b.period, 0);
}
/* 预算金额有历史：history 记录「从哪一期起是多少」，overrides 记录单独某一期的临时调整 */
function baseAmount(b, key) {
  if (!b.history?.length) return b.amount; // 旧数据：一直是同一个金额
  const h = [...b.history].sort((a, c) => a.from.localeCompare(c.from)).filter((x) => x.from <= key).pop();
  return h ? h.amount : null; // 预算建立之前的周期：没有预算
}
function budgetAmount(b, s) {
  if (b.period === "custom") return b.amount;
  const ov = b.overrides?.[fmt(s)];
  return ov && ov.amount > 0 ? ov.amount : baseAmount(b, fmt(s));
}
function budgetNote(b, s) {
  const ov = b.period !== "custom" && b.overrides?.[fmt(s)];
  return ov ? ov.note || "" : b.note || "";
}
const budgetLiveIn = (b, s) => b.period === "custom" || ((!b.stoppedFrom || fmt(s) < b.stoppedFrom) && budgetAmount(b, s) != null);
const isLiveNow = (b) => budgetLiveIn(b, budgetRange(b)[0]);
const hasPastPeriods = (b) => b.period !== "custom" && (!b.history?.length || b.history.some((h) => h.from < fmt(budgetRange(b)[0])));
function periodLabel(period, key) {
  const d = parse(key);
  if (period === "day") return md(d);
  if (period === "week") return `${d.getMonth() + 1}/${d.getDate()} 那周`;
  if (period === "month") return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  return `${d.getFullYear()}年`;
}
function budgetStatus(b, expenses, K) {
  const [s, e] = budgetRange(b);
  const t = todayDate();
  const amount = budgetAmount(b, s) ?? b.amount;
  const spent = sum(expenses.filter((x) => matchCat(b, x, K) && inRange(x, s, e)));
  const total = daysBetween(s, e);
  let elapsed;
  if (b.period === "day") { const n = new Date(); elapsed = (n.getHours() + n.getMinutes() / 60) / 24; }
  else elapsed = t < s ? 0 : Math.min(1, daysBetween(s, t) / total);
  const daysLeft = t > e ? 0 : daysBetween(t < s ? s : t, e);
  const remaining = amount - spent;
  const pct = amount > 0 ? spent / amount : 0;
  const tone = pct >= 1 ? C.over : pct >= 0.85 || pct > elapsed + 0.15 ? C.warn : C.ok;
  const ov = b.period !== "custom" ? b.overrides?.[fmt(s)] : null;
  return {
    s, e, amount, spent, remaining, pct, elapsed, daysLeft, tone,
    perDay: daysLeft > 0 ? Math.max(0, remaining) / daysLeft : 0,
    note: budgetNote(b, s), overridden: !!ov, normal: ov ? baseAmount(b, fmt(s)) : null,
  };
}
function overallBudget(data, K) {
  const live = data.budgets.filter(isLiveNow);
  const all = live.find((b) => b.cat === "all" && b.period === "month") || live.find((b) => b.cat === "all");
  if (all) { const st = budgetStatus(all, data.expenses, K); return { id: all.id, amount: st.amount, st, noun: nounOf(all.period) }; }
  // 没有总预算时，把大类的月预算加起来（子类预算已包含在大类里，不重复计算）
  const ms = live.filter((b) => b.period === "month" && !K.isSub(b.cat));
  if (!ms.length) return null;
  const sts = ms.map((b) => budgetStatus(b, data.expenses, K));
  const amount = sts.reduce((a, s) => a + s.amount, 0);
  const spent = sts.reduce((a, s) => a + s.spent, 0);
  return { id: null, amount, noun: "本月", st: { spent, remaining: amount - spent, pct: spent / amount, elapsed: sts[0].elapsed } };
}

/* 定期记账：第 i 次发生的日期（月末自动对齐，如 31 号遇到 2 月就记在 28/29 号） */
function occDate(r, i) {
  const s = parse(r.start), n = (r.every || 1) * i;
  if (r.freq === "day") return addDays(s, n);
  if (r.freq === "week") return addDays(s, 7 * n);
  const y = r.freq === "year" ? s.getFullYear() + n : s.getFullYear();
  const m = r.freq === "year" ? s.getMonth() : s.getMonth() + n;
  return new Date(y, m, Math.min(s.getDate(), new Date(y, m + 1, 0).getDate()));
}
function recurLabel(r) {
  const s = parse(r.start), every = r.every || 1;
  if (every > 1) return `每 ${every} ${FREQS.find((f) => f.id === r.freq).unit}`;
  if (r.freq === "day") return "每天";
  if (r.freq === "week") return `每周${WD[s.getDay()]}`;
  if (r.freq === "month") return `每月 ${s.getDate()} 日`;
  return `每年 ${s.getMonth() + 1}月${s.getDate()}日`;
}
const fxPart = (x) => (x.origCurrency ? { origAmount: x.origAmount, origCurrency: x.origCurrency, rate: x.rate, rateSource: x.rateSource } : {});
/* 把到期的定期记账补成真实记录；没有新增时原样返回 */
function materialize(d) {
  const t = fmt(todayDate());
  const add = { expenses: [], income: [] };
  let changed = false;
  const recurring = (d.recurring || []).map((r) => {
    let done = r.done || 0;
    while (done < 2000) {
      const dt = fmt(occDate(r, done));
      if (dt > t || (r.end && dt > r.end)) break;
      add[r.kind === "income" ? "income" : "expenses"].push({
        // 固定 id「规则id-第几次」：手机和电脑各自生成也不会重复记账
        id: `${r.id}-${done}`, created: new Date().toISOString(), amount: r.amount, cat: r.cat, date: dt, note: r.note || "", recurId: r.id, ...fxPart(r),
      });
      done++;
    }
    if (done === (r.done || 0)) return r;
    changed = true;
    return { ...r, done };
  });
  if (!changed) return d;
  return { ...d, recurring, expenses: [...d.expenses, ...add.expenses], income: [...(d.income || []), ...add.income] };
}

/* 市场汇率：返回 1 主货币 = ? 外币。拿不到就返回 null */
async function fetchMarketRate(base, cc) {
  const tries = [
    async () => (await (await fetch(`https://open.er-api.com/v6/latest/${base}`)).json()).rates?.[cc],
    async () => (await (await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${cc}`)).json()).rates?.[cc],
  ];
  for (const t of tries) {
    try { const v = await t(); if (v > 0) return round4(v); } catch { /* 试下一个 */ }
  }
  return null;
}

/* ---------- 通用组件 ---------- */
function Money({ v, cur, size = 40, color = C.ink }) {
  return (
    <span style={{ fontSize: size, fontWeight: 600, color, letterSpacing: size > 30 ? -1.2 : -0.3, lineHeight: 1.1, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: size * 0.58, color: C.muted, fontWeight: 500, marginRight: 2 }}>{v < 0 ? "-" : ""}{cur}</span>
      {fmtNum(v)}
    </span>
  );
}
const Tile = ({ c, size = 52, recur }) => (
  <span className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size, borderRadius: size * 0.3, background: c.color + "40", fontSize: size * 0.5 }}>
    {c.emoji}
    {recur && (
      <span className="absolute flex items-center justify-center" aria-label="定期"
        style={{ right: -5, bottom: -5, width: size * 0.44, height: size * 0.44, borderRadius: "50%", background: C.bg, border: `1.5px solid ${C.line}` }}>
        <Repeat size={size * 0.24} strokeWidth={2.6} color={C.sub} />
      </span>
    )}
  </span>
);
const Chip = ({ on, onClick, children, soft }) => (
  <button onClick={onClick} className="shrink-0 flex items-center gap-1.5 px-4"
    style={{ height: 46, borderRadius: 16, fontSize: 17, fontWeight: 500, background: on ? C.dark : soft ? C.bg : C.card, color: on ? "#fff" : C.ink, border: soft && !on ? `1.5px solid ${C.line}` : "none" }}>
    {children}
  </button>
);
const Title = ({ children, right }) => (
  <div className="flex items-center justify-between mb-6">
    <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>{children}</h1>{right}
  </div>
);
function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,.3)" }} onClick={onClose}>
      <div className="w-full max-w-md mx-auto px-6 pt-5 overflow-y-auto" style={{ background: C.bg, borderRadius: "28px 28px 0 0", maxHeight: "92vh", paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span style={{ fontSize: 22, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} aria-label="关闭" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: C.card }}><X size={20} color={C.sub} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function FullPage({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: C.bg }}>
      <div className="max-w-md mx-auto px-6 pb-10" style={{ paddingTop: "calc(24px + env(safe-area-inset-top))" }}>
        <button onClick={onClose} aria-label="返回" className="w-11 h-11 rounded-full flex items-center justify-center mb-6" style={{ background: C.card }}>
          <ChevronLeft size={24} color={C.sub} />
        </button>
        <h1 className="mb-5" style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
const Label = ({ children }) => <div className="mb-2 mt-5" style={{ fontSize: 15, fontWeight: 600, color: C.muted }}>{children}</div>;
const Section = ({ title, children }) => (
  <div className="mb-6"><div className="mb-2" style={{ fontSize: 15, fontWeight: 600, color: C.muted }}>{title}</div>
    <div className="px-4" style={{ background: C.card, borderRadius: 22 }}>{children}</div></div>
);
const Note = ({ children }) => <div className="mt-4 px-1" style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{children}</div>;

/* ---------- 主应用 ---------- */
export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("ledger");
  const [sheet, setSheet] = useState(null);
  const [saveErr, setSaveErr] = useState(false);
  const [search, setSearch] = useState(null); // null | { filters: bool }
  const [swipeId, setSwipeId] = useState(null); // 当前左滑展开的记录
  const [toast, setToast] = useState(null);   // 刚删除的记录，5 秒内可撤销
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    (async () => {
      const init = { categories: DEFAULT_CATS, incomeCats: INCOME_CATS, expenses: [], income: [], recurring: [], budgets: [], currency: "S$", currencyCode: "SGD", rates: {} };
      const saved = LS.get(STORE_KEY);
      setData(saved ? { ...init, ...saved } : init);
      try { navigator.storage?.persist?.(); } catch { /* 不支持就算了 */ }
      // 从「记一笔」快捷方式打开（网址带 ?add=1）时，直接弹出记账页
      if (new URLSearchParams(location.search).has("add")) {
        setSheet({ type: "expense" });
        history.replaceState(null, "", location.pathname);
      }
    })();
  }, []);
  useEffect(() => {
    if (!data) return;
    setSaveErr(!LS.set(STORE_KEY, data));
  }, [data]);

  // 打开时（以及定期规则变化时）把到期的定期记账自动记上
  useEffect(() => {
    if (!data) return;
    const m = materialize(data);
    if (m !== data) setData(m);
  }, [data]);

  const sync = useSync(data, setData);
  const K = useMemo(() => (data ? makeCats(data.categories) : null), [data?.categories]);
  if (!data) return <div className="min-h-screen flex items-center justify-center" style={{ color: C.muted, fontSize: 17 }}>正在打开账本…</div>;

  const base = baseCodeOf(data);
  const cur = data.currency;
  const upd = (fn) => setData((d) => ({ ...d, ...fn(d) }));
  const incOf = (id) => (data.incomeCats || []).find((c) => c.id === id) || { id, name: "已删除", emoji: "❔", color: "#9AA4B2" };
  const removeRecord = (rec) => {
    const arr = rec.kind === "income" ? "income" : "expenses";
    const { kind, ...clean } = rec;
    upd((d) => ({ [arr]: (d[arr] || []).filter((x) => x.id !== rec.id) }));
    setToast({ rec: clean, arr, label: rec.note || (rec.kind === "income" ? incOf(rec.cat) : K.of(rec.cat)).name });
  };
  const undoRemove = () => {
    const { rec, arr } = toast;
    upd((d) => ({ [arr]: [...(d[arr] || []).filter((x) => x.id !== rec.id), rec] }));
    setToast(null);
  };
  const ctx = { data, cur, base, K, incOf, upd, sync, open: setSheet, removeRecord, swipeId, setSwipeId, openSearch: (filters) => setSearch({ filters }) };
  const close = () => setSheet(null);
  const tabBtn = (id, Icon, label) => (
    <button onClick={() => setTab(id)} aria-label={label} className="w-12 h-12 flex items-center justify-center">
      <Icon size={28} strokeWidth={2.2} color={tab === id ? C.dark : C.faint} />
    </button>
  );

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif', fontVariantNumeric: "tabular-nums" }}>
      <style>{`.noscroll::-webkit-scrollbar{display:none}.noscroll{scrollbar-width:none}button{-webkit-tap-highlight-color:transparent}input,button,select{font-family:inherit;color:inherit}`}</style>
      <div className="max-w-md mx-auto px-6" style={{ paddingTop: "calc(32px + env(safe-area-inset-top))", paddingBottom: "calc(120px + env(safe-area-inset-bottom))" }}>
        {saveErr && <div className="mb-4 px-4 py-3 rounded-2xl" style={{ background: "#FDECEC", color: C.over, fontSize: 15 }}>刚才的改动没保存成功，请再操作一次。</div>}
        {sync.connected && sync.status === "error" && (
          <button onClick={() => setTab("settings")} className="w-full text-left mb-4 px-4 py-3 rounded-2xl" style={{ background: "#FFF4E0", color: "#9A6200", fontSize: 15 }}>
            同步没成功：{sync.error}。记录都保存在手机上，稍后会自动再试。
          </button>
        )}
        {tab === "ledger" && <Ledger {...ctx} />}
        {tab === "stats" && <Insights {...ctx} />}
        {tab === "budget" && <Budgets {...ctx} />}
        {tab === "settings" && <SettingsView {...ctx} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0" style={{ background: "rgba(255,255,255,.94)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}` }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-3" style={{ height: "calc(80px + env(safe-area-inset-bottom))", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
          {tabBtn("ledger", ScrollText, "账本")}
          {tabBtn("stats", BarChart3, "统计")}
          <button onClick={() => setSheet({ type: "expense" })} aria-label="记一笔" className="flex items-center justify-center" style={{ width: 76, height: 50, borderRadius: 18, background: C.dark }}>
            <Plus size={30} strokeWidth={2.6} color="#fff" />
          </button>
          {tabBtn("budget", LayoutGrid, "预算")}
          {tabBtn("settings", Settings, "设置")}
        </div>
      </nav>

      {search && <SearchPage {...ctx} startWithFilters={search.filters} onClose={() => setSearch(null)} />}
      {sheet?.type === "expense" && <ExpenseSheet {...ctx} initial={sheet.exp} onClose={close} />}
      {toast && (
        <div className="fixed left-0 right-0 flex justify-center px-6" style={{ bottom: "calc(96px + env(safe-area-inset-bottom))", zIndex: 60 }}>
          <div className="flex items-center gap-4 pl-5 pr-2 max-w-md w-full" style={{ height: 56, borderRadius: 18, background: C.dark, color: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,.18)" }}>
            <span className="flex-1 min-w-0 truncate" style={{ fontSize: 17 }}>已删除「{toast.label}」</span>
            <button onClick={undoRemove} className="px-4" style={{ height: 42, borderRadius: 13, background: "rgba(255,255,255,.14)", fontSize: 17, fontWeight: 700 }}>撤销</button>
          </div>
        </div>
      )}
      {sheet?.type === "budget" && <BudgetSheet {...ctx} onClose={close} />}
      {sheet?.type === "budgetDetail" && <BudgetDetail {...ctx} id={sheet.id} onClose={close} />}
    </div>
  );
}

/* ---------- 账本 ---------- */
function Ledger({ data, cur, K, incOf, open, openSearch, removeRecord, swipeId, setSwipeId }) {
  const [view, setView] = useState("month");
  const [limit, setLimit] = useState(50);
  const [s, e] = statRange(view, 0);
  const total = sum(data.expenses.filter((x) => inRange(x, s, e)));
  const incTotal = sum((data.income || []).filter((x) => inRange(x, s, e)));
  const t = fmt(todayDate()), y = fmt(addDays(todayDate(), -1));
  const ruleIds = new Set((data.recurring || []).map((r) => r.id));

  const all = [
    ...data.expenses.map((x) => ({ ...x, kind: "expense" })),
    ...(data.income || []).map((x) => ({ ...x, kind: "income" })),
  ].sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created));
  const groups = [];
  all.slice(0, limit).forEach((x) => { const g = groups[groups.length - 1]; g && g.date === x.date ? g.items.push(x) : groups.push({ date: x.date, items: [x] }); });
  const dayTotal = (d) => sum(data.expenses.filter((x) => x.date === d));

  return (
    <>
      <div className="flex justify-between -mt-2">
        <button onClick={() => openSearch(false)} aria-label="搜索" className="w-11 h-11 -ml-2 flex items-center justify-center"><Search size={26} strokeWidth={2.2} color={C.ink} /></button>
        <button onClick={() => openSearch(true)} aria-label="筛选" className="w-11 h-11 -mr-2 flex items-center justify-center"><SlidersHorizontal size={24} strokeWidth={2.2} color={C.ink} /></button>
      </div>
      <div className="text-center pt-6 pb-12">
        <div className="flex items-center justify-center gap-2 mb-3" style={{ fontSize: 20, fontWeight: 500 }}>
          支出
          <button onClick={() => setView(NEXT[view])} className="px-3 py-1 rounded-full" style={{ border: `1.5px solid ${C.line}`, fontSize: 18 }}>{VIEW[view]}</button>
        </div>
        <Money v={total} cur={cur} size={60} />
        {incTotal > 0 && (
          <div className="mt-3" style={{ fontSize: 17, color: C.muted, fontWeight: 500 }}>
            收入 <span style={{ color: C.ok }}>{cur}{fmtNum(incTotal)}</span>　结余 <span style={{ color: incTotal - total < 0 ? C.over : C.ink }}>{incTotal - total < 0 ? "-" : ""}{cur}{fmtNum(incTotal - total)}</span>
          </div>
        )}
      </div>

      {groups.length === 0 && <div className="text-center pt-6" style={{ color: C.muted, fontSize: 18, lineHeight: 1.7 }}>还没有记录<br />点下方 ＋ 记下第一笔</div>}

      {groups.map((g) => {
        const d = parse(g.date);
        const dt = dayTotal(g.date);
        return (
          <div key={g.date} className="mb-6">
            <div className="flex justify-between pb-2 mb-2" style={{ borderBottom: `1.5px solid ${C.line}`, color: C.muted, fontSize: 16, fontWeight: 600 }}>
              <span>{g.date === t ? "今天" : g.date === y ? "昨天" : `${md(d)} 周${WD[d.getDay()]}`}</span>
              <span>{dt > 0 ? `${cur}${fmtNum(dt)}` : ""}</span>
            </div>
            {g.items.map((x) => (
              <RecordRow key={x.id} x={x} cur={cur} K={K} incOf={incOf} recur={!!x.recurId && ruleIds.has(x.recurId)} onClick={() => open({ type: "expense", exp: x })}
                onDelete={() => removeRecord(x)} openId={swipeId} setOpenId={setSwipeId} />
            ))}
          </div>
        );
      })}
      {all.length > limit && <button onClick={() => setLimit(limit + 50)} className="w-full py-3" style={{ color: C.muted, fontSize: 16 }}>显示更早的记录</button>}
    </>
  );
}

/* ---------- 记一笔（支出/收入 + 计算器键盘 + 多币种 + 重复） ---------- */
function ExpenseSheet({ data, cur, base, K, upd, removeRecord, initial, onClose }) {
  const poolOf = (k) => (k === "income" ? data.incomeCats || [] : K.leaves);
  const sortedPool = (k) => {
    const f = {};
    (k === "income" ? data.income || [] : data.expenses).forEach((x) => { f[x.cat] = (f[x.cat] || 0) + 1; });
    return [...poolOf(k)].sort((a, b) => (f[b.id] || 0) - (f[a.id] || 0));
  };
  const defaultCat = (k) => {
    const last = k === "income" ? data.lastIncCat : data.lastCat;
    return poolOf(k).some((c) => c.id === last) ? last : sortedPool(k)[0]?.id;
  };
  const fx0 = initial?.origCurrency;
  const rule = initial?.recurId ? (data.recurring || []).find((r) => r.id === initial.recurId) : null;

  const [kind, setKind] = useState(initial?.kind || "expense");
  const [amt, setAmt] = useState(initial ? String(fx0 ? initial.origAmount : initial.amount) : "0");
  const [cc, setCc] = useState(fx0 || base);
  const [rate, setRate] = useState(fx0 ? String(initial.rate) : "");
  const [src, setSrc] = useState(initial?.rateSource || "mine");
  const [cat, setCat] = useState(initial?.cat || defaultCat("expense"));
  const [date, setDate] = useState(initial?.date || fmt(todayDate()));
  const [note, setNote] = useState(initial?.note || "");
  const [noteOpen, setNoteOpen] = useState(!!initial?.note);
  const [recur, setRecur] = useState(null); // 新设置的重复：{ freq, every, end }
  const [panel, setPanel] = useState(null); // "cur" | "rate" | "recur"

  const isInc = kind === "income";
  const chips = sortedPool(kind);
  const fx = cc !== base;
  const amtNum = parseFloat(amt) || 0;
  const rateNum = parseFloat(rate) || 0;
  const baseAmt = fx ? (rateNum > 0 ? amtNum / rateNum : 0) : amtNum;
  const valid = amtNum > 0 && !!cat && (!fx || rateNum > 0);

  const switchKind = (k) => { if (k === kind) return; setKind(k); setCat(defaultCat(k)); };
  const press = (k) => setAmt((a) => {
    if (k === ".") return a.includes(".") ? a : a + ".";
    if (a === "0") return k;
    if (a.includes(".") && a.split(".")[1].length >= 2) return a;
    if (a.replace(".", "").length >= 10) return a;
    return a + k;
  });
  const back = () => setAmt((a) => (a.length <= 1 ? "0" : a.slice(0, -1)));

  const chooseCur = (code) => {
    setCc(code);
    if (code !== base) {
      const r = data.rates?.[code];
      setRate(r ? String(r) : "");
      setSrc("mine");
      setPanel(r ? null : "rate");
    } else setPanel(null);
  };
  const saveRate = (n, s, mine) => {
    setRate(String(n)); setSrc(s);
    if (mine) upd((d) => ({ rates: { ...(d.rates || {}), [cc]: n } }));
    setPanel(null);
  };

  const save = () => {
    if (!valid) return;
    const body = { amount: round(baseAmt), cat, date, note: note.trim(), ...(fx ? { origAmount: round(amtNum), origCurrency: cc, rate: rateNum, rateSource: src } : {}) };
    const arr = isInc ? "income" : "expenses";
    const oldArr = initial ? (initial.kind === "income" ? "income" : "expenses") : null;
    upd((d) => {
      const next = { ...d, [isInc ? "lastIncCat" : "lastCat"]: cat };
      let rec = { id: initial?.id || uid(), created: initial?.created || new Date().toISOString(), ...body, ...(initial?.recurId ? { recurId: initial.recurId } : {}) };
      if (recur) {
        // 新记录：第一笔交给 materialize 生成；已有记录：它自己就是第 1 笔
        const r = { id: uid(), kind, ...body, freq: recur.freq, every: recur.every, start: date, end: recur.end || "", done: initial ? 1 : 0 };
        next.recurring = [...(d.recurring || []), r];
        if (initial) rec.recurId = r.id; else rec = null;
      }
      if (oldArr) next[oldArr] = (d[oldArr] || []).filter((x) => x.id !== initial.id);
      if (rec) next[arr] = [...(next[arr] || []), rec];
      return materialize(next);
    });
    onClose();
  };
  const del = () => { removeRecord(initial); onClose(); };
  const stopRule = () => { upd((d) => ({ recurring: (d.recurring || []).filter((r) => r.id !== rule.id) })); setPanel(null); };

  const dd = parse(date), t = fmt(todayDate()), y = fmt(addDays(todayDate(), -1));
  const dateLabel = date === t ? `今天，${md(dd)}` : date === y ? `昨天，${md(dd)}` : `${md(dd)} 周${WD[dd.getDay()]}`;
  const recurText = rule ? recurLabel(rule) : recur ? recurLabel({ ...recur, start: date }) : "不重复";
  const [ip, dp] = amt.split(".");
  const shown = Number(ip).toLocaleString("en-US") + (amt.includes(".") ? "." + dp : "");
  const size = shown.length > 8 ? 48 : 68;
  const curOrder = [...new Set([base, "CNY", ...Object.keys(data.rates || {}), ...CURRENCIES.map((c) => c.code)])];

  return (
    <div className="fixed inset-0 z-50" style={{ background: C.bg }}>
      <div className="max-w-md mx-auto h-full flex flex-col px-5" style={{ paddingTop: "calc(24px + env(safe-area-inset-top))", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between">
          <button onClick={onClose} aria-label="关闭" className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.card }}><X size={22} color={C.sub} /></button>
          <div className="flex p-1" style={{ background: C.card, borderRadius: 16 }}>
            {[["expense", "支出"], ["income", "收入"]].map(([k, l]) => (
              <button key={k} onClick={() => switchKind(k)} className="px-5"
                style={{ height: 40, borderRadius: 13, fontSize: 17, fontWeight: 600, background: kind === k ? C.bg : "transparent", color: kind === k ? C.ink : C.muted, boxShadow: kind === k ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
                {l}
              </button>
            ))}
          </div>
          {initial ? (
            <button onClick={del} aria-label="删除" className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.card }}>
              <Trash2 size={20} color={C.over} />
            </button>
          ) : <span className="w-11" />}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative w-full flex justify-center items-center">
            <span className="flex items-baseline" style={{ fontSize: size, fontWeight: 600, letterSpacing: -2, color: isInc ? C.ok : C.ink }}>
              <button onClick={() => setPanel("cur")} aria-label="切换货币" className="flex items-baseline" style={{ fontSize: size * 0.55, color: fx ? C.ink : C.muted, fontWeight: 500, letterSpacing: 0 }}>
                {symOf(cc)}<ChevronDown size={size * 0.28} color={C.muted} style={{ marginRight: 2 }} />
              </button>
              {shown}
            </span>
            <button onClick={back} aria-label="退格" className="absolute right-0 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.card }}><Delete size={20} color={C.sub} /></button>
          </div>

          {fx && (
            <button onClick={() => setPanel("rate")} className="mt-3 flex items-center gap-1" style={{ fontSize: 17, color: rateNum > 0 ? C.sub : C.warn, fontWeight: 500 }}>
              {rateNum > 0 ? `≈ ${cur}${fmtNum(baseAmt)}，${SRC_LABEL[src]} 1 : ${rate}` : `先设置 ${cc} 汇率`}
              <ChevronRight size={18} />
            </button>
          )}

          {noteOpen ? (
            <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注" className="mt-5 text-center outline-none px-4 py-2"
              style={{ border: `1.5px solid ${C.line}`, borderRadius: 16, fontSize: 18, width: "70%" }} />
          ) : (
            <button onClick={() => setNoteOpen(true)} className="mt-5 flex items-center gap-2 px-4 py-2" style={{ border: `1.5px solid ${C.line}`, borderRadius: 16, fontSize: 18, color: C.muted }}>
              <AlignLeft size={18} />添加备注
            </button>
          )}
          {initial?.recurId && <div className="mt-3" style={{ fontSize: 14, color: C.muted }}>这是定期记账生成的记录，修改只影响这一笔</div>}
        </div>

        <div className="noscroll flex gap-2 overflow-x-auto mb-3 -mx-5 px-5">
          {chips.map((c) => <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>{c.emoji} {c.name}</Chip>)}
        </div>
        <div className="flex gap-2 mb-3">
          <label className="relative flex-1 min-w-0 flex items-center gap-2 px-4" style={{ height: 52, border: `1.5px solid ${C.line}`, borderRadius: 16, fontSize: 18, fontWeight: 500 }}>
            <Calendar size={20} color={C.muted} className="shrink-0" /><span className="truncate">{dateLabel}</span>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 w-full opacity-0" aria-label="日期" />
          </label>
          <button onClick={() => setPanel("recur")} className="flex items-center gap-2 px-4 shrink-0"
            style={{ height: 52, borderRadius: 16, fontSize: 17, fontWeight: 500, border: `1.5px solid ${rule || recur ? C.dark : C.line}`, color: rule || recur ? C.ink : C.muted }}>
            <Repeat size={18} />{recurText}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((k) => (
            <button key={k} onClick={() => press(k)} style={{ height: 62, borderRadius: 16, background: C.card, fontSize: 30 }}>{k}</button>
          ))}
          <button onClick={save} aria-label="保存" className="flex items-center justify-center" style={{ height: 62, borderRadius: 16, background: valid ? C.dark : C.faint }}>
            <Check size={30} strokeWidth={3} color="#fff" />
          </button>
        </div>
      </div>

      {panel === "cur" && (
        <Sheet title="这笔用的货币" onClose={() => setPanel(null)}>
          <div className="px-4" style={{ background: C.card, borderRadius: 22 }}>
            {curOrder.map((code, i) => (
              <button key={code} onClick={() => chooseCur(code)} className="w-full flex items-center gap-4 py-3 text-left" style={i ? { borderTop: `1px solid ${C.line}` } : {}}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 52, height: 40, borderRadius: 12, background: C.bg, fontSize: 16, fontWeight: 600 }}>{symOf(code)}</span>
                <span className="flex-1">
                  <span className="block" style={{ fontSize: 18, fontWeight: 600 }}>{code}{code === base && <span style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>　主货币</span>}</span>
                  <span className="block" style={{ fontSize: 15, color: C.muted }}>{curInfo(code)?.name}{data.rates?.[code] ? `，我的汇率 1 : ${data.rates[code]}` : ""}</span>
                </span>
                {cc === code && <Check size={22} strokeWidth={3} color={C.dark} />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {panel === "rate" && fx && (
        <RateSheet base={base} cc={cc} amount={amtNum} saved={data.rates?.[cc]} initialRate={rate} initialSrc={src}
          onSave={saveRate} onClose={() => setPanel(null)} />
      )}
      {panel === "recur" && (rule
        ? <RecurInfo rule={rule} onStop={stopRule} onClose={() => setPanel(null)} />
        : <RecurSheet date={date} value={recur} onSave={(v) => { setRecur(v); setPanel(null); }} onClose={() => setPanel(null)} />)}
    </div>
  );
}

function RecurSheet({ date, value, onSave, onClose }) {
  const [freq, setFreq] = useState(value?.freq || "month");
  const [every, setEvery] = useState(value?.every || 1);
  const [end, setEnd] = useState(value?.end || "");
  const r = { freq, every, start: date, end };
  const t = fmt(todayDate());
  const preview = [0, 1, 2].map((i) => occDate(r, i)).filter((d) => !end || fmt(d) <= end);
  const unit = FREQS.find((f) => f.id === freq).unit;
  const stepBtn = (Icon, onClick, off) => (
    <button onClick={onClick} disabled={off} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.card, opacity: off ? 0.4 : 1 }}><Icon size={20} color={C.sub} /></button>
  );
  return (
    <Sheet title="重复" onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        {FREQS.map((f) => <Chip key={f.id} on={freq === f.id} onClick={() => setFreq(f.id)}>{f.label}</Chip>)}
      </div>
      <Label>间隔</Label>
      <div className="flex items-center gap-4">
        {stepBtn(Minus, () => setEvery(Math.max(1, every - 1)), every <= 1)}
        <span style={{ fontSize: 20, fontWeight: 600, minWidth: 90, textAlign: "center" }}>每 {every} {unit}</span>
        {stepBtn(Plus, () => setEvery(Math.min(99, every + 1)), every >= 99)}
      </div>
      <Label>结束日期（可不填）</Label>
      <div className="flex gap-2 items-center">
        <input type="date" value={end} min={date} onChange={(e) => setEnd(e.target.value)} className="flex-1 px-3" style={{ height: 48, borderRadius: 14, background: C.card, fontSize: 17 }} />
        {end && <button onClick={() => setEnd("")} style={{ fontSize: 16, color: C.muted }}>清除</button>}
      </div>
      <Label>接下来</Label>
      <div style={{ fontSize: 18, lineHeight: 1.6 }}>
        {preview.map((d) => md(d)).join("、")}{preview.length === 3 ? " …" : ""}
      </div>
      {fmt(preview[0] || todayDate()) > t && <div style={{ fontSize: 15, color: C.muted }}>第一笔会在 {md(preview[0])} 自动记入</div>}
      <div className="flex gap-2 mt-6">
        <button onClick={() => onSave(null)} className="px-5" style={{ height: 56, borderRadius: 18, background: C.card, fontSize: 17, fontWeight: 600 }}>不重复</button>
        <button onClick={() => onSave({ freq, every, end })} className="flex-1" style={{ height: 56, borderRadius: 18, background: C.dark, color: "#fff", fontSize: 18, fontWeight: 600 }}>确定</button>
      </div>
      <Note>到期那天会自动记一笔，并在图标上显示 ↻ 标记。可以在「设置 → 定期记账」里查看和停止。</Note>
    </Sheet>
  );
}

function RecurInfo({ rule, onStop, onClose }) {
  const [confirm, setConfirm] = useState(false);
  const nx = occDate(rule, rule.done || 0);
  const ended = rule.end && fmt(nx) > rule.end;
  return (
    <Sheet title="定期记账" onClose={onClose}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{recurLabel(rule)}</div>
      <div className="mt-1" style={{ fontSize: 17, color: C.muted }}>
        已记 {rule.done || 0} 笔，{ended ? "已到结束日期" : `下次 ${md(nx)}`}{rule.end ? `，${md(parse(rule.end))}结束` : ""}
      </div>
      <button onClick={() => (confirm ? onStop() : setConfirm(true))} className="w-full mt-6"
        style={{ height: 54, borderRadius: 16, background: confirm ? C.over : C.card, color: confirm ? "#fff" : C.over, fontSize: 17, fontWeight: 600 }}>
        {confirm ? "再点一次，停止重复" : "停止重复"}
      </button>
      <Note>停止后不会再自动记账，已经记下的记录会保留。</Note>
    </Sheet>
  );
}


/* ---------- 单条记录（账本和搜索共用），支持左滑删除 ---------- */
const SWIPE_W = 92;
function RecordRow({ x, cur, K, incOf, recur, onClick, onDelete, openId, setOpenId }) {
  const inc = x.kind === "income";
  const c = inc ? incOf(x.cat) : K.of(x.cat);
  const isOpen = openId === x.id;
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const box = useRef(null);
  const start = useRef(null);
  const moved = useRef(false);

  useEffect(() => { if (!isOpen && !start.current) setDx(0); }, [isOpen]);

  const down = (e) => { start.current = { x: e.clientX, y: e.clientY, base: isOpen ? -SWIPE_W : 0, dir: null }; moved.current = false; };
  const move = (e) => {
    const st = start.current;
    if (!st) return;
    const mx = e.clientX - st.x, my = e.clientY - st.y;
    if (!st.dir) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      st.dir = Math.abs(mx) > Math.abs(my) ? "h" : "v";   // 竖着滑就交给页面滚动
      if (st.dir === "h") {
        setDrag(true);
        if (openId && openId !== x.id) setOpenId(null);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
    }
    if (st.dir !== "h") return;
    moved.current = true;
    setDx(Math.min(0, st.base + mx));
  };
  const up = () => {
    const st = start.current;
    start.current = null;
    if (!st || st.dir !== "h") return;
    setDrag(false);
    const w = box.current?.offsetWidth || 360;
    if (dx < -w * 0.55) {               // 滑过一半多：直接删
      setDx(-w); setOpenId(null);
      setTimeout(onDelete, 180);
    } else if (dx < -SWIPE_W / 2) {      // 滑开一点：露出删除按钮
      setDx(-SWIPE_W); setOpenId(x.id);
    } else {
      setDx(0); if (isOpen) setOpenId(null);
    }
  };
  const click = () => {
    if (moved.current) { moved.current = false; return; }
    if (openId) { setOpenId(null); setDx(0); return; }  // 有展开的行时，先收起
    onClick();
  };

  return (
    <div ref={box} className="relative overflow-hidden">
      <button onClick={onDelete} tabIndex={dx < 0 ? 0 : -1} aria-label="删除这笔" className="absolute top-1 bottom-1 right-0 flex flex-col items-center justify-center gap-0.5"
        style={{ width: Math.max(SWIPE_W - 8, -dx - 8), borderRadius: 16, background: C.over, color: "#fff", fontSize: 15, fontWeight: 600, opacity: dx < 0 ? 1 : 0 }}>
        <Trash2 size={20} color="#fff" />删除
      </button>
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ transform: `translateX(${dx}px)`, transition: drag ? "none" : "transform .22s ease", background: C.bg, touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" }}>
        <button onClick={click} className="w-full flex items-center gap-4 py-2.5 text-left">
          <Tile c={c} recur={recur} />
          <span className="flex-1 min-w-0">
            <span className="block truncate" style={{ fontSize: 19, fontWeight: 600 }}>{x.note || c.name}</span>
            {x.note && <span className="block" style={{ fontSize: 15, color: C.muted }}>{c.name}</span>}
          </span>
          <span className="text-right">
            <span className="block" style={{ fontSize: 20, fontWeight: 600, color: inc ? C.ok : C.ink }}>
              {inc ? "+" : ""}{x.origCurrency ? `${symOf(x.origCurrency)}${fmtNum(x.origAmount)}` : `${cur}${fmtNum(x.amount)}`}
            </span>
            {x.origCurrency && <span className="block" style={{ fontSize: 14, color: C.muted }}>≈ {cur}{fmtNum(x.amount)}</span>}
          </span>
        </button>
      </div>
    </div>
  );
}

/* ---------- 搜索 + 筛选 ---------- */
const RANGES = [
  { id: "all", label: "全部时间" }, { id: "week", label: "本周" }, { id: "month", label: "本月" },
  { id: "year", label: "今年" }, { id: "custom", label: "自定义" },
];
function SearchPage({ data, cur, K, incOf, open, removeRecord, swipeId, setSwipeId, startWithFilters, onClose }) {
  const t = todayDate();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [range, setRange] = useState("all");
  const [start, setStart] = useState(fmt(new Date(t.getFullYear(), t.getMonth(), 1)));
  const [end, setEnd] = useState(fmt(t));
  const [cats, setCats] = useState([]);
  const [showFilters, setShowFilters] = useState(!!startWithFilters);
  const [limit, setLimit] = useState(100);
  const ruleIds = new Set((data.recurring || []).map((r) => r.id));

  const toggleCat = (id) => setCats((cs) => (cs.includes(id) ? cs.filter((x) => x !== id) : [...cs, id]));
  const activeCount = (type !== "all") + (range !== "all") + (cats.length > 0);
  const clearAll = () => { setType("all"); setRange("all"); setCats([]); };

  const results = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const isNum = /^\d+(\.\d*)?$/.test(kw);
    let s = null, e = null;
    if (range === "custom") { s = start; e = end; }
    else if (range !== "all") { const [a, b] = statRange(range, 0); s = fmt(a); e = fmt(b); }
    const catSet = new Set(cats);
    return [
      ...data.expenses.map((x) => ({ ...x, kind: "expense" })),
      ...(data.income || []).map((x) => ({ ...x, kind: "income" })),
    ].filter((x) => {
      if (type !== "all" && x.kind !== type) return false;
      if (s && (x.date < s || x.date > e)) return false;
      if (catSet.size && !(catSet.has(x.cat) || (x.kind === "expense" && catSet.has(K.topOf(x.cat))))) return false;
      if (!kw) return true;
      const c = x.kind === "income" ? incOf(x.cat) : K.of(x.cat);
      const parent = x.kind === "expense" && K.isSub(x.cat) ? K.of(K.topOf(x.cat)).name : "";
      const text = `${x.note || ""} ${c.name} ${parent} ${x.origCurrency || ""}`.toLowerCase();
      if (text.includes(kw)) return true;
      if (isNum) return String(x.amount).startsWith(kw) || (x.origAmount != null && String(x.origAmount).startsWith(kw));
      return false;
    }).sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created));
  }, [data.expenses, data.income, q, type, range, start, end, cats, K]);

  const spent = sum(results.filter((x) => x.kind === "expense"));
  const earned = sum(results.filter((x) => x.kind === "income"));
  const groups = [];
  results.slice(0, limit).forEach((x) => { const g = groups[groups.length - 1]; g && g.date === x.date ? g.items.push(x) : groups.push({ date: x.date, items: [x] }); });
  const searching = q.trim() || activeCount;

  const catChips = (
    <>
      {type !== "income" && K.tops.map((p) => (
        <div key={p.id} className="flex flex-wrap gap-2 mt-2">
          <Chip on={cats.includes(p.id)} onClick={() => toggleCat(p.id)}>{p.emoji} {p.name}{K.hasKids(p.id) ? "（全部）" : ""}</Chip>
          {K.kids(p.id).map((k) => <Chip soft key={k.id} on={cats.includes(k.id)} onClick={() => toggleCat(k.id)}>{k.emoji} {k.name}</Chip>)}
        </div>
      ))}
      {type !== "expense" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {(data.incomeCats || []).map((c) => <Chip soft key={c.id} on={cats.includes(c.id)} onClick={() => toggleCat(c.id)}>{c.emoji} {c.name}</Chip>)}
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto" style={{ background: C.bg }}>
      <div className="max-w-md mx-auto px-6 pb-16" style={{ paddingTop: "calc(24px + env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onClose} aria-label="返回" className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: C.card }}>
            <ChevronLeft size={24} color={C.sub} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2 px-4" style={{ height: 48, borderRadius: 16, background: C.card }}>
            <Search size={20} color={C.muted} className="shrink-0" />
            <input autoFocus={!startWithFilters} value={q} onChange={(e) => setQ(e.target.value)} placeholder="备注、类目或金额"
              className="flex-1 min-w-0 bg-transparent outline-none" style={{ fontSize: 17 }} />
            {q && <button onClick={() => setQ("")} aria-label="清除"><X size={18} color={C.muted} /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} aria-label="筛选" className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: showFilters || activeCount ? C.dark : C.card }}>
            <SlidersHorizontal size={20} color={showFilters || activeCount ? "#fff" : C.sub} />
            {activeCount > 0 && !showFilters && (
              <span className="absolute flex items-center justify-center" style={{ top: -3, right: -3, width: 20, height: 20, borderRadius: 10, background: C.over, color: "#fff", fontSize: 12, fontWeight: 700 }}>{activeCount}</span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mb-5 px-4 pb-4 pt-1" style={{ background: C.card, borderRadius: 22 }}>
            <Label>类型</Label>
            <div className="flex flex-wrap gap-2">
              {[["all", "全部"], ["expense", "支出"], ["income", "收入"]].map(([k, l]) => (
                <Chip soft key={k} on={type === k} onClick={() => { setType(k); setCats([]); }}>{l}</Chip>
              ))}
            </div>
            <Label>时间</Label>
            <div className="flex flex-wrap gap-2">
              {RANGES.map((r) => <Chip soft key={r.id} on={range === r.id} onClick={() => setRange(r.id)}>{r.label}</Chip>)}
            </div>
            {range === "custom" && (
              <div className="flex items-center gap-2 mt-3" style={{ fontSize: 17 }}>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="flex-1 min-w-0 px-3" style={{ height: 46, borderRadius: 14, background: C.bg }} />
                至
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="flex-1 min-w-0 px-3" style={{ height: 46, borderRadius: 14, background: C.bg }} />
              </div>
            )}
            <Label>类目{cats.length ? `（已选 ${cats.length}）` : ""}</Label>
            {catChips}
            <div className="flex gap-2 mt-5">
              {activeCount > 0 && <button onClick={clearAll} className="px-5" style={{ height: 50, borderRadius: 16, background: C.bg, fontSize: 17, fontWeight: 600 }}>清除</button>}
              <button onClick={() => setShowFilters(false)} className="flex-1" style={{ height: 50, borderRadius: 16, background: C.dark, color: "#fff", fontSize: 17, fontWeight: 600 }}>
                看结果（{results.length} 笔）
              </button>
            </div>
          </div>
        )}

        {searching ? (
          <div className="flex flex-wrap gap-x-4 mb-4" style={{ fontSize: 16, color: C.muted, fontWeight: 500 }}>
            <span>共 {results.length} 笔</span>
            {spent > 0 && <span>支出 <span style={{ color: C.ink, fontWeight: 600 }}>{cur}{fmtNum(spent)}</span></span>}
            {earned > 0 && <span>收入 <span style={{ color: C.ok, fontWeight: 600 }}>{cur}{fmtNum(earned)}</span></span>}
          </div>
        ) : (
          <div className="mb-4" style={{ fontSize: 16, color: C.muted }}>输入关键词，或点右上角按类型、时间、类目筛选</div>
        )}

        {searching && results.length === 0 && <div className="text-center pt-8" style={{ color: C.muted, fontSize: 18 }}>没有找到匹配的记录</div>}
        {searching && groups.map((g) => {
          const d = parse(g.date);
          return (
            <div key={g.date} className="mb-5">
              <div className="pb-2 mb-1" style={{ borderBottom: `1.5px solid ${C.line}`, color: C.muted, fontSize: 16, fontWeight: 600 }}>
                {d.getFullYear() !== t.getFullYear() ? `${d.getFullYear()}年` : ""}{md(d)} 周{WD[d.getDay()]}
              </div>
              {g.items.map((x) => (
                <RecordRow key={x.id} x={x} cur={cur} K={K} incOf={incOf} recur={!!x.recurId && ruleIds.has(x.recurId)} onClick={() => open({ type: "expense", exp: x })}
                onDelete={() => removeRecord(x)} openId={swipeId} setOpenId={setSwipeId} />
              ))}
            </div>
          );
        })}
        {searching && results.length > limit && <button onClick={() => setLimit(limit + 100)} className="w-full py-3" style={{ color: C.muted, fontSize: 16 }}>显示更多</button>}
      </div>
    </div>
  );
}

function RateSheet({ base, cc, amount, saved, initialRate, initialSrc, onSave, onClose }) {
  const [draft, setDraft] = useState(initialRate || (saved ? String(saved) : ""));
  const [src, setSrc] = useState(initialSrc || "mine");
  const [saveMine, setSaveMine] = useState(!saved);
  const [mk, setMk] = useState("idle");
  const n = parseFloat(draft) || 0;
  const finalSrc = saveMine || (saved && n === saved) ? "mine" : src === "market" ? "market" : "custom";

  const getMarket = async () => {
    setMk("loading");
    const v = await fetchMarketRate(base, cc);
    if (v) { setDraft(String(v)); setSrc("market"); setSaveMine(false); setMk("ok"); }
    else setMk("fail");
  };

  return (
    <Sheet title={`${cc} 汇率`} onClose={onClose}>
      <div className="flex items-baseline gap-2 pb-2" style={{ borderBottom: `1.5px solid ${C.line}` }}>
        <span style={{ fontSize: 22, color: C.muted, whiteSpace: "nowrap" }}>1 {base} =</span>
        <input inputMode="decimal" placeholder="0" value={draft} onChange={(e) => { setDraft(cleanNum(e.target.value)); setSrc("custom"); }}
          className="flex-1 min-w-0 outline-none bg-transparent" style={{ fontSize: 40, fontWeight: 600 }} />
        <span style={{ fontSize: 22, color: C.muted }}>{cc}</span>
      </div>
      <div className="mt-2" style={{ fontSize: 16, color: C.sub, minHeight: 24 }}>
        {n > 0 && amount > 0 ? `${symOf(cc)}${fmtNum(amount)} ≈ ${symOf(base)}${fmtNum(amount / n)}` : ""}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {saved && <Chip soft on={n === saved && src !== "market"} onClick={() => { setDraft(String(saved)); setSrc("mine"); }}>我的汇率 {saved}</Chip>}
        <Chip soft on={src === "market" && mk === "ok"} onClick={getMarket}>{mk === "loading" ? "获取中…" : "市场汇率"}</Chip>
      </div>
      {mk === "fail" && <div className="mt-2" style={{ fontSize: 15, color: C.warn }}>暂时获取不到市场汇率，可以手动输入</div>}

      <label className="flex items-center gap-3 mt-6" style={{ fontSize: 17 }}>
        <input type="checkbox" checked={saveMine} onChange={(e) => setSaveMine(e.target.checked)} style={{ width: 22, height: 22, accentColor: C.dark }} />
        设为我的 {cc} 汇率，以后自动使用
      </label>

      <button onClick={() => n > 0 && onSave(n, finalSrc, saveMine)} className="w-full mt-6"
        style={{ height: 56, borderRadius: 18, background: n > 0 ? C.dark : C.faint, color: "#fff", fontSize: 18, fontWeight: 600 }}>确定</button>
      <Note>汇率在保存这笔开销时锁定，之后汇率变动不会影响这笔记录。</Note>
    </Sheet>
  );
}

/* ---------- 统计 ---------- */
function Insights({ data, cur, K }) {
  const [mode, setMode] = useState("month");
  const [offset, setOffset] = useState(0);
  const [openTop, setOpenTop] = useState(null);
  const [s, e] = statRange(mode, offset);
  const t = todayDate();
  const list = data.expenses.filter((x) => inRange(x, s, e));
  const total = sum(list);
  const incTotal = sum((data.income || []).filter((x) => inRange(x, s, e)));

  const bars = mode === "year"
    ? Array.from({ length: 12 }, (_, m) => ({ x: `${m + 1}`, v: round(sum(list.filter((x) => parse(x.date).getMonth() === m))) }))
    : Array.from({ length: daysBetween(s, e) }, (_, i) => {
      const d = addDays(s, i);
      return { x: mode === "week" ? WD[d.getDay()] : String(d.getDate()), v: round(sum(list.filter((x) => x.date === fmt(d)))) };
    });
  const units = mode === "year" ? (t < s ? 0 : t > e ? 12 : t.getMonth() + 1) : t < s ? 0 : t > e ? daysBetween(s, e) : daysBetween(s, t);
  const avg = units ? total / units : 0;

  const byTop = [...new Set(list.map((x) => K.topOf(x.cat)))]
    .map((id) => ({ id, value: sum(list.filter((x) => K.topOf(x.cat) === id)) }))
    .sort((a, b) => b.value - a.value);
  const subsOf = (topId) => [...new Set(list.filter((x) => K.topOf(x.cat) === topId).map((x) => x.cat))]
    .map((id) => ({ id, value: sum(list.filter((x) => x.cat === id)) }))
    .sort((a, b) => b.value - a.value);
  const title = mode === "week" ? `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}` : mode === "month" ? `${s.getFullYear()}年${s.getMonth() + 1}月` : `${s.getFullYear()}年`;
  const budgetFor = (cid) => {
    const b = data.budgets.find((x) => x.period === mode && x.cat === cid && budgetLiveIn(x, s));
    return b ? { ...b, amount: budgetAmount(b, s) } : null;
  };

  const BudgetLine = ({ value, b, color }) => (
    <div className="mt-2">
      <div style={{ height: 8, borderRadius: 4, background: C.card }}>
        <div style={{ height: "100%", borderRadius: 4, width: `${clamp(value / b.amount) * 100}%`, background: value > b.amount ? C.over : color }} />
      </div>
      <div className="mt-1" style={{ fontSize: 14, color: value > b.amount ? C.over : C.muted }}>
        预算 {cur}{fmtNum(b.amount)}，{value > b.amount ? `超出 ${cur}${fmtNum(value - b.amount)}` : `剩 ${cur}${fmtNum(b.amount - value)}`}
      </div>
    </div>
  );

  return (
    <>
      <Title right={
        <button onClick={() => { setMode(NEXT[mode]); setOffset(0); }} className="flex items-center gap-1 px-4 py-2" style={{ background: C.card, borderRadius: 14, fontSize: 18, fontWeight: 500 }}>
          {VIEW_SHORT[mode]}<ChevronsUpDown size={16} color={C.sub} />
        </button>
      }>统计</Title>

      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="flex items-center gap-1 mb-1" style={{ color: C.muted, fontSize: 15, fontWeight: 600 }}>
            <button onClick={() => setOffset(offset - 1)} aria-label="上一期" className="-ml-1"><ChevronLeft size={20} /></button>
            {title}
            <button onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="下一期" style={{ opacity: offset >= 0 ? 0.3 : 1 }}><ChevronRight size={20} /></button>
          </div>
          <Money v={total} cur={cur} size={36} />
        </div>
        <div className="text-right">
          <div className="mb-1" style={{ color: C.muted, fontSize: 15, fontWeight: 600 }}>{mode === "year" ? "月均" : "日均"}</div>
          <Money v={avg} cur={cur} size={36} />
        </div>
      </div>
      {incTotal > 0 && (
        <div className="grid grid-cols-2 gap-3 -mt-2 mb-6">
          <div className="px-4 py-3" style={{ background: C.card, borderRadius: 18 }}>
            <div style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>收入</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.ok }}>{cur}{fmtNum(incTotal)}</div>
          </div>
          <div className="px-4 py-3" style={{ background: C.card, borderRadius: 18 }}>
            <div style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>结余</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: incTotal - total < 0 ? C.over : C.ink }}>{incTotal - total < 0 ? "-" : ""}{cur}{fmtNum(incTotal - total)}</div>
          </div>
        </div>
      )}

      <div style={{ height: 210 }} className="mb-8 -ml-2">
        <ResponsiveContainer>
          <BarChart data={bars} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="x" axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: C.muted }} interval={mode === "month" ? 6 : 0} />
            <YAxis axisLine={false} tickLine={false} width={40} tick={{ fontSize: 12, fill: C.muted }} tickFormatter={(v) => (v >= 1000 ? `${round(v / 1000)}k` : v)} />
            {avg > 0 && <ReferenceLine y={avg} stroke={C.muted} strokeDasharray="6 6" strokeWidth={2} />}
            <Bar dataKey="v" fill={C.dark} radius={[6, 6, 6, 6]} background={{ fill: C.card, radius: 6 }} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {byTop.length === 0 ? <div className="text-center" style={{ color: C.muted, fontSize: 18 }}>这段时间没有开销</div> : (
        <>
          <div className="flex gap-1 mb-3" style={{ height: 40 }}>
            {byTop.map((c) => <div key={c.id} style={{ flex: c.value, minWidth: 8, borderRadius: 12, background: K.of(c.id).color }} />)}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8">
            {byTop.map((c) => (
              <span key={c.id} className="flex items-center gap-2" style={{ fontSize: 17, fontWeight: 600 }}>
                <span style={{ width: 11, height: 11, borderRadius: 4, background: K.of(c.id).color }} />
                {K.of(c.id).name}<span style={{ color: C.muted, fontWeight: 500 }}>{Math.round((c.value / total) * 100)}%</span>
              </span>
            ))}
          </div>
          {byTop.map((c) => {
            const cat = K.of(c.id), b = budgetFor(c.id);
            const subs = subsOf(c.id).filter((x) => x.id !== c.id || K.hasKids(c.id));
            const expandable = K.hasKids(c.id);
            const opened = openTop === c.id;
            return (
              <div key={c.id} className="py-3" style={{ borderTop: `1.5px solid ${C.line}` }}>
                <button className="w-full flex items-center gap-3 text-left" onClick={() => expandable && setOpenTop(opened ? null : c.id)}>
                  <Tile c={cat} size={44} />
                  <span className="flex-1" style={{ fontSize: 18, fontWeight: 600 }}>{cat.name}</span>
                  <span style={{ fontSize: 19, fontWeight: 600 }}>{cur}{fmtNum(c.value)}</span>
                  {expandable && <ChevronDown size={20} color={C.faint} style={{ transform: opened ? "rotate(180deg)" : "none", transition: "transform .2s" }} />}
                </button>
                {b && <div style={{ paddingLeft: 56 }}><BudgetLine value={c.value} b={b} color={cat.color} /></div>}
                {opened && (
                  <div className="mt-3 ml-14 px-4 py-1" style={{ background: C.card, borderRadius: 18 }}>
                    {subs.map((sc, i) => {
                      const sub = K.of(sc.id), sb = budgetFor(sc.id);
                      return (
                        <div key={sc.id} className="py-2.5" style={i ? { borderTop: `1px solid ${C.line}` } : {}}>
                          <div className="flex items-center gap-2" style={{ fontSize: 17 }}>
                            <span>{sub.emoji}</span>
                            <span className="flex-1">{sc.id === c.id ? "未分子类" : sub.name}</span>
                            <span style={{ color: C.muted, fontSize: 15 }}>{Math.round((sc.value / c.value) * 100)}%</span>
                            <span className="text-right" style={{ fontWeight: 600, minWidth: 72 }}>{cur}{fmtNum(sc.value)}</span>
                          </div>
                          {sb && <BudgetLine value={sc.value} b={sb} color={cat.color} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

/* ---------- 预算 ---------- */
function Budgets({ data, cur, K, open }) {
  const ov = overallBudget(data, K);
  // 大类在前，子类紧跟在它的大类后面
  const order = (b) => {
    if (b.cat === "all") return -1;
    const top = K.topOf(b.cat), i = K.tops.findIndex((c) => c.id === top);
    return i * 100 + (K.isSub(b.cat) ? 1 + K.kids(top).findIndex((c) => c.id === b.cat) : 0);
  };
  const live = data.budgets.filter(isLiveNow);
  const cards = live.filter((b) => !ov || b.id !== ov.id).sort((a, b) => order(a) - order(b));
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>预算</h1>
        <button onClick={() => open({ type: "budget" })} aria-label="新增预算" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: C.card }}><Plus size={22} color={C.sub} /></button>
      </div>
      {live.length === 0 ? (
        <button onClick={() => open({ type: "budget" })} className="w-full text-center py-16" style={{ background: C.card, borderRadius: 24, color: C.muted, fontSize: 18, lineHeight: 1.7 }}>
          还没有预算<br /><span style={{ color: C.ink, fontWeight: 600 }}>点这里设第一个</span>
        </button>
      ) : (
        <>
          {ov && <Gauge ov={ov} cur={cur} onClick={() => ov.id && open({ type: "budgetDetail", id: ov.id })} />}
          <div className="grid grid-cols-2 gap-3">
            {cards.map((b) => <BudgetCard key={b.id} b={b} data={data} cur={cur} K={K} onClick={() => open({ type: "budgetDetail", id: b.id })} />)}
          </div>
        </>
      )}
    </>
  );
}

function Gauge({ ov, cur, onClick }) {
  const { st, amount, noun } = ov;
  const cx = 160, cy = 170, r = 128, L = Math.PI * r;
  const f = clamp(st.remaining / amount);
  const a = Math.PI * st.elapsed;
  const mx = cx + (r + 26) * Math.cos(a), my = cy - (r + 26) * Math.sin(a);
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const over = st.remaining < 0;
  return (
    <button onClick={onClick} className="w-full block mb-8">
      <div className="text-center" style={{ fontSize: 14, fontWeight: 600, letterSpacing: 2, color: C.muted }}>{noun}总预算 已用 {Math.round(st.pct * 100)}%</div>
      <div className="relative">
        <svg viewBox="0 0 320 192" width="100%">
          <path d={arc} fill="none" stroke={C.card} strokeWidth="30" strokeLinecap="round" />
          {f > 0 && <path d={arc} fill="none" stroke={C.dark} strokeWidth="30" strokeLinecap="round" strokeDasharray={`${f * L} ${L}`} style={{ transition: "stroke-dasharray .5s" }} />}
          <circle cx={mx} cy={my} r="7" fill={C.muted} />
        </svg>
        <div className="absolute left-0 right-0 text-center" style={{ top: "48%" }}>
          <Money v={over ? -st.remaining : st.remaining} cur={cur} size={46} color={over ? C.over : C.ink} />
          <div style={{ fontSize: 18, color: C.muted }}>{over ? `${noun}已超支` : `${noun}还剩`}</div>
        </div>
      </div>
      <div className="flex justify-between px-6" style={{ fontSize: 15, color: C.muted, fontWeight: 500 }}>
        <span>已用 {fmtNum(st.spent)}</span><span>预算 {fmtNum(amount)}</span>
      </div>
    </button>
  );
}

function BudgetCard({ b, data, cur, K, onClick }) {
  const st = budgetStatus(b, data.expenses, K);
  const c = b.cat === "all" ? { name: "全部开销", emoji: "💰", color: C.dark } : K.of(b.cat);
  const parentName = K.isSub(b.cat) ? K.of(K.topOf(b.cat)).name : null;
  const f = clamp(st.remaining / st.amount);
  const over = st.remaining < 0;
  const left = b.period === "day" ? "今天" : st.daysLeft > 0 ? `剩 ${st.daysLeft} 天` : "已结束";
  const sub = b.name ? c.name : parentName;
  return (
    <button onClick={onClick} className="text-left p-4 flex flex-col" style={{ background: C.card, borderRadius: 24, minHeight: 210 }}>
      <div className="truncate w-full" style={{ fontSize: 18, fontWeight: 600 }}>{c.emoji} {b.name || c.name}</div>
      <div className="truncate w-full" style={{ fontSize: 15, color: C.muted, fontWeight: 500 }}>{sub ? `${sub} · ` : ""}{PERIODS.find((p) => p.id === b.period).label}，{left}</div>
      <div className="mt-auto pt-5 flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 700, color: st.tone, letterSpacing: 1 }}>
        已用 {Math.round(st.pct * 100)}%
        {st.overridden && <span style={{ color: C.sub, background: "#E5E5EA", borderRadius: 6, padding: "1px 6px", letterSpacing: 0 }}>临时</span>}
      </div>
      <Money v={over ? -st.remaining : st.remaining} cur={cur} size={28} color={over ? C.over : C.ink} />
      <div style={{ fontSize: 15, color: C.muted }}>{over ? "已超支" : `${nounOf(b.period)}剩余`}</div>
      <div className="relative mt-4 w-full" style={{ height: 14, borderRadius: 7, background: "#E5E5EA" }}>
        <div style={{ height: "100%", width: `${f * 100}%`, borderRadius: 7, background: c.color, transition: "width .4s" }} />
        <div className="absolute" style={{ left: `calc(${(1 - st.elapsed) * 100}% - 6px)`, top: -9, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `8px solid ${C.dark}` }} />
      </div>
    </button>
  );
}

/* 新建 / 编辑预算 */
function BudgetSheet({ data, cur, K, upd, onClose, initial }) {
  const t = todayDate();
  const st0 = initial ? budgetStatus(initial, data.expenses, K) : null;
  const [cat, setCat] = useState(initial?.cat || "all");
  const [period, setPeriod] = useState(initial?.period || "month");
  const [amount, setAmount] = useState(st0 ? String(st0.amount) : "");
  const [start, setStart] = useState(initial?.start || fmt(t));
  const [end, setEnd] = useState(initial?.end || fmt(addDays(t, 13)));
  const [name, setName] = useState(initial?.name || "");
  const [note, setNote] = useState(st0 ? st0.note : "");
  const [ask, setAsk] = useState(null); // "scope" | "restructure"
  const valid = parseFloat(amount) > 0 && (period !== "custom" || start <= end);

  const amt = round(parseFloat(amount) || 0), nm = name.trim(), nt = note.trim();
  const curKey = initial ? fmt(budgetRange(initial)[0]) : null;
  const noun = initial ? nounOf(initial.period) : "";

  const replace = (nb) => upd((d) => ({ budgets: d.budgets.map((x) => (x.id === initial.id ? nb : x)) }));
  const freshBudget = (extra = {}) => {
    const b = { id: uid(), cat, period, name: nm, note: nt, amount: amt, ...(period === "custom" ? { start, end } : {}) };
    if (period !== "custom") b.history = [{ from: fmt(budgetRange(b)[0]), amount: amt }];
    return { ...b, ...extra };
  };

  const save = () => {
    if (!valid) return;
    if (!initial) { upd((d) => ({ budgets: [...d.budgets, freshBudget()] })); return onClose(); }
    if (initial.period === "custom" && period === "custom") {
      replace({ ...initial, cat, name: nm, note: nt, amount: amt, start, end }); return onClose();
    }
    if (cat !== initial.cat || period !== initial.period) {
      if (!hasPastPeriods(initial)) { replace(freshBudget({ id: initial.id })); return onClose(); }
      return setAsk("restructure");
    }
    const amountChanged = amt !== st0.amount, noteChanged = nt !== st0.note;
    if (!amountChanged && !noteChanged) { replace({ ...initial, name: nm }); return onClose(); }
    setAsk("scope");
  };

  const applyScope = (scope) => {
    const ov = { ...(initial.overrides || {}) };
    let nb;
    if (scope === "once") {
      // 只改本期：金额和备注都和平时一样时，就等于没有临时调整
      if (amt === baseAmount(initial, curKey) && nt === (initial.note || "")) delete ov[curKey];
      else ov[curKey] = { amount: amt, note: nt };
      nb = { ...initial, name: nm, overrides: ov };
    } else {
      delete ov[curKey];
      const hist = initial.history?.length ? initial.history : [{ from: "0000-01-01", amount: initial.amount }];
      nb = { ...initial, name: nm, note: nt, amount: amt, overrides: ov, history: [...hist.filter((h) => h.from < curKey), { from: curKey, amount: amt }] };
    }
    replace(nb); onClose();
  };
  const restructure = () => {
    upd((d) => ({ budgets: [...d.budgets.map((x) => (x.id === initial.id ? { ...x, stoppedFrom: curKey } : x)), freshBudget()] }));
    onClose();
  };

  return (
    <>
      <Sheet title={initial ? "编辑预算" : "新预算"} onClose={onClose}>
        <Label>用在哪</Label>
        <Chip on={cat === "all"} onClick={() => setCat("all")}>💰 全部开销</Chip>
        {K.tops.map((p) => (
          <div key={p.id} className="flex flex-wrap gap-2 mt-2">
            <Chip on={cat === p.id} onClick={() => setCat(p.id)}>{p.emoji} {p.name}{K.hasKids(p.id) ? "（全部）" : ""}</Chip>
            {K.kids(p.id).map((k) => <Chip soft key={k.id} on={cat === k.id} onClick={() => setCat(k.id)}>{k.emoji} {k.name}</Chip>)}
          </div>
        ))}
        <Label>多久一次</Label>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => <Chip key={p.id} on={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</Chip>)}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2 mt-3" style={{ fontSize: 17 }}>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="flex-1 min-w-0 px-3" style={{ height: 48, borderRadius: 14, background: C.card }} />
            至
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="flex-1 min-w-0 px-3" style={{ height: 48, borderRadius: 14, background: C.card }} />
          </div>
        )}
        <Label>{initial && initial.period !== "custom" ? `${noun}金额` : "金额"}</Label>
        <div className="flex items-baseline gap-1 pb-2" style={{ borderBottom: `1.5px solid ${C.line}` }}>
          <span style={{ fontSize: 28, color: C.muted }}>{cur}</span>
          <input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(cleanNum(e.target.value))}
            className="flex-1 min-w-0 outline-none bg-transparent" style={{ fontSize: 44, fontWeight: 600 }} />
        </div>
        <Label>名称（可不填）</Label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={period === "custom" ? "比如：日本旅行" : "不填就显示类目名"}
          className="w-full px-4 outline-none" style={{ height: 50, borderRadius: 16, background: C.card, fontSize: 17 }} />
        <Label>备注（可不填）</Label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="比如：这个月有朋友婚礼，放宽一点"
          className="w-full px-4 py-3 outline-none resize-none" style={{ borderRadius: 16, background: C.card, fontSize: 17, fontFamily: "inherit" }} />
        <button onClick={save} className="w-full mt-6" style={{ height: 56, borderRadius: 18, background: valid ? C.dark : C.faint, color: "#fff", fontSize: 18, fontWeight: 600 }}>保存</button>
        {!initial && <Note>大类预算包含它下面所有子类的花费；子类预算是大类里的小限额，不用加起来等于大类。</Note>}
      </Sheet>

      {ask === "scope" && (
        <Sheet title="这次修改用在哪些周期？" onClose={() => setAsk(null)}>
          <button onClick={() => applyScope("once")} className="w-full text-left px-5 py-4 mb-3" style={{ background: C.card, borderRadius: 20 }}>
            <div style={{ fontSize: 19, fontWeight: 600 }}>只改{noun}</div>
            <div style={{ fontSize: 15, color: C.muted }}>临时调整，下个周期自动恢复 {cur}{fmtNum(baseAmount(initial, curKey) ?? initial.amount)}</div>
          </button>
          <button onClick={() => applyScope("forward")} className="w-full text-left px-5 py-4" style={{ background: C.card, borderRadius: 20 }}>
            <div style={{ fontSize: 19, fontWeight: 600 }}>{noun}及以后</div>
            <div style={{ fontSize: 15, color: C.muted }}>长期调整，之前的周期保持原来的金额</div>
          </button>
        </Sheet>
      )}
      {ask === "restructure" && (
        <Sheet title="换类目或周期" onClose={() => setAsk(null)}>
          <div style={{ fontSize: 17, lineHeight: 1.7, color: C.sub }}>
            换了类目或周期，相当于一个新预算。旧预算会在{noun}停止，它之前的记录保留在统计里；新预算从现在开始生效。
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => setAsk(null)} className="px-5" style={{ height: 56, borderRadius: 18, background: C.card, fontSize: 17, fontWeight: 600 }}>取消</button>
            <button onClick={restructure} className="flex-1" style={{ height: 56, borderRadius: 18, background: C.dark, color: "#fff", fontSize: 18, fontWeight: 600 }}>开始新预算</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function BudgetDetail({ data, cur, K, upd, id, onClose }) {
  const [confirm, setConfirm] = useState(null); // "stop" | "delete"
  const [editing, setEditing] = useState(false);
  const b = data.budgets.find((x) => x.id === id);
  // 换了类目或周期后旧预算已停止：回到预算页，新预算在列表里
  useEffect(() => { if (b && !editing && !isLiveNow(b)) onClose(); }, [b, editing]);
  const series = useMemo(() => {
    if (!b || b.period === "day") return [];
    const st = budgetStatus(b, data.expenses, K), t = todayDate();
    const rel = data.expenses.filter((x) => matchCat(b, x, K) && inRange(x, st.s, st.e));
    let cum = 0;
    if (b.period === "year") {
      return Array.from({ length: 12 }, (_, m) => {
        cum += sum(rel.filter((x) => parse(x.date).getMonth() === m));
        return { x: `${m + 1}月`, 实际: new Date(st.s.getFullYear(), m, 1) <= t ? round(cum) : null, 计划: round((st.amount * (m + 1)) / 12) };
      });
    }
    const n = daysBetween(st.s, st.e);
    return Array.from({ length: n }, (_, i) => {
      const d = addDays(st.s, i);
      cum += sum(rel.filter((x) => x.date === fmt(d)));
      return { x: `${d.getMonth() + 1}/${d.getDate()}`, 实际: d <= t ? round(cum) : null, 计划: round((st.amount * (i + 1)) / n) };
    });
  }, [b, data.expenses, K]);
  if (!b) return null;
  const closeEdit = () => setEditing(false);
  if (editing) return <BudgetSheet data={data} cur={cur} K={K} upd={upd} initial={b} onClose={closeEdit} />;

  const st = budgetStatus(b, data.expenses, K);
  const c = b.cat === "all" ? { name: "全部开销", emoji: "💰" } : K.of(b.cat);
  const over = st.remaining < 0;
  const past = hasPastPeriods(b);
  const noun = nounOf(b.period);
  const stat = (k, v) => (
    <div><div style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>{k}</div><div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div></div>
  );
  // 调整记录：长期金额变化 + 临时调整
  const log = [
    ...(b.history || []).map((h) => ({ key: h.from, text: h.from === "0000-01-01" ? `最初 ${cur}${fmtNum(h.amount)}` : `${periodLabel(b.period, h.from)}起 ${cur}${fmtNum(h.amount)}` })),
    ...Object.entries(b.overrides || {}).map(([k, v]) => ({ key: k, text: `${periodLabel(b.period, k)} 临时 ${cur}${fmtNum(v.amount)}${v.note ? `：${v.note}` : ""}` })),
  ].sort((a, c2) => c2.key.localeCompare(a.key));
  const showLog = (b.history || []).length > 1 || Object.keys(b.overrides || {}).length > 0;

  const stop = () => { upd((d) => ({ budgets: d.budgets.map((x) => (x.id === b.id ? { ...x, stoppedFrom: fmt(st.s) } : x)) })); onClose(); };
  const remove = () => { upd((d) => ({ budgets: d.budgets.filter((x) => x.id !== b.id) })); onClose(); };

  return (
    <Sheet title={`${c.emoji} ${b.name || c.name}`} onClose={onClose}>
      <div style={{ fontSize: 16, color: C.muted, fontWeight: 500 }} className="-mt-3 mb-4">
        {b.name ? `${c.name} · ` : ""}{K.hasKids(b.cat) ? "含所有子类，" : ""}{PERIODS.find((p) => p.id === b.period).label}，{b.period === "day" ? "今天" : `${md(st.s)} – ${md(st.e)}`}
      </div>
      <Money v={over ? -st.remaining : st.remaining} cur={cur} size={48} color={over ? C.over : C.ink} />
      <div style={{ fontSize: 17, color: C.muted }} className="mb-5">{over ? "已超支" : `${noun}还剩`}</div>
      <div className="flex justify-between mb-5">
        {stat("已用", `${cur}${fmtNum(st.spent)}`)}
        {stat(st.overridden ? `${noun}预算（临时）` : "预算", `${cur}${fmtNum(st.amount)}`)}
        {stat("日均可用", st.daysLeft > 1 ? `${cur}${fmtNum(st.perDay)}` : "–")}
      </div>
      {(st.note || st.overridden) && (
        <div className="px-4 py-3 mb-5" style={{ background: C.card, borderRadius: 18, fontSize: 16, lineHeight: 1.6 }}>
          {st.overridden && <div style={{ color: C.sub, fontWeight: 600 }}>{noun}临时调整，平时是 {cur}{fmtNum(st.normal)}</div>}
          {st.note && <div>{st.note}</div>}
        </div>
      )}
      {series.length > 0 && (
        <>
          <div style={{ fontSize: 14, color: C.muted, fontWeight: 600 }} className="mb-1">累计花费 vs 均匀花完的计划线</div>
          <div style={{ height: 170 }} className="-ml-2 mb-4">
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="x" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: C.muted }} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} width={40} tick={{ fontSize: 12, fill: C.muted }} />
                <Line dataKey="计划" stroke={C.faint} strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Line dataKey="实际" stroke={over ? C.over : C.dark} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
      {showLog && (
        <div className="mb-5">
          <div className="mb-2" style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>调整记录</div>
          {log.map((l, i) => <div key={i} className="py-1.5" style={{ fontSize: 16, color: C.sub }}>{l.text}</div>)}
        </div>
      )}

      <button onClick={() => setEditing(true)} className="w-full mb-3" style={{ height: 54, borderRadius: 16, background: C.dark, color: "#fff", fontSize: 17, fontWeight: 600 }}>编辑</button>
      {past ? (
        <div className="flex gap-2">
          <button onClick={() => (confirm === "stop" ? stop() : setConfirm("stop"))} className="flex-1"
            style={{ height: 50, borderRadius: 16, background: confirm === "stop" ? C.over : C.card, color: confirm === "stop" ? "#fff" : C.ink, fontSize: 16, fontWeight: 600 }}>
            {confirm === "stop" ? `确认从${noun}停止` : "停止这个预算"}
          </button>
          <button onClick={() => (confirm === "delete" ? remove() : setConfirm("delete"))} className="flex-1"
            style={{ height: 50, borderRadius: 16, background: confirm === "delete" ? C.over : C.card, color: confirm === "delete" ? "#fff" : C.over, fontSize: 16, fontWeight: 600 }}>
            {confirm === "delete" ? "确认，连历史一起删" : "彻底删除"}
          </button>
        </div>
      ) : (
        <button onClick={() => (confirm === "delete" ? remove() : setConfirm("delete"))} className="w-full"
          style={{ height: 50, borderRadius: 16, background: confirm === "delete" ? C.over : C.card, color: confirm === "delete" ? "#fff" : C.over, fontSize: 16, fontWeight: 600 }}>
          {confirm === "delete" ? "再点一次确认删除" : "删除这个预算"}
        </button>
      )}
      {past && <Note>停止：以后不再有这个预算，之前各期的预算对比还留在统计里。彻底删除：连之前的记录一起删掉。</Note>}
    </Sheet>
  );
}

/* ---------- 设置 ---------- */
function CatRow({ c, K, level, pending, onDelete, onMove }) {
  const withKids = K.hasKids(c.id);
  const targets = K.tops.filter((p) => p.id !== c.id);
  return (
    <div className="flex items-center gap-3 py-3" style={{ paddingLeft: level ? 28 : 0, borderTop: `1px solid ${C.line}` }}>
      <Tile c={c} size={level ? 34 : 40} />
      <span className="flex-1 min-w-0">
        <span className="block truncate" style={{ fontSize: level ? 17 : 18, fontWeight: level ? 400 : 600 }}>{c.name}</span>
        {!withKids && (
          <select value={c.parent && K.byId[c.parent] ? c.parent : ""} onChange={(e) => onMove(e.target.value)} aria-label="所属大类"
            className="bg-transparent outline-none -ml-1" style={{ fontSize: 14, color: C.muted }}>
            <option value="">作为大类</option>
            {targets.map((p) => <option key={p.id} value={p.id}>属于 {p.name}</option>)}
          </select>
        )}
      </span>
      <button onClick={onDelete} style={{ fontSize: 15, color: pending ? C.over : C.muted, fontWeight: 500 }}>
        {pending ? (withKids ? "确认（子类一起删）" : "确认删除") : "删除"}
      </button>
    </div>
  );
}

function SettingsView({ data, cur, base, K, incOf, upd, sync }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏷️");
  const [color, setColor] = useState(PALETTE[0]);
  const [parent, setParent] = useState("");
  const [pending, setPending] = useState(null);
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(null); // "currency" | "rates" | "recurring"
  const [incName, setIncName] = useState("");
  const [incEmoji, setIncEmoji] = useState("💰");
  const rateKeys = Object.keys(data.rates || {});

  const addCat = () => {
    if (!name.trim()) return;
    const col = parent ? K.of(parent).color : color;
    upd((d) => ({ categories: [...d.categories, { id: uid(), name: name.trim(), emoji: emoji || "🏷️", color: col, parent }] }));
    setName(""); setEmoji("🏷️");
  };
  const delCat = (c) => {
    if (pending !== c.id) return setPending(c.id);
    const ids = new Set([c.id, ...K.kids(c.id).map((k) => k.id)]);
    upd((d) => ({ categories: d.categories.filter((x) => !ids.has(x.id)), budgets: d.budgets.filter((b) => !ids.has(b.cat)) }));
    setPending(null);
  };
  const moveCat = (c, p) => upd((d) => ({
    categories: d.categories.map((x) => (x.id === c.id ? { ...x, parent: p, color: p ? K.of(p).color : x.color } : x)),
  }));
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `expenses-${fmt(todayDate())}.json`; a.click();
  };
  const [backupBox, setBackupBox] = useState(null); // null | "show" | "paste"
  const [pasted, setPasted] = useState("");
  const copyBackup = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(data)); setMsg("备份内容已复制，可以粘贴到备忘录或发给自己保存"); }
    catch { setBackupBox("show"); setMsg(""); }
  };
  const importData = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    importText(await f.text());
  };
  const importText = (text) => {
    try {
      const j = JSON.parse(text);
      const fresh = (arr, cur) => { const ids = new Set(cur.map((x) => x.id)); return (arr || []).filter((x) => x && x.id && !ids.has(x.id)); };
      const n = fresh(j.expenses, data.expenses).filter((x) => x.amount > 0 && x.date).length;
      upd((d) => ({
        categories: [...d.categories, ...fresh(j.categories, d.categories)],
        incomeCats: [...(d.incomeCats || []), ...fresh(j.incomeCats, d.incomeCats || [])],
        expenses: [...d.expenses, ...fresh(j.expenses, d.expenses).filter((x) => x.amount > 0 && x.date)],
        income: [...(d.income || []), ...fresh(j.income, d.income || []).filter((x) => x.amount > 0 && x.date)],
        recurring: [...(d.recurring || []), ...fresh(j.recurring, d.recurring || [])],
        budgets: [...d.budgets, ...fresh(j.budgets, d.budgets)],
        rates: { ...(j.rates || {}), ...(d.rates || {}) },
      }));
      setMsg(`导入完成，新增 ${n} 笔记录，已有的不会重复`);
      setBackupBox(null); setPasted("");
    } catch { setMsg("读不出来，请确认是本工具导出的备份内容"); }
  };

  const navRow = (label, value, onClick, first) => (
    <button onClick={onClick} className="w-full flex items-center py-4" style={{ fontSize: 18, borderTop: first ? "none" : `1px solid ${C.line}` }}>
      <span className="flex-1 text-left">{label}</span>
      <span style={{ color: C.muted }}>{value}</span>
      <ChevronRight size={20} color={C.faint} className="ml-1" />
    </button>
  );

  return (
    <>
      <Title>设置</Title>
      <SyncSection sync={sync} />
      <Section title="通用">
        {navRow("主货币", `${base} ${symOf(base)}`, () => setPage("currency"), true)}
        {navRow("我的汇率", rateKeys.length ? rateKeys.map((k) => `${k} ${data.rates[k]}`).join("，") : "未设置", () => setPage("rates"))}
        {navRow("定期记账", `${(data.recurring || []).length} 条`, () => setPage("recurring"))}
      </Section>

      <Section title="类目">
        <div className="-mt-px">
          {K.tops.map((p) => (
            <div key={p.id}>
              <CatRow c={p} K={K} level={0} pending={pending === p.id} onDelete={() => delCat(p)} onMove={(v) => moveCat(p, v)} />
              {K.kids(p.id).map((k) => <CatRow key={k.id} c={k} K={K} level={1} pending={pending === k.id} onDelete={() => delCat(k)} onMove={(v) => moveCat(k, v)} />)}
            </div>
          ))}
        </div>
        <div className="py-3" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="flex gap-2 mb-3">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} aria-label="图标" className="text-center outline-none" style={{ width: 52, height: 46, borderRadius: 14, background: C.bg, fontSize: 22 }} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="新类目" className="flex-1 min-w-0 px-3 outline-none" style={{ height: 46, borderRadius: 14, background: C.bg, fontSize: 17 }} />
            <button onClick={addCat} className="px-4" style={{ height: 46, borderRadius: 14, background: name.trim() ? C.dark : C.faint, color: "#fff", fontSize: 17, fontWeight: 600 }}>添加</button>
          </div>
          <select value={parent} onChange={(e) => setParent(e.target.value)} className="w-full px-3 mb-3 outline-none" style={{ height: 46, borderRadius: 14, background: C.bg, fontSize: 17 }}>
            <option value="">作为大类</option>
            {K.tops.map((p) => <option key={p.id} value={p.id}>作为「{p.name}」的子类</option>)}
          </select>
          {!parent && (
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map((p) => <button key={p} onClick={() => setColor(p)} aria-label={`颜色 ${p}`} style={{ width: 28, height: 28, borderRadius: 10, background: p, outline: color === p ? `2.5px solid ${C.dark}` : "none", outlineOffset: 2 }} />)}
            </div>
          )}
        </div>
      </Section>

      <Section title="收入类目">
        {(data.incomeCats || []).map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 py-3" style={i ? { borderTop: `1px solid ${C.line}` } : {}}>
            <Tile c={c} size={40} />
            <span className="flex-1" style={{ fontSize: 18 }}>{c.name}</span>
            <button onClick={() => {
              if (pending !== c.id) return setPending(c.id);
              upd((d) => ({ incomeCats: d.incomeCats.filter((x) => x.id !== c.id) })); setPending(null);
            }} style={{ fontSize: 15, color: pending === c.id ? C.over : C.muted, fontWeight: 500 }}>{pending === c.id ? "确认删除" : "删除"}</button>
          </div>
        ))}
        <div className="flex gap-2 py-3" style={{ borderTop: `1px solid ${C.line}` }}>
          <input value={incEmoji} onChange={(e) => setIncEmoji(e.target.value.slice(0, 4))} aria-label="图标" className="text-center outline-none" style={{ width: 52, height: 46, borderRadius: 14, background: C.bg, fontSize: 22 }} />
          <input value={incName} onChange={(e) => setIncName(e.target.value)} placeholder="新收入类目" className="flex-1 min-w-0 px-3 outline-none" style={{ height: 46, borderRadius: 14, background: C.bg, fontSize: 17 }} />
          <button onClick={() => {
            if (!incName.trim()) return;
            upd((d) => ({ incomeCats: [...(d.incomeCats || []), { id: uid(), name: incName.trim(), emoji: incEmoji || "💰", color: "#1FB57A" }] }));
            setIncName(""); setIncEmoji("💰");
          }} className="px-4" style={{ height: 46, borderRadius: 14, background: incName.trim() ? C.dark : C.faint, color: "#fff", fontSize: 17, fontWeight: 600 }}>添加</button>
        </div>
      </Section>

      <Section title="数据">
        <button onClick={exportData} className="w-full flex items-center gap-3 py-4" style={{ fontSize: 18 }}><Download size={20} color={C.sub} />导出备份</button>
        <button onClick={copyBackup} className="w-full flex items-center gap-3 py-4" style={{ borderTop: `1px solid ${C.line}`, fontSize: 18 }}><AlignLeft size={20} color={C.sub} />复制备份内容</button>
        <label className="w-full flex items-center gap-3 py-4 cursor-pointer" style={{ borderTop: `1px solid ${C.line}`, fontSize: 18 }}>
          <Upload size={20} color={C.sub} />从备份文件导入
          <input type="file" accept=".json,application/json" onChange={importData} className="hidden" />
        </label>
        <button onClick={() => setBackupBox(backupBox === "paste" ? null : "paste")} className="w-full flex items-center gap-3 py-4" style={{ borderTop: `1px solid ${C.line}`, fontSize: 18 }}><Upload size={20} color={C.sub} />粘贴备份内容导入</button>
        {backupBox && (
          <div className="pb-4">
            <textarea readOnly={backupBox === "show"} value={backupBox === "show" ? JSON.stringify(data) : pasted} onChange={(e) => setPasted(e.target.value)}
              onFocus={(e) => backupBox === "show" && e.target.select()} rows={5} placeholder="把之前复制的备份内容粘贴到这里"
              className="w-full px-3 py-2 outline-none resize-none" style={{ borderRadius: 14, background: C.bg, fontSize: 13, fontFamily: "ui-monospace, monospace" }} />
            {backupBox === "show"
              ? <div style={{ fontSize: 14, color: C.muted }}>没法自动复制：点上面的框全选，再手动复制保存</div>
              : <button onClick={() => importText(pasted)} className="w-full mt-2" style={{ height: 48, borderRadius: 14, background: pasted.trim() ? C.dark : C.faint, color: "#fff", fontSize: 17, fontWeight: 600 }}>导入</button>}
          </div>
        )}
        <button onClick={() => {
          if (pending !== "reset") return setPending("reset");
          upd(() => ({ categories: DEFAULT_CATS, incomeCats: INCOME_CATS, expenses: [], income: [], recurring: [], budgets: [], rates: {} })); setPending(null);
        }} className="w-full text-left py-4" style={{ borderTop: `1px solid ${C.line}`, fontSize: 18, color: C.over }}>
          {pending === "reset" ? "再点一次，清空全部数据" : "清空全部数据"}
        </button>
      </Section>
      {msg && <div className="text-center -mt-2" style={{ fontSize: 15, color: C.sub }}>{msg}</div>}
      <div className="text-center mt-4" style={{ fontSize: 14, color: C.muted }}>共 {data.expenses.length + (data.income || []).length} 笔记录，建议定期导出备份</div>

      {page === "currency" && <CurrencyPage data={data} base={base} upd={upd} onClose={() => setPage(null)} />}
      {page === "rates" && <RatesPage data={data} base={base} upd={upd} onClose={() => setPage(null)} />}
      {page === "recurring" && <RecurringPage data={data} cur={cur} K={K} incOf={incOf} upd={upd} onClose={() => setPage(null)} />}
    </>
  );
}

/* ---------- 主货币设置页 ---------- */
function CurrencyPage({ data, base, upd, onClose }) {
  const [q, setQ] = useState("");
  const kw = q.trim().toLowerCase();
  const list = CURRENCIES.filter((c) => !kw || c.code.toLowerCase().includes(kw) || c.name.includes(q.trim()) || c.symbol.toLowerCase().includes(kw));
  const pick = (c) => {
    // 汇率都是相对主货币的，换主货币后旧汇率不再成立，所以清空
    upd((d) => ({ currency: c.symbol, currencyCode: c.code, rates: c.code === base ? d.rates : {} }));
    onClose();
  };
  return (
    <FullPage title="主货币" onClose={onClose}>
      <div className="flex items-center gap-2 px-4 mb-5" style={{ height: 50, borderRadius: 16, background: C.card }}>
        <Search size={20} color={C.muted} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索名称或代码" className="flex-1 min-w-0 bg-transparent outline-none" style={{ fontSize: 17 }} />
        {q && <button onClick={() => setQ("")} aria-label="清除"><X size={18} color={C.muted} /></button>}
      </div>
      <div className="px-4" style={{ background: C.card, borderRadius: 22 }}>
        {list.map((c, i) => (
          <button key={c.code} onClick={() => pick(c)} className="w-full flex items-center gap-4 py-3.5 text-left" style={i ? { borderTop: `1px solid ${C.line}` } : {}}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 52, height: 40, borderRadius: 12, background: C.bg, fontSize: 16, fontWeight: 600 }}>{c.symbol}</span>
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: 18, fontWeight: 600 }}>{c.code}</span>
              <span className="block" style={{ fontSize: 15, color: C.muted }}>{c.name}</span>
            </span>
            {base === c.code && <Check size={22} strokeWidth={3} color={C.dark} />}
          </button>
        ))}
        {list.length === 0 && <div className="py-6 text-center" style={{ fontSize: 16, color: C.muted }}>没有找到这个货币</div>}
      </div>
      <Note>预算和统计都按主货币计算。更换主货币只改变符号，不会换算已有金额，「我的汇率」也会清空，需要重新设置。</Note>
    </FullPage>
  );
}

/* ---------- 我的汇率页 ---------- */
function RatesPage({ data, base, upd, onClose }) {
  const rates = data.rates || {};
  const [adding, setAdding] = useState("");
  const [val, setVal] = useState("");
  const options = CURRENCIES.filter((c) => c.code !== base && !rates[c.code]);
  const setOne = (code, v) => upd((d) => ({ rates: { ...(d.rates || {}), [code]: v } }));
  const remove = (code) => upd((d) => { const r = { ...(d.rates || {}) }; delete r[code]; return { rates: r }; });

  return (
    <FullPage title="我的汇率" onClose={onClose}>
      <div className="px-4" style={{ background: C.card, borderRadius: 22 }}>
        {Object.keys(rates).length === 0 && <div className="py-6 text-center" style={{ fontSize: 16, color: C.muted }}>还没有设置汇率</div>}
        {Object.keys(rates).map((code, i) => (
          <RateRow key={code} code={code} base={base} value={rates[code]} first={i === 0} onSave={(v) => setOne(code, v)} onRemove={() => remove(code)} />
        ))}
      </div>

      <div className="mt-6 mb-2" style={{ fontSize: 15, fontWeight: 600, color: C.muted }}>添加</div>
      <div className="px-4 py-3" style={{ background: C.card, borderRadius: 22 }}>
        <select value={adding} onChange={(e) => setAdding(e.target.value)} className="w-full px-3 mb-3 outline-none" style={{ height: 46, borderRadius: 14, background: C.bg, fontSize: 17 }}>
          <option value="">选择货币</option>
          {options.map((c) => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 17, color: C.muted, whiteSpace: "nowrap" }}>1 {base} =</span>
          <input inputMode="decimal" value={val} onChange={(e) => setVal(cleanNum(e.target.value))} placeholder="0" className="flex-1 min-w-0 px-3 outline-none" style={{ height: 46, borderRadius: 14, background: C.bg, fontSize: 18 }} />
          <span style={{ fontSize: 17, color: C.muted, minWidth: 36 }}>{adding}</span>
          <button onClick={() => { if (adding && parseFloat(val) > 0) { setOne(adding, parseFloat(val)); setAdding(""); setVal(""); } }}
            className="px-4" style={{ height: 46, borderRadius: 14, background: adding && parseFloat(val) > 0 ? C.dark : C.faint, color: "#fff", fontSize: 17, fontWeight: 600 }}>添加</button>
        </div>
      </div>
      <Note>记这种货币的开销时会自动用这里的汇率换算成 {base}。下次换汇后，在这里改成新的汇率就行；已经记下的开销不会跟着变。</Note>
    </FullPage>
  );
}

function RateRow({ code, base, value, first, onSave, onRemove }) {
  const [v, setV] = useState(String(value));
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setV(String(value)), [value]);
  const commit = () => { const n = parseFloat(v); if (n > 0 && n !== value) onSave(n); else setV(String(value)); };
  return (
    <div className="flex items-center gap-2 py-3" style={first ? {} : { borderTop: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 17, color: C.muted, whiteSpace: "nowrap" }}>1 {base} =</span>
      <input inputMode="decimal" value={v} onChange={(e) => setV(cleanNum(e.target.value))} onBlur={commit}
        className="flex-1 min-w-0 px-3 outline-none" style={{ height: 44, borderRadius: 12, background: C.bg, fontSize: 18, fontWeight: 600 }} />
      <span style={{ fontSize: 17, fontWeight: 600, minWidth: 40 }}>{code}</span>
      <button onClick={() => (confirm ? onRemove() : setConfirm(true))} style={{ fontSize: 15, color: confirm ? C.over : C.muted }}>{confirm ? "确认" : "删除"}</button>
    </div>
  );
}

/* ---------- 定期记账管理页 ---------- */
function RecurringPage({ data, cur, K, incOf, upd, onClose }) {
  const [pending, setPending] = useState(null);
  const list = [...(data.recurring || [])].sort((a, b) => fmt(occDate(a, a.done || 0)).localeCompare(fmt(occDate(b, b.done || 0))));
  return (
    <FullPage title="定期记账" onClose={onClose}>
      {list.length === 0 ? (
        <div className="text-center py-14" style={{ background: C.card, borderRadius: 24, color: C.muted, fontSize: 18, lineHeight: 1.7 }}>
          还没有定期记账<br />记一笔时点「不重复」就能设置
        </div>
      ) : (
        <div className="px-4" style={{ background: C.card, borderRadius: 22 }}>
          {list.map((r, i) => {
            const inc = r.kind === "income";
            const c = inc ? incOf(r.cat) : K.of(r.cat);
            const nx = occDate(r, r.done || 0);
            const ended = r.end && fmt(nx) > r.end;
            return (
              <div key={r.id} className="flex items-center gap-4 py-3.5" style={i ? { borderTop: `1px solid ${C.line}` } : {}}>
                <Tile c={c} size={44} recur />
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ fontSize: 18, fontWeight: 600 }}>{r.note || c.name}</span>
                  <span className="block" style={{ fontSize: 15, color: C.muted }}>{recurLabel(r)}，{ended ? "已结束" : `下次 ${md(nx)}`}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block" style={{ fontSize: 18, fontWeight: 600, color: inc ? C.ok : C.ink }}>
                    {inc ? "+" : ""}{r.origCurrency ? `${symOf(r.origCurrency)}${fmtNum(r.origAmount)}` : `${cur}${fmtNum(r.amount)}`}
                  </span>
                  <button onClick={() => {
                    if (pending !== r.id) return setPending(r.id);
                    upd((d) => ({ recurring: (d.recurring || []).filter((x) => x.id !== r.id) })); setPending(null);
                  }} style={{ fontSize: 15, color: pending === r.id ? C.over : C.muted, fontWeight: 500 }}>{pending === r.id ? "确认停止" : "停止"}</button>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Note>到期那天会自动记一笔。停止后不再自动记账，已经记下的记录会保留。外币的定期记账沿用设置时的汇率。</Note>
    </FullPage>
  );
}

/* ---------- 云端同步（Google Sheets） ---------- */
function SyncSection({ sync }) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);

  if (!sync.connected) {
    const ok = url.trim().startsWith("https://") && token.trim();
    const connect = async () => {
      if (!ok || busy) return;
      setBusy(true); setMsg("");
      try { await sync.connect(url, token); setMsg("已连接，本机的记录已经合并到 Google Sheets"); }
      catch (e) { setMsg(`连不上：${e.message || e}`); }
      setBusy(false);
    };
    return (
      <Section title="云端同步">
        <div className="py-4" style={{ fontSize: 16, color: C.sub, lineHeight: 1.6 }}>
          连上你的 Google Sheets 后，手机和电脑会看到同一份账，数据也多一份保障。
        </div>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Apps Script 网址（https://script.google.com/…）" autoCapitalize="off" autoCorrect="off"
          className="w-full px-3 mb-2 outline-none" style={{ height: 48, borderRadius: 14, background: C.bg, fontSize: 16 }} />
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="口令 TOKEN" autoCapitalize="off" autoCorrect="off"
          className="w-full px-3 mb-3 outline-none" style={{ height: 48, borderRadius: 14, background: C.bg, fontSize: 16 }} />
        <button onClick={connect} className="w-full mb-4" style={{ height: 50, borderRadius: 16, background: ok ? C.dark : C.faint, color: "#fff", fontSize: 17, fontWeight: 600 }}>
          {busy ? "正在连接…" : "连接"}
        </button>
        {msg && <div className="pb-4" style={{ fontSize: 15, color: msg.startsWith("已连接") ? C.ok : C.over }}>{msg}</div>}
      </Section>
    );
  }

  const time = sync.last ? new Date(sync.last) : null;
  const when = time ? `${time.getMonth() + 1}月${time.getDate()}日 ${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}` : "";
  const label = {
    syncing: ["正在同步…", C.sub],
    offline: [`离线${sync.pending ? `，${sync.pending} 处改动等联网后同步` : ""}`, C.warn],
    error: [`同步没成功：${sync.error}`, C.over],
  }[sync.status] || [sync.pending ? `${sync.pending} 处改动等待同步` : `已同步${when ? ` · ${when}` : ""}`, C.ok];

  return (
    <Section title="云端同步">
      <div className="flex items-center gap-3 py-4">
        <Cloud size={22} color={label[1]} />
        <span className="flex-1" style={{ fontSize: 17, color: label[1], fontWeight: 500 }}>{label[0]}</span>
        <button onClick={sync.syncNow} aria-label="立即同步" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: C.bg }}>
          <RefreshCw size={18} color={C.sub} />
        </button>
      </div>
      {sync.issues.length > 0 && (
        <div className="pb-3" style={{ fontSize: 14, color: C.over, lineHeight: 1.6 }}>
          有 {sync.issues.length} 处改动云端没接受：{sync.issues.map((x) => x.error).slice(0, 2).join("；")}
        </div>
      )}
      <button onClick={() => (confirmOff ? (sync.disconnect(), setConfirmOff(false)) : setConfirmOff(true))} className="w-full text-left py-4"
        style={{ borderTop: `1px solid ${C.line}`, fontSize: 17, color: confirmOff ? C.over : C.sub }}>
        {confirmOff ? "再点一次断开（手机上的记录会保留）" : "断开云端同步"}
      </button>
    </Section>
  );
}
