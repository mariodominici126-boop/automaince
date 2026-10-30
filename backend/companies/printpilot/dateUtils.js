const TIME_ZONE = 'America/Santo_Domingo';

function dateParts(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (![year, month, day].every(Number.isInteger)) throw new Error('La fecha debe tener formato AAAA-MM-DD.');
  return { year, month, day };
}

function formatDate({ year, month, day }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayInSantoDomingo(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date, days) {
  const { year, month, day } = dateParts(date);
  const next = new Date(Date.UTC(year, month - 1, day + Number(days)));
  return formatDate({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() });
}

function addMonthsClamped(date, months) {
  const { year, month, day } = dateParts(date);
  const target = new Date(Date.UTC(year, month - 1 + Number(months), 1));
  const targetYear = target.getUTCFullYear(), targetMonth = target.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return formatDate({ year: targetYear, month: targetMonth, day: Math.min(day, lastDay) });
}

module.exports = { TIME_ZONE, todayInSantoDomingo, addDays, addMonthsClamped };
