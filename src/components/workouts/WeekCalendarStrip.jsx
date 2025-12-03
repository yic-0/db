import { useMemo } from 'react'
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns'

export default function WeekCalendarStrip({ selectedDate, onSelectDate, completedDates = [] }) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date())
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      return {
        date: dateStr,
        dayName: format(date, 'EEE'),
        dayNum: format(date, 'd'),
        isToday: isToday(date),
        isSelected: selectedDate === dateStr,
        hasCompletion: completedDates.includes(dateStr)
      }
    })
  }, [selectedDate, completedDates])

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700 tracking-wide">This Week</h3>
        <span className="text-xs font-medium text-slate-400">{format(new Date(), 'MMMM yyyy')}</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map(day => (
          <button
            key={day.date}
            onClick={() => onSelectDate(day.date)}
            className={`relative p-2 sm:p-3 rounded-lg text-center transition-all duration-200 ${
              day.isSelected
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/25'
                : day.isToday
                ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                : 'bg-slate-50/80 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="text-[10px] font-semibold opacity-70 uppercase tracking-wider">{day.dayName}</div>
            <div className="text-base sm:text-lg font-bold mt-0.5">{day.dayNum}</div>
            {day.hasCompletion && !day.isSelected && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-success-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
