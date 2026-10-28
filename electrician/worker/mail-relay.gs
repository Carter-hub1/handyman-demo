// Google Apps Script: sends the enquiry emails from your Gmail account.
// Deploy as a web app (Execute as: Me, Who has access: Anyone) and keep the web app URL private.
// This version also works for the Keith booking demo. The sender name comes from the Worker when it sends one.
const SECRET = 'PASTE_A_LONG_RANDOM_TEXT_HERE'; // must match the MAIL_SECRET secret in Cloudflare

function reply(text) {
  return ContentService.createTextOutput(text);
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const want = String(SECRET).trim();
    const got = String(d.secret || '').trim();
    if (got !== want) {
      // Reports lengths and the first and last character only, never the phrases themselves.
      return reply('no: the script secret has ' + want.length + ' characters, the Worker sent ' + got.length
        + '. First character matches: ' + (got.charAt(0) === want.charAt(0))
        + '. Last character matches: ' + (got.slice(-1) === want.slice(-1)) + '.');
    }
    const name = String(d.name || "Keith's Handyman Services (demo)").slice(0, 80);
    MailApp.sendEmail({ to: d.to, subject: d.subject, body: d.text, name: name });
    return reply('ok');
  } catch (err) {
    return reply('error: ' + String((err && err.message) || err).slice(0, 120));
  }
}

// Run this once from the editor (pick "authorize" in the function list, then Run) to give the script
// permission to send mail. It does not send anything.
function authorize() {
  MailApp.getRemainingDailyQuota();
}
