// ---------------------------------------------------------------------------
// FleetOS Client Portal — Shared helper utilities
// ---------------------------------------------------------------------------


export const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};


/** Download rows (first row = header) as a CSV file. */
export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => (value ? new Date(value).toLocaleDateString('en-PK', options) : '—');
export const formatDateTime = (value) => (value ? new Date(value).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

export function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : formatDate(value);
}
