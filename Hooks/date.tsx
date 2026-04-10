export function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // Sunday = 0, Monday = 1
  const diff = day === 0 ? -6 : 1 - day; 
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}