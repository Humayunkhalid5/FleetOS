// Calendar-month windows for revenue charts: always the last `count` months
// ending with the current one, with months that had no payments set to 0.
function recentMonths(count = 6, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });
}

/** Sum `amount` per calendar month for the last `count` months. */
function monthlyTotals(items, { count = 6, dateOf, amountOf, now = new Date() } = {}) {
  const months = recentMonths(count, now);
  const totals = new Map(months.map(({ year, month }) => [`${year}-${month}`, 0]));
  items.forEach((item) => {
    const date = new Date(dateOf(item));
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (totals.has(key)) totals.set(key, totals.get(key) + (Number(amountOf(item)) || 0));
  });
  return months.map(({ year, month }) => ({ year, month, amount: totals.get(`${year}-${month}`) }));
}

module.exports = { recentMonths, monthlyTotals };
