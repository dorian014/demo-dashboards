# Google Apps Script - Superbetin Email Service

This file contains the Google Apps Script code for sending Superbetin influencer reports via Gmail.

## Setup Instructions

### 1. Create Google Apps Script Project

1. Go to https://script.google.com
2. Click **"New Project"**
3. Delete any default code
4. Copy and paste the code below
5. Save the project (name it "Superbetin Report Email Service")

### 2. Deploy as Web App

1. Click **"Deploy"** → **"New deployment"**
2. Click the gear icon next to "Select type" → Choose **"Web app"**
3. Configure:
   - **Execute as:** Your account
   - **Who has access:** Anyone
4. Click **"Deploy"**
5. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/.../exec`)
6. Add this URL to `report-renderer.js` in the `EMAIL_CONFIG.googleAppsScriptUrl` field

### 3. Grant Permissions

On first deployment, you'll need to:
1. Click "Authorize access"
2. Choose your Google account
3. Click "Advanced" → "Go to [project name] (unsafe)"
4. Click "Allow"

## Google Apps Script Code

```javascript
function doPost(e) {
  try {
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!data.recipientEmail || !data.pdfBase64) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Missing required fields: recipientEmail or pdfBase64'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const recipient = data.recipientEmail;
    const subject = `Superbetin Influencer Report - ${data.reportDate}`;

    const body = `
Hello,

Please find attached the Superbetin Influencer Performance Report.

Report Details:
- Date Range: ${data.filterRange || 'All Time'}
- Generated: ${data.reportDate}
- Total Posts: ${data.totalPosts}
- Total Impressions: ${data.totalImpressions}

Best regards,
QStarLabs Analytics Team
    `;

    // Convert base64 to PDF blob
    const pdfBlob = Utilities.newBlob(
      Utilities.base64Decode(data.pdfBase64),
      'application/pdf',
      `Superbetin_Report_${data.reportDate}.pdf`
    );

    // Send email with Gmail
    GmailApp.sendEmail(recipient, subject, body, {
      attachments: [pdfBlob],
      name: 'QStarLabs Analytics'
    });

    Logger.log(`Email sent successfully to ${recipient}`);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Email sent successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error sending email: ${error.toString()}`);

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (run manually to test)
function testDoPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        recipientEmail: 'test@example.com',
        pdfBase64: '', // Would need actual base64 PDF
        reportDate: '2025-12-11',
        filterRange: 'Past 7 Days',
        totalPosts: 100,
        totalImpressions: 50000
      })
    }
  };

  const result = doPost(testData);
  Logger.log(result.getContent());
}
```

## Gmail Limits

- **Free Gmail accounts**: 100 emails/day
- **Google Workspace accounts**: 1,500 emails/day
- **Attachment size limit**: 25 MB per email

## Troubleshooting

**Email not sending:**
- Check Google Apps Script execution logs for errors
- Verify the Web App URL is correct
- Ensure you've granted Gmail permissions
- Check if you've hit daily email quota

**Permission errors:**
- Re-deploy the Web App
- Ensure "Execute as: Me" is selected
- Re-authorize permissions if needed
