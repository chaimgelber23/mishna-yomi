'use client';

import { useState, useMemo } from 'react';
import {
  getDayNumber,
  getMishnayotForDay,
  getMishnaPairLabel,
  getDateForDayNumber,
  formatDateShort,
  TOTAL_CYCLE_DAYS,
} from '@/lib/calendar';
import Link from 'next/link';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

interface CalendarDay {
  date: Date;
  dayNumber: number;
  label: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startPad = firstDay.getUTCDay(); // 0=Sun

  const days: CalendarDay[] = [];

  // Pad start
  for (let i = 0; i < startPad; i++) {
    const d = new Date(Date.UTC(year, month, 1 - (startPad - i)));
    const dayNum = getDayNumber(d);
    const mishnayot = getMishnayotForDay(dayNum);
    days.push({
      date: d,
      dayNumber: dayNum,
      label: getMishnaPairLabel(mishnayot),
      isToday: false,
      isPast: d < todayUTC,
      isFuture: d > todayUTC,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month, d));
    const dayNum = getDayNumber(date);
    const mishnayot = getMishnayotForDay(dayNum);
    const isToday = date.getTime() === todayUTC.getTime();
    days.push({
      date,
      dayNumber: dayNum,
      label: getMishnaPairLabel(mishnayot),
      isToday,
      isPast: date < todayUTC,
      isFuture: date > todayUTC,
    });
  }

  return days;
}

export default function CalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [searchDate, setSearchDate] = useState('');

  const days = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Today's info
  const today = new Date();
  const todayDayNum = getDayNumber(today);
  const todayMishnayot = getMishnayotForDay(todayDayNum);
  const todayLabel = getMishnaPairLabel(todayMishnayot);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }
  function goToToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }

  // Search by date
  function handleSearch() {
    if (!searchDate) return;
    const d = new Date(searchDate);
    if (isNaN(d.getTime())) return;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    const dayNum = getDayNumber(d);
    const mishnayot = getMishnayotForDay(dayNum);
    setSelectedDay({
      date: d,
      dayNumber: dayNum,
      label: getMishnaPairLabel(mishnayot),
      isToday: false,
      isPast: d < today,
      isFuture: d > today,
    });
  }

  // List view — current week + 2 weeks ahead
  const upcomingDays = useMemo(() => {
    const list = [];
    for (let i = -1; i <= 14; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + i);
      const dn = getDayNumber(d);
      const mish = getMishnayotForDay(dn);
      list.push({
        date: d,
        dayNumber: dn,
        label: getMishnaPairLabel(mish),
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif text-parchment-50 mb-1">Mishna Yomit Calendar</h1>
        <p className="text-slate-500 text-sm">
          The official daily learning calendar — 2 Mishnayot per day.
          Day <span className="text-gold-400">{todayDayNum}</span> of {TOTAL_CYCLE_DAYS} in the current cycle.
        </p>
      </div>

      {/* Today's highlight */}
      <div className="card-gold p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gold-500 uppercase tracking-widest mb-1">Today</p>
            <p className="text-2xl font-bold text-gold-300">{todayLabel}</p>
            <p className="text-slate-400 text-sm">
              {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link href="/learn" className="btn-gold px-6 py-3 rounded-xl text-sm flex-shrink-0">
            ▶ Listen Today&apos;s Lesson
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="card p-4 sm:p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="text-slate-400 hover:text-parchment-100 p-2 rounded-lg hover:bg-navy-700 transition-colors">
                ← Prev
              </button>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-parchment-50">
                  {MONTHS[viewMonth]} {viewYear}
                </h2>
                <button onClick={goToToday} className="text-xs text-gold-500 hover:text-gold-400 mt-0.5">
                  Jump to Today
                </button>
              </div>
              <button onClick={nextMonth} className="text-slate-400 hover:text-parchment-100 p-2 rounded-lg hover:bg-navy-700 transition-colors">
                Next →
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="text-center text-xs text-slate-600 py-1 uppercase tracking-wider">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px">
              {days.map((day, i) => {
                const inMonth = day.date.getUTCMonth() === viewMonth;
                const isSelected = selectedDay?.dayNumber === day.dayNumber && selectedDay?.date.toDateString() === day.date.toDateString();

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    className={`
                      relative p-1 rounded-lg text-left transition-all min-h-[64px] sm:min-h-[80px]
                      ${!inMonth ? 'opacity-30' : ''}
                      ${day.isToday ? 'bg-gold-900/40 border border-gold-600' : 'hover:bg-navy-700/50 border border-transparent'}
                      ${isSelected && !day.isToday ? 'bg-navy-700 border-navy-500' : ''}
                      ${day.isPast && !day.isToday && !isSelected ? 'opacity-60' : ''}
                    `}
                  >
                    <span className={`
                      text-xs font-medium block mb-1
                      ${day.isToday ? 'text-gold-300' : inMonth ? 'text-slate-300' : 'text-slate-600'}
                    `}>
                      {day.date.getUTCDate()}
                    </span>
                    <span className={`
                      text-[9px] leading-tight block
                      ${day.isToday ? 'text-gold-400' : 'text-slate-500'}
                    `}>
                      {day.label.length > 20 ? day.label.substring(0, 18) + '…' : day.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day details */}
          {selectedDay && (
            <div className="card-gold p-5">
              <p className="text-xs text-gold-500 uppercase tracking-widest mb-2">Selected Date</p>
              <p className="text-xl font-bold text-gold-300 mb-1">{selectedDay.label}</p>
              <p className="text-sm text-slate-400 mb-3">
                {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
              </p>
              <p className="text-xs text-slate-500 mb-4">Cycle Day {selectedDay.dayNumber}</p>
              <Link
                href="/learn"
                className="btn-gold w-full py-2.5 rounded-lg text-sm text-center block"
              >
                Listen to This Lesson
              </Link>
            </div>
          )}

          {/* Date search */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Look up any date</h3>
            <div className="flex gap-2">
              <input
                type="date"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="flex-1 bg-navy-700 border border-navy-500 rounded-lg px-3 py-2 text-sm text-parchment-100 focus:outline-none focus:border-gold-500 transition-colors"
              />
              <button
                onClick={handleSearch}
                className="btn-gold px-3 py-2 rounded-lg text-sm"
              >
                Go
              </button>
            </div>
          </div>

          {/* Upcoming 2 weeks */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Upcoming</h3>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {upcomingDays.map((d, i) => (
                <div
                  key={i}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg text-sm
                    ${d.isToday ? 'bg-gold-900/30 border border-gold-700/40' : 'hover:bg-navy-700/40'}
                  `}
                >
                  <span className={`text-xs ${d.isToday ? 'text-gold-400 font-bold' : 'text-slate-500'}`}>
                    {d.isToday ? 'Today' : formatDateShort(d.date)}
                  </span>
                  <span className={`text-xs ${d.isToday ? 'text-gold-300 font-medium' : 'text-slate-400'}`}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
