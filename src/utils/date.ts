const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function formatDateLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isSameDay = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isSameDay) return "Aujourd'hui";
  if (isTomorrow) return 'Demain';

  const diff = Math.round(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 7 && diff > 0) return DAYS[date.getDay()]!;

  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatTimeLabel(isoString: string): string {
  const date = new Date(isoString);
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h}h${m ? m.toString().padStart(2, '0') : ''}`;
}

export function formatDayShort(isoString: string): string {
  const date = new Date(isoString);
  return DAYS_SHORT[date.getDay()]!;
}

export function formatFullDate(isoString: string): string {
  const date = new Date(isoString);
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
}

export function hoursUntil(isoString: string): number {
  const target = new Date(isoString).getTime();
  const now = Date.now();
  return (target - now) / (1000 * 60 * 60);
}
