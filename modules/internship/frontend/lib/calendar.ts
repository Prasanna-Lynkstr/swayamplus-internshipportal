function toGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

// Real, working "add to calendar" — no backend needed. Builds a Google
// Calendar prefilled-event link for the application deadline.
export function googleCalendarUrl(title: string, deadlineIso: string): string {
  const start = new Date(deadlineIso);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Application deadline: ${title}`,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: `Last date to apply for the "${title}" internship on SWAYAM Plus.`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
