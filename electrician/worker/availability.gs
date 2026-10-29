// Google Apps Script: tells the Worker which visit windows are free in your Google Calendar.
// It returns only the free windows, never event titles or details.
// Deploy as a web app (Execute as: Me, Who has access: Anyone) and keep the web app URL private.
// Put the same phrase in the Worker as the AVAIL_SECRET secret.
const SECRET = 'PASTE_A_LONG_RANDOM_TEXT_HERE';
const TZ = 'Europe/London';
const DAYS_AHEAD = 14;     // how far ahead to look
const LEAD_HOURS = 4;      // never offer a window starting sooner than this
const MAX_SLOTS = 8;
// Visit windows by weekday (0 = Sunday). Each is [start hour, end hour] in 24-hour time. Leave a day out for no visits.
const WINDOWS = {
  1: [[9, 12], [13, 16]],
  2: [[9, 12], [13, 16]],
  3: [[9, 12], [13, 16]],
  4: [[9, 12], [13, 16]],
  5: [[9, 12], [13, 16]],
  6: [[9, 12]],
};

function hourLabel(h) {
  const suffix = h >= 12 ? 'pm' : 'am';
  const n = h % 12 === 0 ? 12 : h % 12;
  return n + suffix;
}

// Builds a Date for a given London calendar day and hour.
function londonDate(y, m, d, h) {
  const guess = new Date(Date.UTC(y, m, d, h, 0, 0));
  const shown = Number(Utilities.formatDate(guess, TZ, 'H'));
  return new Date(guess.getTime() - (shown - h) * 3600 * 1000);
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (String(d.secret || '').trim() !== String(SECRET).trim()) return out({ error: 'no' });
    const cal = CalendarApp.getDefaultCalendar();
    const now = new Date();
    const earliest = now.getTime() + LEAD_HOURS * 3600 * 1000;
    const slots = [];
    for (let i = 0; i <= DAYS_AHEAD && slots.length < MAX_SLOTS; i++) {
      const day = new Date(now.getTime() + i * 86400000);
      const y = Number(Utilities.formatDate(day, TZ, 'yyyy'));
      const m = Number(Utilities.formatDate(day, TZ, 'M')) - 1;
      const dd = Number(Utilities.formatDate(day, TZ, 'd'));
      const wd = Number(Utilities.formatDate(day, TZ, 'u')) % 7; // 'u' is 1 (Monday) to 7 (Sunday)
      (WINDOWS[wd] || []).forEach((w) => {
        if (slots.length >= MAX_SLOTS) return;
        const start = londonDate(y, m, dd, w[0]);
        const end = londonDate(y, m, dd, w[1]);
        if (start.getTime() < earliest) return;
        const busy = cal.getEvents(start, end).filter((ev) => ev.getMyStatus() !== CalendarApp.GuestStatus.NO && ev.getTransparency() !== CalendarApp.EventTransparency.TRANSPARENT);
        if (busy.length) return;
        slots.push(Utilities.formatDate(start, TZ, 'EEEE d MMMM') + ', ' + hourLabel(w[0]) + ' to ' + hourLabel(w[1]));
      });
    }
    return out({ slots: slots });
  } catch (err) {
    return out({ error: String((err && err.message) || err).slice(0, 120) });
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor (pick "authorize" in the function list, then Run) to give the script permission to read your calendar.
function authorize() {
  CalendarApp.getDefaultCalendar().getName();
}

// Optional: run this to see the windows it would offer right now.
function preview() {
  const res = doPost({ postData: { contents: JSON.stringify({ secret: SECRET }) } });
  Logger.log(res.getContent());
}
