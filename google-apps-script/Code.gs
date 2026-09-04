const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_TAB = 'Signups';

function doPost(event) {
  const body = JSON.parse(event.postData.contents || '{}');
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('PLENARY_WEBHOOK_SECRET');

  if (!expectedSecret || body.secret !== expectedSecret) {
    return jsonResponse({ ok: false, error: 'Unauthorized' });
  }

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_TAB);
  if (!sheet) return jsonResponse({ ok: false, error: 'Missing Signups tab' });

  sheet.appendRow([
    body.createdAt || new Date().toISOString(),
    body.email || '',
    (body.selectedAtmospheres || []).join(', '),
  ]);

  return jsonResponse({ ok: true });
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}