export function generateGoogleSheetScript({
  webhook,
  secret,
  sheetName,
}) {
  return `
const WEBHOOK = "${webhook}";
const SECRET = "${secret}";
const SHEET_NAME = "${sheetName}";

function sendRow(rowData) {

  const payload = {
    secret: SECRET,
    sheetName: SHEET_NAME,
    row: rowData
  };

  UrlFetchApp.fetch(WEBHOOK, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

}

function onEdit(e) {

  const sheet = e.source.getActiveSheet();

  if (sheet.getName() !== SHEET_NAME) {
    return;
  }

  const rowNumber = e.range.getRow();

  if (rowNumber === 1) {
    return;
  }

  const lastColumn = sheet.getLastColumn();

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0];

  const values = sheet
    .getRange(rowNumber, 1, 1, lastColumn)
    .getValues()[0];

  const rowData = {};

  headers.forEach((header, index) => {
    rowData[String(header).trim()] = values[index];
  });

  sendRow(rowData);

}
`;
}