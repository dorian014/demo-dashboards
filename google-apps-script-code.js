function doPost(e) {
  Logger.log('=== New email request received ===');

  try {
    var data = JSON.parse(e.postData.contents);
    Logger.log('Recipient: ' + data.recipientEmail);
    Logger.log('Client: ' + data.clientName);
    Logger.log('Report Date: ' + data.reportDate);
    Logger.log('PDF Base64 length: ' + (data.pdfBase64 ? data.pdfBase64.length : 0));
    Logger.log('CSV Base64 length: ' + (data.csvBase64 ? data.csvBase64.length : 0));

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

    // Build email body with metrics
    var body = buildEmailBody(data);

    Logger.log('Creating PDF blob...');
    var fileName = clientName.replace(/\s+/g, '_') + '_Report_' + data.reportDate + '.pdf';
    var pdfBlob = Utilities.newBlob(Utilities.base64Decode(data.pdfBase64), 'application/pdf', fileName);
    Logger.log('PDF blob created, size: ' + pdfBlob.getBytes().length + ' bytes');

    // Create CSV blob if provided
    var attachments = [pdfBlob];
    if (data.csvBase64) {
      Logger.log('Creating CSV blob...');
      var csvFileName = clientName.replace(/\s+/g, '_') + '_Posts_' + data.reportDate + '.csv';
      var csvBlob = Utilities.newBlob(Utilities.base64Decode(data.csvBase64), 'text/csv', csvFileName);
      attachments.push(csvBlob);
      Logger.log('CSV blob created, size: ' + csvBlob.getBytes().length + ' bytes');
    }

    Logger.log('Sending email to: ' + data.recipientEmail);
    Logger.log('CC: dorian@qstarlabs.ai, yang@qstarlabs.ai');
    GmailApp.sendEmail(data.recipientEmail, subject, body, {
      attachments: attachments,
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

function buildEmailBody(data) {
  var clientName = data.clientName || 'Client';
  var reportType = data.reportType || 'Performance Report';

  var lines = [];
  lines.push('Hello,');
  lines.push('');
  lines.push('Please find attached the ' + clientName + ' ' + reportType + '.');
  lines.push('');

  // Summary section
  if (data.summaryMetrics) {
    lines.push('═══════════════════════════════════');
    lines.push('SUMMARY (' + (data.filterLabel || 'Report Period') + ')');
    lines.push('═══════════════════════════════════');
    lines.push('Total Video Posts: ' + data.summaryMetrics.totalPosts);
    lines.push('Total Impressions: ' + formatNumberForEmail(data.summaryMetrics.totalImpressions));
    if (data.summaryMetrics.dateRange) {
      lines.push('Period: ' + data.summaryMetrics.dateRange.start + ' to ' + data.summaryMetrics.dateRange.end);
    }
    lines.push('');
  }

  // Top performers section
  if (data.topPosts && data.topPosts.length > 0) {
    lines.push('═══════════════════════════════════');
    lines.push('TOP PERFORMERS');
    lines.push('═══════════════════════════════════');
    data.topPosts.forEach(function(post, i) {
      lines.push((i + 1) + '. ' + post.agentName + ' (' + post.platform + ') - ' + formatNumberForEmail(post.impressions) + ' impressions');
      lines.push('   ' + post.postUrl);
    });
    lines.push('');
  }

  lines.push('Best regards,');
  lines.push('QStarLabs Analytics Team');

  return lines.join('\n');
}

function formatNumberForEmail(num) {
  if (!num) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
