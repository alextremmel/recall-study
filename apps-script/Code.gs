// Paste this whole file into Extensions > Apps Script in your Google Sheet.
// It adds one row to the "Responses" tab each time a participant finishes.

var SHEET_NAME = "Responses";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Header row: created on first submit, extended if new fields ever appear.
    var lastCol = sheet.getLastColumn();
    var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    if (headers.indexOf("received_at") < 0) headers.unshift("received_at");
    Object.keys(data).forEach(function (k) {
      if (headers.indexOf(k) < 0) headers.push(k);
    });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);

    data.received_at = new Date();
    var row = headers.map(function (h) {
      var v = data[h] === undefined ? "" : data[h];
      // Keep answers like "042" as typed instead of letting Sheets turn them into 42.
      if (typeof v === "string" && /^0\d+$/.test(v)) v = "'" + v;
      return v;
    });
    sheet.appendRow(row);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Visiting the web app URL in a browser shows this, which confirms it is live.
function doGet() {
  return json({ ok: true, message: "Recall study endpoint is running." });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
