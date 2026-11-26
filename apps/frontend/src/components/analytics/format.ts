import dayjs from 'dayjs';
import 'dayjs/locale/de';

const intFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const oneFmt = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// 12.345 → "12,3K", 1.234.567 → "1,2 Mio."
export function formatCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '–';
  const a = Math.abs(n);
  if (a < 10_000) return intFmt.format(Math.round(n));
  if (a < 100_000) return `${oneFmt.format(Math.floor(n / 100) / 10)}K`;
  if (a < 1_000_000) return `${intFmt.format(Math.floor(n / 1000))}K`;
  return `${oneFmt.format(Math.floor(n / 100_000) / 10)} Mio.`;
}

export function formatInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '–';
  return intFmt.format(Math.round(n));
}

// 0.0754 → "7,5 %"
export function formatRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '–';
  return `${oneFmt.format(rate * 100)} %`;
}

export function formatDay(date: string): string {
  return dayjs(date).format('DD.MM.');
}

export function formatDayLong(date: string): string {
  return dayjs(date).locale('de').format('dd, DD.MM.YYYY');
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('DD.MM.YYYY, HH:mm');
}

export function percentChange(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || !previous) return null;
  return ((current - previous) / previous) * 100;
}
