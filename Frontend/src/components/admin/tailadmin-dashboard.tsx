"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardStat } from "@/types/dashboard";
import { Card } from "@/components/ui/card";

interface TailAdminDashboardProps {
  stats: DashboardStat[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEADS_ADDED = [118, 124, 109, 102, 114, 121, 136, 158, 171, 165, 182, 176];
const LEADS_CONVERTED = [42, 38, 46, 41, 49, 45, 58, 72, 80, 84, 93, 89];
const CHART_WIDTH = 520;
const CHART_HEIGHT = 180;
const CALENDAR_WEEKS = 6;
const CALENDAR_DAYS = CALENDAR_WEEKS * 7;

const ORDERS = [
  { id: "DE124321", customer: "John Doe", email: "johndoe@gmail.com", service: "Software License", value: "$18,50.34", date: "2024-06-15", status: "Complete" },
  { id: "DE124322", customer: "Jane Smith", email: "janesmith@gmail.com", service: "Cloud Hosting", value: "$12,99.00", date: "2024-06-18", status: "Pending" },
  { id: "DE124323", customer: "Michael Brown", email: "michaelbrown@gmail.com", service: "Web Domain", value: "$9,50.00", date: "2024-06-20", status: "Canceled" }
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

const adminStatCardStyles = [
  {
    card: "border-indigo-200/70 bg-indigo-50/80 dark:border-indigo-500/20 dark:bg-indigo-500/10",
    icon: "bg-indigo-600 text-white dark:bg-indigo-500/20 dark:text-indigo-200",
    value: "text-indigo-700 dark:text-indigo-100",
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
  },
  {
    card: "border-blue-200/70 bg-blue-50/80 dark:border-blue-500/20 dark:bg-blue-500/10",
    icon: "bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-200",
    value: "text-blue-700 dark:text-blue-100",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
  },
  {
    card: "border-cyan-200/70 bg-cyan-50/80 dark:border-cyan-500/20 dark:bg-cyan-500/10",
    icon: "bg-cyan-600 text-white dark:bg-cyan-500/20 dark:text-cyan-200",
    value: "text-cyan-700 dark:text-cyan-100",
    chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200"
  },
  {
    card: "border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10",
    icon: "bg-amber-500 text-white dark:bg-amber-500/20 dark:text-amber-200",
    value: "text-amber-700 dark:text-amber-100",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
  },
  {
    card: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10",
    icon: "bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-200",
    value: "text-emerald-700 dark:text-emerald-100",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
  }
];

function pointsFromSeries(series: number[], maxValue: number) {
  const step = CHART_WIDTH / (series.length - 1);

  return series
    .map((value, index) => {
      const x = index * step;
      const y = CHART_HEIGHT - (value / maxValue) * (CHART_HEIGHT - 16) - 8;
      return `${x},${y}`;
    })
    .join(" ");
}

function getChartPoint(value: number, index: number, maxValue: number) {
  const step = CHART_WIDTH / (MONTHS.length - 1);
  return {
    x: index * step,
    y: CHART_HEIGHT - (value / maxValue) * (CHART_HEIGHT - 16) - 8
  };
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWithinRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function formatRangeLabel(start: Date | null, end: Date | null) {
  if (!start) return "Select date range";
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  if (!end) return fmt.format(start);
  return `${fmt.format(start)} to ${fmt.format(end)}`;
}

function buildCalendarDays(monthDate: Date) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  return Array.from({ length: CALENDAR_DAYS }, (_, index) => addDays(gridStart, index));
}

export function TailAdminDashboard({ stats }: TailAdminDashboardProps) {
  const [dealSearch, setDealSearch] = useState("");
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [leadView, setLeadView] = useState<"monthly" | "quarterly" | "annually">("monthly");
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(new Date(2026, 3, 23));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(new Date(2026, 3, 29));
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(2026, 3, 1));
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const filteredOrders = useMemo(() => {
    const query = dealSearch.trim().toLowerCase();
    if (!query) return ORDERS;

    return ORDERS.filter((order) =>
      [order.id, order.customer, order.email, order.service, order.status].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [dealSearch]);
  const leadsAddedTotal = LEADS_ADDED.reduce((total, value) => total + value, 0);
  const leadsConvertedTotal = LEADS_CONVERTED.reduce((total, value) => total + value, 0);
  const leadConversionRate = Math.round((leadsConvertedTotal / leadsAddedTotal) * 100);
  const goalTarget = 1200;
  const goalAchieved = 912;
  const goalPercent = Math.round((goalAchieved / goalTarget) * 100);
  const goalAngle = Math.PI * (1 - goalPercent / 100);
  const goalMarkerX = 120 + 100 * Math.cos(goalAngle);
  const goalMarkerY = 120 - 100 * Math.sin(goalAngle);
  const maxLeadsValue = Math.max(...LEADS_ADDED, ...LEADS_CONVERTED) + 20;
  const leadAddedPoints = pointsFromSeries(LEADS_ADDED, maxLeadsValue);
  const leadConvertedPoints = pointsFromSeries(LEADS_CONVERTED, maxLeadsValue);
  const activeIndex = hoveredMonthIndex ?? MONTHS.length - 1;
  const activeAddedValue = LEADS_ADDED[activeIndex];
  const activeConvertedValue = LEADS_CONVERTED[activeIndex];
  const activeAddedPoint = getChartPoint(activeAddedValue, activeIndex, maxLeadsValue);
  const activeConvertedPoint = getChartPoint(activeConvertedValue, activeIndex, maxLeadsValue);
  const tooltipLeftPercent = Math.min(90, Math.max(10, (activeAddedPoint.x / CHART_WIDTH) * 100));
  const tooltipTopPercent = Math.max(10, (Math.min(activeAddedPoint.y, activeConvertedPoint.y) / CHART_HEIGHT) * 100 - 8);
  const calendarDays = buildCalendarDays(calendarMonth);
  const monthLabel = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const onSelectDate = (date: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }

    if (date.getTime() < rangeStart.getTime()) {
      setRangeEnd(rangeStart);
      setRangeStart(date);
      return;
    }

    setRangeEnd(date);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dateFilterRef.current?.contains(event.target as Node)) {
        setIsDateFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const onChartMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const ratio = Math.min(1, Math.max(0, x / bounds.width));
    const index = Math.round(ratio * (MONTHS.length - 1));
    setHoveredMonthIndex(index);
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((item, index) => {
          const styles = adminStatCardStyles[index % adminStatCardStyles.length];

          return (
            <Card
              key={item.label}
              className={`min-h-[168px] rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.card}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</p>
                  <p className={`mt-4 text-4xl font-semibold tracking-tight ${styles.value}`}>
                    {formatNumber(item.value)}
                  </p>
                </div>
                <div
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${styles.icon}`}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19h16" />
                    <path d="M7 15V9" />
                    <path d="M12 15V5" />
                    <path d="M17 15v-3" />
                  </svg>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/70 pt-4 dark:border-white/10">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.chip}`}>{item.trend}</span>
                <span className="h-2 w-2 rounded-full bg-current text-slate-300 dark:text-slate-600" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="rounded-2xl p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 lg:flex-nowrap lg:items-center">
            <div className="min-w-0 flex-1">
              <h3 className=" font-semibold leading-tight tracking-tight text-slate-600 dark:text-slate-100 ">
                Lead Pipeline Trend
              </h3>
              {/* <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:whitespace-nowrap">
                Monthly leads added vs converted leads
              </p> */}
            </div>
            <div className="relative flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap lg:gap-3" ref={dateFilterRef}>
              <div className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:inline-flex sm:w-auto">
                {[
                  { label: "Monthly", value: "monthly" as const },
                  { label: "Quarterly", value: "quarterly" as const },
                  { label: "Annually", value: "annually" as const }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLeadView(option.value)}
                    className={
                      option.value === leadView
                        ? "rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100 sm:min-w-[96px] lg:min-w-[116px] lg:text-sm"
                        : "rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100 sm:min-w-[96px] lg:min-w-[116px] lg:text-sm"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsDateFilterOpen((prev) => !prev)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto sm:justify-start lg:px-4 lg:text-sm"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 lg:h-4 lg:w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
                {formatRangeLabel(rangeStart, rangeEnd)}
              </button>
              {isDateFilterOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(100vw-2rem,460px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((prev) => addMonths(prev, -1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{monthLabel}</p>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-y-3 text-center">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <span key={day} className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {day}
                      </span>
                    ))}
                    {calendarDays.map((day) => {
                      const muted = day.getMonth() !== calendarMonth.getMonth();
                      const isStart = isSameDay(day, rangeStart);
                      const isEnd = isSameDay(day, rangeEnd);
                      const inRange = isWithinRange(day, rangeStart, rangeEnd);

                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => onSelectDate(day)}
                          className={[
                            "mx-auto inline-flex h-9 w-9 items-center justify-center text-lg font-semibold transition",
                            muted ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100",
                            inRange ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-800",
                            isStart ? "rounded-l-full bg-brand-600 text-white hover:bg-brand-600 dark:bg-brand-600 dark:text-white dark:hover:bg-brand-600" : "",
                            isEnd ? "rounded-r-full bg-brand-600 text-white hover:bg-brand-600 dark:bg-brand-600 dark:text-white dark:hover:bg-brand-600" : "",
                            isStart && isEnd ? "rounded-full" : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-brand-50 px-3 py-2 dark:bg-brand-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Leads Added</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatNumber(leadsAddedTotal)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Leads Converted</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatNumber(leadsConvertedTotal)}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Conversion Rate</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{leadConversionRate}%</p>
            </div>
          </div>
          <div
            className="relative h-56 rounded-xl bg-gradient-to-b from-brand-100/70 to-white p-4 dark:from-brand-950/20 dark:to-slate-900"
            onMouseLeave={() => setHoveredMonthIndex(null)}
          >
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="h-full w-full"
              onMouseMove={onChartMouseMove}
            >
              {[0, 1, 2, 3].map((row) => (
                <line
                  key={row}
                  x1="0"
                  y1={20 + row * 40}
                  x2={CHART_WIDTH}
                  y2={20 + row * 40}
                  stroke="rgb(203 213 225)"
                  strokeOpacity="0.45"
                />
              ))}
              <polyline fill="none" stroke="#3158E8" strokeWidth="3.25" strokeLinecap="round" points={leadAddedPoints} />
              <polyline fill="none" stroke="#22C55E" strokeWidth="3.25" strokeLinecap="round" points={leadConvertedPoints} />
              {hoveredMonthIndex !== null ? (
                <>
                  <line
                    x1={activeAddedPoint.x}
                    y1="8"
                    x2={activeAddedPoint.x}
                    y2={CHART_HEIGHT - 8}
                    stroke="#64748B"
                    strokeOpacity="0.35"
                    strokeDasharray="4 4"
                  />
                  <circle cx={activeAddedPoint.x} cy={activeAddedPoint.y} r="5.5" fill="#3158E8" stroke="white" strokeWidth="2.5" />
                  <circle cx={activeConvertedPoint.x} cy={activeConvertedPoint.y} r="5.5" fill="#22C55E" stroke="white" strokeWidth="2.5" />
                </>
              ) : null}
            </svg>
            {hoveredMonthIndex !== null ? (
              <div
                className="pointer-events-none absolute z-10 min-w-40 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-soft backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
                style={{ left: `${tooltipLeftPercent}%`, top: `${tooltipTopPercent}%`, transform: "translate(-50%, -110%)" }}
              >
                <p className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">{MONTHS[activeIndex]}</p>
                <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-600" />Added</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{formatNumber(activeAddedValue)}</span>
                </p>
                <p className="mt-1 flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Converted</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{formatNumber(activeConvertedValue)}</span>
                </p>
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
              Leads Added
            </span>
            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Leads Converted
            </span>
          </div>
          <div className="mt-4 grid grid-cols-6 gap-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 md:grid-cols-12">
            {MONTHS.map((month, index) => (
              <span key={month} className={hoveredMonthIndex === index ? "text-slate-900 dark:text-slate-100" : ""}>
                {month}
              </span>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl p-6">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Lead Goal Progress</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Target leads for current month</p>
          <div className="mt-5 flex justify-center">
            <svg width="240" height="140" viewBox="0 0 240 140" className="h-auto w-full max-w-[240px]">
              <path
                d="M 20 120 A 100 100 0 0 1 220 120"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 20 120 A 100 100 0 0 1 220 120"
                fill="none"
                stroke="#3158E8"
                strokeWidth="14"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${goalPercent} 100`}
              />
              <circle cx={goalMarkerX} cy={goalMarkerY} r="5.5" fill="#3158E8" stroke="white" strokeWidth="2.5" />
            </svg>
          </div>
          <p className="-mt-8 text-center text-5xl font-semibold text-slate-900 dark:text-slate-100">{goalPercent}%</p>
          <p className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            {formatNumber(goalAchieved)} / {formatNumber(goalTarget)} leads
          </p>
          <div className="mt-8 space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                <span>Leads Converted</span>
                <span>85%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-2 w-[85%] rounded-full bg-brand-600" />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                <span>Leads Canceled</span>
                <span>55%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-2 w-[55%] rounded-full bg-brand-500" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl p-6">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Lead Category</h3>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[220px_1fr]">
            <div className="relative mx-auto h-48 w-48 rounded-full bg-[conic-gradient(#3158E8_0_38%,#6F88F6_38%_71%,#CBD5E1_71%_100%)]">
              <div className="absolute inset-7 rounded-full bg-white dark:bg-slate-900" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">3.5K</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total deals</p>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <p className="font-medium text-slate-700 dark:text-slate-200"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#3158E8]" />Affiliate Program 48%</p>
              <p className="font-medium text-slate-700 dark:text-slate-200"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#6F88F6]" />Direct Buy 33%</p>
              <p className="font-medium text-slate-700 dark:text-slate-200"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />Adsense 19%</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl p-6">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Upcoming Schedule</h3>
          <div className="mt-4 space-y-5">
            {[
              "Wed, 11 Jan - Business Analytics Press",
              "Fri, 15 Feb - Business Sprint",
              "Thu, 18 Mar - Customer Review Meeting"
            ].map((event) => (
              <div key={event} className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <p className="text-sm text-slate-700 dark:text-slate-200">{event}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto rounded-2xl p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Recent Orders
          </h3>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 sm:w-auto">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={dealSearch}
                onChange={(event) => setDealSearch(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 sm:w-56"
                placeholder="Search deals..."
                aria-label="Search deals"
              />
            </div>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-100"
            >
              See all
            </button>
          </div>
        </div>
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3">Deal ID</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Product/Service</th>
              <th className="px-6 py-3">Deal Value</th>
              <th className="px-6 py-3">Close Date</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td className="px-6 py-4 font-medium text-brand-700 dark:text-brand-300">{order.id}</td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{order.customer}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{order.email}</p>
                </td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{order.service}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{order.value}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{order.date}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
            {!filteredOrders.length ? (
              <tr className="border-t border-slate-200 text-sm dark:border-slate-800">
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  No deals found for &quot;{dealSearch}&quot;.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
