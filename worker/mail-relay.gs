// Google Apps Script: sends the booking emails from your Gmail account.
// Deploy as a web app (Execute as: Me, Who has access: Anyone) and keep the web app URL private.
const SECRET = 'PASTE_A_LONG_RANDOM_TEXT_HERE'; // must match the MAIL_SECRET secret in Cloudflare

function reply(text) {
  return ContentService.createTextOutput(text);
}

function doPost(e) {
  let d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply('bad request');
  }
  const want = String(SECRET).trim();
  const got = String(d.secret || '').trim();
  if (got !== want) {
    // Reports lengths and the first and last character only, never the phrases themselves.
    return reply('no: the script secret has ' + want.length + ' characters, the Worker sent ' + got.length
      + '. First character matches: ' + (got.charAt(0) === want.charAt(0))
      + '. Last character matches: ' + (got.slice(-1) === want.slice(-1)) + '.');
  }
  MailApp.sendEmail({ to: d.to, subject: d.subject, body: d.text, name: "Keith's Handyman Services (demo)" });
  return reply('ok');
}

// Run this once from the editor (pick "authorize" in the function list, then Run) to give the script
// permission to send mail. It does not send anything.
function authorize() {
  MailApp.getRemainingDailyQuota();
}
