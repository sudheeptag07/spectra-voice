const IST_TIME_ZONE = 'Asia/Kolkata';
const IST_LOCALE = 'en-IN';

function parseDbDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  const normalized = input.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized.replace(' ', 'T') + 'Z');
  }
  return new Date(normalized);
}

function dayKeyInIst(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function formatDateTimeIst(input: string | Date): string {
  const date = parseDbDate(input);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString(IST_LOCALE, {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function isTodayIst(input: string | Date): boolean {
  const date = parseDbDate(input);
  if (Number.isNaN(date.getTime())) return false;
  return dayKeyInIst(date) === dayKeyInIst(new Date());
}

export function toDate(input: string | Date): Date {
  return parseDbDate(input);
}
