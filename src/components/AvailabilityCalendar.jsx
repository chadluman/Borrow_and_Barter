import { useMemo, useState } from 'react'

function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatLabel(date) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

export default function AvailabilityCalendar({ selectedDates = [], onChange }) {
  const [viewMonth, setViewMonth] = useState(new Date())

  const days = useMemo(() => {
    const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const firstDay = start.getDay()
    const totalDays = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
    const cells = []

    for (let i = 0; i < firstDay; i += 1) {
      cells.push(null)
    }

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day))
    }

    return cells
  }, [viewMonth])

  const toggleDate = (date) => {
    const iso = toIsoDate(date)
    const next = selectedDates.includes(iso)
      ? selectedDates.filter((value) => value !== iso)
      : [...selectedDates, iso].sort()

    onChange(next)
  }

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <button type="button" className="mini-btn" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>
          ←
        </button>
        <strong>{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(viewMonth)}</strong>
        <button type="button" className="mini-btn" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>
          →
        </button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="calendar-empty" />
          }

          const iso = toIsoDate(day)
          const active = selectedDates.includes(iso)
          const today = toIsoDate(new Date())
          const isToday = iso === today

          return (
            <button
              key={iso}
              type="button"
              className={`calendar-day ${active ? 'active' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => toggleDate(day)}
            >
              <span>{day.getDate()}</span>
            </button>
          )
        })}
      </div>

      <div className="calendar-summary">
        {selectedDates.length ? (
          <>
            <strong>Selected availability:</strong>
            <p>{selectedDates.map((value) => formatLabel(new Date(`${value}T00:00:00`))).join(', ')}</p>
          </>
        ) : (
          <p>Select dates this item is available for borrowing or pickup.</p>
        )}
      </div>
    </div>
  )
}
