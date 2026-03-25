import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, PlusCircle, X, ChevronLeft, ChevronRight,
  Home, List, PiggyBank, BarChart2, Settings, ArrowUpRight, ArrowDownLeft,
  CreditCard, Briefcase, ShoppingBag, Car, Utensils, Zap, Coffee,
  Building, Repeat, Gift, Shield, DollarSign, Eye, EyeOff, Edit2, Trash2, Check,
  Bell, BellOff, CheckCircle2, Circle, AlertCircle, CalendarClock, Flame,
  ClipboardList, RefreshCw, AlarmClock, Copy
} from "lucide-react";

// ── FONTS ──────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #060b14;
      -webkit-text-size-adjust: 100%;
      touch-action: manipulation;
    }
    /* Prevent iOS auto-zoom on focus — all inputs must be >= 16px */
    input, select, textarea {
      font-size: 16px !important;
      -webkit-appearance: none;
      border-radius: 0;
      touch-action: manipulation;
    }
    /* But visually keep them looking like 13-14px via transform */
    .input-sm {
      font-size: 16px !important;
      transform: scale(0.875);
      transform-origin: left center;
      width: calc(100% / 0.875) !important;
    }
    button {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 2px; }
  `}</style>
);

// ── CONSTANTS ───────────────────────────────────────────────────────────────
const MONTHS = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
const MONTH_NAMES = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];

const BASE_CATEGORIES = [
  { id: "rząd",        label: "Rząd/Podatki",  icon: Building,   color: "#3b82f6" },
  { id: "rachunki",    label: "Rachunki",       icon: Zap,        color: "#f59e0b" },
  { id: "inwestycje",  label: "Inwestycje",     icon: TrendingUp, color: "#8b5cf6" },
  { id: "zakupy",      label: "Zakupy",         icon: ShoppingBag,color: "#06b6d4" },
  { id: "transport",   label: "Transport",      icon: Car,        color: "#f97316" },
  { id: "jedzenie",    label: "Jedzenie",       icon: Utensils,   color: "#ef4444" },
  { id: "kawiarnia",   label: "Kawiarnia",      icon: Coffee,     color: "#a78bfa" },
  { id: "zdrowie",     label: "Zdrowie",        icon: Shield,     color: "#10b981" },
  { id: "rozrywka",    label: "Rozrywka",       icon: Gift,       color: "#ec4899" },
  { id: "muzyka",      label: "Muzyka",         icon: Gift,       color: "#f43f5e" },
  { id: "prezenty",    label: "Prezenty",       icon: Gift,       color: "#e879f9" },
  { id: "bukmacher",   label: "Bukmacher",      icon: TrendingUp, color: "#dc2626" },
  { id: "ubrania",     label: "Ubrania",        icon: ShoppingBag,color: "#818cf8" },
  { id: "alkohol",     label: "Alkohol",        icon: Coffee,     color: "#2563eb" },
  { id: "inne",        label: "Inne",           icon: Wallet,     color: "#6b7280" },
  { id: "przychód",    label: "Przychód",       icon: DollarSign, color: "#10b981" },
  { id: "sprzedaż",    label: "Sprzedaż",       icon: DollarSign, color: "#34d399" },
  { id: "kiga",        label: "Kiga",           icon: DollarSign, color: "#a3e635" },
  { id: "bukmacherka", label: "Bukmacherka",    icon: DollarSign, color: "#fb923c" },
];

// CATEGORIES is always BASE + custom — updated reactively in App
let CATEGORIES = [...BASE_CATEGORIES];
const getCat = (id) => CATEGORIES.find(c => c.id === id) || { id, label: id, icon: Wallet, color: "#6b7280" };

const INITIAL_ACCOUNTS = [
  { id: 1, name: "PKO",              type: "savings", bank: "PKO BP",    balance: 7505.50,  color: "#3b82f6", iban: "PL61 1090 1014 0000 0712 1981 2874" },
  { id: 2, name: "Revolut",          type: "savings", bank: "Revolut",   balance:  804.00,  color: "#06b6d4", iban: "" },
  { id: 3, name: "XTB Inwestycyjne", type: "invest",   bank: "XTB",       balance: 9750.00,  color: "#8b5cf6", iban: "" },
  { id: 4, name: "XTB Emerytalne",   type: "savings",  bank: "XTB",       balance: 1000.00,  color: "#10b981", iban: "" },
];


// ── RECURRING BILLS ──────────────────────────────────────────────────────────
// ── PAYMENTS ─────────────────────────────────────────────────────────────────
// type: "credit" | "bill" | "sub" | "savings"
const INITIAL_PAYMENTS = [
  // ── Zobowiązania kredytowe ─────────────────────────────────────────────────
  { id: 1, name: "Kredyt Dom",  type: "credit", amount: -1563.00, cat: "rachunki", acc: 1, color: "#3b82f6", freq: "monthly", dueDay: 10, trackPaid: true },
  { id: 2, name: "Kredyt auto", type: "credit", amount: -1125.43, cat: "rachunki", acc: 1, color: "#f97316", freq: "monthly", dueDay: 26, trackPaid: true },
  // ── Rachunki ──────────────────────────────────────────────────────────────
  { id: 3, name: "Żłobek",      type: "bill",   amount: -1163.20, cat: "rachunki", acc: 1, color: "#ec4899", freq: "monthly", dueDay:  3, trackPaid: true, shared: true },
  { id: 4, name: "Czynsz",      type: "bill",   amount:  -700.00, cat: "rachunki", acc: 1, color: "#f59e0b", freq: "monthly", dueDay:  6, trackPaid: true, shared: true },
  { id: 5, name: "Netia",       type: "bill",   amount:  -135.00, cat: "rachunki", acc: 1, color: "#06b6d4", freq: "monthly", dueDay: 27, trackPaid: true },
  // ── Subskrypcje ───────────────────────────────────────────────────────────
  { id: 6, name: "Spotify",     type: "sub",    amount:   -23.00, cat: "muzyka",   acc: 1, color: "#1db954", freq: "monthly", dueDay:  5, trackPaid: true },
  { id: 7, name: "Netflix",     type: "sub",    amount:   -43.00, cat: "rozrywka", acc: 1, color: "#e50914", freq: "monthly", dueDay:  5, trackPaid: true },
  // ── Cele oszczędnościowe ──────────────────────────────────────────────────
  { id: 8, name: "Oszczędności PKO",  type: "savings", amount: -1000.00, cat: "inwestycje", acc: 1, color: "#10b981", freq: "monthly", dueDay: 10, trackPaid: true },
  { id: 9, name: "XTB IKZE",          type: "savings", amount:  -500.00, cat: "inwestycje", acc: 3, color: "#f59e0b", freq: "monthly", dueDay: 10, trackPaid: true },
];

const INITIAL_PAID = {
  "1_2026-03": true, "2_2026-03": true, "3_2026-03": true,
  "4_2026-03": true, "5_2026-03": true,
};




// ── SAVINGS GOALS ─────────────────────────────────────────────────────────────
const INITIAL_GOALS = [];

// ─── MARZEC 2026 ─────────────────────────────────────────────────────────────
// Przychody: 16 540,77  |  Wydatki: 25 094,11  |  Bilans: −8 553,34
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_TRANSACTIONS = [

  // ── PRZYCHODY ─────────────────────────────────────────────────────────────
  { id:  1, date: "2026-03-12", desc: "Wypłata",    amount:  10124.77, cat: "przychód",    acc: 1 },
  { id:  2, date: "2026-03-23", desc: "Vinted",     amount:   1750.00, cat: "sprzedaż",    acc: 1 },
  { id:  3, date: "2026-03-16", desc: "Vinted",     amount:    227.00, cat: "sprzedaż",    acc: 1 },
  { id:  4, date: "2026-03-12", desc: "Allegro",    amount:    820.00, cat: "sprzedaż",    acc: 1 },
  { id:  5, date: "2026-03-12", desc: "Vinted",     amount:    319.00, cat: "sprzedaż",    acc: 1 },
  { id:  6, date: "2026-03-17", desc: "Kiga",       amount:    200.00, cat: "kiga",        acc: 1 },
  { id:  7, date: "2026-03-12", desc: "Kiga",       amount:   2000.00, cat: "kiga",        acc: 1 },
  { id:  8, date: "2026-03-21", desc: "Superbet",   amount:    800.00, cat: "bukmacherka", acc: 1 },
  { id:  9, date: "2026-03-12", desc: "Superbet",   amount:    300.00, cat: "bukmacherka", acc: 1 },

  // ── RZĄD → 7 000,00 zł (1 transakcja) ────────────────────────────────────
  { id: 10, date: "2026-03-20", desc: "PIT",                 amount:  -7000.00, cat: "rząd",        acc: 1 },

  // ── RACHUNKI → 4 821,63 zł (6 transakcji) ────────────────────────────────
  { id: 11, date: "2026-03-27", desc: "Internet",            amount:   -135.00, cat: "rachunki",    acc: 1 },
  { id: 12, date: "2026-03-27", desc: "Netia",               amount:   -135.00, cat: "rachunki",    acc: 1 },
  { id: 13, date: "2026-03-26", desc: "Kredyt auto",         amount:  -1125.43, cat: "rachunki",    acc: 1 },
  { id: 14, date: "2026-03-10", desc: "Kredyt Dom",          amount:  -1563.00, cat: "rachunki",    acc: 1 },
  { id: 15, date: "2026-03-06", desc: "Czynsz",              amount:   -700.00, cat: "rachunki",    acc: 1 },
  { id: 16, date: "2026-03-03", desc: "Żłobek",              amount:  -1163.20, cat: "rachunki",    acc: 1 },

  // ── INWESTYCJE → 3 850,00 zł (4 transakcje) ──────────────────────────────
  { id: 17, date: "2026-03-23", desc: "Oszczędności",        amount:  -1500.00, cat: "inwestycje",  acc: 3 },
  { id: 18, date: "2026-03-16", desc: "XTB",                 amount:   -200.00, cat: "inwestycje",  acc: 3 },
  { id: 19, date: "2026-03-12", desc: "Oszczędności",        amount:  -1000.00, cat: "inwestycje",  acc: 3 },
  { id: 20, date: "2026-03-12", desc: "XTB",                 amount:  -1150.00, cat: "inwestycje",  acc: 3 },

  // ── ZAKUPY → 2 059,25 zł (5 transakcji) ──────────────────────────────────
  { id: 21, date: "2026-03-17", desc: "Bieżnia",             amount:   -579.00, cat: "zakupy",      acc: 1 },
  { id: 22, date: "2026-03-16", desc: "Żabka",               amount:    -37.96, cat: "zakupy",      acc: 1 },
  { id: 23, date: "2026-03-13", desc: "Żabka",               amount:    -20.29, cat: "zakupy",      acc: 1 },
  { id: 24, date: "2026-03-12", desc: "Telefon",             amount:   -128.00, cat: "zakupy",      acc: 1 },
  { id: 25, date: "2026-03-12", desc: "Zakupy do 12 marzec", amount:  -1294.00, cat: "zakupy",      acc: 1 },

  // ── TRANSPORT → 1 761,00 zł (8 transakcji) ───────────────────────────────
  { id: 26, date: "2026-03-22", desc: "Bolt",                amount:    -35.00, cat: "transport",   acc: 1 },
  { id: 27, date: "2026-03-22", desc: "Paliwo",              amount:   -270.00, cat: "transport",   acc: 1 },
  { id: 28, date: "2026-03-13", desc: "Uber",                amount:    -15.00, cat: "transport",   acc: 1 },
  { id: 29, date: "2026-03-13", desc: "Tramwaj",             amount:    -25.00, cat: "transport",   acc: 1 },
  { id: 30, date: "2026-03-12", desc: "Paliwo",              amount:   -208.00, cat: "transport",   acc: 1 },
  { id: 31, date: "2026-03-12", desc: "Tramwaj",             amount:    -25.00, cat: "transport",   acc: 1 },
  { id: 32, date: "2026-03-12", desc: "Uber",                amount:   -100.00, cat: "transport",   acc: 1 },
  { id: 33, date: "2026-03-12", desc: "Auto gwarancja",      amount:  -1083.00, cat: "transport",   acc: 1 },

  // ── JEDZENIE → 1 058,70 zł (4 transakcje) ────────────────────────────────
  { id: 34, date: "2026-03-22", desc: "Restauracje",         amount:   -500.00, cat: "jedzenie",    acc: 1 },
  { id: 35, date: "2026-03-22", desc: "Restauracje",         amount:   -152.20, cat: "jedzenie",    acc: 1 },
  { id: 36, date: "2026-03-13", desc: "Praca",               amount:    -26.50, cat: "jedzenie",    acc: 1 },
  { id: 37, date: "2026-03-12", desc: "Restauracje",         amount:   -380.00, cat: "jedzenie",    acc: 1 },

  // ── ROZRYWKA → 1 054,00 zł (5 transakcji) ──────────────────────────────────
  { id: 38, date: "2026-03-22", desc: "Bilety Kreator",  amount:  -350.00, cat: "rozrywka", acc: 1 },
  { id: 39, date: "2026-03-17", desc: "Subskrypcja",     amount:  -100.00, cat: "rozrywka", acc: 1 },
  { id: 40, date: "2026-03-12", desc: "Gry",             amount:  -279.00, cat: "rozrywka", acc: 1 },
  { id: 41, date: "2026-03-12", desc: "Subskrypcja",     amount:  -295.00, cat: "rozrywka", acc: 1 },
  { id: 42, date: "2026-03-12", desc: "Ksiazki",         amount:   -30.00, cat: "rozrywka", acc: 1 },

  // ── MUZYKA → 947,00 zł (1 transakcja) ────────────────────────────────────
  { id: 43, date: "2026-03-12", desc: "Winyle",          amount:  -947.00, cat: "muzyka",   acc: 1 },

  // ── PREZENTY → 564,34 zł (2 transakcje) ──────────────────────────────────
  { id: 44, date: "2026-03-18", desc: "Laura",           amount:  -105.35, cat: "prezenty", acc: 1 },
  { id: 45, date: "2026-03-12", desc: "Kiga",            amount:  -458.99, cat: "prezenty", acc: 1 },

  // ── BUKMACHER → 560,00 zł (11 transakcji) ────────────────────────────────
  { id: 46, date: "2026-03-22", desc: "Kupon",           amount:   -30.00, cat: "bukmacher", acc: 1 },
  { id: 47, date: "2026-03-21", desc: "Kupon",           amount:   -60.00, cat: "bukmacher", acc: 1 },
  { id: 48, date: "2026-03-18", desc: "Kupon",           amount:   -15.00, cat: "bukmacher", acc: 1 },
  { id: 49, date: "2026-03-17", desc: "Kupon",           amount:   -20.00, cat: "bukmacher", acc: 1 },
  { id: 50, date: "2026-03-15", desc: "Kupon",           amount:   -15.00, cat: "bukmacher", acc: 1 },
  { id: 51, date: "2026-03-15", desc: "Kupon",           amount:   -15.00, cat: "bukmacher", acc: 1 },
  { id: 52, date: "2026-03-15", desc: "Kupon",           amount:   -15.00, cat: "bukmacher", acc: 1 },
  { id: 53, date: "2026-03-14", desc: "Kupon",           amount:   -15.00, cat: "bukmacher", acc: 1 },
  { id: 54, date: "2026-03-13", desc: "Kupon",           amount:   -15.00, cat: "bukmacher", acc: 1 },
  { id: 55, date: "2026-03-13", desc: "Kupon",           amount:   -15.00, cat: "bukmacher", acc: 1 },
  { id: 56, date: "2026-03-12", desc: "Kupony",          amount:  -345.00, cat: "bukmacher", acc: 1 },

  // ── UBRANIA → 540,00 zł (1 transakcja) ─────────────────────────────────────
  { id: 57, date: "2026-03-12", desc: "Buty i bytom",  amount:  -540.00, cat: "ubrania",  acc: 1 },

  // ── ALKOHOL → 498,19 zł (2 transakcje) ──────────────────────────────────
  { id: 58, date: "2026-03-13", desc: "Alko",          amount:  -240.19, cat: "alkohol",  acc: 1 },
  { id: 59, date: "2026-03-12", desc: "Alko",          amount:  -258.00, cat: "alkohol",  acc: 1 },

  // ── ZDROWIE → 380,00 zł (1 transakcja) ───────────────────────────────────
  { id: 60, date: "2026-03-12", desc: "Laura",         amount:  -380.00, cat: "zdrowie",  acc: 1 },

  // ── PRZELEW WEWNĘTRZNY ────────────────────────────────────────────────────
  { id: 61, date: "2026-03-10", desc: "Przelew → XTB Emerytalne",     amount:   -500.00, cat: "inne",      acc: 1 },
  { id: 62, date: "2026-03-10", desc: "Przelew ← konto główne",       amount:    500.00, cat: "inne",      acc: 4 },
];

const INITIAL_BUDGETS = [
  { cat: "rząd",        limit: 7000, color: "#3b82f6" },
  { cat: "rachunki",    limit: 5000, color: "#f59e0b" },
  { cat: "inwestycje",  limit: 4000, color: "#8b5cf6" },
  { cat: "zakupy",      limit: 2000, color: "#06b6d4" },
  { cat: "transport",   limit: 1500, color: "#f97316" },
  { cat: "jedzenie",    limit: 1200, color: "#ef4444" },
  { cat: "rozrywka",    limit: 800,  color: "#ec4899" },
  { cat: "muzyka",      limit: 700,  color: "#f43f5e" },
  { cat: "prezenty",    limit: 400,  color: "#e879f9" },
  { cat: "bukmacher",   limit: 400,  color: "#dc2626" },
  { cat: "ubrania",     limit: 500,  color: "#818cf8" },
  { cat: "alkohol",     limit: 300,  color: "#2563eb" },
  { cat: "zdrowie",     limit: 500,  color: "#10b981" },
  { cat: "kawiarnia",   limit: 300,  color: "#a78bfa" },
];

const XTB_PORTFOLIO = [
  // ── Konto zwykłe (9 606,96 PLN) ──────────────────────────────────────────
  { ticker: "2B7K.DE", name: "MSCI World SRI",          type: "ETF",    account: "zwykłe",
    qty: 148.0874, avgPricePLN: 51.73, currentPricePLN: 50.74,
    valuePLN: 7514.40, pnlPLN: -146.80, pnlPct: -1.92, currency: "EUR" },
  { ticker: "AMEM.DE", name: "MSCI Emerging Markets",   type: "ETF",    account: "zwykłe",
    qty: 76.117,   avgPricePLN: 27.07, currentPricePLN: 27.40,
    valuePLN: 2085.90, pnlPLN:  25.41, pnlPct:  1.23, currency: "EUR" },
  // ── IKZE (1 135,52 PLN) ──────────────────────────────────────────────────
  { ticker: "ACWI",    name: "MSCI All Country World",  type: "ETF",    account: "IKZE",
    qty: 0.4429,   avgPricePLN: 2314.28, currentPricePLN: 2225.10,
    valuePLN:  985.40, pnlPLN: -39.80, pnlPct: -3.88, currency: "EUR" },
  { ticker: "NVDA",    name: "Nvidia",                  type: "Akcje",  account: "IKZE",
    qty: 0.2333,   avgPricePLN:  728.11, currentPricePLN:  634.40,
    valuePLN:  148.00, pnlPLN: -12.02, pnlPct: -7.51, currency: "USD" },
];

// HIST_DATA is now computed dynamically from transactions in Dashboard
// This constant is kept as empty placeholder
const HIST_DATA = [];

function buildHistData(transactions) {
  // Get all unique year-months from transactions, sorted
  const monthSet = new Set(transactions.map(t => t.date.slice(0,7)));
  const months = [...monthSet].sort();
  // Take last 6 months
  const last6 = months.slice(-6);
  return last6.map(ym => {
    const txs     = transactions.filter(t => t.date.startsWith(ym) && t.cat !== "inne");
    const income  = txs.filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0);
    const expense = txs.filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(t.amount), 0);
    const [,mm]   = ym.split("-");
    return {
      m:       MONTHS[parseInt(mm)-1],
      ym,
      income:  Math.round(income),
      expense: Math.round(expense),
      balance: Math.round(income - expense),
    };
  });
}

// ── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (n, showSign = false) => {
  const s = Math.abs(n).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (showSign) return (n >= 0 ? "+" : "−") + s + " zł";
  return s + " zł";
};

const fmtShort = (n) => {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toFixed(0);
};


// ── BILLING CYCLE HELPER ─────────────────────────────────────────────────────
// Returns [startDate, endDate] strings for a given month index and cycleDay.
// If cycleDay=1 → standard calendar month.
// If cycleDay=25 → 25th of prev month to 24th of current month.
// "month" param is 0-indexed (0=Jan … 11=Dec), year hardcoded 2026.
const getCycleRange = (month, cycleDay) => {
  if (cycleDay <= 1) {
    const y = 2026;
    const m = month + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const start = `${y}-${String(m).padStart(2,"0")}-01`;
    const end   = `${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
    return [start, end];
  }
  // e.g. cycleDay=25, month=2 (March) → 25 Feb – 24 Mar
  const y = 2026;
  // start: cycleDay of previous month
  const startMonth = month === 0 ? 12 : month;       // 1-indexed prev month
  const startYear  = month === 0 ? y - 1 : y;
  const start = `${startYear}-${String(startMonth).padStart(2,"0")}-${String(cycleDay).padStart(2,"0")}`;
  // end: (cycleDay-1) of current month
  const endMonth = month + 1; // 1-indexed
  const endDay   = cycleDay - 1;
  const end = `${y}-${String(endMonth).padStart(2,"0")}-${String(endDay).padStart(2,"0")}`;
  return [start, end];
};

const cycleTxs = (transactions, month, cycleDay) => {
  const [start, end] = getCycleRange(month, cycleDay);
  return transactions.filter(t => t.date >= start && t.date <= end);
};

const fmtCycleLabel = (month, cycleDay) => {
  if (cycleDay <= 1) return MONTH_NAMES[month] + " 2026";
  const prevMonth = month === 0 ? 11 : month - 1;
  return `${cycleDay} ${MONTHS[prevMonth]} – ${cycleDay-1} ${MONTHS[month]} 2026`;
};

// ── COMPONENTS ───────────────────────────────────────────────────────────────
const Card = ({ children, className = "", style = {} }) => (
  <div style={{
    background: "linear-gradient(145deg, #0f1825 0%, #0a1120 100%)",
    border: "1px solid #1a2744",
    borderRadius: 16,
    padding: 20,
    ...style
  }} className={className}>{children}</div>
);

const Badge = ({ children, color = "#3b82f6" }) => (
  <span style={{
    background: color + "22",
    color,
    border: `1px solid ${color}44`,
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.05em",
    fontFamily: "'DM Mono', monospace",
  }}>{children}</span>
);

// ── MODAL ────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#0d1628",
        border: "1px solid #1a2744",
        borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 480,
        padding: "24px 20px 40px",
        maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>{title}</span>
          <button onClick={onClose} style={{ background: "#1a2744", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "#94a3b8" }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>}
    <input style={{
      width: "100%",
      background: "#060b14",
      border: "1px solid #1a2744",
      borderRadius: 10,
      padding: "12px 14px",
      color: "#e2e8f0",
      fontSize: 16,
      fontFamily: "'Space Grotesk', sans-serif",
      outline: "none",
      WebkitAppearance: "none",
    }} {...props} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>}
    <select style={{
      width: "100%",
      background: "#060b14",
      border: "1px solid #1a2744",
      borderRadius: 10,
      padding: "12px 14px",
      color: "#e2e8f0",
      fontSize: 16,
      fontFamily: "'Space Grotesk', sans-serif",
      outline: "none",
      WebkitAppearance: "none",
      appearance: "none",
    }} {...props}>{children}</select>
  </div>
);



// ── SETTINGS / IMPORT-EXPORT PANEL ───────────────────────────────────────────
const SettingsPanel = ({ open, onClose, accounts, transactions, budgets, payments, paid,
                         setTransactions, setAccounts, setBudgets, cycleDay, setCycleDay,
                         customCats, setCustomCats, notifEnabled, setNotifEnabled }) => {
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState("#06b6d4");
  const [newCatType,  setNewCatType]  = useState("expense"); // expense | income
  const [importStatus, setImportStatus] = useState(null); // null | "ok" | "err" | "loading"
  const [importMsg, setImportMsg]       = useState("");

  if (!open) return null;

  // ── EXPORT ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Transakcje
    const txRows = transactions.map(t => ({
      ID:          t.id,
      Data:        t.date,
      Opis:        t.desc,
      Kwota:       t.amount,
      Kategoria:   t.cat,
      Konto_ID:    t.acc,
      Konto_Nazwa: accounts.find(a => a.id === t.acc)?.name || "",
    }));
    const wsTx = XLSX.utils.json_to_sheet(txRows);
    wsTx["!cols"] = [
      {wch:8},{wch:12},{wch:34},{wch:12},{wch:14},{wch:10},{wch:20}
    ];
    XLSX.utils.book_append_sheet(wb, wsTx, "Transakcje");

    // Sheet 2: Konta
    const accRows = accounts.map(a => ({
      ID:    a.id,
      Nazwa: a.name,
      Typ:   a.type,
      Bank:  a.bank,
      Saldo: a.balance,
      IBAN:  a.iban,
    }));
    const wsAcc = XLSX.utils.json_to_sheet(accRows);
    wsAcc["!cols"] = [{wch:6},{wch:22},{wch:12},{wch:14},{wch:14},{wch:32}];
    XLSX.utils.book_append_sheet(wb, wsAcc, "Konta");

    // Sheet 3: Budżety
    const budRows = budgets.map(b => ({
      Kategoria: b.cat,
      Limit_PLN: b.limit,
    }));
    const wsBud = XLSX.utils.json_to_sheet(budRows);
    wsBud["!cols"] = [{wch:16},{wch:12}];
    XLSX.utils.book_append_sheet(wb, wsBud, "Budżety");

    // Sheet 4: Płatności
    const billRows = payments.map(b => ({
      ID:           b.id,
      Nazwa:        b.name,
      Typ:          b.type || "bill",
      Kwota:        b.amount,
      Termin:       b.dueDay || "",
      Częstotliwość:b.freq || "monthly",
      Kategoria:    b.cat,
      Konto_ID:     b.acc,
    }));
    const wsBill = XLSX.utils.json_to_sheet(billRows);
    wsBill["!cols"] = [{wch:8},{wch:24},{wch:14},{wch:12},{wch:8},{wch:14},{wch:14},{wch:10}];
    XLSX.utils.book_append_sheet(wb, wsBill, "Płatności");

    // Sheet 5: Podsumowanie miesięczne
    const months = [...new Set(transactions.map(t => t.date.slice(0,7)))].sort();
    const sumRows = months.map(m => {
      const mTx = transactions.filter(t => t.date.startsWith(m) && t.cat !== "inne");
      const income  = mTx.filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0);
      const expense = mTx.filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(t.amount), 0);
      return { Miesiąc: m, Przychody: +income.toFixed(2), Wydatki: +expense.toFixed(2), Bilans: +(income-expense).toFixed(2) };
    });
    const wsSum = XLSX.utils.json_to_sheet(sumRows);
    wsSum["!cols"] = [{wch:10},{wch:14},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb, wsSum, "Podsumowanie");

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `FinTrack_export_${today}.xlsx`);
  };

  // ── IMPORT ─────────────────────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportStatus("loading");
    setImportMsg("Wczytuję plik…");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });

        let imported = { tx: 0, acc: 0, bud: 0 };

        // Parse Transakcje sheet
        if (wb.SheetNames.includes("Transakcje")) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets["Transakcje"]);
          const newTx = rows
            .filter(r => r.Data && r.Opis && r.Kwota !== undefined)
            .map((r, i) => ({
              id:     r.ID || Date.now() + i,
              date:   String(r.Data).slice(0, 10),
              desc:   String(r.Opis),
              amount: parseFloat(r.Kwota),
              cat:    String(r.Kategoria || "inne"),
              acc:    parseInt(r.Konto_ID) || 1,
            }));
          if (newTx.length > 0) {
            setTransactions(newTx);
            imported.tx = newTx.length;
          }
        }

        // Parse Konta sheet
        if (wb.SheetNames.includes("Konta")) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets["Konta"]);
          const newAcc = rows
            .filter(r => r.Nazwa && r.Saldo !== undefined)
            .map(r => ({
              id:      parseInt(r.ID) || Date.now(),
              name:    String(r.Nazwa),
              type:    String(r.Typ || "checking"),
              bank:    String(r.Bank || ""),
              balance: parseFloat(r.Saldo),
              color:   "#3b82f6",
              iban:    String(r.IBAN || ""),
            }));
          if (newAcc.length > 0) {
            setAccounts(newAcc);
            imported.acc = newAcc.length;
          }
        }

        // Parse Budżety sheet
        if (wb.SheetNames.includes("Budżety")) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets["Budżety"]);
          const newBud = rows
            .filter(r => r.Kategoria && r.Limit_PLN !== undefined)
            .map(r => ({
              cat:   String(r.Kategoria),
              limit: parseFloat(r.Limit_PLN),
              color: "#3b82f6",
            }));
          if (newBud.length > 0) {
            setBudgets(newBud);
            imported.bud = newBud.length;
          }
        }

        setImportStatus("ok");
        setImportMsg(
          `✓ Zaimportowano: ${imported.tx} transakcji` +
          (imported.acc  ? `, ${imported.acc} kont`    : "") +
          (imported.bud  ? `, ${imported.bud} budżetów` : "")
        );
      } catch (err) {
        setImportStatus("err");
        setImportMsg("Błąd wczytywania pliku. Upewnij się, że to plik .xlsx z FinTrack.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // reset input
  };

  const Divider = () => (
    <div style={{ height: 1, background: "#1a2744", margin: "18px 0" }}/>
  );

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                  letterSpacing: "0.1em", marginBottom: 12 }}>{children}</div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)",
                  backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
         onClick={onClose}>
      <div style={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: "20px 20px 0 0",
                    width: "100%", maxWidth: 480, padding: "24px 20px 48px", maxHeight: "92vh", overflowY: "auto" }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "linear-gradient(135deg,#1e40af,#7c3aed)", borderRadius: 10,
                          padding: 8, display: "flex" }}>
              <Settings size={16} color="white"/>
            </div>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Ustawienia</span>
          </div>
          <button onClick={onClose} style={{ background: "#1a2744", border: "none", borderRadius: 8,
                                             padding: 6, cursor: "pointer", color: "#94a3b8" }}>
            <X size={16}/>
          </button>
        </div>

        {/* CYCLE SECTION */}
        <SectionTitle>📅 Cykl rozliczeniowy</SectionTitle>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
          Ustaw dzień miesiąca, od którego zaczyna się Twój cykl. Dzień <strong style={{color:"#e2e8f0"}}>1</strong> = standardowy miesiąc kalendarzowy.
          Np. dzień <strong style={{color:"#e2e8f0"}}>25</strong> → cykl "Kwiecień" to 25 mar – 24 kwi.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, background: "#060b14", border: "1px solid #1a2744", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Mój miesiąc zaczyna się</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setCycleDay(d => Math.max(1, d - 1))}
                style={{ background: "#1a2744", border: "none", borderRadius: 8, width: 30, height: 30,
                         cursor: "pointer", color: "#94a3b8", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: "#60a5fa", minWidth: 32, textAlign: "center" }}>{cycleDay}</span>
              <button onClick={() => setCycleDay(d => Math.min(28, d + 1))}
                style={{ background: "#1a2744", border: "none", borderRadius: 8, width: 30, height: 30,
                         cursor: "pointer", color: "#94a3b8", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        </div>

        {/* Quick presets */}
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          {[1, 10, 15, 20, 25, 27].map(d => (
            <button key={d} onClick={() => setCycleDay(d)} style={{
              flex: 1, background: cycleDay === d ? "#1e3a5f" : "#060b14",
              border: `1px solid ${cycleDay === d ? "#2563eb" : "#1a2744"}`,
              borderRadius: 8, padding: "6px 0",
              color: cycleDay === d ? "#60a5fa" : "#475569",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
            }}>{d}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#334155", marginBottom: 20, textAlign: "center" }}>
          {cycleDay === 1
            ? "Standardowy miesiąc kalendarzowy"
            : `Cykl: ${cycleDay} poprzedniego → ${cycleDay - 1} bieżącego miesiąca`}
        </div>

        <Divider/>

        {/* EXPORT SECTION */}
        <SectionTitle>📤 Eksport danych</SectionTitle>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
          Pobierz wszystkie swoje dane jako plik Excel (.xlsx) z 5 arkuszami:
          Transakcje, Konta, Budżety, Rachunki stałe, Podsumowanie miesięczne.
        </p>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Transakcji",  val: transactions.length, color: "#3b82f6" },
            { label: "Kont",        val: accounts.length,     color: "#10b981" },
            { label: "Budżetów",    val: budgets.length,      color: "#8b5cf6" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: "#060b14", border: "1px solid #1a2744",
                                       borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 600,
                             color }}>{val}</div>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 600,
                             textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <button onClick={handleExport} style={{
          width: "100%", background: "linear-gradient(135deg,#1e3a5f,#1e40af)",
          border: "1px solid #2563eb66", borderRadius: 12, padding: "14px 0",
          color: "#93c5fd", fontWeight: 700, fontSize: 15, cursor: "pointer",
          fontFamily: "'Space Grotesk', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>⬇</span> Eksportuj do Excel (.xlsx)
        </button>

        <div style={{ height: 10 }}/>
        <button onClick={() => {
          const monthNames = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];
          const cats = {};
          transactions.filter(t => t.date.startsWith("2026-03") && t.amount < 0 && t.cat !== "inne")
            .forEach(t => { cats[t.cat] = (cats[t.cat]||0) + Math.abs(t.amount); });
          const income = transactions.filter(t => t.date.startsWith("2026-03") && t.amount > 0 && t.cat !== "inne").reduce((s,t) => s+t.amount,0);
          const expense = Object.values(cats).reduce((s,v) => s+v, 0);
          const rows = Object.entries(cats).sort((a,b) => b[1]-a[1]).map(([cat,val]) => `<tr><td style="padding:4px 12px;border-bottom:1px solid #eee">${cat}</td><td style="padding:4px 12px;text-align:right;border-bottom:1px solid #eee">${val.toLocaleString("pl-PL",{minimumFractionDigits:2})} zł</td></tr>`).join("");
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>FinTrack – Marzec 2026</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;max-width:600px;margin:0 auto}h1{font-size:22px;margin-bottom:4px}h2{font-size:15px;color:#555;font-weight:400;margin-bottom:24px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:6px 12px;background:#f5f5f5;font-size:13px}td{font-size:13px}.summary{display:flex;gap:32px;margin-bottom:24px}.box{background:#f9f9f9;padding:12px 20px;border-radius:8px}.label{font-size:11px;color:#888;text-transform:uppercase}.val{font-size:20px;font-weight:700;margin-top:4px}.green{color:#16a34a}.red{color:#dc2626}</style></head><body><h1>FinTrack — Raport miesięczny</h1><h2>Marzec 2026</h2><div class="summary"><div class="box"><div class="label">Przychody</div><div class="val green">${income.toLocaleString("pl-PL",{minimumFractionDigits:2})} zł</div></div><div class="box"><div class="label">Wydatki</div><div class="val red">${expense.toLocaleString("pl-PL",{minimumFractionDigits:2})} zł</div></div><div class="box"><div class="label">Bilans</div><div class="val ${income-expense>=0?"green":"red"}">${(income-expense).toLocaleString("pl-PL",{minimumFractionDigits:2})} zł</div></div></div><table><thead><tr><th>Kategoria</th><th style="text-align:right">Kwota</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:24px;font-size:11px;color:#aaa">Wygenerowano: ${new Date().toLocaleDateString("pl-PL")} · FinTrack PRO</p></body></html>`;
          const w = window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
        }} style={{
          width: "100%", background: "#060b14", border: "1px solid #1a2744",
          borderRadius: 12, padding: "12px 0", color: "#94a3b8",
          fontWeight: 700, fontSize: 14, cursor: "pointer",
          fontFamily: "'Space Grotesk', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>🖨</span> Drukuj / Zapisz PDF
        </button>

        <Divider/>

        {/* IMPORT SECTION */}
        <SectionTitle>📥 Import danych</SectionTitle>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 6, lineHeight: 1.6 }}>
          Wczytaj plik .xlsx wcześniej wyeksportowany z FinTrack. Dane zostaną
          <span style={{ color: "#f59e0b", fontWeight: 700 }}> zastąpione</span> — zrób
          eksport przed importem jeśli chcesz zachować kopię.
        </p>

        {/* Column legend */}
        <div style={{ background: "#060b14", border: "1px solid #1a2744", borderRadius: 10,
                      padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8,
                        textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Wymagane kolumny (arkusz Transakcje)
          </div>
          {[
            ["Data",      "RRRR-MM-DD",  "#3b82f6"],
            ["Opis",      "tekst",       "#10b981"],
            ["Kwota",     "+/- liczba",  "#f59e0b"],
            ["Kategoria", "np. jedzenie","#8b5cf6"],
            ["Konto_ID",  "1, 2, 3…",   "#06b6d4"],
          ].map(([col, hint, color]) => (
            <div key={col} style={{ display: "flex", justifyContent: "space-between",
                                    padding: "3px 0", borderBottom: "1px solid #0f1a2e" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11,
                             color, fontWeight: 600 }}>{col}</span>
              <span style={{ fontSize: 11, color: "#475569" }}>{hint}</span>
            </div>
          ))}
        </div>

        {/* File input styled */}
        <label style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", background: "#060b14", border: "2px dashed #1e3a5f",
          borderRadius: 12, padding: "16px 0", cursor: "pointer",
          color: "#60a5fa", fontWeight: 700, fontSize: 14,
          fontFamily: "'Space Grotesk', sans-serif",
          transition: "border-color 0.2s",
        }}>
          <span style={{ fontSize: 20 }}>📂</span> Wybierz plik .xlsx
          <input type="file" accept=".xlsx,.xls" onChange={handleImport}
                 style={{ display: "none" }}/>
        </label>

        {/* Import status */}
        {importStatus && (
          <div style={{
            marginTop: 12, borderRadius: 10, padding: "12px 14px",
            background: importStatus === "ok"      ? "#052e16"
                      : importStatus === "err"     ? "#1a0808"
                      : "#0d1628",
            border: `1px solid ${importStatus === "ok" ? "#14532d" : importStatus === "err" ? "#7f1d1d" : "#1a2744"}`,
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>
              {importStatus === "ok" ? "✅" : importStatus === "err" ? "❌" : "⏳"}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600,
                            color: importStatus === "ok" ? "#86efac" : importStatus === "err" ? "#fca5a5" : "#94a3b8" }}>
                {importStatus === "ok" ? "Import zakończony!" : importStatus === "err" ? "Błąd importu" : "Wczytuję…"}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{importMsg}</div>
            </div>
          </div>
        )}

        <Divider/>

        {/* Notifications */}
        <SectionTitle>🔔 Powiadomienia</SectionTitle>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
          Otrzymuj przypomnienia o terminach płatności (1 dzień i 3 dni wcześniej).
          Działa tylko gdy strona jest otwarta.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#060b14", border: `1px solid ${notifEnabled ? "#16a34a44" : "#1a2744"}`,
          borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {notifEnabled ? "🔔 Włączone" : "🔕 Wyłączone"}
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
              {!("Notification" in window)
                ? "Twoja przeglądarka nie obsługuje powiadomień"
                : Notification.permission === "denied"
                ? "Przeglądarka zablokowała powiadomienia — odblokuj ręcznie w ustawieniach"
                : notifEnabled ? "Powiadomienia aktywne" : "Kliknij aby włączyć"}
            </div>
          </div>
          <button onClick={async () => {
            if (notifEnabled) { setNotifEnabled(false); return; }
            const ok = await requestNotifications();
            setNotifEnabled(ok);
            if (!ok && Notification.permission === "denied") {
              alert("Przeglądarka zablokowała powiadomienia. Odblokuj je w ustawieniach Safari: Ustawienia → Safari → Powiadomienia");
            }
          }} style={{
            width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
            background: notifEnabled ? "#10b981" : "#1a2744", position: "relative", transition: "background 0.2s",
            flexShrink: 0,
          }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: "white",
              position: "absolute", top: 3, left: notifEnabled ? 25 : 3, transition: "left 0.2s" }}/>
          </button>
        </div>

        <Divider/>

        {/* Custom categories */}
        <SectionTitle>🏷️ Moje kategorie</SectionTitle>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12, lineHeight: 1.6 }}>
          Dodaj własne kategorie wydatków lub przychodów.
        </p>

        {/* Existing custom cats */}
        {customCats.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {customCats.map(cat => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#060b14", border: "1px solid #1a2744", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: cat.color, flexShrink: 0 }}/>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.label}</span>
                  <span style={{ fontSize: 11, color: "#334155" }}>{cat.type === "income" ? "przychód" : "wydatek"}</span>
                </div>
                <button onClick={() => setCustomCats(c => c.filter(x => x.id !== cat.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}>
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new custom cat */}
        <div style={{ background: "#060b14", border: "1px solid #1a2744", borderRadius: 12, padding: "14px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {[["expense","Wydatek"],["income","Przychód"]].map(([v,l]) => (
              <button key={v} onClick={() => setNewCatType(v)} style={{
                flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12,
                fontFamily: "'Space Grotesk', sans-serif",
                background: newCatType === v ? "#1e3a5f" : "transparent",
                border: `1px solid ${newCatType === v ? "#2563eb" : "#1a2744"}`,
                color: newCatType === v ? "#60a5fa" : "#475569",
              }}>{l}</button>
            ))}
          </div>
          <input
            value={newCatLabel}
            onChange={e => setNewCatLabel(e.target.value)}
            placeholder="Nazwa kategorii (np. Siłownia)"
            style={{ width: "100%", background: "#0d1628", border: "1px solid #1a2744", borderRadius: 8,
              padding: "10px 12px", color: "#e2e8f0", fontSize: 16, fontFamily: "'Space Grotesk', sans-serif",
              outline: "none", marginBottom: 10, WebkitAppearance: "none" }}
          />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>Kolor</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#f97316","#14b8a6","#a855f7","#84cc16","#f43f5e"].map(c => (
                <div key={c} onClick={() => setNewCatColor(c)}
                  style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: "pointer",
                    border: newCatColor === c ? "2px solid white" : "2px solid transparent" }}/>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              if (!newCatLabel.trim()) return;
              const id = newCatLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_ąćęłńóśźż]/gi, "");
              if (CATEGORIES.find(c => c.id === id)) { alert("Kategoria o tej nazwie już istnieje"); return; }
              setCustomCats(c => [...c, {
                id, label: newCatLabel.trim(), icon: Wallet, color: newCatColor,
                type: newCatType, custom: true,
              }]);
              setNewCatLabel("");
            }}
            style={{ width: "100%", background: "linear-gradient(135deg,#1e40af,#3b82f6)", border: "none",
              borderRadius: 10, padding: "11px 0", color: "white", fontWeight: 700, fontSize: 14,
              cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
            + Dodaj kategorię
          </button>
        </div>

        <Divider/>

        {/* Data reset */}
        <SectionTitle>⚠️ Resetowanie danych</SectionTitle>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12, lineHeight: 1.6 }}>
          Usuwa wszystkie Twoje dane i przywraca dane demonstracyjne z marca 2026.
          Tej operacji nie można cofnąć.
        </p>
        <button
          onClick={() => {
            if (window.confirm("Na pewno? Wszystkie Twoje dane zostaną usunięte.")) {
              if (window.confirm("Na pewno? Wszystkie dane zostaną usunięte — zapisz kopię przed resetem!")) { window.location.reload(); }
              window.location.reload();
            }
          }}
          style={{
            width: "100%", background: "#1a0808", border: "1px solid #7f1d1d44",
            borderRadius: 12, padding: "12px 0", color: "#ef4444",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
          🗑 Resetuj do danych demonstracyjnych
        </button>

      </div>
    </div>
  );
};



const DailyReminder = ({ transactions, onAddTx }) => {
  const today = new Date().toISOString().split("T")[0];
  const todayTxs = transactions.filter(t => t.date === today && t.cat !== "inne");
  const [dismissed, setDismissed] = useState(false);

  // streak: consecutive days with at least one transaction
  const streak = (() => {
    let s = 0;
    const d = new Date();
    while (true) {
      const ds = d.toISOString().split("T")[0];
      const has = transactions.some(t => t.date === ds && t.cat !== "inne");
      if (!has) break;
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  })();

  const lastDate = transactions
    .filter(t => t.cat !== "inne")
    .map(t => t.date)
    .sort()
    .reverse()[0];
  const daysSinceLast = lastDate
    ? Math.floor((new Date(today) - new Date(lastDate)) / 86400000)
    : 99;

  if (dismissed) return null;

  const hasToday = todayTxs.length > 0;
  const urgent = !hasToday && daysSinceLast >= 1;

  return (
    <div style={{
      marginBottom: 14,
      background: urgent
        ? "linear-gradient(135deg, #1a0a0a 0%, #2d1212 100%)"
        : "linear-gradient(135deg, #0a1a12 0%, #0d2318 100%)",
      border: `1px solid ${urgent ? "#7f1d1d" : "#14532d"}`,
      borderRadius: 16,
      padding: "14px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* subtle glow top */}
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80,
        borderRadius: "50%",
        background: urgent ? "#ef444422" : "#10b98122",
        filter: "blur(20px)",
        pointerEvents: "none",
      }}/>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          background: urgent ? "#ef444422" : "#10b98122",
          border: `1px solid ${urgent ? "#ef444444" : "#10b98144"}`,
          borderRadius: 12, padding: 9, flexShrink: 0,
        }}>
          {urgent ? <AlarmClock size={18} color="#ef4444"/> : <CheckCircle2 size={18} color="#10b981"/>}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: urgent ? "#fca5a5" : "#86efac" }}>
                {urgent
                  ? daysSinceLast === 1 ? "Nie dodałeś dziś transakcji!" : `Brak transakcji od ${daysSinceLast} dni!`
                  : `Dzisiaj: ${todayTxs.length} transakcj${todayTxs.length === 1 ? "a" : "e"}`
                }
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>
                {urgent
                  ? "Pamiętaj – każdy wydatek się liczy 💸"
                  : `Ostatnia: ${todayTxs[0]?.desc || "—"}`
                }
              </div>
            </div>
            <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#334155", padding: 2 }}>
              <X size={14}/>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            {/* Streak badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#1e2d45", borderRadius: 8, padding: "5px 10px" }}>
              <Flame size={12} color={streak >= 3 ? "#f97316" : "#475569"}/>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: streak >= 3 ? "#f97316" : "#64748b" }}>
                {streak} dzień z rzędu
              </span>
            </div>

            {/* Quick add button */}
            <button onClick={onAddTx} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: urgent ? "#7f1d1d" : "#14532d",
              border: `1px solid ${urgent ? "#ef444444" : "#22c55e44"}`,
              borderRadius: 8, padding: "5px 12px",
              cursor: "pointer", color: urgent ? "#fca5a5" : "#86efac",
              fontSize: 12, fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              <PlusCircle size={12}/> Dodaj teraz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const Dashboard = ({ accounts, transactions, setTransactions, payments, month, setMonth, onAddTx, cycleDay = 1 }) => {
  const histData = useMemo(() => buildHistData(transactions), [transactions]);
  const [hideBalance, setHideBalance] = useState(false);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const savings = accounts.filter(a => a.type === "savings").reduce((s, a) => s + a.balance, 0);
  const invest = accounts.filter(a => a.type === "invest").reduce((s, a) => s + a.balance, 0);

  const monthTx = cycleTxs(transactions, month, cycleDay);
  const cycleLabel = fmtCycleLabel(month, cycleDay);
  const income = monthTx.filter(t => t.amount > 0 && t.cat !== "inne").reduce((s,t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.amount < 0 && t.cat !== "inne").reduce((s,t) => s + Math.abs(t.amount), 0);
  const balance = income - expense;

  const catData = useMemo(() => {
    const map = {};
    monthTx.filter(t => t.amount < 0 && t.cat !== "inne").forEach(t => {
      map[t.cat] = (map[t.cat] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map).map(([cat, val]) => ({
      cat, val, ...getCat(cat)
    })).sort((a,b) => b.val - a.val);
  }, [monthTx]);

  const incomeData = useMemo(() => {
    const map = {};
    monthTx.filter(t => t.amount > 0 && t.cat !== "inne").forEach(t => {
      map[t.cat] = (map[t.cat] || 0) + t.amount;
    });
    return Object.entries(map).map(([cat, val]) => ({
      cat, val, ...getCat(cat)
    })).sort((a,b) => b.val - a.val);
  }, [monthTx]);

  const topCats = catData.slice(0, 5);
  const [catTab, setCatTab] = useState("expense"); // "expense" | "income"

  // ── Balance widget: days left + daily budget ──────────────────────────────
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const dayOfMonth  = today.getDate();
  const daysLeft    = daysInMonth - dayOfMonth;
  const dailyBudget = balance < 0 ? 0 : balance / Math.max(1, daysLeft);
  const dailySpend  = dayOfMonth > 0 ? expense / dayOfMonth : 0;
  const monthPct    = (dayOfMonth / daysInMonth) * 100;
  const spendPct    = income > 0 ? (expense / income) * 100 : 0;

  return (
    <div style={{ padding: "0 16px 100px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Recurring Reminder */}
      <RecurringReminder payments={payments||[]} transactions={transactions} setTransactions={setTransactions} accounts={accounts}/>
      {/* Daily Reminder */}
      <DailyReminder transactions={transactions} onAddTx={onAddTx}/>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Całkowity Majątek</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 500, color: hideBalance ? "#1a2744" : "#e2e8f0", transition: "color 0.3s", letterSpacing: "-0.03em" }}>
              {hideBalance ? "●●●●●●" : fmt(totalBalance)}
            </span>
            <button onClick={() => setHideBalance(h => !h)} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}>
              {hideBalance ? <Eye size={16}/> : <EyeOff size={16}/>}
            </button>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Oszczędności</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: "#10b981" }}>{fmt(savings)}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Inwestycje</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: "#8b5cf6" }}>{fmt(invest)}</div>
        </div>
      </div>

      {/* Month selector + summary */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={() => setMonth(m => Math.max(0, m-1))} style={{ background: "#1a2744", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#94a3b8" }}><ChevronLeft size={14}/></button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{cycleDay > 1 ? fmtCycleLabel(month, cycleDay) : MONTH_NAMES[month] + " 2026"}</span>
          <button onClick={() => setMonth(m => Math.min(11, m+1))} style={{ background: "#1a2744", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#94a3b8" }}><ChevronRight size={14}/></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Przychody", val: income, color: "#10b981", Icon: ArrowDownLeft },
            { label: "Wydatki",   val: expense, color: "#ef4444", Icon: ArrowUpRight },
            { label: "Bilans",    val: balance, color: balance >= 0 ? "#10b981" : "#ef4444", Icon: balance >= 0 ? TrendingUp : TrendingDown },
          ].map(({ label, val, color, Icon }) => (
            <div key={label} style={{ background: "#060b14", borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <Icon size={12} color={color}/>
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{label}</span>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500, color }}>{fmtShort(val)} zł</div>
            </div>
          ))}
        </div>
        {/* Histogram */}
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={histData} barGap={4}>
            <XAxis dataKey="m" tick={{ fill: "#475569", fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false}/>
            <Tooltip
              contentStyle={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 10, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}
              cursor={{ fill: "#ffffff08" }}
              formatter={(v, n) => [fmt(v), n === "income" ? "Przychody" : "Wydatki"]}
            />
            <Bar dataKey="income" fill="#10b98144" radius={[4,4,0,0]}/>
            <Bar dataKey="expense" fill="#ef444444" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Weekly summary + forecast */}
      <WeeklySummary transactions={transactions} month={month} cycleDay={cycleDay}/>

      {/* Balance widget */}
      <Card style={{ padding: "16px 18px" }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Stan na dziś · {daysLeft} dni do końca miesiąca
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { label: "Dzienne wydatki", val: dailySpend, color: dailySpend > dailyBudget ? "#ef4444" : "#10b981", prefix: "" },
            { label: "Dzienny budżet",  val: dailyBudget, color: "#60a5fa", prefix: "" },
          ].map(({ label, val, color, prefix }) => (
            <div key={label} style={{ background: "#060b14", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 700, color }}>{prefix}{fmt(val)}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
          <span>Wydano {spendPct.toFixed(0)}% przychodów</span>
          <span style={{ color: balance >= 0 ? "#10b981" : "#ef4444", fontWeight: 700 }}>
            {balance >= 0 ? "+" : ""}{fmt(balance)} bilans
          </span>
        </div>
        <div style={{ background: "#060b14", borderRadius: 6, height: 6, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, spendPct)}%`, height: "100%", borderRadius: 6,
            background: spendPct > 100 ? "#ef4444" : spendPct > 80 ? "#f59e0b" : "#10b981",
            transition: "width 0.6s" }}/>
        </div>
      </Card>

      {/* Category breakdown — wydatki & wpływy */}
      <Card style={{ padding: "18px 18px 14px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["expense","📉 Wydatki"],["income","📈 Wpływy"]].map(([t,l]) => (
            <button key={t} onClick={() => setCatTab(t)} style={{
              flex: 1, padding: "7px 0", borderRadius: 10, cursor: "pointer",
              fontWeight: 700, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
              background: catTab === t ? (t === "expense" ? "#2d0a0a" : "#0a1e12") : "#060b14",
              border: `1px solid ${catTab === t ? (t === "expense" ? "#ef4444" : "#10b981") : "#1a2744"}`,
              color: catTab === t ? (t === "expense" ? "#ef4444" : "#10b981") : "#475569",
            }}>{l}</button>
          ))}
        </div>
        {catTab === "expense" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topCats.length === 0 && <div style={{ color: "#334155", fontSize: 12, textAlign: "center", padding: 16 }}>Brak wydatków</div>}
            {topCats.map(({ cat, val, label, color, icon: Icon }) => {
              const pct = expense > 0 ? (val / expense) * 100 : 0;
              return (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ background: color+"22", border: `1px solid ${color}44`, borderRadius: 8, padding: 5, display: "flex" }}><Icon size={13} color={color}/></div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color }}>{fmt(val)}</span>
                  </div>
                  <div style={{ background: "#1a2744", borderRadius: 4, height: 4 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {catTab === "income" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {incomeData.length === 0 && <div style={{ color: "#334155", fontSize: 12, textAlign: "center", padding: 16 }}>Brak wpływów</div>}
            {incomeData.map(({ cat, val, label, color, icon: Icon }) => {
              const pct = income > 0 ? (val / income) * 100 : 0;
              return (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ background: color+"22", border: `1px solid ${color}44`, borderRadius: 8, padding: 5, display: "flex" }}><Icon size={13} color={color}/></div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#10b981" }}>{fmt(val)}</span>
                  </div>
                  <div style={{ background: "#1a2744", borderRadius: 4, height: 4 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#10b981", borderRadius: 4, transition: "width 0.6s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pie chart */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>Struktura majątku</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <PieChart width={120} height={120}>
            <Pie data={accounts.map(a => ({ name: a.name, value: a.balance }))} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={2} stroke="#060b14">
              {accounts.map((a, i) => <Cell key={i} fill={a.color}/>)}
            </Pie>
          </PieChart>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {accounts.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color }}/>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{a.name}</span>
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: a.color }}>
                  {((a.balance / totalBalance) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Account balance history (simple) */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>Historia sald</div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={histData}>
            <XAxis dataKey="m" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 10, fontSize: 12 }}
              formatter={(v, n) => [fmt(Math.abs(v)), n === "balance" ? "Bilans" : n]}/>
            <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }}/>
            <Line type="monotone" dataKey="income"  stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
          {[["#10b981","Bilans"],["#3b82f6","Przychody"]].map(([c,l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 12, height: 3, background: c, borderRadius: 2 }}/>
              <span style={{ fontSize: 10, color: "#475569" }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent transactions */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>Ostatnie transakcje</div>
        {transactions.slice(0, 5).map(tx => {
          const cat = getCat(tx.cat);
          const Icon = cat.icon;
          return (
            <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid #0f1a2e" }}>
              <div style={{ background: cat.color + "22", border: `1px solid ${cat.color}33`, borderRadius: 10, padding: 8, flexShrink: 0 }}>
                <Icon size={14} color={cat.color}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.desc}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{tx.date} · {cat.label}</div>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color: tx.amount > 0 ? "#10b981" : "#ef4444", flexShrink: 0 }}>
                {tx.amount > 0 ? "+" : "−"}{fmt(Math.abs(tx.amount))}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};


const AccountsView = ({ accounts, setAccounts }) => {
  const [modal, setModal] = useState(false);
  const [editAcc, setEditAcc] = useState(null); // account being edited
  const [form, setForm] = useState({ name: "", bank: "", balance: "", type: "checking", color: "#3b82f6" });

  const openAdd  = () => { setEditAcc(null); setForm({ name: "", bank: "", balance: "", type: "checking", color: "#3b82f6" }); setModal(true); };
  const openEdit = (acc) => { setEditAcc(acc); setForm({ name: acc.name, bank: acc.bank, balance: String(acc.balance), type: acc.type, color: acc.color }); setModal(true); };

  const saveAccount = () => {
    if (!form.name || !form.balance) return;
    if (editAcc) {
      setAccounts(a => a.map(x => x.id === editAcc.id ? { ...x, ...form, balance: parseFloat(form.balance) } : x));
    } else {
      setAccounts(a => [...a, { id: Date.now(), ...form, balance: parseFloat(form.balance), iban: "" }]);
    }
    setModal(false);
  };

  const deleteAcc = (id) => {
    if (window.confirm("Usunąć to konto?")) setAccounts(a => a.filter(x => x.id !== id));
  };

  const typeLabel = { checking: "Rachunek", savings: "Oszczędności", invest: "Inwestycje" };
  const total     = accounts.reduce((s, a) => s + a.balance, 0);
  const biezace   = accounts.filter(a => a.type === "checking");
  const oszcz     = accounts.filter(a => a.type === "savings");
  const inwest    = accounts.filter(a => a.type === "invest");
  const oszczInw  = accounts.filter(a => a.type !== "checking");
  const totalBiezace  = biezace.reduce((s, a) => s + a.balance, 0);
  const totalOszcz    = oszcz.reduce((s, a) => s + a.balance, 0);
  const totalInwest   = inwest.reduce((s, a) => s + a.balance, 0);
  const totalOszczInw = oszczInw.reduce((s, a) => s + a.balance, 0);

  const AccCard = ({ acc }) => {
    const pct = ((acc.balance / total) * 100).toFixed(1);
    return (
      <Card style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: acc.color + "22",
              border: `1px solid ${acc.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {acc.type === "invest"  ? <TrendingUp size={17} color={acc.color}/> :
               acc.type === "savings" ? <PiggyBank  size={17} color={acc.color}/> :
               <CreditCard size={17} color={acc.color}/>}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{acc.name}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                {acc.bank} · <Badge color={acc.color}>{typeLabel[acc.type]}</Badge>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 17, fontWeight: 600, color: acc.color }}>{fmt(acc.balance)}</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{pct}% majątku</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
              <button onClick={() => openEdit(acc)} style={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#60a5fa", fontSize: 11 }}>Edytuj</button>
              <button onClick={() => deleteAcc(acc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#334155" }}><Trash2 size={11}/></button>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ background: "#060b14", borderRadius: 5, height: 4 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: acc.color, borderRadius: 5, opacity: 0.7 }}/>
          </div>
        </div>
        {acc.iban && <div style={{ marginTop: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155", letterSpacing: "0.04em" }}>{acc.iban}</div>}
      </Card>
    );
  };

  const SectionHeader = ({ label, total, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600, color }}>{fmt(total)}</div>
    </div>
  );

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Top summary */}
      <div style={{ paddingTop: 8, paddingBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Łączny majątek</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 500, marginTop: 2 }}>{fmt(total)}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
            {oszcz.length > 0 && <div style={{ fontSize: 11, color: "#64748b" }}>
              Oszcz: <span style={{ color: "#06b6d4", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmt(totalOszcz)}</span>
            </div>}
            {inwest.length > 0 && <div style={{ fontSize: 11, color: "#64748b" }}>
              Inwest: <span style={{ color: "#8b5cf6", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmt(totalInwest)}</span>
            </div>}
          </div>
        </div>
        <button onClick={openAdd} style={{ background: "#1e3a5f", border: "1px solid #2563eb44", color: "#60a5fa", borderRadius: 12, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
          <PlusCircle size={14}/> Dodaj
        </button>
      </div>

      {/* Konta bieżące — tylko jeśli istnieją */}
      {biezace.length > 0 && <>
        <SectionHeader label="💳 Konta bieżące" total={totalBiezace} color="#3b82f6"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {biezace.map(acc => <AccCard key={acc.id} acc={acc}/>)}
        </div>
      </>}

      {/* Konta oszczędnościowe */}
      {oszcz.length > 0 && <>
        <SectionHeader label="🏦 Oszczędności" total={totalOszcz} color="#06b6d4"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {oszcz.map(acc => <AccCard key={acc.id} acc={acc}/>)}
        </div>
      </>}

      {/* Inwestycje */}
      {inwest.length > 0 && <>
        <SectionHeader label="📈 Inwestycje" total={totalInwest} color="#8b5cf6"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {inwest.map(acc => <AccCard key={acc.id} acc={acc}/>)}
        </div>
      </>}

      {/* Add / Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editAcc ? "Edytuj konto" : "Nowe konto"}>
        <Input label="Nazwa konta" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="np. Konto osobiste"/>
        <Input label="Bank" value={form.bank} onChange={e => setForm(f => ({...f, bank: e.target.value}))} placeholder="np. PKO BP"/>
        <Input label="Saldo (zł)" type="number" value={form.balance} onChange={e => setForm(f => ({...f, balance: e.target.value}))} placeholder="0.00"/>
        <Select label="Typ konta" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
          <option value="checking">Rachunek bieżący</option>
          <option value="savings">Oszczędności</option>
          <option value="invest">Inwestycje</option>
        </Select>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Kolor</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899"].map(c => (
              <div key={c} onClick={() => setForm(f => ({...f, color: c}))} style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: "pointer", border: form.color === c ? "2px solid white" : "2px solid transparent" }}/>
            ))}
          </div>
        </div>
        <button onClick={saveAccount} style={{ width: "100%", background: "linear-gradient(135deg, #1e40af, #3b82f6)", border: "none", borderRadius: 12, padding: 14, color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          {editAcc ? "Zapisz zmiany" : "Dodaj konto"}
        </button>
      </Modal>
    </div>
  );
};


const TransactionsView = ({ transactions, setTransactions, accounts, setAccounts, _forceOpenModal, _onClose, _onModalClose }) => {
  const [modal, setModal] = useState(_forceOpenModal || false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], desc: "", amount: "", cat: "jedzenie", acc: 1, type: "expense" });

  const addTx = () => {
    if (!form.desc || !form.amount) return;
    const incomeCategories = ["przychód","sprzedaż","kiga","bukmacherka"];
    const finalCat = form.type === "income"
      ? (incomeCategories.includes(form.cat) ? form.cat : "przychód")
      : form.cat;
    const rawAmt = Math.abs(parseFloat(form.amount));
    const amt = form.type === "expense" ? -rawAmt : rawAmt;
    const txData = { date: form.date, desc: form.desc, amount: parseFloat(amt.toFixed(2)), cat: finalCat, acc: parseInt(form.acc) };
    if (editingId) {
      // reverse old tx on old account, apply new tx on new account
      const oldTx = transactions.find(t => t.id === editingId);
      if (oldTx && setAccounts) {
        setAccounts(accs => accs.map(a => {
          if (a.type === "invest") return a; // skip invest accounts
          if (a.id === oldTx.acc && a.id === txData.acc)
            return { ...a, balance: parseFloat((a.balance - oldTx.amount + txData.amount).toFixed(2)) };
          if (a.id === oldTx.acc)
            return { ...a, balance: parseFloat((a.balance - oldTx.amount).toFixed(2)) };
          if (a.id === txData.acc)
            return { ...a, balance: parseFloat((a.balance + txData.amount).toFixed(2)) };
          return a;
        }));
      }
      setTransactions(tx => tx.map(t => t.id === editingId ? { ...t, ...txData } : t));
      setEditingId(null);
    } else {
      // apply amount to linked account (only savings/checking, not invest)
      if (setAccounts) {
        setAccounts(accs => accs.map(a => {
          if (a.id !== txData.acc) return a;
          if (a.type === "invest") return a; // investment accounts managed separately
          return { ...a, balance: parseFloat((a.balance + txData.amount).toFixed(2)) };
        }));
      }
      setTransactions(tx => [{ id: Date.now(), ...txData }, ...tx]);
    }
    setForm(f => ({ ...f }));
    setModal(false);
    if (_onModalClose) _onModalClose();
  };

  const filtered = transactions
    .filter(t => filter === "all" ? true : filter === "income" ? t.amount > 0 : t.amount < 0)
    .filter(t => filterCat === "all" ? true : t.cat === filterCat)
    .filter(t => search === "" ? true :
      t.desc.toLowerCase().includes(search.toLowerCase()) ||

      getCat(t.cat).label.toLowerCase().includes(search.toLowerCase())
    );

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(t => { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={{ paddingTop: 8, paddingBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[["all","Wszystkie"],["income","Przychody"],["expense","Wydatki"]].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{ background: filter === v ? "#1e3a5f" : "#0d1628", border: `1px solid ${filter === v ? "#2563eb" : "#1a2744"}`, color: filter === v ? "#60a5fa" : "#64748b", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowSearch(s => !s)} style={{ background: showSearch ? "#1e3a5f" : "#0d1628", border: `1px solid ${showSearch ? "#2563eb" : "#1a2744"}`, color: showSearch ? "#60a5fa" : "#64748b", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
              🔍
            </button>
            <button onClick={() => setModal(true)} style={{ background: "#1e3a5f", border: "1px solid #2563eb44", color: "#60a5fa", borderRadius: 10, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600 }}>
              <PlusCircle size={13}/> Dodaj
            </button>
          </div>
        </div>

        {showSearch && (
          <div style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj opisu, tagu, kategorii…"
              style={{ width: "100%", background: "#060b14", border: "1px solid #1a2744", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 16, fontFamily: "'Space Grotesk', sans-serif", outline: "none", boxSizing: "border-box", WebkitAppearance: "none" }}
            />
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              <button onClick={() => setFilterCat("all")} style={{ background: filterCat === "all" ? "#1e3a5f" : "#0d1628", border: `1px solid ${filterCat === "all" ? "#2563eb" : "#1a2744"}`, color: filterCat === "all" ? "#60a5fa" : "#64748b", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                Wszystkie
              </button>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ background: filterCat === c.id ? c.color+"33" : "#0d1628", border: `1px solid ${filterCat === c.id ? c.color : "#1a2744"}`, color: filterCat === c.id ? c.color : "#64748b", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(search || filterCat !== "all") && (
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>
            Znaleziono: <span style={{ color: "#60a5fa", fontWeight: 700 }}>{filtered.length}</span> transakcji
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {grouped.map(([date, txs]) => (
          <div key={date}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{date}</div>
            <Card style={{ padding: "4px 16px" }}>
              {txs.map((tx, i) => {
                const cat = getCat(tx.cat);
                const Icon = cat.icon;
                const acc = accounts.find(a => a.id === tx.acc);
                return (
                  <div key={tx.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                    borderBottom: i < txs.length-1 ? "1px solid #0f1a2e" : "none",
                  }}>
                    {/* Icon */}
                    <div style={{ background: cat.color+"1a", borderRadius: 10, padding: 8, flexShrink: 0 }}>
                      <Icon size={14} color={cat.color}/>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.desc}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>{cat.label}</span>
                        {acc && <><span>·</span><span style={{ color: acc.color }}>{acc.name}</span></>}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600,
                      color: tx.amount > 0 ? "#10b981" : "#ef4444", flexShrink: 0 }}>
                      {tx.amount > 0 ? "+" : "−"}{fmt(Math.abs(tx.amount))}
                    </div>

                    {/* Action buttons — always visible */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => {
                          setForm({ date: new Date().toISOString().split("T")[0], desc: tx.desc,
                            amount: String(Math.abs(tx.amount)), cat: tx.cat, acc: tx.acc,
                            type: tx.amount > 0 ? "income" : "expense" });
                          setModal(true);
                        }}
                        title="Kopiuj"
                        style={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 7,
                          padding: "5px 7px", cursor: "pointer", color: "#475569" }}>
                        <Copy size={12}/>
                      </button>
                      <button
                        onClick={() => {
                          setForm({ date: tx.date, desc: tx.desc,
                            amount: String(Math.abs(tx.amount)), cat: tx.cat, acc: tx.acc,
                            type: tx.amount > 0 ? "income" : "expense" });
                          setEditingId(tx.id);
                          setModal(true);
                        }}
                        title="Edytuj"
                        style={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 7,
                          padding: "5px 7px", cursor: "pointer", color: "#60a5fa" }}>
                        <Edit2 size={12}/>
                      </button>
                      <button
                        onClick={() => {
                          setAccounts(accs => accs.map(a =>
                            a.id === tx.acc && a.type !== "invest"
                              ? { ...a, balance: parseFloat((a.balance - tx.amount).toFixed(2)) }
                              : a
                          ));
                          setTransactions(t => t.filter(x => x.id !== tx.id));
                        }}
                        title="Usuń"
                        style={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 7,
                          padding: "5px 7px", cursor: "pointer", color: "#f87171" }}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditingId(null); }} title={editingId ? "Edytuj transakcję" : "Nowa transakcja"}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["expense","Wydatek","#ef4444"],["income","Przychód","#10b981"]].map(([v,l,c]) => (
            <button key={v} onClick={() => setForm(f => ({...f, type: v}))} style={{ flex: 1, background: form.type === v ? c + "22" : "#060b14", border: `1px solid ${form.type === v ? c : "#1a2744"}`, color: form.type === v ? c : "#64748b", borderRadius: 10, padding: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
              {l}
            </button>
          ))}
        </div>
        {/* Description with autocomplete */}
        <div style={{ marginBottom: 14, position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6,
            textTransform: "uppercase", letterSpacing: "0.08em" }}>Opis</div>
          <input
            value={form.desc}
            onChange={e => setForm(f => ({...f, desc: e.target.value}))}
            placeholder="np. Biedronka"
            autoComplete="off"
            style={{ width: "100%", background: "#060b14", border: "1px solid #1a2744",
              borderRadius: 10, padding: "12px 14px", color: "#e2e8f0", fontSize: 16,
              fontFamily: "'Space Grotesk', sans-serif", outline: "none", WebkitAppearance: "none" }}
          />
          {/* Suggestions */}
          {form.desc.length >= 2 && (() => {
            const q = form.desc.toLowerCase();
            const seen = new Set();
            const suggestions = transactions
              .map(t => t.desc)
              .filter(d => {
                if (d.toLowerCase() === form.desc.toLowerCase()) return false;
                if (!d.toLowerCase().includes(q)) return false;
                if (seen.has(d)) return false;
                seen.add(d);
                return true;
              })
              .slice(0, 5);
            if (suggestions.length === 0) return null;
            return (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                background: "#0d1628", border: "1px solid #1a2744", borderRadius: 10,
                marginTop: 4, overflow: "hidden", boxShadow: "0 8px 24px #00000066" }}>
                {suggestions.map(s => {
                  // find last transaction with this desc to pre-fill cat & acc
                  const prev = transactions.find(t => t.desc === s);
                  return (
                    <button key={s} onClick={() => setForm(f => ({
                      ...f, desc: s,
                      cat: prev?.cat || f.cat,
                      acc: prev?.acc || f.acc,
                      type: prev ? (prev.amount > 0 ? "income" : "expense") : f.type,
                    }))} style={{
                      width: "100%", background: "none", border: "none",
                      borderBottom: "1px solid #0f1a2e", padding: "11px 14px",
                      cursor: "pointer", textAlign: "left", display: "flex",
                      alignItems: "center", justifyContent: "space-between",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#1a2744"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <span style={{ fontSize: 14, color: "#e2e8f0" }}>{s}</span>
                      {prev && <span style={{ fontSize: 11, color: "#475569" }}>{getCat(prev.cat).label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
        <Input label="Kwota (zł)" type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="0.00"/>
        <Input label="Data" type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}/>
        {form.type === "expense" && (
          <Select label="Kategoria" value={form.cat} onChange={e => setForm(f => ({...f, cat: e.target.value}))}>
            {CATEGORIES.filter(c => c.id !== "przychód").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        )}
        <Select label="Konto" value={form.acc} onChange={e => setForm(f => ({...f, acc: e.target.value}))}>
          {[...accounts].sort((a,b) => {
            const order = { checking: 0, savings: 1, invest: 2 };
            return (order[a.type]??1) - (order[b.type]??1);
          }).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>

        <button onClick={addTx} style={{ width: "100%", background: "linear-gradient(135deg, #1e40af, #3b82f6)", border: "none", borderRadius: 12, padding: 14, color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          {editingId ? "Zapisz zmiany" : "Zapisz transakcję"}
        </button>
      </Modal>
    </div>
  );
};


const BudgetView = ({ transactions, budgets, setBudgets, month, cycleDay = 1 }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ cat: "jedzenie", limit: "" });

  const monthTx = cycleTxs(transactions, month, cycleDay);

  const addBudget = () => {
    if (!form.limit) return;
    setBudgets(b => {
      const exists = b.findIndex(x => x.cat === form.cat);
      if (exists >= 0) { const n = [...b]; n[exists] = { ...n[exists], limit: parseFloat(form.limit) }; return n; }
      return [...b, { cat: form.cat, limit: parseFloat(form.limit), color: getCat(form.cat).color }];
    });
    setModal(false);
  };

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => {
    const spent = monthTx.filter(t => t.cat === b.cat && t.amount < 0).reduce((ss, t) => ss + Math.abs(t.amount), 0);
    return s + spent;
  }, 0);

  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={{ paddingTop: 8, paddingBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {cycleDay > 1 ? `Cykl ${fmtCycleLabel(month, cycleDay)}` : `Budżet · ${MONTH_NAMES[month]}`}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, marginTop: 2 }}>
            <span style={{ color: "#ef4444" }}>{fmt(totalSpent)}</span>
            <span style={{ color: "#334155", fontSize: 14 }}> / {fmt(totalBudget)}</span>
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{ background: "#1e3a5f", border: "1px solid #2563eb44", color: "#60a5fa", borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600 }}>
          <PlusCircle size={13}/> Limit
        </button>
      </div>

      {/* Overall progress */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
          <span style={{ color: "#64748b" }}>Wykorzystano</span>
          <span style={{ fontFamily: "'DM Mono', monospace", color: totalSpent/totalBudget > 0.9 ? "#ef4444" : "#10b981" }}>
            {totalBudget > 0 ? ((totalSpent/totalBudget)*100).toFixed(0) : 0}%
          </span>
        </div>
        <div style={{ background: "#060b14", borderRadius: 8, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, totalBudget > 0 ? (totalSpent/totalBudget)*100 : 0)}%`, height: "100%", background: totalSpent/totalBudget > 0.9 ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg,#1d4ed8,#3b82f6)", borderRadius: 8, transition: "width 0.8s ease" }}/>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#475569", fontFamily: "'DM Mono', monospace" }}>
          <span>{fmt(totalSpent)} wydano</span>
          <span>{fmt(totalBudget - totalSpent)} pozostało</span>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {budgets.map(b => {
          const cat = getCat(b.cat);
          const Icon = cat.icon;
          const spent = monthTx.filter(t => t.cat === b.cat && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
          const pct = Math.min(100, b.limit > 0 ? (spent / b.limit) * 100 : 0);
          const over = spent > b.limit;
          return (
            <Card key={b.cat} style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ background: cat.color + "22", borderRadius: 10, padding: 7 }}>
                    <Icon size={14} color={cat.color}/>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{cat.label}</div>
                    <div style={{ fontSize: 11, color: "#475569", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                      {fmt(spent)} / {fmt(b.limit)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600, color: over ? "#ef4444" : cat.color }}>{pct.toFixed(0)}%</div>
                  {over && <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>+{fmt(spent - b.limit)} ponad limit</div>}
                </div>
              </div>
              <div style={{ background: "#060b14", borderRadius: 6, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: over ? "#ef4444" : `linear-gradient(90deg, ${cat.color}aa, ${cat.color})`, borderRadius: 6, transition: "width 0.8s ease" }}/>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Ustaw limit budżetu">
        <Select label="Kategoria" value={form.cat} onChange={e => setForm(f => ({...f, cat: e.target.value}))}>
          {CATEGORIES.filter(c => c.id !== "przychód" && c.id !== "inne").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
        <Input label="Limit miesięczny (zł)" type="number" value={form.limit} onChange={e => setForm(f => ({...f, limit: e.target.value}))} placeholder="np. 1500"/>
        <button onClick={addBudget} style={{ width: "100%", background: "linear-gradient(135deg, #1e40af, #3b82f6)", border: "none", borderRadius: 12, padding: 14, color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          Zapisz limit
        </button>
      </Modal>
    </div>
  );
};


const InvestmentsView = ({ accounts }) => {
  const COLORS = { "2B7K.DE": "#8b5cf6", "AMEM.DE": "#06b6d4", "ACWI": "#f59e0b", "NVDA": "#10b981" };

  const totalValue = XTB_PORTFOLIO.reduce((s, p) => s + p.valuePLN, 0);
  const totalPnL   = XTB_PORTFOLIO.reduce((s, p) => s + p.pnlPLN, 0);
  const totalInv   = totalValue - totalPnL;
  const totalPct   = totalInv > 0 ? (totalPnL / totalInv * 100) : 0;

  const zwykle = XTB_PORTFOLIO.filter(p => p.account === "zwykłe");
  const ikze   = XTB_PORTFOLIO.filter(p => p.account === "IKZE");
  const zwykleVal = zwykle.reduce((s,p) => s+p.valuePLN, 0);
  const ikzeVal   = ikze.reduce((s,p) => s+p.valuePLN, 0);

  const chartData = XTB_PORTFOLIO.map(p => ({ name: p.ticker, value: p.valuePLN }));

  // Build from real XTB portfolio total — only current value is real, rest placeholder
  const histPerf = [{ m: "Teraz", val: totalValue }];

  const PositionCard = ({ p }) => {
    const color = COLORS[p.ticker] || "#64748b";
    const isIKZE = p.account === "IKZE";
    return (
      <Card style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <Badge color={color}>{p.ticker}</Badge>
              <span style={{ fontSize: 11, background: isIKZE ? "#78350f22" : "#1e3a5f33",
                color: isIKZE ? "#f59e0b" : "#60a5fa", border: `1px solid ${isIKZE ? "#78350f66" : "#2563eb44"}`,
                borderRadius: 5, padding: "1px 6px", fontWeight: 700 }}>
                {isIKZE ? "IKZE" : "Zwykłe"}
              </span>
              <Badge color="#475569">{p.type}</Badge>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155" }}>
              {p.qty} szt. · avg {p.avgPricePLN.toFixed(2)} PLN
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 600 }}>{fmt(p.valuePLN)}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12,
              color: p.pnlPLN >= 0 ? "#10b981" : "#ef4444", marginTop: 3 }}>
              {p.pnlPLN >= 0 ? "+" : ""}{fmt(p.pnlPLN)} ({p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%)
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Header */}
      <div style={{ paddingTop: 8, paddingBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>XTB Portfolio</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 500 }}>{fmt(totalValue)}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: totalPnL >= 0 ? "#10b981" : "#ef4444" }}>
            {totalPnL >= 0 ? "+" : ""}{fmt(totalPnL)} ({totalPct >= 0 ? "+" : ""}{totalPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Konta summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Inwestycje", val: zwykleVal, pnl: zwykle.reduce((s,p)=>s+p.pnlPLN,0), color: "#8b5cf6" },
          { label: "IKZE",       val: ikzeVal,   pnl: ikze.reduce((s,p)=>s+p.pnlPLN,0),   color: "#f59e0b" },
        ].map(({ label, val, pnl, color }) => (
          <Card key={label} style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600, color }}>{fmt(val)}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: pnl >= 0 ? "#10b981" : "#ef4444", marginTop: 3 }}>
              {pnl >= 0 ? "+" : ""}{fmt(pnl)}
            </div>
          </Card>
        ))}
      </div>

      {/* Performance chart */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Wartość portfela (6M)</div>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={histPerf}>
            <defs>
              <linearGradient id="grd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 10, fontSize: 12 }} formatter={v => [fmt(v), "Wartość"]}/>
            <Area type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={2} fill="url(#grd)"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Alokacja pie */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Alokacja</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <PieChart width={110} height={110}>
            <Pie data={chartData} cx={50} cy={50} innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={2} stroke="#060b14">
              {chartData.map((p) => <Cell key={p.name} fill={COLORS[p.name] || "#64748b"}/>)}
            </Pie>
          </PieChart>
          <div style={{ flex: 1 }}>
            {XTB_PORTFOLIO.map(p => (
              <div key={p.ticker} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[p.ticker] || "#64748b" }}/>
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#94a3b8" }}>{p.ticker}</span>
                </div>
                <span style={{ fontSize: 11, color: "#64748b" }}>{(p.valuePLN / totalValue * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Positions — Zwykłe */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Konto inwestycyjne · {fmt(zwykleVal)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {zwykle.map(p => <PositionCard key={p.ticker} p={p}/>)}
      </div>

      {/* Positions — IKZE */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        IKZE · {fmt(ikzeVal)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ikze.map(p => <PositionCard key={p.ticker} p={p}/>)}
      </div>
    </div>
  );
};



// ── RECURRING REMINDER ────────────────────────────────────────────────────────
const RecurringReminder = ({ payments, transactions, setTransactions, accounts }) => {
  const today     = new Date();
  const todayStr  = today.toISOString().split("T")[0];
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon..7=Sun
  const dayOfMonth = today.getDate();
  const [dismissed, setDismissed] = useState({});

  // Find recurring payments due today (weekly by weekday, monthly by day)
  const dueToday = payments.filter(p => {
    if (dismissed[p.id]) return false;
    if (p.freq === "daily") return true;
    if (p.freq === "weekly") return p.dayOfWeek === dayOfWeek;
    if (p.freq === "monthly" || p.freq === "bimonthly") return (p.dueDay || p.dayOfMonth || 1) === dayOfMonth;
    return false;
  });

  // Check which ones already have a transaction today
  const notYetAdded = dueToday.filter(p =>
    !transactions.some(t => t.desc === p.name && t.date === todayStr && t.amount === p.amount)
  );

  if (notYetAdded.length === 0) return null;

  const addNow = (p) => {
    setTransactions(tx => [{ id: Date.now(), date: todayStr, desc: p.name, amount: p.amount, cat: p.cat, acc: p.acc }, ...tx]);
    setDismissed(d => ({ ...d, [p.id]: true }));
  };

  const dismiss = (id) => setDismissed(d => ({ ...d, [id]: true }));

  return (
    <div style={{ marginBottom: 14 }}>
      {notYetAdded.map(p => (
        <div key={p.id} style={{
          background: "linear-gradient(135deg,#1a1208,#221a08)",
          border: "1px solid #78350f",
          borderRadius: 14, padding: "12px 14px", marginBottom: 8,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ background: "#f59e0b22", borderRadius: 10, padding: 8, flexShrink: 0 }}>
            <RefreshCw size={15} color="#f59e0b"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fcd34d" }}>
              🔔 {p.name}
            </div>
            <div style={{ fontSize: 11, color: "#92400e", marginTop: 2 }}>
              Dzisiejsza płatność · {fmt(Math.abs(p.amount))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={() => addNow(p)} style={{
              background: "#f59e0b", border: "none", borderRadius: 8,
              padding: "6px 12px", cursor: "pointer", color: "#1a0a00",
              fontSize: 12, fontWeight: 700 }}>+ Dodaj</button>
            <button onClick={() => dismiss(p.id)} style={{
              background: "none", border: "1px solid #78350f44", borderRadius: 8,
              padding: "6px 8px", cursor: "pointer", color: "#92400e",
              fontSize: 11 }}>Pomiń</button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── WEEKLY SUMMARY + FORECAST ─────────────────────────────────────────────────
const WeeklySummary = ({ transactions, month, cycleDay }) => {
  const today = "2026-03-23";
  const todayDate = new Date(today);
  const weekAgo = new Date(todayDate); weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(todayDate); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const toStr = d => d.toISOString().split("T")[0];
  const thisWeekTx  = transactions.filter(t => t.date >= toStr(weekAgo)    && t.date <= today && t.amount < 0 && t.cat !== "inne");
  const lastWeekTx  = transactions.filter(t => t.date >= toStr(twoWeeksAgo) && t.date < toStr(weekAgo) && t.amount < 0 && t.cat !== "inne");

  const thisWeek = thisWeekTx.reduce((s,t) => s + Math.abs(t.amount), 0);
  const lastWeek = lastWeekTx.reduce((s,t) => s + Math.abs(t.amount), 0);
  const diff = thisWeek - lastWeek;
  const diffPct = lastWeek > 0 ? (diff / lastWeek * 100) : 0;

  // Top category this week
  const catMap = {};
  thisWeekTx.forEach(t => { catMap[t.cat] = (catMap[t.cat]||0) + Math.abs(t.amount); });
  const topCat = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0];

  // Forecast: days elapsed in cycle, project to end
  const [cycleStart] = getCycleRange(month, cycleDay);
  const cycleStartDate = new Date(cycleStart);
  const daysElapsed = Math.max(1, Math.floor((todayDate - cycleStartDate) / 86400000) + 1);
  const cycleTx = cycleTxs(transactions, month, cycleDay);
  const cycleExp = cycleTx.filter(t => t.amount < 0 && t.cat !== "inne").reduce((s,t) => s + Math.abs(t.amount), 0);
  const cycleInc = cycleTx.filter(t => t.amount > 0 && t.cat !== "inne").reduce((s,t) => s + t.amount, 0);
  const daysInCycle = 30;
  const dailyRate = cycleExp / daysElapsed;
  const projectedExp = dailyRate * daysInCycle;
  const projectedBalance = cycleInc - projectedExp;
  const daysLeft = Math.max(0, daysInCycle - daysElapsed);

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tydzień w skrócie</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569" }}>17–23 mar</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ background: "#060b14", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Ten tydzień</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600, color: "#ef4444" }}>{fmt(thisWeek)}</div>
          <div style={{ fontSize: 11, color: diff > 0 ? "#ef4444" : "#10b981", marginTop: 3 }}>
            {diff > 0 ? "▲" : "▼"} {Math.abs(diffPct).toFixed(0)}% vs poprzedni
          </div>
        </div>
        <div style={{ background: "#060b14", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Prognoza końca mies.</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600, color: projectedBalance >= 0 ? "#10b981" : "#ef4444" }}>
            {projectedBalance >= 0 ? "+" : ""}{fmt(projectedBalance)}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>zostało {daysLeft} dni · {fmt(dailyRate)}/dzień</div>
        </div>
      </div>

      {topCat && (
        <div style={{ background: getCat(topCat[0]).color + "15", border: `1px solid ${getCat(topCat[0]).color}33`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>
          <span style={{ color: getCat(topCat[0]).color, fontWeight: 700 }}>{getCat(topCat[0]).label}</span> zjadło {(topCat[1]/thisWeek*100).toFixed(0)}% wydatków tygodnia · <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(topCat[1])}</span>
        </div>
      )}
    </Card>
  );
};

// ── GOALS VIEW ────────────────────────────────────────────────────────────────
const GoalsView = ({ goals, setGoals, accounts, budgets, setBudgets, transactions, month }) => {
  const [modal,       setModal]       = useState(false);
  const [limitModal,  setLimitModal]  = useState(false);
  const [activeTab,   setActiveTab]   = useState("goals");
  const [editGoal,    setEditGoal]    = useState(null);
  const EMPTY_FORM = { name: "", target: "", saved: "", accId: 1, color: "#06b6d4", emoji: "🎯" };
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [limitForm,   setLimitForm]   = useState({ cat: "bukmacher", limit: "" });

  // ── Goals logic ───────────────────────────────────────────────────────────
  const openAdd  = () => { setEditGoal(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (goal) => {
    setEditGoal(goal);
    setForm({ name: goal.name, target: String(goal.target), saved: String(goal.saved), accId: goal.accId, color: goal.color, emoji: goal.emoji });
    setModal(true);
  };

  const saveGoal = () => {
    if (!form.name || !form.target) return;
    const item = { name: form.name, target: parseFloat(form.target), saved: parseFloat(form.saved||0), accId: parseInt(form.accId), color: form.color, emoji: form.emoji };
    if (editGoal) {
      setGoals(g => g.map(x => x.id === editGoal.id ? { ...x, ...item } : x));
    } else {
      setGoals(g => [...g, { id: Date.now(), ...item }]);
    }
    setModal(false);
  };
  const updateSaved = (id, delta) => setGoals(g => g.map(goal => goal.id === id ? { ...goal, saved: Math.max(0, goal.saved + delta) } : goal));
  const deleteGoal  = (id) => setGoals(g => g.filter(x => x.id !== id));
  const totalTarget = goals.reduce((s,g) => s + g.target, 0);
  const totalSaved  = goals.reduce((s,g) => s + g.saved, 0);

  // ── Limits logic ──────────────────────────────────────────────────────────
  // budgets array: { cat, limit, color }
  const monthTx = transactions.filter(t => {
    const m = `2026-${String(month+1).padStart(2,"0")}`;
    return t.date.startsWith(m) && t.amount < 0;
  });

  const spentBycat = {};
  monthTx.forEach(t => { spentBycat[t.cat] = (spentBycat[t.cat]||0) + Math.abs(t.amount); });

  const addLimit = () => {
    if (!limitForm.cat || !limitForm.limit) return;
    const existing = budgets.find(b => b.cat === limitForm.cat);
    if (existing) {
      setBudgets(b => b.map(x => x.cat === limitForm.cat ? { ...x, limit: parseFloat(limitForm.limit) } : x));
    } else {
      setBudgets(b => [...b, { cat: limitForm.cat, limit: parseFloat(limitForm.limit), color: getCat(limitForm.cat).color }]);
    }
    setLimitForm({ cat: "bukmacher", limit: "" });
    setLimitModal(false);
  };
  const deleteLimit = (cat) => setBudgets(b => b.filter(x => x.cat !== cat));

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 6, paddingTop: 8, paddingBottom: 14 }}>
        {[["goals","🎯 Cele"],["limits","🚦 Limity"],["forecast","📈 Prognoza"]].map(([t,l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: "9px 0", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 12,
            fontFamily: "'Space Grotesk', sans-serif",
            background: activeTab === t ? "linear-gradient(135deg,#1e40af,#3b82f6)" : "#0f1825",
            border: `1px solid ${activeTab === t ? "#2563eb" : "#1a2744"}`,
            color: activeTab === t ? "white" : "#475569",
          }}>{l}</button>
        ))}
      </div>

      {/* ── CELE ── */}
      {activeTab === "goals" && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Cele oszczędnościowe</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, marginTop: 3 }}>
              <span style={{ color: "#10b981" }}>{fmt(totalSaved)}</span>
              <span style={{ color: "#334155", fontSize: 13 }}> / {fmt(totalTarget)}</span>
            </div>
          </div>
          <button onClick={openAdd} style={{ background: "#1e3a5f", border: "1px solid #2563eb44", color: "#60a5fa", borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600 }}>
            <PlusCircle size={13}/> Cel
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {goals.map(goal => {
            const pct  = Math.min(100, goal.target > 0 ? (goal.saved / goal.target * 100) : 0);
            const done = pct >= 100;
            const acc  = accounts.find(a => a.id === goal.accId);
            return (
              <Card key={goal.id} style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 28, lineHeight: 1 }}>{goal.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{goal.name}</div>
                      {acc && <div style={{ fontSize: 11, color: acc.color, marginTop: 2 }}>{acc.name}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 600, color: done ? "#10b981" : goal.color }}>{pct.toFixed(0)}%</div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                      <button onClick={() => openEdit(goal)} style={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 6, padding: "2px 8px", cursor: "pointer", color: "#60a5fa", fontSize: 10 }}>Edytuj</button>
                      <button onClick={() => deleteGoal(goal.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#334155" }}><Trash2 size={11}/></button>
                    </div>
                  </div>
                </div>
                <div style={{ background: "#060b14", borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: done ? "linear-gradient(90deg,#059669,#10b981)" : `linear-gradient(90deg,${goal.color}99,${goal.color})`, borderRadius: 8, transition: "width 0.8s ease" }}/>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>
                    {fmt(goal.saved)} <span style={{ color: "#334155" }}>/ {fmt(goal.target)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[100, 500, 1000].map(amt => (
                      <button key={amt} onClick={() => updateSaved(goal.id, amt)} style={{ background: "#0a1e12", border: "1px solid #14532d55", borderRadius: 7, padding: "4px 10px", cursor: "pointer", color: "#10b981", fontSize: 11, fontWeight: 700 }}>+{amt}</button>
                    ))}
                    <button onClick={() => updateSaved(goal.id, -100)} style={{ background: "#1a0808", border: "1px solid #7f1d1d44", borderRadius: 7, padding: "4px 8px", cursor: "pointer", color: "#f87171", fontSize: 11 }}>−</button>
                  </div>
                </div>
                {done
                  ? <div style={{ marginTop: 10, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#10b981" }}>🎉 Cel osiągnięty!</div>
                  : <div style={{ marginTop: 8, fontSize: 11, color: "#334155", textAlign: "right" }}>brakuje {fmt(goal.target - goal.saved)}</div>
                }
              </Card>
            );
          })}
        </div>
      </>}

      {/* ── LIMITY ── */}
      {activeTab === "limits" && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Limity miesięczne · {MONTH_NAMES[month]}</div>
            <div style={{ fontSize: 12, color: "#334155", marginTop: 3 }}>Ustaw max kwotę na kategorię</div>
          </div>
          <button onClick={() => setLimitModal(true)} style={{ background: "#1e3a5f", border: "1px solid #2563eb44", color: "#60a5fa", borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600 }}>
            <PlusCircle size={13}/> Limit
          </button>
        </div>

        {budgets.length === 0 && (
          <div style={{ background: "#0f1825", border: "1px solid #1a2744", borderRadius: 14, padding: "24px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚦</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Brak limitów</div>
            <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>Kliknij + Limit aby dodać pierwszy</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {budgets.map(b => {
            const spent  = spentBycat[b.cat] || 0;
            const pct    = b.limit > 0 ? Math.min(100, spent / b.limit * 100) : 0;
            const over   = spent > b.limit;
            const warn   = !over && pct >= 80;
            const cat    = getCat(b.cat);
            const Icon   = cat.icon;
            const remain = b.limit - spent;

            return (
              <div key={b.cat} style={{
                background: over ? "linear-gradient(135deg,#1a0808,#200e0e)" : "#0f1825",
                border: `1px solid ${over ? "#7f1d1d" : warn ? "#78350f" : "#1a2744"}`,
                borderRadius: 14, padding: "14px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: cat.color+"22", borderRadius: 10, padding: 8 }}>
                      <Icon size={14} color={cat.color}/>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{cat.label}</div>
                      <div style={{ fontSize: 11, marginTop: 2, color: over ? "#ef4444" : warn ? "#f59e0b" : "#475569" }}>
                        {over ? `⚠ Przekroczono o ${fmt(spent - b.limit)}` : warn ? `🔶 Zostało tylko ${fmt(remain)}` : `Zostało ${fmt(remain)}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: over ? "#ef4444" : warn ? "#f59e0b" : "#e2e8f0" }}>
                      {fmt(spent)}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>/ {fmt(b.limit)}</div>
                    <button onClick={() => deleteLimit(b.cat)} style={{ background: "none", border: "none", cursor: "pointer", color: "#334155", marginTop: 2 }}><Trash2 size={11}/></button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: "#060b14", borderRadius: 6, height: 6, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 6,
                    background: over ? "#ef4444" : warn ? "#f59e0b" : `linear-gradient(90deg,${cat.color}88,${cat.color})`,
                    transition: "width 0.6s ease",
                  }}/>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#334155" }}>
                  <span>0</span>
                  <span style={{ color: over ? "#ef4444" : "#475569", fontWeight: over ? 700 : 400 }}>{pct.toFixed(0)}%</span>
                  <span>{fmt(b.limit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </>}

      {/* ── PROGNOZA ── */}
      {activeTab === "forecast" && (() => {
        const [monthly,    setMonthly]    = React.useState(1000);
        const [years,      setYears]      = React.useState(10);
        const [rate,       setRate]       = React.useState(7);
        const [startAmt,   setStartAmt]   = React.useState(0);

        const months   = years * 12;
        const r        = rate / 100 / 12;
        // future value: start + monthly contributions with compound interest
        const fvStart  = startAmt * Math.pow(1 + r, months);
        const fvMthly  = r > 0
          ? monthly * ((Math.pow(1 + r, months) - 1) / r)
          : monthly * months;
        const total    = fvStart + fvMthly;
        const invested = startAmt + monthly * months;
        const profit   = total - invested;

        // Chart: yearly snapshots
        const chartData = Array.from({ length: years + 1 }, (_, i) => {
          const m  = i * 12;
          const fvS = startAmt * Math.pow(1 + r, m);
          const fvM = r > 0 ? monthly * ((Math.pow(1 + r, m) - 1) / r) : monthly * m;
          return {
            rok: i === 0 ? "Teraz" : `${i}r`,
            wartość: Math.round(fvS + fvM),
            wpłacono: Math.round(startAmt + monthly * m),
          };
        });

        const Slider = ({ label, value, onChange, min, max, step, fmt: fmtFn, color }) => (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color }}>
                {fmtFn ? fmtFn(value) : value}
              </span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={e => onChange(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: color || "#3b82f6", cursor: "pointer" }}/>
          </div>
        );

        return (
          <div>
            <Card style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Parametry</div>
              <Slider label="Miesięczna wpłata" value={monthly} onChange={setMonthly}
                min={100} max={10000} step={100} fmtFn={v => fmt(v)} color="#3b82f6"/>
              <Slider label="Czas oszczędzania" value={years} onChange={setYears}
                min={1} max={40} step={1} fmtFn={v => `${v} lat`} color="#8b5cf6"/>
              <Slider label="Roczna stopa zwrotu" value={rate} onChange={setRate}
                min={0} max={20} step={0.5} fmtFn={v => `${v}%`} color="#10b981"/>
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>Kwota startowa</div>
                <input type="number" value={startAmt} onChange={e => setStartAmt(parseFloat(e.target.value)||0)}
                  style={{ width: "100%", background: "#060b14", border: "1px solid #1a2744", borderRadius: 8,
                    padding: "10px 12px", color: "#e2e8f0", fontSize: 16, fontFamily: "'Space Grotesk', sans-serif",
                    outline: "none" }}/>
              </div>
            </Card>

            {/* Result */}
            <Card style={{ marginBottom: 14, background: "linear-gradient(135deg,#0d1e35,#0a1628)" }}>
              <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
                  Po {years} latach będziesz mieć
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 700, color: "#60a5fa" }}>
                  {fmt(total)}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Wpłacono", val: invested, color: "#94a3b8" },
                  { label: "Zysk z %", val: profit,   color: "#10b981" },
                  { label: "Miesięcznie", val: monthly, color: "#f59e0b" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background: "#060b14", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color }}>{fmt(val)}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Chart */}
            <Card>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Wzrost w czasie</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gWart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gWpl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#475569" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#475569" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="rok" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 10, fontSize: 12 }}
                    formatter={(v, n) => [fmt(v), n === "wartość" ? "Wartość" : "Wpłacono"]}/>
                  <Area type="monotone" dataKey="wpłacono" stroke="#475569" strokeWidth={1.5} fill="url(#gWpl)"/>
                  <Area type="monotone" dataKey="wartość"  stroke="#3b82f6" strokeWidth={2}   fill="url(#gWart)"/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
                {[["#3b82f6","Wartość portfela"],["#475569","Wpłacono"]].map(([c,l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 12, height: 3, background: c, borderRadius: 2 }}/>
                    <span style={{ fontSize: 10, color: "#475569" }}>{l}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Modal — nowy cel */}
      <Modal open={modal} onClose={() => { setModal(false); setEditGoal(null); }} title={editGoal ? "Edytuj cel" : "Nowy cel"}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Emoji</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["🏖️","💻","🚗","🏠","💍","✈️","📈","🎯","🎸","👶"].map(e => (
              <button key={e} onClick={() => setForm(f => ({...f, emoji: e}))} style={{ fontSize: 22, background: form.emoji === e ? "#1e3a5f" : "#060b14", border: `1px solid ${form.emoji === e ? "#2563eb" : "#1a2744"}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>{e}</button>
            ))}
          </div>
        </div>
        <Input label="Nazwa celu" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="np. Wakacje letnie"/>
        <Input label="Cel (zł)" type="number" value={form.target} onChange={e => setForm(f => ({...f, target: e.target.value}))} placeholder="np. 8000"/>
        <Input label="Już odłożone (zł)" type="number" value={form.saved} onChange={e => setForm(f => ({...f, saved: e.target.value}))} placeholder="0"/>
        <Select label="Konto" value={form.accId} onChange={e => setForm(f => ({...f, accId: e.target.value}))}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Kolor</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["#06b6d4","#10b981","#8b5cf6","#f59e0b","#ef4444","#ec4899","#3b82f6"].map(c => (
              <div key={c} onClick={() => setForm(f => ({...f, color: c}))} style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: "pointer", border: form.color === c ? "2px solid white" : "2px solid transparent" }}/>
            ))}
          </div>
        </div>
        <button onClick={saveGoal} style={{ width: "100%", background: "linear-gradient(135deg,#1e40af,#3b82f6)", border: "none", borderRadius: 12, padding: 14, color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          {editGoal ? "Zapisz zmiany" : "Dodaj cel"}
        </button>
      </Modal>

      {/* Modal — nowy limit */}
      <Modal open={limitModal} onClose={() => setLimitModal(false)} title="Nowy limit miesięczny">
        <Select label="Kategoria" value={limitForm.cat} onChange={e => setLimitForm(f => ({...f, cat: e.target.value}))}>
          {CATEGORIES.filter(c => !["przychód","inne","sprzedaż","kiga","bukmacherka"].includes(c.id)).map(c =>
            <option key={c.id} value={c.id}>{c.label}</option>
          )}
        </Select>
        <Input label="Limit miesięczny (zł)" type="number" value={limitForm.limit}
          onChange={e => setLimitForm(f => ({...f, limit: e.target.value}))} placeholder="np. 200"/>
        <div style={{ marginBottom: 16, background: "#060b14", border: "1px solid #1a2744", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Wydano w tym miesiącu: <span style={{ color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
              {fmt(spentBycat[limitForm.cat] || 0)}
            </span>
          </div>
        </div>
        <button onClick={addLimit} style={{ width: "100%", background: "linear-gradient(135deg,#1e40af,#3b82f6)", border: "none", borderRadius: 12, padding: 14, color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          Zapisz limit
        </button>
      </Modal>
    </div>
  );
};

// ── PAYMENTS VIEW ────────────────────────────────────────────────────────────
const PaymentsView = ({ payments, setPayments, paid, setPaid, transactions, setTransactions, accounts, month: globalMonth }) => {
  const TODAY_DAY  = new Date().getDate();
  // own month selector — starts at current month, can navigate independently
  const [localMonth, setLocalMonth] = useState(globalMonth);
  const month    = localMonth;
  const monthKey = `2026-${String(month + 1).padStart(2, "0")}`;
  const isCurrentMonth = month === globalMonth;
  const DAYS_PL   = ["Pn","Wt","Śr","Cz","Pt","So","Nd"];

  const [modal,    setModal]    = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [section,  setSection]  = useState("credit"); // active add section
  const EMPTY = { name:"", amount:"", cat:"rachunki", acc:1, color:"#3b82f6",
                  type:"credit", freq:"monthly", dueDay:1, dayOfWeek:1, trackPaid:true, shared:false };
  const [form, setForm] = useState(EMPTY);

  const openAdd = (type) => {
    const defaults = {
      credit:  { ...EMPTY, type:"credit",  color:"#3b82f6", cat:"rachunki"   },
      bill:    { ...EMPTY, type:"bill",    color:"#f59e0b", cat:"rachunki"   },
      sub:     { ...EMPTY, type:"sub",     color:"#8b5cf6", cat:"rozrywka"   },
      savings: { ...EMPTY, type:"savings", color:"#10b981", cat:"inwestycje" },
    };
    setEditItem(null);
    setForm(defaults[type] || EMPTY);
    setSection(type);
    setModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name, amount: String(Math.abs(item.amount)),
      cat: item.cat, acc: item.acc, color: item.color || "#3b82f6",
      type: item.type || "bill",
      freq: item.freq || "monthly",
      dueDay: item.dueDay || 1,
      dayOfWeek: item.dayOfWeek || 1,
      trackPaid: item.trackPaid !== false,
      shared: item.shared || false,
    });
    setModal(true);
  };

  const save = () => {
    if (!form.name || !form.amount) return;
    const item = {
      id:         editItem ? editItem.id : Date.now(),
      name:       form.name,
      amount:     -Math.abs(parseFloat(form.amount)),
      cat:        form.cat,
      acc:        parseInt(form.acc),
      color:      form.color,
      type:       form.type,
      freq:       form.freq,
      dueDay:     parseInt(form.dueDay) || 1,
      dayOfWeek:  parseInt(form.dayOfWeek) || 1,
      trackPaid:  form.trackPaid,
      shared:     form.shared || false,
      startMonth: form.startMonth ?? 0,
    };
    if (editItem) setPayments(p => p.map(x => x.id === editItem.id ? item : x));
    else          setPayments(p => [...p, item]);
    setModal(false);
  };

  const del = (id) => setPayments(p => p.filter(x => x.id !== id));

  // Check if a bimonthly item is due this month
  const isDueThisMonth = (item) => {
    if (item.freq !== "bimonthly") return true;
    // bimonthly: due every 2 months starting from item.startMonth (default 0 = Jan)
    const start = item.startMonth ?? 0;
    return (month - start) % 2 === 0;
  };

  const isPaid = (item) => !!paid[`${item.id}_${monthKey}`];

  const togglePaid = (item) => {
    const key = `${item.id}_${monthKey}`;
    const nowPaid = !paid[key];
    setPaid(p => ({ ...p, [key]: nowPaid }));
    if (nowPaid) {
      const day  = String(item.dueDay || 1).padStart(2, "0");
      const date = `2026-${String(month+1).padStart(2,"0")}-${day}`;
      setTransactions(tx => [{ id: Date.now(), date, desc: item.name, amount: item.amount, cat: item.cat, acc: item.acc }, ...tx]);
    } else {
      setTransactions(tx => {
        const idx = tx.findIndex(t => t.desc === item.name && t.date.startsWith(monthKey) && t.amount === item.amount);
        return idx === -1 ? tx : [...tx.slice(0, idx), ...tx.slice(idx+1)];
      });
    }
  };

  const freqLabel = (item) => {
    if (item.freq === "daily")   return "Codziennie";
    if (item.freq === "weekly")  return `Co tydzień · ${DAYS_PL[(item.dayOfWeek-1)%7]}`;
    if (item.freq === "bimonthly") {
      let next = -1;
      for (let i = 1; i <= 12; i++) {
        const m = (month + i) % 12;
        const startM = (item.startMonth || 1) - 1;
        if ((m - startM + 12) % 2 === 0) { next = m; break; }
      }
      return "Co 2 mies. · nast: " + (MONTH_NAMES[next] || "");
    }
    return `${item.dueDay}. każdego`;
  };

  const ItemCard = ({ item }) => {
    const p = isPaid(item);
    const isMonthly = item.freq === "monthly" || item.freq === "bimonthly";
    const overdue = !p && isMonthly && isCurrentMonth && (item.dueDay||1) < TODAY_DAY;
    const soon    = !p && !overdue && isMonthly && isCurrentMonth && ((item.dueDay||1) - TODAY_DAY) <= 3 && (item.dueDay||1) >= TODAY_DAY;
    return (
      <div style={{
        background: p ? "#0a1410" : overdue ? "linear-gradient(135deg,#1a0808,#200e0e)" : "#0f1825",
        border: `1px solid ${p ? "#14532d33" : overdue ? "#7f1d1d" : soon ? "#78350f" : "#1a2744"}`,
        borderRadius: 14, padding: "13px 14px", opacity: p ? 0.65 : 1,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        {/* Checkbox */}
        <button onClick={() => togglePaid(item)} style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0, cursor: "pointer",
          background: p ? "#052e16" : "#0d1628",
          border: `2px solid ${p ? "#16a34a" : overdue ? "#ef4444" : "#1e3a5f"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {p ? <Check size={12} color="#10b981"/> : <Circle size={9} color={overdue ? "#ef444488" : "#334155"}/>}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: p ? "#64748b" : "#e2e8f0",
              textDecoration: p ? "line-through" : "none",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{item.name}</div>
            {item.shared && (
              <span style={{ fontSize: 9, fontWeight: 700, background: "#0a1e12",
                border: "1px solid #16a34a44", borderRadius: 5, padding: "1px 5px",
                color: "#10b981", flexShrink: 0 }}>👫 wspólne</span>
            )}
          </div>
          <div style={{ fontSize: 11, marginTop: 2, color:
            overdue ? "#ef4444" : soon ? "#f59e0b" : "#475569" }}>
            {overdue ? `⚠ Termin minął (${item.dueDay}.)` :
             soon    ? `🕐 Za ${item.dueDay - TODAY_DAY} dni` :
             freqLabel(item)}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600,
            color: p ? "#1f5c34" : overdue ? "#ef4444" : item.color || "#e2e8f0" }}>
            {fmt(Math.abs(item.amount))}
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 5, justifyContent: "flex-end" }}>
            <button onClick={() => openEdit(item)} style={{
              background: "#0d1628", border: "1px solid #1a2744", borderRadius: 6,
              padding: "3px 8px", cursor: "pointer", color: "#60a5fa", fontSize: 10 }}>Edytuj</button>
            <button onClick={() => del(item.id)} style={{
              background: "none", border: "none", cursor: "pointer", color: "#334155" }}>
              <Trash2 size={11}/></button>
          </div>
        </div>
      </div>
    );
  };

  const Section = ({ type, label, emoji, color, items }) => {
    const dueItems = items.filter(isDueThisMonth);
    const total = dueItems.reduce((s, x) => s + Math.abs(x.amount), 0);
    const paidAmt = dueItems.filter(isPaid).reduce((s, x) => s + Math.abs(x.amount), 0);
    const pct = total > 0 ? (paidAmt / total * 100) : 0;
    return (
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16 }}>{emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color }}>{fmt(total)}</span>
            <button onClick={() => openAdd(type)} style={{
              background: color+"22", border: `1px solid ${color}44`, borderRadius: 8,
              padding: "3px 8px", cursor: "pointer", color, fontSize: 11, fontWeight: 700 }}>+ Dodaj</button>
          </div>
        </div>
        {dueItems.length === 0 && items.length === 0 ? (
          <div style={{ background: "#060b14", borderRadius: 12, padding: "12px 16px",
            fontSize: 12, color: "#334155", textAlign: "center" }}>
            Brak — kliknij + Dodaj
          </div>
        ) : dueItems.length === 0 ? (
          <div style={{ background: "#060b14", borderRadius: 12, padding: "12px 16px",
            fontSize: 12, color: "#334155", textAlign: "center" }}>
            Brak płatności w tym miesiącu
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dueItems.sort((a,b) => (a.dueDay||1)-(b.dueDay||1)).map(item => <ItemCard key={item.id} item={item}/>)}
            </div>
            {items.length > 1 && (
              <div style={{ marginTop: 8, background: "#060b14", borderRadius: 8, height: 5, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 8, transition: "width 0.6s" }}/>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Only show bimonthly payments in their active months
  const isActiveThisMonth = (p) => {
    if (p.freq !== "bimonthly") return true;
    const startM = (p.startMonth || 1) - 1; // 0-based
    return (month - startM) % 2 === 0;
  };

  const credits  = payments.filter(p => p.type === "credit"  && isActiveThisMonth(p));
  const bills    = payments.filter(p => p.type === "bill"     && isActiveThisMonth(p));
  const subs     = payments.filter(p => p.type === "sub"      && isActiveThisMonth(p));
  const savings  = payments.filter(p => p.type === "savings"  && isActiveThisMonth(p));

  const allItems    = [...credits, ...bills, ...subs, ...savings];
  const allMthTotal = allItems.reduce((s, x) => s + Math.abs(x.amount), 0);
  const allMthPaid  = allItems.filter(isPaid).reduce((s, x) => s + Math.abs(x.amount), 0);
  const totalPct    = allMthTotal > 0 ? (allMthPaid / allMthTotal * 100) : 0;

  const FREQ_LABELS = { monthly: "Miesięcznie", bimonthly: "Co 2 miesiące", weekly: "Tygodniowo", daily: "Codziennie" };

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Header summary + month nav */}
      <div style={{ paddingTop: 8, paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={() => setLocalMonth(m => Math.max(0, m-1))}
            style={{ background: "#1a2744", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#94a3b8" }}>
            <ChevronLeft size={14}/>
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Płatności</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: isCurrentMonth ? "#e2e8f0" : "#60a5fa", marginTop: 2 }}>
              {MONTH_NAMES[month]} 2026 {isCurrentMonth && <span style={{ fontSize: 10, color: "#10b981" }}>● teraz</span>}
            </div>
          </div>
          <button onClick={() => setLocalMonth(m => Math.min(11, m+1))}
            style={{ background: "#1a2744", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#94a3b8" }}>
            <ChevronRight size={14}/>
          </button>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, textAlign: "center" }}>
          <span style={{ color: "#10b981" }}>{fmt(allMthPaid)}</span>
          <span style={{ color: "#334155", fontSize: 14 }}> / {fmt(allMthTotal)}</span>
        </div>
        <div style={{ background: "#1a2744", borderRadius: 6, height: 4, marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${totalPct}%`, height: "100%",
            background: totalPct >= 100 ? "#10b981" : "linear-gradient(90deg,#d97706,#f59e0b)",
            transition: "width 0.6s" }}/>
        </div>
      </div>

      <Section type="credit"  label="Zobowiązania"           emoji="🏦" color="#3b82f6" items={credits}/>
      <Section type="bill"    label="Rachunki"                emoji="📄" color="#f59e0b" items={bills}/>
      <Section type="sub"     label="Subskrypcje"             emoji="🔄" color="#8b5cf6" items={subs}/>
      <Section type="savings" label="Cele oszczędnościowe"    emoji="💰" color="#10b981" items={savings}/>

      {totalPct >= 100 && payments.length > 0 && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 28 }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#10b981", marginTop: 6 }}>Wszystko opłacone!</div>
        </div>
      )}


      {/* Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditItem(null); }}
             title={editItem ? "Edytuj" : form.type === "credit" ? "Nowe zobowiązanie" : form.type === "sub" ? "Nowa subskrypcja" : form.type === "savings" ? "Nowy cel oszczędnościowy" : "Nowy rachunek"}>

        {/* Type tabs in modal */}
        {!editItem && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[["credit","🏦 Zobowiązanie"],["bill","📄 Rachunek"],["sub","🔄 Subskrypcja"],["savings","💰 Oszczędności"]].map(([t,l]) => (
              <button key={t} onClick={() => setForm(f => ({...f, type: t}))}
                style={{ flex: 1, background: form.type === t ? "#1e3a5f" : "#060b14",
                  border: `1px solid ${form.type === t ? "#2563eb" : "#1a2744"}`,
                  color: form.type === t ? "#60a5fa" : "#475569",
                  borderRadius: 8, padding: "7px 4px", cursor: "pointer",
                  fontWeight: 700, fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>{l}</button>
            ))}
          </div>
        )}

        <Input label="Nazwa" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder={
          form.type === "credit" ? "np. Kredyt hipoteczny" :
          form.type === "sub"    ? "np. Netflix" : "np. Prąd"}/>
        <Input label="Kwota miesięczna (zł)" type="number" value={form.amount}
          onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="0.00"/>

        <Select label="Kategoria" value={form.cat} onChange={e => setForm(f => ({...f, cat: e.target.value}))}>
          {CATEGORIES.filter(c => !["przychód","inne"].includes(c.id)).map(c =>
            <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>

        <Select label="Konto" value={form.acc} onChange={e => setForm(f => ({...f, acc: e.target.value}))}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>

        <Select label="Częstotliwość" value={form.freq} onChange={e => setForm(f => ({...f, freq: e.target.value}))}>
          <option value="daily">Codziennie</option>
          <option value="weekly">Tygodniowo</option>
          <option value="monthly">Miesięcznie</option>
          <option value="bimonthly">Co 2 miesiące</option>
        </Select>

        {form.freq === "weekly" && (
          <Select label="Dzień tygodnia" value={form.dayOfWeek} onChange={e => setForm(f => ({...f, dayOfWeek: e.target.value}))}>
            {["Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota","Niedziela"].map((d,i) =>
              <option key={i+1} value={i+1}>{d}</option>)}
          </Select>
        )}
        {(form.freq === "monthly" || form.freq === "bimonthly") && (
          <Input label="Dzień miesiąca (termin)" type="number" min="1" max="31"
            value={form.dueDay} onChange={e => setForm(f => ({...f, dueDay: e.target.value}))}/>
        )}
        {form.freq === "bimonthly" && (
          <Select label="Płatny co 2 miesiące — zacznij od" value={form.startMonth || 1}
            onChange={e => setForm(f => ({...f, startMonth: parseInt(e.target.value)}))}>
            {MONTH_NAMES.map((name, i) => (
              <option key={i+1} value={i+1}>{name}</option>
            ))}
          </Select>
        )}
        {form.freq === "bimonthly" && (
          <Select label="Pierwszy miesiąc płatności" value={form.startMonth ?? 0}
            onChange={e => setForm(f => ({...f, startMonth: parseInt(e.target.value)}))}>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m} (potem co 2 mies.)</option>)}
          </Select>
        )}

        {/* Track paid toggle */}
        <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#060b14", border: "1px solid #1a2744", borderRadius: 10, padding: "12px 14px" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Śledź opłacanie</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Checkbox do odznaczania co miesiąc</div>
          </div>
          <button onClick={() => setForm(f => ({...f, trackPaid: !f.trackPaid}))} style={{
            width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
            background: form.trackPaid ? "#10b981" : "#1a2744", position: "relative", transition: "background 0.2s",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "white", position: "absolute",
              top: 3, left: form.trackPaid ? 23 : 3, transition: "left 0.2s" }}/>
          </button>
        </div>

        {/* Shared with Kinga toggle */}
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between",
          background: form.shared ? "#0d1e12" : "#060b14",
          border: `1px solid ${form.shared ? "#16a34a44" : "#1a2744"}`,
          borderRadius: 10, padding: "12px 14px" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>👫 Wspólne z Kingą</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Liczy się do rozliczenia wspólnego</div>
          </div>
          <button onClick={() => setForm(f => ({...f, shared: !f.shared}))} style={{
            width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
            background: form.shared ? "#10b981" : "#1a2744", position: "relative", transition: "background 0.2s",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "white", position: "absolute",
              top: 3, left: form.shared ? 23 : 3, transition: "left 0.2s" }}/>
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Kolor</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["#3b82f6","#f59e0b","#8b5cf6","#10b981","#ef4444","#06b6d4","#ec4899","#f97316"].map(c => (
              <div key={c} onClick={() => setForm(f => ({...f, color: c}))}
                style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: "pointer",
                  border: form.color === c ? "2px solid white" : "2px solid transparent" }}/>
            ))}
          </div>
        </div>

        <button onClick={save} style={{ width: "100%", background: "linear-gradient(135deg,#1e40af,#3b82f6)",
          border: "none", borderRadius: 12, padding: 14, color: "white", fontWeight: 700, fontSize: 15,
          cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          {editItem ? "Zapisz zmiany" : "Dodaj"}
        </button>
      </Modal>
    </div>
  );
};


// ── ANALYTICS VIEW ─────────────────────────────────────────────────────────────
const AnalyticsView = ({ transactions, payments, paid, month, cycleDay = 1 }) => {
  const monthTx = transactions.filter(t => t.date.startsWith(`2026-${String(month+1).padStart(2,"0")}`));
  const expense = monthTx.filter(t => t.amount < 0 && t.cat !== "inne");
  const income = monthTx.filter(t => t.amount > 0 && t.cat !== "inne");

  const catData = useMemo(() => {
    const map = {};
    expense.forEach(t => { map[t.cat] = (map[t.cat] || 0) + Math.abs(t.amount); });
    return Object.entries(map).map(([cat, val]) => ({ cat, val, ...getCat(cat) })).sort((a,b) => b.val - a.val);
  }, [expense]);

  const totalExp = expense.reduce((s,t) => s + Math.abs(t.amount), 0);
  const totalInc = income.reduce((s,t) => s + t.amount, 0);
  const savingsRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc * 100) : 0;

  const dayData = useMemo(() => {
    const map = {};
    expense.forEach(t => {
      const d = t.date.split("-")[2];
      map[d] = (map[d] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map).map(([d, v]) => ({ d, v })).sort((a,b) => parseInt(a.d)-parseInt(b.d));
  }, [expense]);

  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={{ paddingTop: 8, paddingBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Analityka · {cycleDay > 1 ? fmtCycleLabel(month, cycleDay) : MONTH_NAMES[month]}</div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Przychody", val: fmt(totalInc), color: "#10b981" },
          { label: "Wydatki",   val: fmt(totalExp), color: "#ef4444" },
          { label: "Bilans",    val: fmt(totalInc - totalExp, true), color: totalInc >= totalExp ? "#10b981" : "#ef4444" },
          { label: "Stopa oszcz.", val: `${savingsRate.toFixed(1)}%`, color: savingsRate >= 20 ? "#10b981" : "#f59e0b" },
        ].map(({ label, val, color }) => (
          <Card key={label} style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 500, color, marginTop: 6 }}>{val}</div>
          </Card>
        ))}
      </div>

      {/* Daily spending */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Wydatki dzienne</div>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={dayData}>
            <XAxis dataKey="d" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{ background: "#0d1628", border: "1px solid #1a2744", borderRadius: 10, fontSize: 12 }} formatter={v => [fmt(v), "Wydatki"]}/>
            <Bar dataKey="v" fill="#3b82f644" radius={[3,3,0,0]}>
              {dayData.map((_, i) => <Cell key={i} fill={_ => "#3b82f6"}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category list with percentages */}
      <Card>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Ranking wydatków</div>
        {catData.map(({ cat, val, label, color, icon: Icon }, i) => {
          const pct = totalExp > 0 ? (val / totalExp * 100) : 0;
          return (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < catData.length-1 ? "1px solid #0f1a2e" : "none" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#334155", width: 20, textAlign: "center" }}>#{i+1}</div>
              <div style={{ background: color + "1a", borderRadius: 8, padding: 7 }}><Icon size={13} color={color}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ background: "#060b14", borderRadius: 3, height: 4 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }}/>
                </div>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#94a3b8", width: 90, textAlign: "right" }}>{fmt(val)}</div>
            </div>
          );
        })}
      </Card>

      {/* Per-sklep / per-miejsce */}
      {(() => {
        const shopMap = {};
        transactions
          .filter(t => t.amount < 0 && t.cat !== "inne")
          .forEach(t => {
            const key = t.desc.trim();
            if (!shopMap[key]) shopMap[key] = { count: 0, total: 0, cat: t.cat };
            shopMap[key].count++;
            shopMap[key].total += Math.abs(t.amount);
          });
        const shops = Object.entries(shopMap)
          .filter(([,d]) => d.count >= 1)
          .sort((a,b) => b[1].total - a[1].total)
          .slice(0, 15);
        if (shops.length === 0) return null;
        const maxVal = shops[0][1].total;
        return (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>🏪 Wydatki per miejsce</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {shops.map(([name, data]) => {
                const cat   = getCat(data.cat);
                const Icon  = cat.icon;
                const pct   = (data.total / maxVal) * 100;
                return (
                  <div key={name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <div style={{ background: cat.color+"22", borderRadius: 8, padding: 5, flexShrink: 0 }}>
                          <Icon size={12} color={cat.color}/>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                        <span style={{ fontSize: 10, color: "#334155", flexShrink: 0 }}>×{data.count}</span>
                      </div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: cat.color, flexShrink: 0, marginLeft: 8 }}>{fmt(data.total)}</span>
                    </div>
                    <div style={{ background: "#0f1825", borderRadius: 3, height: 3 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: cat.color, borderRadius: 3, opacity: 0.7 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Porównanie miesięcy */}
      {(() => {
        const [cmpMonth, setCmpMonth] = React.useState(month > 0 ? month - 1 : 0);
        const cmpKey = `2026-${String(cmpMonth+1).padStart(2,"0")}`;
        const curKey = `2026-${String(month+1).padStart(2,"0")}`;

        const cmpTx  = transactions.filter(t => t.date.startsWith(cmpKey) && t.cat !== "inne");
        const curTx  = transactions.filter(t => t.date.startsWith(curKey) && t.cat !== "inne");

        const cmpExp = cmpTx.filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(t.amount), 0);
        const curExp = curTx.filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(t.amount), 0);
        const cmpInc = cmpTx.filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0);
        const curInc = curTx.filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0);

        // per category comparison
        const catMap = {};
        [...cmpTx, ...curTx].filter(t => t.amount < 0).forEach(t => {
          if (!catMap[t.cat]) catMap[t.cat] = { cmp: 0, cur: 0 };
          if (t.date.startsWith(cmpKey)) catMap[t.cat].cmp += Math.abs(t.amount);
          else catMap[t.cat].cur += Math.abs(t.amount);
        });
        const catRows = Object.entries(catMap)
          .map(([cat, d]) => ({ cat, ...d, diff: d.cur - d.cmp }))
          .filter(r => r.cur > 0 || r.cmp > 0)
          .sort((a,b) => Math.abs(b.diff) - Math.abs(a.diff));

        return (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              📊 Porównanie miesięcy
            </div>

            {/* Month selector for comparison */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "#475569", flexShrink: 0 }}>Porównaj z:</span>
              <select value={cmpMonth} onChange={e => setCmpMonth(parseInt(e.target.value))}
                style={{ flex: 1, background: "#060b14", border: "1px solid #1a2744", borderRadius: 8,
                  padding: "8px 12px", color: "#e2e8f0", fontSize: 14, outline: "none" }}>
                {MONTH_NAMES.map((m, i) => i !== month && (
                  <option key={i} value={i}>{m} 2026</option>
                ))}
              </select>
            </div>

            {/* Summary row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: "Wydatki", cur: curExp, cmp: cmpExp },
                { label: "Przychody", cur: curInc, cmp: cmpInc },
              ].map(({ label, cur, cmp }) => {
                const diff = cur - cmp;
                const isExp = label === "Wydatki";
                const good  = isExp ? diff < 0 : diff > 0;
                return (
                  <div key={label} style={{ background: "#060b14", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{fmt(cur)}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{MONTHS[cmpMonth]}: {fmt(cmp)}</div>
                    {diff !== 0 && (
                      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4,
                        color: good ? "#10b981" : "#ef4444" }}>
                        {diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diff))} {good ? "✓" : "↑"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Category diff */}
            {catRows.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "#334155", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
                  Zmiany per kategoria
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {catRows.slice(0, 8).map(row => {
                    const cat  = getCat(row.cat);
                    const Icon = cat.icon;
                    const up   = row.diff > 0;
                    return (
                      <div key={row.cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ background: cat.color+"22", borderRadius: 8, padding: 6, flexShrink: 0 }}>
                          <Icon size={12} color={cat.color}/>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{cat.label}</div>
                          <div style={{ fontSize: 10, color: "#475569" }}>
                            {MONTHS[cmpMonth]}: {fmt(row.cmp)} → {MONTHS[month]}: {fmt(row.cur)}
                          </div>
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700,
                          color: up ? "#ef4444" : "#10b981", flexShrink: 0 }}>
                          {up ? "+" : ""}{fmt(row.diff)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Rozliczenie z Kingą */}
      {(() => {
        const monthKey    = `2026-${String(month+1).padStart(2,"0")}`;
        const sharedItems = (payments||[]).filter(p =>
          p.shared && p.freq !== "weekly" && p.freq !== "daily"
        );
        if (sharedItems.length === 0) return (
          <Card style={{ marginTop: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>👫 Rozliczenie z Kingą</div>
            <div style={{ fontSize: 13, color: "#334155", textAlign: "center", padding: "12px 0" }}>
              Brak wspólnych rachunków — zaznacz „Wspólne z Kingą" w Płatnościach
            </div>
          </Card>
        );

        const totalShared = sharedItems.reduce((s, x) => s + Math.abs(x.amount), 0);
        const halfTotal   = totalShared / 2;
        const paidAmt     = sharedItems
          .filter(item => !!(paid||{})[`${item.id}_${monthKey}`])
          .reduce((s, x) => s + Math.abs(x.amount), 0);

        return (
          <Card style={{ marginTop: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              👫 Rozliczenie z Kingą · {MONTH_NAMES[month]}
            </div>

            {/* Shared items list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {sharedItems.map(item => {
                const isPd = !!(paid||{})[`${item.id}_${monthKey}`];
                return (
                  <div key={item.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 12px",
                    background: isPd ? "#0a1410" : "#060b14",
                    borderRadius: 10, border: `1px solid ${isPd ? "#16a34a33" : "#1a2744"}`,
                  }}>
                    <div>
                      <span style={{ fontSize: 13, color: isPd ? "#475569" : "#e2e8f0",
                        textDecoration: isPd ? "line-through" : "none" }}>{item.name}</span>
                      {isPd && <span style={{ fontSize: 10, color: "#10b981", marginLeft: 8 }}>✓</span>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13,
                        color: isPd ? "#334155" : "#e2e8f0" }}>{fmt(Math.abs(item.amount))}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        po {fmt(Math.abs(item.amount) / 2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ height: 1, background: "#1a2744", marginBottom: 14 }}/>

            {/* Summary grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: paidAmt > 0 ? 10 : 0 }}>
              {[
                { label: "Razem", val: totalShared, color: "#e2e8f0" },
                { label: "Twoja połowa", val: halfTotal, color: "#60a5fa" },
                { label: "Połowa Kingi", val: halfTotal, color: "#f59e0b" },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: "#060b14", borderRadius: 10,
                  padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#475569", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14,
                    fontWeight: 700, color }}>{fmt(val)}</div>
                </div>
              ))}
            </div>

            {paidAmt > 0 && (
              <div style={{ padding: "10px 12px", background: "#0a1e12",
                border: "1px solid #16a34a22", borderRadius: 8,
                display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#475569" }}>Zapłacono: <span style={{ color: "#10b981",
                  fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{fmt(paidAmt)}</span></span>
                <span style={{ color: "#475569" }}>Zostało: <span style={{ color: "#f59e0b",
                  fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{fmt(totalShared - paidAmt)}</span></span>
              </div>
            )}
          </Card>
        );
      })()}

    </div>
  );
};

// ── MAIN APP ─────────────────────────────────────────────────────────────────
// ── STORAGE — localStorage (działa na GitHub Pages) ─────────────────────────
const LS_KEY = "fintrack_v1";

function saveToStorage(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    return Promise.resolve(true);
  } catch(e) {
    console.error("[FT] save failed", e);
    return Promise.resolve(false);
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return Promise.resolve(JSON.parse(raw));
  } catch(e) {}
  return Promise.resolve(null);
}

// JSON export/import (backup)
function downloadJSON(data) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = "fintrack_" + new Date().toISOString().slice(0,10) + ".json";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    return true;
  } catch(e) { return false; }
}

function loadSnapshotFromJSON(json) {
  try { const d = JSON.parse(json); return d.v ? d : null; }
  catch(_) { return null; }
}


// ── NOTIFICATIONS ────────────────────────────────────────────────────────────
async function requestNotifications() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

function schedulePaymentNotifications(payments, paid, month) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const today     = new Date();
  const todayDay  = today.getDate();
  const monthKey  = `2026-${String(month+1).padStart(2,"0")}`;

  payments
    .filter(p => p.trackPaid && p.freq === "monthly" && p.dueDay)
    .filter(p => !paid[`${p.id}_${monthKey}`])
    .forEach(p => {
      const daysUntil = p.dueDay - todayDay;
      if (daysUntil === 3 || daysUntil === 1 || daysUntil === 0) {
        const label = daysUntil === 0 ? "dziś" : daysUntil === 1 ? "jutro" : "za 3 dni";
        setTimeout(() => {
          new Notification("FinTrack 💰", {
            body: `${p.name} (${Math.abs(p.amount).toFixed(2)} zł) — termin ${label}`,
            icon: "/favicon.ico",
          });
        }, 1000);
      }
    });
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [month, setMonth] = useState(2);
  const [customCats,   setCustomCats]   = useState([]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [accounts,     setAccounts]     = useState(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [budgets,      setBudgets]      = useState(INITIAL_BUDGETS);
  const [payments,     setPayments]     = useState(INITIAL_PAYMENTS);
  const [paid,         setPaid]         = useState(INITIAL_PAID);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cycleDay,     setCycleDay]     = useState(1);
  const [goals,        setGoals]        = useState(INITIAL_GOALS);
  const [fabOpen, setFabOpen] = useState(false);
  const [loaded,        setLoaded]        = useState(false);

  // Keep global CATEGORIES in sync with custom categories
  useEffect(() => {
    CATEGORIES = [...BASE_CATEGORIES, ...customCats];
  }, [customCats]);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [importErr,     setImportErr]     = useState("");
  const stateRef = useRef(null);
  stateRef.current = { accounts, transactions, budgets, payments, paid, goals, month, cycleDay, customCats };

  // ── LOAD once on mount ────────────────────────────────────────────────────
  useEffect(() => {
    loadFromStorage().then(d => {
      if (d) {
        if (d.accounts)        setAccounts(d.accounts);
        if (d.transactions)    setTransactions(d.transactions);
        if (d.budgets)         setBudgets(d.budgets);
        if (d.payments)        setPayments(d.payments);
        if (d.paid)            setPaid(d.paid);
        if (d.goals)           setGoals(d.goals);
        if (d.customCats)      setCustomCats(d.customCats);
        if (d.month   != null) setMonth(d.month);
        if (d.cycleDay != null) setCycleDay(d.cycleDay);
      }
      setLoaded(true);
    });
  }, []);

  // ── Schedule notifications when payments change ──────────────────────────
  useEffect(() => {
    if (loaded && notifEnabled) schedulePaymentNotifications(payments, paid, month);
  }, [loaded, payments, paid, month, notifEnabled]);

  // ── SAVE on every change (debounced) ─────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveToStorage({ ...stateRef.current, customCats }).then(ok => {
        if (ok) { setSaveIndicator(true); setTimeout(() => setSaveIndicator(false), 2000); }
      });
    }, 500);
    return () => clearTimeout(t);
  }, [loaded, accounts, transactions, budgets, payments, paid, goals, month, cycleDay, customCats]);

  // ── JSON export (backup) ──────────────────────────────────────────────────
  const handleSaveFile = () => downloadJSON(stateRef.current);

  // ── JSON import (restore backup) ─────────────────────────────────────────
  const handleLoadFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const d = loadSnapshotFromJSON(ev.target.result);
      if (!d) { setImportErr("Nieprawidłowy plik — wybierz plik .json z FinTrack"); return; }
      if (d.accounts)        setAccounts(d.accounts);
      if (d.transactions)    setTransactions(d.transactions);
      if (d.budgets)         setBudgets(d.budgets);
      if (d.payments)        setPayments(d.payments);
      if (d.paid)            setPaid(d.paid);
      if (d.goals)           setGoals(d.goals);
      if (d.month   != null) setMonth(d.month);
      if (d.cycleDay != null) setCycleDay(d.cycleDay);
      setImportErr("");
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const unpaidBillsCount = payments.filter(p =>
    p.trackPaid && p.freq !== "weekly" && !paid[`${p.id}_2026-${String(month+1).padStart(2,"0")}`]
  ).length;

  const TABS = [
    { id: "dashboard",    label: "Start",      Icon: Home },
    { id: "transactions", label: "Transakcje", Icon: List },
    { id: "payments",     label: "Płatności",  Icon: ClipboardList, badge: unpaidBillsCount },
    { id: "goals",        label: "Cele",       Icon: TrendingUp },
    { id: "analytics",    label: "Analiza",    Icon: BarChart2 },
    { id: "accounts",     label: "Konta",      Icon: CreditCard },
  ];


  if (!loaded) return (
    <div style={{ background: "#060b14", minHeight: "100vh", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14,
        background: "linear-gradient(135deg,#1e40af,#7c3aed)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Wallet size={24} color="white"/>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800,
        fontSize: 22, color: "#e2e8f0" }}>FinTrack</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 13, color: "#475569" }}>Wczytuję dane…</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", background: "#060b14", color: "#e2e8f0", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", overflowX: "hidden" }}>
      <FontLoader/>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>

      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "linear-gradient(180deg, #060b14 80%, transparent)", padding: "16px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#1e40af,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={14} color="white"/>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>FinTrack</span>
          <Badge color="#3b82f6">PRO</Badge>
          {cycleDay > 1 && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700,
                           color: "#f59e0b", background: "#78350f22", border: "1px solid #78350f66",
                           borderRadius: 6, padding: "2px 6px" }}>
              /{cycleDay}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {saveIndicator && (
            <div style={{ display: "flex", alignItems: "center", gap: 4,
              background: "#052e16", border: "1px solid #14532d",
              borderRadius: 8, padding: "4px 8px" }}>
              <CheckCircle2 size={11} color="#10b981"/>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981" }}>Zapisano</span>
            </div>
          )}
          {unpaidBillsCount > 0 && (
            <button onClick={() => setTab("payments")} style={{ display: "flex", alignItems: "center", gap: 4, background: "#2d1212", border: "1px solid #7f1d1d", borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: "#fca5a5", fontSize: 11, fontWeight: 700 }}>
              <Bell size={11}/> {unpaidBillsCount}
            </button>
          )}
          <Settings size={17} color="#475569" style={{ cursor: "pointer" }} onClick={() => setSettingsOpen(true)}/>
        </div>
      </div>

      {/* Page content */}
      <div style={{ paddingBottom: 20 }}>
        {tab === "dashboard"    && <Dashboard accounts={accounts} transactions={transactions} setTransactions={setTransactions} payments={payments} month={month} setMonth={setMonth} onAddTx={() => setQuickAddOpen(true)} cycleDay={cycleDay}/>}
        {tab === "accounts"     && <AccountsView accounts={accounts} setAccounts={setAccounts}/>}
        {tab === "transactions" && <TransactionsView transactions={transactions} setTransactions={setTransactions} accounts={accounts} setAccounts={setAccounts} _forceOpenModal={fabOpen} _onModalClose={() => setFabOpen(false)}/>}
        {tab === "payments"     && <PaymentsView payments={payments} setPayments={setPayments} paid={paid} setPaid={setPaid} transactions={transactions} setTransactions={setTransactions} accounts={accounts} month={month}/>}
        {tab === "goals"        && <GoalsView goals={goals} setGoals={setGoals} accounts={accounts} budgets={budgets} setBudgets={setBudgets} transactions={transactions} month={month}/>}
        {tab === "analytics"    && <AnalyticsView transactions={transactions} payments={payments} paid={paid} month={month} cycleDay={cycleDay}/>}
      </div>

      {/* Settings panel */}
      {/* Import error toast */}
      {importErr && (
        <div style={{ position: "fixed", top: 70, left: 12, right: 12, zIndex: 300,
          background: "#1a0808", border: "1px solid #7f1d1d", borderRadius: 12,
          padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>❌</span>
          <span style={{ fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>{importErr}</span>
          <button onClick={() => setImportErr("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><X size={14}/></button>
        </div>
      )}

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        accounts={accounts}
        transactions={transactions}
        budgets={budgets}
        payments={payments}
        paid={paid}
        setTransactions={setTransactions}
        setAccounts={setAccounts}
        setBudgets={setBudgets}
        cycleDay={cycleDay}
        setCycleDay={setCycleDay}
        customCats={customCats}
        setCustomCats={setCustomCats}
        notifEnabled={notifEnabled}
        setNotifEnabled={setNotifEnabled}
      />

      {/* Quick-add transaction modal (from reminder) */}
      {quickAddOpen && (
        <TransactionsView
          transactions={transactions}
          setTransactions={(txs) => { setTransactions(txs); setQuickAddOpen(false); }}
          accounts={accounts}
          setAccounts={setAccounts}
          _forceOpenModal={true}
          _onClose={() => setQuickAddOpen(false)}
        />
      )}

{/* FAB is now inside the nav bar — see below */}

      {/* Bottom navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "linear-gradient(180deg, transparent 0%, #060b14 20%)",
        paddingTop: 20, paddingBottom: 8,
      }}>
        <div style={{ display: "flex", background: "#0a1120", border: "1px solid #1a2744", borderRadius: 20, margin: "0 12px", padding: "5px 3px", alignItems: "center" }}>
          {/* Left tabs */}
          {TABS.slice(0, 3).map(({ id, label, Icon, badge }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, background: active ? "#1e3a5f" : "none",
                border: active ? "1px solid #2563eb44" : "1px solid transparent",
                borderRadius: 13, padding: "7px 2px",
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "all 0.2s ease", position: "relative",
              }}>
                <Icon size={15} color={active ? "#60a5fa" : "#334155"}/>
                {badge > 0 && (
                  <div style={{ position: "absolute", top: 4, right: 6, background: "#ef4444", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 8, fontWeight: 800, color: "white" }}>{badge > 9 ? "9+" : badge}</span>
                  </div>
                )}
                <span style={{ fontSize: 8, fontWeight: 700, color: active ? "#60a5fa" : "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
              </button>
            );
          })}
          {/* end right tabs */}

          {/* Centre FAB */}
          <button
            onClick={() => { setFabOpen(true); setTab("transactions"); }}
            style={{
              width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,#1e40af,#7c3aed)",
              border: "2px solid #0a1120",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 16px #7c3aed55",
              transition: "transform 0.12s ease",
              margin: "0 2px",
            }}
            onPointerDown={e => e.currentTarget.style.transform = "scale(0.9)"}
            onPointerUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <PlusCircle size={20} color="white"/>
          </button>

          {/* Right tabs */}
          {TABS.slice(3).map(({ id, label, Icon, badge }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, background: active ? "#1e3a5f" : "none",
                border: active ? "1px solid #2563eb44" : "1px solid transparent",
                borderRadius: 13, padding: "7px 2px",
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "all 0.2s ease", position: "relative",
              }}>
                <Icon size={15} color={active ? "#60a5fa" : "#334155"}/>
                {badge > 0 && (
                  <div style={{ position: "absolute", top: 4, right: 6, background: "#ef4444", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 8, fontWeight: 800, color: "white" }}>{badge > 9 ? "9+" : badge}</span>
                  </div>
                )}
                <span style={{ fontSize: 8, fontWeight: 700, color: active ? "#60a5fa" : "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
