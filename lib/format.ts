const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

export function formatDate(iso?: string): string {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}

export function formatTime(iso?: string): string {
  return iso ? timeFmt.format(new Date(iso)) : "—";
}

export function formatDateTime(iso?: string): string {
  return iso ? `${formatDate(iso)}, ${formatTime(iso)}` : "—";
}

export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((startOfDay(today) - startOfDay(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return formatDate(iso);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function ageSex(age: number, gender: string): string {
  return `${age}/${gender.charAt(0).toUpperCase()}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
