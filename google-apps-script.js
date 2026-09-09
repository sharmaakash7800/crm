/**
 * =========================================================================
 * SHEETLESS CRM - GOOGLE APPS SCRIPT WEBHOOK
 * =========================================================================
 * 
 * Kaise use karein (1 Minute Setup):
 * 1. Apni Google Sheet kholein.
 * 2. Extensions -> Apps Script par click karein.
 * 3. Ye poora code wahan paste karein aur Save (Ctrl + S) karein.
 * 4. Deploy -> New deployment par click karein.
 * 5. Select type: "Web app"
 * 6. "Who has access": "Anyone" select karein.
 * 7. Deploy par click karke URL copy karein.
 * 8. CRM me Settings -> "Google Sheets Auto-Sync" me ye URL daal dein.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = JSON.parse(e.postData.contents);

    // Agar sheet khali hai toh header create karein
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Lead ID",
        "Name",
        "Phone",
        "Email",
        "Company",
        "City",
        "Source",
        "Status",
        "Priority",
        "Deal Value (Rs.)",
        "Assigned To",
        "Tags",
        "Notes",
        "Next Follow-up",
        "Created At",
        "Last Sync Time"
      ]);
      // Header formatting (Green Background, White bold text)
      var headerRange = sheet.getRange(1, 1, 1, 16);
      headerRange.setBackground("#0F766E");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
    }

    var leadId = contents.id || "";
    var action = contents.action || "create";

    // Update case me existing row search karein
    var rowUpdated = false;
    if (action === "update" && leadId) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == leadId) {
          sheet.getRange(i + 1, 1, 1, 16).setValues([[
            contents.id,
            contents.name || "",
            contents.phone || "",
            contents.email || "",
            contents.company || "",
            contents.city || "",
            contents.source || "",
            contents.status || "",
            contents.priority || "",
            contents.deal_value || 0,
            contents.assigned_to || "",
            contents.tags || "",
            contents.notes || "",
            contents.next_followup_date || "",
            contents.created_at || "",
            new Date().toLocaleString()
          ]]);
          rowUpdated = true;
          break;
        }
      }
    }

    // New lead create ya Test lead
    if (!rowUpdated) {
      sheet.appendRow([
        contents.id || "N/A",
        contents.name || "",
        contents.phone || "",
        contents.email || "",
        contents.company || "",
        contents.city || "",
        contents.source || "",
        contents.status || "",
        contents.priority || "",
        contents.deal_value || 0,
        contents.assigned_to || "",
        contents.tags || "",
        contents.notes || "",
        contents.next_followup_date || "",
        contents.created_at || "",
        new Date().toLocaleString()
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Saved to Google Sheet" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Sheetless CRM Google Sheet Webhook is active!");
}
