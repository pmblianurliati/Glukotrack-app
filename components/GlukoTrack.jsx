"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Utensils,
  GlassWater,
  Coffee,
  Trash2,
  SlidersHorizontal,
  Check,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";

// ---------- constants ----------
const ACTIVITY_TYPES = ["Jalan kaki", "Lari", "Angkat beban", "Yoga", "Bersepeda", "Lainnya"];
const HIGH_THRESHOLD = 100; // mg/dL, ambang filter "tinggi" untuk gula puasa
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const MONTHS_SHORT_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const DAYS_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const DAYS_MIN_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

// ---------- pure calendar-date helpers (UTC-based math, no timezone drift) ----------
function pad(n) { return String(n).padStart(2, "0"); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function ymd(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}
function weekdayOf(dateStr) {
  const { y, m, d } = ymd(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function addDays(dateStr, delta) {
  const { y, m, d } = ymd(dateStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
function formatLong(dateStr) {
  const { y, m, d } = ymd(dateStr);
  return `${DAYS_ID[weekdayOf(dateStr)]}, ${d} ${MONTHS_ID[m - 1]} ${y}`;
}
function formatShort(dateStr) {
  const { y, m, d } = ymd(dateStr);
  return `${d} ${MONTHS_SHORT_ID[m - 1]}`;
}
function formatShortYear(dateStr) {
  const { y, m, d } = ymd(dateStr);
  return `${d} ${MONTHS_SHORT_ID[m - 1]} ${y}`;
}
function monthKeyOf(dateStr) { return dateStr.slice(0, 7); }
function formatMonthYearFromKey(mk) {
  const [y, m] = mk.split("-").map(Number);
  return `${MONTHS_ID[m - 1]} ${y}`;
}
function getCalendarCells(year, monthIndex0) {
  const firstDow = new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, monthIndex0, 0)).getUTCDate();
  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    let pm = monthIndex0 - 1, py = year;
    if (pm < 0) { pm = 11; py = year - 1; }
    cells.push({ date: `${py}-${pad(pm + 1)}-${pad(dayNum)}`, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${year}-${pad(monthIndex0 + 1)}-${pad(d)}`, inMonth: true });
  }
  let next = 1;
  while (cells.length < 42) {
    let nm = monthIndex0 + 1, ny = year;
    if (nm > 11) { nm = 0; ny = year + 1; }
    cells.push({ date: `${ny}-${pad(nm + 1)}-${pad(next)}`, inMonth: false });
    next++;
  }
  return cells;
}
function emptyForm(date) {
  return {
    date,
    isIF: false,
    gulaPuasa: "",
    ifStart: "",
    ifFirstMeal: "",
    makan: [],
    cek2Jam: false,
    gula2Jam: "",
    isAktivitas: false,
    aktivitas: [],
    konsumsiLain: [],
    airMinum: "",
    catatan: "",
  };
}

// ---------- small UI building blocks ----------
function YesNoToggle({ value, onChange, labelYes = "Ya", labelNo = "Tidak" }) {
  return (
    <div className="yn-toggle">
      <button type="button" className={`yn-btn ${value === true ? "yn-active-yes" : ""}`} onClick={() => onChange(true)}>{labelYes}</button>
      <button type="button" className={`yn-btn ${value === false ? "yn-active-no" : ""}`} onClick={() => onChange(false)}>{labelNo}</button>
    </div>
  );
}
function Chip({ active, onClick, children }) {
  return <button type="button" className={`chip ${active ? "chip-active" : ""}`} onClick={onClick}>{children}</button>;
}

function DateField({ value, onChange, editable = true }) {
  const [open, setOpen] = useState(false);
  const start = ymd(value);
  const [viewYear, setViewYear] = useState(start.y);
  const [viewMonth, setViewMonth] = useState(start.m - 1);

  useEffect(() => {
    if (open) {
      const v = ymd(value);
      setViewYear(v.y);
      setViewMonth(v.m - 1);
    }
  }, [open, value]);

  if (!editable) return <div className="date-field-static">{formatLong(value)}</div>;

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear((v) => v - 1); } else setViewMonth((v) => v - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear((v) => v + 1); } else setViewMonth((v) => v + 1); }
  function pickToday() { onChange(todayStr()); setOpen(false); }
  function pickDate(d) { onChange(d); setOpen(false); }

  const cells = getCalendarCells(viewYear, viewMonth);
  const weeks = [];
  for (let i = 0; i < 6; i++) weeks.push(cells.slice(i * 7, i * 7 + 7));

  return (
    <div className="date-field-wrap">
      <button type="button" className="date-field-btn" onClick={() => setOpen((o) => !o)}>
        <span>{formatLong(value)}</span>
        <CalendarIcon size={17} />
      </button>
      {open && (
        <>
          <div className="date-popover-backdrop" onClick={() => setOpen(false)} />
          <div className="date-popover">
            <div className="date-popover-header">
              <button type="button" className="icon-btn small" onClick={prevMonth}><ChevronLeft size={15} /></button>
              <span className="date-popover-title">{MONTHS_ID[viewMonth]} {viewYear}</span>
              <button type="button" className="icon-btn small" onClick={nextMonth}><ChevronRight size={15} /></button>
            </div>
            <div className="date-popover-weekdays">{DAYS_MIN_ID.map((d) => <span key={d}>{d}</span>)}</div>
            {weeks.map((week, wi) => (
              <div className="date-popover-row" key={wi}>
                {week.map((cell) => {
                  const isSelected = cell.date === value;
                  const isToday = cell.date === todayStr();
                  return (
                    <button type="button" key={cell.date}
                      className={`date-cell ${!cell.inMonth ? "muted" : ""} ${isSelected ? "selected" : ""} ${isToday && !isSelected ? "today" : ""}`}
                      onClick={() => pickDate(cell.date)}>
                      {Number(cell.date.slice(8, 10))}
                    </button>
                  );
                })}
              </div>
            ))}
            <button type="button" className="today-btn" onClick={pickToday}>Hari Ini</button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- main app ----------
export default function GlukoTrackApp() {
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("manage");
  const [form, setForm] = useState(emptyForm(todayStr()));
  const [formError, setFormError] = useState("");

  const [rangeMode, setRangeMode] = useState("all");
  const [customStart, setCustomStart] = useState(addDays(todayStr(), -6));
  const [customEnd, setCustomEnd] = useState(todayStr());

  const [showFilters, setShowFilters] = useState(false);
  const [filterPuasa, setFilterPuasa] = useState("all");
  const [filterAktivitas, setFilterAktivitas] = useState("all");
  const [filterJenis, setFilterJenis] = useState([]);

  const STORAGE_KEY = "glukotrack_entries";

  // ---------- load from THIS device's local storage (not shared across devices) ----------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setEntries(raw ? JSON.parse(raw) : {});
    } catch (e) {
      setLoadError("Gagal memuat data dari penyimpanan lokal perangkat ini.");
    } finally {
      setLoading(false);
    }
  }, []);

  function openManageModal() {
    const date = todayStr();
    const existing = entries[date];
    setForm(existing ? JSON.parse(JSON.stringify(existing)) : emptyForm(date));
    setModalMode("manage");
    setFormError("");
    setShowModal(true);
  }
  function openLockedModal(date) {
    const existing = entries[date];
    setForm(existing ? JSON.parse(JSON.stringify(existing)) : emptyForm(date));
    setModalMode("locked");
    setFormError("");
    setShowModal(true);
  }
  function handleModalDateChange(newDate) {
    const existing = entries[newDate];
    setForm(existing ? JSON.parse(JSON.stringify(existing)) : emptyForm(newDate));
    setFormError("");
  }

  async function handleSave() {
    if (form.isIF && (!form.gulaPuasa || Number(form.gulaPuasa) <= 0)) {
      setFormError("Gula darah puasa wajib diisi saat IF diisi Ya.");
      return;
    }
    const record = {
      ...form,
      gulaPuasa: form.isIF && form.gulaPuasa !== "" ? Number(form.gulaPuasa) : null,
      gula2Jam: form.cek2Jam && form.gula2Jam !== "" ? Number(form.gula2Jam) : null,
      airMinum: form.airMinum !== "" ? Number(form.airMinum) : null,
      aktivitas: form.isAktivitas ? form.aktivitas.filter((a) => a.jenis) : [],
      makan: form.makan.filter((m) => m.waktu || m.menu),
      konsumsiLain: form.konsumsiLain.filter((k) => k.item || k.jumlah),
    };
    setSaving(true);
    setFormError("");
    try {
      const next = { ...entries, [record.date]: record };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setEntries(next);
      setShowModal(false);
    } catch (e) {
      setFormError("Gagal menyimpan ke penyimpanan lokal perangkat ini.");
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete() {
    setSaving(true);
    setFormError("");
    try {
      const next = { ...entries };
      delete next[form.date];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setEntries(next);
      setShowModal(false);
    } catch (e) {
      setFormError("Gagal menghapus.");
    } finally {
      setSaving(false);
    }
  }

  function addMeal() {
    const isFirst = form.makan.length === 0;
    const defaultWaktu = isFirst && form.isIF && form.ifFirstMeal ? form.ifFirstMeal : "";
    setForm((f) => ({ ...f, makan: [...f.makan, { id: Date.now() + Math.random(), waktu: defaultWaktu, menu: "" }] }));
  }
  function updateMeal(id, key, value) { setForm((f) => ({ ...f, makan: f.makan.map((m) => (m.id === id ? { ...m, [key]: value } : m)) })); }
  function removeMeal(id) { setForm((f) => ({ ...f, makan: f.makan.filter((m) => m.id !== id) })); }

  function addActivity() { setForm((f) => ({ ...f, aktivitas: [...f.aktivitas, { id: Date.now() + Math.random(), jenis: ACTIVITY_TYPES[0], durasi: "" }] })); }
  function updateActivity(id, key, value) { setForm((f) => ({ ...f, aktivitas: f.aktivitas.map((a) => (a.id === id ? { ...a, [key]: value } : a)) })); }
  function removeActivity(id) { setForm((f) => ({ ...f, aktivitas: f.aktivitas.filter((a) => a.id !== id) })); }

  function addKonsumsi() { setForm((f) => ({ ...f, konsumsiLain: [...f.konsumsiLain, { id: Date.now() + Math.random(), item: "", jumlah: "" }] })); }
  function updateKonsumsi(id, key, value) { setForm((f) => ({ ...f, konsumsiLain: f.konsumsiLain.map((k) => (k.id === id ? { ...k, [key]: value } : k)) })); }
  function removeKonsumsi(id) { setForm((f) => ({ ...f, konsumsiLain: f.konsumsiLain.filter((k) => k.id !== id) })); }

  // ---------- shared range + filter, feeds BOTH the chart and the table ----------
  const rangeDates = useMemo(() => {
    if (rangeMode === "all") return null;
    let start, end;
    if (rangeMode === "custom") { start = customStart; end = customEnd; }
    else { end = todayStr(); start = addDays(end, -(Number(rangeMode) - 1)); }
    if (start > end) [start, end] = [end, start];
    return { start, end };
  }, [rangeMode, customStart, customEnd]);

  const matchesFilters = useCallback((rec) => {
    if (filterPuasa === "above" && !(rec.gulaPuasa != null && rec.gulaPuasa > HIGH_THRESHOLD)) return false;
    if (filterPuasa === "below" && !(rec.gulaPuasa != null && rec.gulaPuasa <= HIGH_THRESHOLD)) return false;
    const hasAktivitas = rec.aktivitas && rec.aktivitas.length > 0;
    if (filterAktivitas === "yes" && !hasAktivitas) return false;
    if (filterAktivitas === "no" && hasAktivitas) return false;
    if (filterJenis.length > 0) {
      const jenisList = (rec.aktivitas || []).map((a) => a.jenis);
      if (!filterJenis.some((j) => jenisList.includes(j))) return false;
    }
    return true;
  }, [filterPuasa, filterAktivitas, filterJenis]);

  const filteredAsc = useMemo(() => {
    return Object.values(entries)
      .filter((rec) => !rangeDates || (rec.date >= rangeDates.start && rec.date <= rangeDates.end))
      .filter(matchesFilters)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [entries, rangeDates, matchesFilters]);

  const filteredDesc = useMemo(() => [...filteredAsc].reverse(), [filteredAsc]);

  const groupedByMonth = useMemo(() => {
    const map = {};
    filteredDesc.forEach((rec) => {
      const mk = monthKeyOf(rec.date);
      if (!map[mk]) map[mk] = [];
      map[mk].push(rec);
    });
    return map;
  }, [filteredDesc]);
  const monthKeysDesc = useMemo(() => Object.keys(groupedByMonth).sort((a, b) => (a < b ? 1 : -1)), [groupedByMonth]);

  const chartData = useMemo(() => filteredAsc.map((rec) => ({
    date: rec.date,
    label: formatShort(rec.date),
    puasa: rec.gulaPuasa ?? null,
    dua: rec.gula2Jam ?? null,
    aktivitas: (rec.aktivitas || []).length > 0,
  })), [filteredAsc]);
  const hasAny2Jam = chartData.some((d) => d.dua !== null && d.dua !== undefined);
  const activeFilterCount = (filterPuasa !== "all" ? 1 : 0) + (filterAktivitas !== "all" ? 1 : 0) + filterJenis.length;

  function toggleJenisFilter(j) { setFilterJenis((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j])); }

  function ActivityDot(props) {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload.puasa == null) return null;
    return <circle cx={cx} cy={cy} r={5} fill={payload.aktivitas ? "var(--color-teal)" : "#FFFFFF"} stroke="var(--color-primary)" strokeWidth={2} />;
  }

  function renderTable(rows) {
    return (
      <div className="table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th className="sticky-col">Tanggal</th>
              <th>Puasa</th>
              <th>2 Jam</th>
              <th>IF (H-1 → hari ini)</th>
              <th>Aktivitas</th>
              <th>Air</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rec) => (
              <tr key={rec.date} onClick={() => openLockedModal(rec.date)}>
                <td className="sticky-col">{formatShort(rec.date)}</td>
                <td>{rec.gulaPuasa != null ? <span className={`badge ${rec.gulaPuasa > HIGH_THRESHOLD ? "high" : "ok"}`}>{rec.gulaPuasa}</span> : "–"}</td>
                <td>{rec.gula2Jam != null ? rec.gula2Jam : "–"}</td>
                <td className="if-cell">{rec.isIF ? `${rec.ifStart || "–"} → ${rec.ifFirstMeal || "–"}` : "–"}</td>
                <td className="akt-cell">{(rec.aktivitas || []).length > 0 ? rec.aktivitas.map((a) => a.jenis).join(", ") : "–"}</td>
                <td>{rec.airMinum != null ? `${rec.airMinum} gls` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --color-bg: #FAF8FF;
          --color-surface: #FFFFFF;
          --color-primary: #7C5CFC;
          --color-primary-dark: #5B3DF5;
          --color-primary-light: #F1ECFF;
          --color-teal: #0FA98C;
          --color-teal-light: #E3F8F3;
          --color-coral: #F0653E;
          --color-coral-light: #FDEAE3;
          --color-text: #211B36;
          --color-text-secondary: #756F8A;
          --color-border: #EAE6F7;
          --font-display: 'Plus Jakarta Sans', sans-serif;
          --font-body: 'Inter', sans-serif;
        }
        * { box-sizing: border-box; }
        .app-root { font-family: var(--font-body); background: var(--color-bg); color: var(--color-text); min-height: 100vh; display: flex; justify-content: center; }
        .app-shell { width: 100%; max-width: 480px; padding: 20px 16px 100px; position: relative; }
        .header { margin-bottom: 20px; }
        .headline { font-family: var(--font-display); font-weight: 800; font-size: 30px; letter-spacing: -0.01em; line-height: 1.15; margin: 0; background: linear-gradient(90deg, var(--color-primary-dark), var(--color-teal)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .tagline { font-size: 16px; color: var(--color-text-secondary); margin: 5px 0 0; }
        .subheadline { font-family: var(--font-display); font-weight: 700; font-size: 22px; margin: 22px 0 12px; color: var(--color-text); }
        p, span, div, button, input, select, textarea, label { font-size: 18px; }

        .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 18px; padding: 16px; margin-bottom: 16px; }
        .btn-primary { background: var(--color-primary); color: white; border: none; padding: 12px 18px; border-radius: 12px; font-weight: 700; font-family: var(--font-body); font-size: 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
        .btn-primary:active { background: var(--color-primary-dark); }
        .btn-primary:disabled, .btn-danger-slim:disabled { opacity: 0.6; cursor: not-allowed; }

        .fab { position: fixed; bottom: 24px; left: 50%; transform: translateX(calc(-50% + 176px)); background: var(--color-primary); color: white; border: none; border-radius: 50px; padding: 14px 20px; display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 10px 24px rgba(124,92,252,0.4); cursor: pointer; z-index: 20; }
        @media (max-width: 480px) { .fab { transform: none; right: 16px; left: auto; } }

        .axis-caption { font-size: 11.5px; color: var(--color-text-secondary); margin: 0 0 8px; }
        .legend-row { display: flex; gap: 14px; font-size: 11.5px; color: var(--color-text-secondary); margin-top: 6px; flex-wrap: wrap; }
        .legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
        .empty-state { text-align: center; color: var(--color-text-secondary); padding: 30px 10px; font-size: 15px; }
        .error-banner { background: var(--color-coral-light); color: var(--color-coral); border-radius: 12px; padding: 12px 14px; font-size: 14px; margin-bottom: 16px; font-weight: 600; }

        .range-tabs { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
        .range-tab { border: 1px solid var(--color-border); background: var(--color-surface); padding: 7px 14px; border-radius: 20px; font-size: 14px; font-weight: 600; color: var(--color-text-secondary); cursor: pointer; }
        .range-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
        .custom-range-row { display: flex; gap: 8px; margin-bottom: 14px; }
        .custom-range-row > div { flex: 1; }
        .custom-range-row .mini-label { margin-bottom: 5px; }
        .filter-toggle-btn { display: flex; align-items: center; gap: 6px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 9px 14px; font-weight: 600; font-size: 14px; cursor: pointer; margin-bottom: 12px; color: var(--color-text); }
        .filter-toggle-btn .count { background: var(--color-primary); color: white; border-radius: 20px; font-size: 12px; padding: 1px 7px; font-weight: 700; }
        .filter-group-title { font-size: 13px; font-weight: 700; color: var(--color-text-secondary); margin: 12px 0 6px; }
        .filter-group-title:first-child { margin-top: 0; }
        .chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { border: 1px solid var(--color-border); background: var(--color-surface); padding: 7px 13px; border-radius: 20px; font-size: 14px; font-weight: 600; color: var(--color-text-secondary); cursor: pointer; }
        .chip-active { background: var(--color-primary); color: white; border-color: var(--color-primary); }

        .month-header { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--color-primary-dark); margin: 18px 0 8px; }
        .table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: 14px; margin-bottom: 6px; }
        .history-table { border-collapse: collapse; width: 100%; min-width: 560px; background: var(--color-surface); }
        .history-table th { text-align: left; font-size: 12.5px; font-weight: 700; color: var(--color-text-secondary); background: var(--color-primary-light); padding: 10px 12px; white-space: nowrap; }
        .history-table td { font-size: 14.5px; padding: 10px 12px; border-top: 1px solid var(--color-border); white-space: nowrap; }
        .history-table tr:not(thead tr) { cursor: pointer; }
        .history-table tbody tr:hover td { background: var(--color-primary-light); }
        .sticky-col { position: sticky; left: 0; background: var(--color-surface); z-index: 1; }
        thead .sticky-col { background: var(--color-primary-light); z-index: 2; }
        .badge { font-weight: 800; font-size: 14px; padding: 3px 9px; border-radius: 8px; }
        .badge.high { background: var(--color-coral-light); color: var(--color-coral); }
        .badge.ok { background: var(--color-teal-light); color: var(--color-teal); }

        .modal-overlay { position: fixed; inset: 0; background: var(--color-bg); z-index: 50; display: flex; flex-direction: column; }
        .modal-sheet { flex: 1; overflow-y: auto; width: 100%; max-width: 480px; margin: 0 auto; padding: 20px 18px 40px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; position: sticky; top: 0; background: var(--color-bg); padding-top: 2px; padding-bottom: 8px; z-index: 5; }
        .modal-title { font-family: var(--font-display); font-weight: 800; font-size: 20px; }
        .icon-btn { background: var(--color-primary-light); border: none; border-radius: 10px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--color-primary-dark); }
        .icon-btn.small { width: 28px; height: 28px; border-radius: 8px; }
        .icon-btn-danger { background: var(--color-coral-light); color: var(--color-coral); border: none; border-radius: 10px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .field-block { margin-bottom: 18px; }
        .field-label { font-weight: 700; font-size: 15px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .required-star { color: var(--color-coral); }
        .field-hint { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }
        input[type="number"], input[type="text"], input[type="time"], textarea, select { width: 100%; border: 1px solid var(--color-border); border-radius: 12px; padding: 11px 13px; font-size: 16px; font-family: var(--font-body); background: var(--color-surface); color: var(--color-text); }
        textarea { resize: vertical; min-height: 70px; }
        .input-with-unit { position: relative; }
        .input-with-unit span { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--color-text-secondary); font-weight: 600; }
        .yn-toggle { display: flex; gap: 8px; }
        .yn-btn { flex: 1; padding: 10px; border-radius: 12px; border: 1px solid var(--color-border); background: var(--color-surface); font-weight: 700; font-size: 15px; cursor: pointer; color: var(--color-text-secondary); }
        .yn-active-yes { background: var(--color-teal); color: white; border-color: var(--color-teal); }
        .yn-active-no { background: var(--color-coral); color: white; border-color: var(--color-coral); }
        .sub-fields { margin-top: 12px; padding: 12px; background: var(--color-primary-light); border-radius: 14px; }
        .sub-fields-row { display: flex; gap: 10px; }
        .sub-fields-row > div { flex: 1; }
        .mini-label { font-size: 13px; font-weight: 600; margin-bottom: 5px; color: var(--color-text-secondary); }
        .date-caption { font-size: 12.5px; color: var(--color-primary-dark); font-weight: 600; margin-top: 5px; }
        .repeat-item { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 10px; margin-bottom: 8px; }
        .repeat-item-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .repeat-item-title { font-weight: 700; font-size: 14px; color: var(--color-primary-dark); }
        .add-row-btn { width: 100%; border: 1.5px dashed var(--color-primary); background: var(--color-primary-light); color: var(--color-primary-dark); border-radius: 12px; padding: 10px; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; margin-top: 4px; }
        .trash-btn { background: none; border: none; color: var(--color-coral); cursor: pointer; display: flex; }
        .error-msg { color: var(--color-coral); font-size: 14px; margin: 6px 0 10px; font-weight: 600; }
        .modal-actions { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 10px; }
        .btn-primary.full { width: 100%; }
        .btn-danger-slim { background: var(--color-coral-light); color: var(--color-coral); border: none; padding: 10px; border-radius: 12px; font-weight: 700; cursor: pointer; width: 33%; }
        .loading-wrap { display:flex; align-items:center; justify-content:center; padding: 60px 0; color: var(--color-text-secondary); gap:8px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }

        .date-field-wrap { position: relative; }
        .date-field-static { border: 1px solid var(--color-border); border-radius: 12px; padding: 11px 13px; background: var(--color-primary-light); color: var(--color-text); font-weight: 600; font-size: 15px; }
        .date-field-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--color-border); border-radius: 12px; padding: 11px 13px; background: var(--color-surface); font-weight: 600; font-size: 15px; color: var(--color-text); cursor: pointer; }
        .date-popover-backdrop { position: fixed; inset: 0; z-index: 55; background: transparent; }
        .date-popover { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 12px; box-shadow: 0 12px 30px rgba(33,27,54,0.18); z-index: 60; }
        .date-popover-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .date-popover-title { font-weight: 700; font-size: 14.5px; }
        .date-popover-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 12px; color: var(--color-text-secondary); font-weight: 700; margin-bottom: 4px; }
        .date-popover-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 2px; }
        .date-cell { border: none; background: transparent; border-radius: 8px; padding: 7px 0; font-size: 13.5px; cursor: pointer; color: var(--color-text); }
        .date-cell.muted { color: #C9C3DA; }
        .date-cell.today { border: 1.5px solid var(--color-primary); font-weight: 700; }
        .date-cell.selected { background: var(--color-primary); color: white; font-weight: 700; }
        .date-cell:hover:not(.selected) { background: var(--color-primary-light); }
        .today-btn { width: 100%; margin-top: 6px; background: var(--color-teal-light); color: var(--color-teal); border: none; border-radius: 10px; padding: 9px; font-weight: 700; font-size: 14px; cursor: pointer; }
      `}</style>

      <div className="app-shell">
        <div className="header">
          <h1 className="headline">GlukoTrack</h1>
          <p className="tagline">Catatan gula darah & aktivitas harianmu</p>
        </div>

        {loadError && (
          <div className="error-banner">
            Gagal memuat data: {loadError}
          </div>
        )}

        {loading ? (
          <div className="loading-wrap"><Loader2 size={20} className="spin" /> Memuat data...</div>
        ) : (
          <>
            <h2 className="subheadline" style={{ marginTop: 0 }}>Tren Gula Darah</h2>
            <div className="card">
              {chartData.length === 0 ? (
                <p className="empty-state">Belum ada data pada rentang/filter ini.</p>
              ) : (
                <>
                  <p className="axis-caption">Sumbu X: Tanggal &nbsp;•&nbsp; Sumbu Y: Gula Darah (mg/dL)</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#756F8A" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#756F8A" }} axisLine={false} tickLine={false} width={40} />
                      <ReferenceLine y={HIGH_THRESHOLD} stroke="#F0653E" strokeDasharray="3 3" />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EAE6F7", fontSize: 13 }} formatter={(value, name) => [`${value} mg/dL`, name === "puasa" ? "Puasa" : "2 Jam"]} />
                      <Line type="monotone" dataKey="puasa" stroke="var(--color-primary)" strokeWidth={2.5} dot={<ActivityDot />} activeDot={{ r: 6 }} connectNulls={false} />
                      {hasAny2Jam && <Line type="monotone" dataKey="dua" stroke="var(--color-teal)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="legend-row">
                    <span><span className="legend-dot" style={{ background: "var(--color-primary)" }} />Puasa</span>
                    {hasAny2Jam && <span><span className="legend-dot" style={{ background: "var(--color-teal)" }} />2 Jam</span>}
                    <span><span className="legend-dot" style={{ background: "var(--color-teal)", border: "2px solid var(--color-primary)" }} />Ada aktivitas fisik</span>
                  </div>
                </>
              )}
            </div>

            <h2 className="subheadline">Riwayat</h2>

            <div className="range-tabs">
              {[["7", "7 Hari"], ["14", "14 Hari"], ["all", "Semua (per bulan)"], ["custom", "Custom"]].map(([val, label]) => (
                <button key={val} className={`range-tab ${rangeMode === val ? "active" : ""}`} onClick={() => setRangeMode(val)}>{label}</button>
              ))}
            </div>
            {rangeMode === "custom" && (
              <div className="custom-range-row">
                <div><p className="mini-label">Dari</p><DateField value={customStart} onChange={setCustomStart} /></div>
                <div><p className="mini-label">Sampai</p><DateField value={customEnd} onChange={setCustomEnd} /></div>
              </div>
            )}

            <button className="filter-toggle-btn" onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal size={16} /> Filter
              {activeFilterCount > 0 && <span className="count">{activeFilterCount}</span>}
            </button>
            {showFilters && (
              <div className="card">
                <p className="filter-group-title">Status Gula Puasa</p>
                <div className="chip-row">
                  <Chip active={filterPuasa === "all"} onClick={() => setFilterPuasa("all")}>Semua</Chip>
                  <Chip active={filterPuasa === "above"} onClick={() => setFilterPuasa("above")}>{`> ${HIGH_THRESHOLD} mg/dL`}</Chip>
                  <Chip active={filterPuasa === "below"} onClick={() => setFilterPuasa("below")}>{`≤ ${HIGH_THRESHOLD} mg/dL`}</Chip>
                </div>
                <p className="filter-group-title">Aktivitas Fisik</p>
                <div className="chip-row">
                  <Chip active={filterAktivitas === "all"} onClick={() => setFilterAktivitas("all")}>Semua</Chip>
                  <Chip active={filterAktivitas === "yes"} onClick={() => setFilterAktivitas("yes")}>Ya</Chip>
                  <Chip active={filterAktivitas === "no"} onClick={() => setFilterAktivitas("no")}>Tidak</Chip>
                </div>
                {filterAktivitas !== "no" && (
                  <>
                    <p className="filter-group-title">Jenis Aktivitas</p>
                    <div className="chip-row">
                      {ACTIVITY_TYPES.map((j) => <Chip key={j} active={filterJenis.includes(j)} onClick={() => toggleJenisFilter(j)}>{j}</Chip>)}
                    </div>
                  </>
                )}
              </div>
            )}

            {filteredDesc.length === 0 ? (
              <p className="empty-state">Tidak ada catatan yang cocok dengan filter/rentang ini.</p>
            ) : rangeMode === "all" ? (
              monthKeysDesc.map((mk) => (
                <div key={mk}>
                  <p className="month-header">{formatMonthYearFromKey(mk)}</p>
                  {renderTable(groupedByMonth[mk])}
                </div>
              ))
            ) : (
              renderTable(filteredDesc)
            )}
          </>
        )}

        {!loading && <button className="fab" onClick={openManageModal}><Plus size={18} /> Isi Tracking</button>}
      </div>

      {/* ---------------- MODAL FORM (full screen, exits only via X) ---------------- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-sheet">
            <div className="modal-header">
              <span className="modal-title">Tracking Harian</span>
              <button className="icon-btn-danger" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            {formError && <p className="error-msg">{formError}</p>}

            <div className="field-block">
              <label className="field-label">Tanggal</label>
              <DateField value={form.date} onChange={handleModalDateChange} editable={modalMode === "manage"} />
              {modalMode === "locked" && <p className="field-hint">Tanggal catatan ini terkunci — hanya isinya yang bisa diedit.</p>}
            </div>

            <div className="field-block">
              <label className="field-label">Intermittent Fasting (IF)?</label>
              <YesNoToggle value={form.isIF} onChange={(v) => setForm((f) => ({ ...f, isIF: v }))} />
              {form.isIF && (
                <div className="sub-fields">
                  <p className="mini-label">Gula Darah Puasa <span className="required-star">*</span></p>
                  <div className="input-with-unit" style={{ marginBottom: 12 }}>
                    <input type="number" placeholder="mis. 95" value={form.gulaPuasa} onChange={(e) => setForm((f) => ({ ...f, gulaPuasa: e.target.value }))} />
                    <span>mg/dL</span>
                  </div>
                  <div className="sub-fields-row">
                    <div>
                      <p className="mini-label">Mulai puasa jam (H-1)</p>
                      <input type="time" value={form.ifStart} onChange={(e) => setForm((f) => ({ ...f, ifStart: e.target.value }))} />
                      <p className="date-caption">Tanggal: {formatShortYear(addDays(form.date, -1))}</p>
                    </div>
                    <div>
                      <p className="mini-label">Mulai makan pertama jam</p>
                      <input type="time" value={form.ifFirstMeal} onChange={(e) => setForm((f) => ({ ...f, ifFirstMeal: e.target.value }))} />
                      <p className="date-caption">Tanggal: {formatShortYear(form.date)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="field-block">
              <label className="field-label"><Utensils size={16} /> Jadwal Makan</label>
              {form.makan.map((m, idx) => (
                <div key={m.id} className="repeat-item">
                  <div className="repeat-item-head">
                    <span className="repeat-item-title">Makan ke-{idx + 1}</span>
                    <button className="trash-btn" onClick={() => removeMeal(m.id)}><Trash2 size={16} /></button>
                  </div>
                  <div className="sub-fields-row">
                    <div><p className="mini-label">Jam makan</p><input type="time" value={m.waktu} onChange={(e) => updateMeal(m.id, "waktu", e.target.value)} /></div>
                    <div style={{ flex: 2 }}><p className="mini-label">Makan apa</p><input type="text" placeholder="mis. Nasi, ayam, sayur" value={m.menu} onChange={(e) => updateMeal(m.id, "menu", e.target.value)} /></div>
                  </div>
                </div>
              ))}
              <button className="add-row-btn" onClick={addMeal}><Plus size={15} /> Tambah Waktu Makan</button>
            </div>

            <div className="field-block">
              <label className="field-label">Cek Gula Darah 2 Jam?</label>
              <YesNoToggle value={form.cek2Jam} onChange={(v) => setForm((f) => ({ ...f, cek2Jam: v }))} />
              {form.cek2Jam && (
                <div className="sub-fields">
                  <div className="input-with-unit">
                    <input type="number" placeholder="mis. 130" value={form.gula2Jam} onChange={(e) => setForm((f) => ({ ...f, gula2Jam: e.target.value }))} />
                    <span>mg/dL</span>
                  </div>
                </div>
              )}
            </div>

            <div className="field-block">
              <label className="field-label"><Activity size={16} /> Aktivitas Fisik Hari Ini?</label>
              <YesNoToggle value={form.isAktivitas} onChange={(v) => setForm((f) => ({ ...f, isAktivitas: v }))} />
              {form.isAktivitas && (
                <div style={{ marginTop: 10 }}>
                  {form.aktivitas.map((a, idx) => (
                    <div key={a.id} className="repeat-item">
                      <div className="repeat-item-head">
                        <span className="repeat-item-title">Aktivitas {idx + 1}</span>
                        <button className="trash-btn" onClick={() => removeActivity(a.id)}><Trash2 size={16} /></button>
                      </div>
                      <div className="sub-fields-row">
                        <div>
                          <p className="mini-label">Jenis aktivitas</p>
                          <select value={a.jenis} onChange={(e) => updateActivity(a.id, "jenis", e.target.value)}>
                            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="mini-label">Durasi (menit)</p>
                          <input type="number" placeholder="mis. 30" value={a.durasi} onChange={(e) => updateActivity(a.id, "durasi", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button className="add-row-btn" onClick={addActivity}><Plus size={15} /> Tambah Aktivitas</button>
                </div>
              )}
            </div>

            <div className="field-block">
              <label className="field-label"><Coffee size={16} /> Konsumsi Diluar Jam Makan</label>
              {form.konsumsiLain.map((k, idx) => (
                <div key={k.id} className="repeat-item">
                  <div className="repeat-item-head">
                    <span className="repeat-item-title">Konsumsi {idx + 1}</span>
                    <button className="trash-btn" onClick={() => removeKonsumsi(k.id)}><Trash2 size={16} /></button>
                  </div>
                  <div className="sub-fields-row">
                    <div style={{ flex: 2 }}><p className="mini-label">Apa yang dikonsumsi</p><input type="text" placeholder="mis. Susu, Yoghurt" value={k.item} onChange={(e) => updateKonsumsi(k.id, "item", e.target.value)} /></div>
                    <div><p className="mini-label">Jumlah</p><input type="text" placeholder="mis. 150 ml / 2 sendok" value={k.jumlah} onChange={(e) => updateKonsumsi(k.id, "jumlah", e.target.value)} /></div>
                  </div>
                </div>
              ))}
              <button className="add-row-btn" onClick={addKonsumsi}><Plus size={15} /> Tambah Konsumsi</button>
            </div>

            <div className="field-block">
              <label className="field-label"><GlassWater size={16} /> Konsumsi Air Minum</label>
              <div className="input-with-unit">
                <input type="number" placeholder="mis. 8" value={form.airMinum} onChange={(e) => setForm((f) => ({ ...f, airMinum: e.target.value }))} />
                <span>gelas (±200ml)</span>
              </div>
            </div>

            <div className="field-block">
              <label className="field-label">Catatan Tambahan</label>
              <textarea placeholder="Catatan bebas hari ini..." value={form.catatan} onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button className="btn-primary full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={18} className="spin" /> : <Check size={18} />} {saving ? "Menyimpan..." : "Simpan"}
              </button>
              {entries[form.date] && (
                <button className="btn-danger-slim" onClick={handleDelete} disabled={saving}>Hapus</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
