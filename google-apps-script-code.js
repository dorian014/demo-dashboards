function doPost(e) {
  Logger.log('=== New email request received ===');

  try {
    var data = JSON.parse(e.postData.contents);
    Logger.log('Recipient: ' + data.recipientEmail);
    Logger.log('Client: ' + data.clientName);
    Logger.log('Report Date: ' + data.reportDate);
    Logger.log('PDF Base64 length: ' + (data.pdfBase64 ? data.pdfBase64.length : 0));

    if (!data.recipientEmail || !data.pdfBase64) {
      Logger.log('ERROR: Missing required fields');
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Missing required fields'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var clientName = data.clientName || 'Client';
    var reportType = data.reportType || 'Performance Report';

    var subject = clientName + ' ' + reportType + ' - ' + data.reportDate;
    Logger.log('Subject: ' + subject);

    var body = 'Hello,\n\nPlease find attached the ' + clientName + ' ' + reportType + '.\n\nBest regards,\nQStarLabs Analytics Team';

    Logger.log('Creating PDF blob...');
    var fileName = clientName.replace(/\s+/g, '_') + '_Report_' + data.reportDate + '.pdf';
    var pdfBlob = Utilities.newBlob(Utilities.base64Decode(data.pdfBase64), 'application/pdf', fileName);
    Logger.log('PDF blob created, size: ' + pdfBlob.getBytes().length + ' bytes');

    Logger.log('Sending email to: ' + data.recipientEmail);
    Logger.log('CC: dorian@qstarlabs.ai, yang@qstarlabs.ai');
    GmailApp.sendEmail(data.recipientEmail, subject, body, {
      attachments: [pdfBlob],
      name: 'QStarLabs Analytics',
      cc: 'dorian@qstarlabs.ai, yang@qstarlabs.ai'
    });
    Logger.log('Email sent successfully!');

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Email sent successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
