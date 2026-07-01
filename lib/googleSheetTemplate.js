export function generateGoogleSheetScript({
  webhook,
  secret,
  sheetName,
}) {
  return `
const WEBHOOK = "${webhook}";
const SECRET = "${secret}";
const SHEET_NAME = "${sheetName}";

/*
Expected Header Row

Name | Email | Phone | Course | Status | Source

*/

function sendLead(row){

  const payload = {
    secret: SECRET,
    fullName: row[0],
    email: row[1],
    phone: row[2],
    course: row[3],
    status: row[4],
    source: row[5]
  };

  UrlFetchApp.fetch(WEBHOOK,{
    method:"post",
    contentType:"application/json",
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });

}

function onEdit(e){

  const sheet = e.source.getActiveSheet();

  if(sheet.getName() !== SHEET_NAME)
    return;

  const rowNumber = e.range.getRow();

  if(rowNumber === 1)
    return;

  const values = sheet
      .getRange(rowNumber,1,1,sheet.getLastColumn())
      .getValues()[0];

  sendLead(values);

}
`;
}