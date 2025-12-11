// Superbetin Report Generator - PDF Generator
// Generates PDF reports using jsPDF

let reportData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadDataInfo();
});

/**
 * Load and display data info
 */
async function loadDataInfo() {
    const dataInfo = document.getElementById('dataInfo');

    try {
        reportData = await DataLoader.loadData();

        if (reportData && reportData.platforms) {
            const instagram = reportData.platforms.instagram?.count || 0;
            const facebook = reportData.platforms.facebook?.count || 0;
            const generated = reportData.generated || 'Unknown';

            dataInfo.innerHTML = `
                <strong>Last updated:</strong> ${generated}<br>
                <strong>Instagram/X:</strong> ${instagram} posts &nbsp;|&nbsp;
                <strong>Facebook:</strong> ${facebook} posts
            `;
        } else {
            dataInfo.innerHTML = '<span style="color: #dc2626;">No data available. Click Refresh to load data.</span>';
        }
    } catch (error) {
        console.error('Error loading data:', error);
        dataInfo.innerHTML = '<span style="color: #dc2626;">Error loading data</span>';
    }
}

/**
 * Show status message
 */
function showStatus(message, type = 'loading') {
    const status = document.getElementById('status');
    status.className = `status show ${type}`;
    status.textContent = message;

    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            status.classList.remove('show');
        }, 3000);
    }
}

/**
 * Refresh data from JSON files
 */
async function refreshData() {
    const btn = document.getElementById('refreshBtn');
    const originalHTML = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div><span>Refreshing...</span>';
    showStatus('Refreshing data...', 'loading');

    try {
        // Clear cache and reload
        DataLoader.clearCache();
        await loadDataInfo();

        showStatus('Data refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showStatus('Error refreshing data', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

/**
 * Download PDF report
 */
async function downloadReport() {
    const btn = document.getElementById('downloadBtn');
    const originalHTML = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div><span>Generating PDF...</span>';
    showStatus('Generating PDF report...', 'loading');

    try {
        if (!reportData) {
            reportData = await DataLoader.loadData();
        }

        await generatePDFReport(reportData);
        showStatus('PDF downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showStatus('Error generating PDF', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

/**
 * Generate PDF report from data
 */
async function generatePDFReport(data) {
    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Colors
    const primaryColor = [37, 99, 235];
    const textColor = [30, 41, 59];
    const lightGray = [100, 116, 139];

    // ============ HEADER ============
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPERBETIN', margin, 22);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Influencer Performance Report', margin, 32);

    // Date
    const today = new Date();
    doc.setFontSize(10);
    doc.text(today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }), pageWidth - margin, 28, { align: 'right' });

    // ============ SUMMARY ============
    let y = 55;

    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, y);

    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...lightGray);

    const instagramData = data.platforms?.instagram?.data || [];
    const facebookData = data.platforms?.facebook?.data || [];

    // Calculate totals
    const totalPosts = instagramData.length + facebookData.length;
    const totalImpressions = [...instagramData, ...facebookData].reduce((sum, r) => {
        const val = r['Impressions/Views'] || 0;
        return sum + (typeof val === 'string' ? parseInt(val.replace(/,/g, '')) || 0 : val);
    }, 0);
    const totalLikes = [...instagramData, ...facebookData].reduce((sum, r) => {
        const val = r['Likes'] || 0;
        return sum + (typeof val === 'string' ? parseInt(val.replace(/,/g, '')) || 0 : val);
    }, 0);
    const totalComments = [...instagramData, ...facebookData].reduce((sum, r) => {
        const val = r['Comments/Replies'] || 0;
        return sum + (typeof val === 'string' ? parseInt(val.replace(/,/g, '')) || 0 : val);
    }, 0);

    // Summary boxes
    const boxWidth = (pageWidth - margin * 2 - 15) / 4;
    const boxHeight = 25;

    const summaryItems = [
        { label: 'Total Posts', value: totalPosts.toLocaleString() },
        { label: 'Impressions', value: formatNumber(totalImpressions) },
        { label: 'Likes', value: formatNumber(totalLikes) },
        { label: 'Comments', value: formatNumber(totalComments) }
    ];

    summaryItems.forEach((item, i) => {
        const x = margin + (boxWidth + 5) * i;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'F');

        doc.setFontSize(8);
        doc.setTextColor(...lightGray);
        doc.text(item.label, x + boxWidth / 2, y + 8, { align: 'center' });

        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'bold');
        doc.text(item.value, x + boxWidth / 2, y + 19, { align: 'center' });
    });

    y += boxHeight + 15;

    // ============ INSTAGRAM/X DATA ============
    if (instagramData.length > 0) {
        y = addPlatformSection(doc, 'Instagram / X', instagramData, y, margin, pageWidth, pageHeight);
    }

    // ============ FACEBOOK DATA ============
    if (facebookData.length > 0) {
        // Check if we need a new page
        if (y > pageHeight - 60) {
            doc.addPage();
            y = 20;
        }
        y = addPlatformSection(doc, 'Facebook', facebookData, y, margin, pageWidth, pageHeight);
    }

    // ============ FOOTER ============
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...lightGray);
        doc.text(
            `Generated by QStarLabs | Page ${i} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    // Save
    const filename = `Superbetin_Report_${today.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

/**
 * Add platform section to PDF
 */
function addPlatformSection(doc, title, data, startY, margin, pageWidth, pageHeight) {
    const primaryColor = [37, 99, 235];
    const textColor = [30, 41, 59];
    const lightGray = [100, 116, 139];

    let y = startY;

    // Section title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${title} (${data.length} posts)`, margin, y);

    y += 8;

    // Table header
    const colWidths = [50, 30, 30, 30, 30];
    const headers = ['Agent', 'Views', 'Likes', 'Shares', 'Comments'];

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);

    let x = margin + 2;
    headers.forEach((header, i) => {
        doc.text(header, x, y + 5.5);
        x += colWidths[i];
    });

    y += 10;

    // Table rows (all data, sorted by impressions)
    const sortedData = [...data].sort((a, b) => {
        const aVal = parseInt(String(a['Impressions/Views'] || 0).replace(/,/g, '')) || 0;
        const bVal = parseInt(String(b['Impressions/Views'] || 0).replace(/,/g, '')) || 0;
        return bVal - aVal;
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    sortedData.forEach((row, index) => {
        // Check for page break
        if (y > pageHeight - 25) {
            doc.addPage();
            y = 20;
        }

        // Alternate row background
        if (index % 2 === 0) {
            doc.setFillColor(252, 252, 253);
            doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
        }

        doc.setTextColor(...textColor);
        x = margin + 2;

        // Agent name (truncate if too long)
        const agent = String(row['Agent Name'] || 'Unknown').substring(0, 20);
        doc.text(agent, x, y);
        x += colWidths[0];

        // Metrics
        doc.text(formatNumber(row['Impressions/Views']), x, y);
        x += colWidths[1];

        doc.text(formatNumber(row['Likes']), x, y);
        x += colWidths[2];

        doc.text(formatNumber(row['Shares/Retweets']), x, y);
        x += colWidths[3];

        doc.text(formatNumber(row['Comments/Replies']), x, y);

        y += 7;
    });

    return y + 10;
}

/**
 * Format number for display
 */
function formatNumber(value) {
    if (!value) return '0';
    const num = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) || 0 : value;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Export functions
window.downloadReport = downloadReport;
window.refreshData = refreshData;
