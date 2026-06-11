'use client';

import { useState, useMemo } from 'react';
import {
  getDayNumber,
  getMishnayotForDay,
  getMishnaPairLabel,
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
        <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>Mishna Yomit Calendar</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          The official daily learning calendar — 2 Mishnayot per day.
          Day <span style={{ color: 'var(--gold-dark)' }}>{todayDayNum}</span> of {TOTAL_CYCLE_DAYS} in the current cycle.
        </p>
      </div>

      {/* Today's highlight */}
      <div className="card-gold p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--gold-dark)' }}>Today</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold-dark)' }}>{todayLabel}</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link href="/learn" className="btn-gold px-6 py-3 rounded-xl text-sm flex-shrink-0">
            Listen Today&apos;s Lesson
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="card p-4 sm:p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-black/5 transition-colors cursor-pointer" style={{ color: 'var(--muted)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--navy)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}>
                ← Prev
              </button>
              <div className="text-center">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                  {MONTHS[viewMonth]} {viewYear}
                </h2>
                <button onClick={goToToday} className="text-xs hover:underline mt-0.5 cursor-pointer" style={{ color: 'var(--gold-dark)' }}>
                  Jump to Today
                </button>
              </div>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-black/5 transition-colors cursor-pointer" style={{ color: 'var(--muted)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--navy)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}>
                Next →
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="text-center text-xs py-1 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{d}</div>
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
                      relative p-1 rounded-lg text-left transition-all min-h-[64px] sm:min-h-[80px] cursor-pointer
                      ${!inMonth ? 'opacity-30' : ''}
                      ${day.isToday ? 'bg-[#C9A96E]/15 border border-[#C9A96E]/60' : 'hover:bg-[#A07840]/10 border border-transparent'}
                      ${isSelected && !day.isToday ? 'bg-[#A07840]/12 border-[#A07840]/45' : ''}
                      ${day.isPast && !day.isToday && !isSelected ? 'opacity-60' : ''}
                    `}
                  >
                    <span className={`
                      text-xs font-medium block mb-1
                      ${day.isToday ? 'text-[#856230]' : inMonth ? 'text-[#221A10]' : 'text-[#6F6049]'}
                    `}>
                      {day.date.getUTCDate()}
                    </span>
                    <span className={`
                      text-[9px] leading-tight block
                      ${day.isToday ? 'text-[#A07840]' : 'text-[#6F6049]'}
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
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--gold-dark)' }}>Selected Date</p>
              <p className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold-dark)' }}>{selectedDay.label}</p>
              <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Cycle Day {selectedDay.dayNumber}</p>
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
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>Look up any date</h3>
            <div className="flex gap-2">
              <input
                type="date"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-sm border outline-none transition-colors"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
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
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Upcoming</h3>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {upcomingDays.map((d, i) => (
                <div
                  key={i}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg text-sm
                    ${d.isToday ? 'bg-[#C9A96E]/15 border border-[#C9A96E]/40' : 'hover:bg-black/5'}
                  `}
                >
                  <span className={`text-xs ${d.isToday ? 'text-[#A07840] font-bold' : 'text-[#6F6049]'}`}>
                    {d.isToday ? 'Today' : formatDateShort(d.date)}
                  </span>
                  <span className={`text-xs ${d.isToday ? 'text-[#A07840] font-medium' : 'text-[#221A10]'}`}>
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
