// Google Apps Script: sends the booking emails from your Gmail account.
// Deploy as a web app (Execute as: Me, Who has access: Anyone) and keep the web app URL private.
const SECRET = 'PASTE_A_LONG_RANDOM_TEXT_HERE'; // must match the MAIL_SECRET secret in Cloudflare

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.secret !== SECRET) return ContentService.createTextOutput('no');
  MailApp.sendEmail({ to: d.to, subject: d.subject, body: d.text, name: "Keith's Handyman Services (demo)" });
  return ContentService.createTextOutput('ok');
}
