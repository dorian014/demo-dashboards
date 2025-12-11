// Superbetin Report Renderer
// Renders report data directly on the page

let reportData = null;

// Email configuration
const EMAIL_CONFIG = {
    googleAppsScriptUrl: 'https://script.google.com/macros/s/AKfycbxSBXq-GHv96B0A5EwRZ82xtd9HyttJ1ve4KWc3guyW6knV-JDudEQYgb9azOjTlKQi/exec',
    defaultRecipient: ''
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndRenderReport();
});

/**
 * Load data and render the report
 */
async function loadAndRenderReport() {
    try {
        reportData = await DataLoader.loadData();
        renderReport(reportData);
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('reportContent').innerHTML = `
            <div class="loading">
                <p style="color: #dc2626;">Error loading report data</p>
            </div>
        `;
    }
}

// Current filter state
let currentFilter = '7days';
let postsChart = null;
let impressionsChart = null;

/**
 * Parse date from "Created At" field
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Get date string (YYYY-MM-DD) from date in local timezone
 */
function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Filter data by time range (only videos)
 */
function filterDataByRange(allData, range) {
    const now = new Date();
    let startDate;

    if (range === '7days') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    } else if (range === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        startDate = null; // 'all' - no date filter
    }

    return allData.filter(item => {
        // Only include videos (check Media Type since not all sheets have Is Video)
        const mediaType = (item['Media Type'] || '').toUpperCase();
        const isVideo = item['Is Video'] === 'Yes' || mediaType === 'VIDEO' || mediaType === 'REEL';
        if (!isVideo) return false;

        // Apply date filter if set
        if (startDate) {
            const itemDate = parseDate(item['Created At']);
            return itemDate && itemDate >= startDate;
        }
        return true;
    });
}

/**
 * Group data by date - only includes days with actual data
 */
function groupByDate(data) {
    const grouped = {};

    // Group by unique dates in data
    data.forEach(item => {
        const itemDate = parseDate(item['Created At']);
        if (itemDate) {
            const key = getDateKey(itemDate);
            if (!grouped[key]) {
                grouped[key] = { posts: 0, impressions: 0 };
            }
            grouped[key].posts++;
            grouped[key].impressions += parseNumber(item['Impressions/Views']);
        }
    });

    // Sort by date and return
    const sortedKeys = Object.keys(grouped).sort();
    return {
        labels: sortedKeys.map(k => {
            const d = new Date(k + 'T12:00:00');  // Add time to avoid timezone shift
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        posts: sortedKeys.map(k => grouped[k].posts),
        impressions: sortedKeys.map(k => grouped[k].impressions)
    };
}

/**
 * Handle filter change
 */
function onFilterChange(value) {
    currentFilter = value;
    renderReport(reportData);
}

/**
 * Render the full report
 */
function renderReport(data) {
    const container = document.getElementById('reportPaper');

    if (!data || !data.platforms) {
        container.innerHTML = `
            <div class="loading">
                <p>No data available</p>
            </div>
        `;
        return;
    }

    const instagramData = data.platforms?.instagram?.data || [];
    const facebookData = data.platforms?.facebook?.data || [];
    const allData = [...instagramData, ...facebookData];

    // Filter data by selected range
    const filteredData = filterDataByRange(allData, currentFilter);

    // Calculate totals for filtered data
    const totalPosts = filteredData.length;
    const totalImpressions = sumField(filteredData, 'Impressions/Views');

    // Group by date for charts
    const chartData = groupByDate(filteredData);

    // Get top 5 posts by impressions from filtered data
    const top5Posts = [...filteredData]
        .sort((a, b) => parseNumber(b['Impressions/Views']) - parseNumber(a['Impressions/Views']))
        .slice(0, 5);

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const filterLabels = {
        '7days': 'Past 7 Days',
        'month': 'This Month',
        'all': 'All Time'
    };

    let html = `
        <!-- Report Header -->
        <div class="report-header">
            <div class="report-header-top">
                <img src="assets/logo2.png" alt="Superbetin" class="report-logo">
                <div class="report-date">
                    ${dateStr}
                    <div class="report-filter">
                        <select id="timeFilter" onchange="onFilterChange(this.value)">
                            <option value="7days" ${currentFilter === '7days' ? 'selected' : ''}>Past 7 Days</option>
                            <option value="month" ${currentFilter === 'month' ? 'selected' : ''}>This Month</option>
                            <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>All Time</option>
                        </select>
                    </div>
                </div>
            </div>
            <h1 class="report-title">AI Micro-influencer Report</h1>
            <p class="report-subtitle">Performance Analytics</p>
        </div>

        <!-- Report Body -->
        <div class="report-body">
            <!-- Stats Row -->
            <div class="stats-row" style="grid-template-columns: repeat(2, 1fr);">
                <div class="stat-card">
                    <div class="stat-value">${totalPosts.toLocaleString()}</div>
                    <div class="stat-label">Total Posts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(totalImpressions)}</div>
                    <div class="stat-label">Impressions</div>
                </div>
            </div>

            <!-- Chart Grid -->
            <div class="chart-grid">
                <div class="chart-card">
                    <div class="chart-title">Posts Over Time</div>
                    <div class="chart-container">
                        <canvas id="postsChart"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">Impressions Over Time</div>
                    <div class="chart-container">
                        <canvas id="impressionsChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Top 5 Posts -->
            <div class="top-posts-section">
                <h3>Top 5 Posts by Impressions</h3>
                <div class="top-posts-list">
                    ${top5Posts.length > 0 ? top5Posts.map((post, index) => `
                        <div class="top-post-item">
                            <div class="top-post-rank">${index + 1}</div>
                            <div class="top-post-info">
                                <div class="top-post-agent">${escapeHtml(post['Agent Name'] || post['Account Name'] || 'Unknown')} · ${escapeHtml(post['Platform'] || '-')}</div>
                                <a href="${fixInstagramUrl(post['Post URL']) || getPostUrl(post['Post ID'])}" target="_blank" class="top-post-link">${escapeHtml(post['Post ID'] || 'No link')}</a>
                            </div>
                            <div class="top-post-metrics">
                                <div class="top-post-impressions">${formatNumber(post['Impressions/Views'])}</div>
                                <div class="top-post-label">Impressions</div>
                            </div>
                        </div>
                    `).join('') : '<p style="color: #64748b; text-align: center; padding: 20px;">No posts in selected time range</p>'}
                </div>
            </div>
        </div>

        <!-- Report Footer -->
        <div class="report-footer">
            <div class="report-footer-left">
                Generated on ${dateStr}
            </div>
            <div class="report-footer-right">
                Powered by <img src="assets/Q-Star-Labs-Logo_Nightshade.png" alt="QStarLabs">
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Render charts after DOM is updated
    setTimeout(() => {
        renderCharts(chartData);
    }, 0);
}

/**
 * Render time-based charts
 */
function renderCharts(chartData) {
    // Destroy existing charts
    if (postsChart) postsChart.destroy();
    if (impressionsChart) impressionsChart.destroy();

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { top: 20 }
        },
        plugins: {
            legend: { display: false },
            datalabels: {
                anchor: 'end',
                align: 'top',
                color: '#1e293b',
                font: { size: 10, weight: 'bold' },
                formatter: (value) => value > 0 ? formatNumber(value) : ''
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
            },
            y: {
                beginAtZero: true,
                grace: '15%',
                grid: { color: '#f1f5f9' },
                ticks: { font: { size: 10 } }
            }
        }
    };

    // Register datalabels plugin
    Chart.register(ChartDataLabels);

    // Posts Chart
    const postsCtx = document.getElementById('postsChart');
    if (postsCtx) {
        postsChart = new Chart(postsCtx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.posts,
                    backgroundColor: '#2563eb',
                    borderRadius: 4
                }]
            },
            options: chartOptions
        });
    }

    // Impressions Chart
    const impressionsCtx = document.getElementById('impressionsChart');
    if (impressionsCtx) {
        impressionsChart = new Chart(impressionsCtx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.impressions,
                    backgroundColor: '#2563eb',
                    borderRadius: 4
                }]
            },
            options: chartOptions
        });
    }
}

// Export filter change function
window.onFilterChange = onFilterChange;

/**
 * Render a platform section with table
 */
function renderPlatformSection(title, data) {
    // Sort by impressions descending
    const sortedData = [...data].sort((a, b) => {
        const aVal = parseNumber(a['Impressions/Views']);
        const bVal = parseNumber(b['Impressions/Views']);
        return bVal - aVal;
    });

    let rows = sortedData.map(row => `
        <tr>
            <td>${escapeHtml(row['Agent Name'] || 'Unknown')}</td>
            <td>${escapeHtml(row['Platform'] || '-')}</td>
            <td class="number">${formatNumber(row['Impressions/Views'])}</td>
            <td class="number">${formatNumber(row['Likes'])}</td>
            <td class="number">${formatNumber(row['Shares/Retweets'])}</td>
            <td class="number">${formatNumber(row['Comments/Replies'])}</td>
            <td class="number">${row['Engagement Rate (%)'] || '0'}%</td>
        </tr>
    `).join('');

    return `
        <div class="platform-section">
            <div class="platform-header">
                <h2>${title}</h2>
                <span class="count">${data.length} posts</span>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Agent</th>
                        <th>Platform</th>
                        <th>Views</th>
                        <th>Likes</th>
                        <th>Shares</th>
                        <th>Comments</th>
                        <th>Eng. Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * GitHub configuration
 */
const GITHUB_CONFIG = {
    owner: 'dorian014',
    repo: 'demo-dashboards',
    workflow: 'fetch-superbetin.yml',
    token: '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',
    cooldownMinutes: 5  // Minimum minutes between refreshes
};

/**
 * Check if refresh is allowed (rate limiting)
 */
function canRefresh() {
    const lastRefresh = localStorage.getItem('lastRefreshTime');
    if (!lastRefresh) return { allowed: true };

    const elapsed = Date.now() - parseInt(lastRefresh);
    const cooldownMs = GITHUB_CONFIG.cooldownMinutes * 60 * 1000;

    if (elapsed < cooldownMs) {
        const remainingMs = cooldownMs - elapsed;
        const remainingMins = Math.ceil(remainingMs / 60000);
        return {
            allowed: false,
            remainingMinutes: remainingMins
        };
    }
    return { allowed: true };
}

/**
 * Record refresh timestamp
 */
function recordRefresh() {
    localStorage.setItem('lastRefreshTime', Date.now().toString());
}

/**
 * Trigger GitHub Action workflow
 */
async function triggerGitHubAction() {
    const response = await fetch(
        `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions/workflows/${GITHUB_CONFIG.workflow}/dispatches`,
        {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ref: 'main' })
        }
    );

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to trigger workflow: ${response.status}`);
    }
    return true;
}

/**
 * Refresh data - triggers GitHub Action and waits for new data
 */
async function refreshData() {
    const btn = document.getElementById('refreshBtn');

    // Check rate limit
    const refreshCheck = canRefresh();
    if (!refreshCheck.allowed) {
        alert(`Please wait ${refreshCheck.remainingMinutes} more minute(s) before refreshing again.`);
        return;
    }

    btn.disabled = true;

    const paper = document.getElementById('reportPaper');
    const oldGenerated = reportData?.generated;

    paper.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Triggering data refresh...</p>
        </div>
    `;

    try {
        // Record this refresh attempt
        recordRefresh();

        await triggerGitHubAction();

        paper.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Fetching fresh data from Google Sheets...</p>
                <p style="font-size: 0.8rem; color: #64748b; margin-top: 8px;">This may take 30-60 seconds</p>
            </div>
        `;

        // Poll for new data every 10 seconds, up to 2 minutes
        for (let i = 0; i < 12; i++) {
            await new Promise(resolve => setTimeout(resolve, 10000));

            DataLoader.clearCache();
            try {
                const newData = await DataLoader.loadData();
                if (newData.generated !== oldGenerated) {
                    reportData = newData;
                    renderReport(reportData);
                    return;
                }
            } catch (e) {
                // Data not ready yet
            }
        }

        // Timeout - reload current data
        DataLoader.clearCache();
        await loadAndRenderReport();

    } catch (error) {
        console.error('Error refreshing data:', error);
        paper.innerHTML = `
            <div class="loading">
                <p style="color: #dc2626;">Error: ${error.message}</p>
                <button onclick="loadAndRenderReport()" style="margin-top: 16px; padding: 8px 16px; cursor: pointer;">
                    Reload Current Data
                </button>
            </div>
        `;
    } finally {
        btn.disabled = false;
    }
}

/**
 * Download PDF - captures the report as it appears on screen with clickable links
 */
async function downloadPDF() {
    const btn = document.getElementById('downloadBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div><span>Generating...</span>';

    try {
        const paper = document.getElementById('reportPaper');

        // Capture the report as an image (scale 1.5 for balance of quality/size)
        const canvas = await html2canvas(paper, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // Use JPEG with 70% quality for smaller file size
        const imgData = canvas.toDataURL('image/jpeg', 0.7);

        // Calculate dimensions to fit on ONE page
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Calculate aspect ratio and scale to fit on one page
        const canvasAspect = canvas.width / canvas.height;
        const pageAspect = pageWidth / pageHeight;

        let imgWidth, imgHeight;
        if (canvasAspect > pageAspect) {
            // Content is wider - fit to width
            imgWidth = pageWidth;
            imgHeight = pageWidth / canvasAspect;
        } else {
            // Content is taller - fit to height
            imgHeight = pageHeight;
            imgWidth = pageHeight * canvasAspect;
        }

        // Center on page
        const xOffset = (pageWidth - imgWidth) / 2;
        const yOffset = (pageHeight - imgHeight) / 2;

        // Scale factor from paper pixels to PDF mm
        const scale = imgWidth / paper.offsetWidth;

        // Add image scaled to fit one page
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);

        // Add clickable links for top posts (adjusted for scaling and offset)
        const linkElements = paper.querySelectorAll('.top-post-link');
        linkElements.forEach((link) => {
            const rect = link.getBoundingClientRect();
            const paperRect = paper.getBoundingClientRect();

            // Calculate position relative to paper, then scale and offset
            const x = xOffset + (rect.left - paperRect.left) * scale;
            const y = yOffset + (rect.top - paperRect.top) * scale;
            const w = rect.width * scale;
            const h = rect.height * scale;

            const url = link.href;
            if (url && url !== '#' && url.startsWith('http')) {
                pdf.link(x, y, w, h, { url: url });
            }
        });

        const today = new Date();
        pdf.save(`Superbetin_Report_${today.toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg><span>Download PDF</span>`;
    }
}

// Helpers

// Fix Instagram URLs that use numeric IDs instead of shortcodes
function fixInstagramUrl(url) {
    if (!url) return null;

    // Check if it's an Instagram URL with a numeric ID
    const match = url.match(/instagram\.com\/(?:p|reel)\/(\d+)/);
    if (match) {
        const numericId = match[1];
        const shortcode = instagramIdToShortcode(numericId);
        return `https://www.instagram.com/reel/${shortcode}/`;
    }

    return url;
}

// Convert Instagram numeric ID to shortcode
function instagramIdToShortcode(id) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let shortcode = '';
    let num = BigInt(id);
    while (num > 0) {
        shortcode = alphabet[Number(num % 64n)] + shortcode;
        num = num / 64n;
    }
    return shortcode;
}

function getPostUrl(postId, platform) {
    if (!postId) return '#';
    const id = String(postId);

    // If it's already a full URL
    if (id.startsWith('http://') || id.startsWith('https://')) {
        return id;
    }
    // If it starts with www, add https
    if (id.startsWith('www.')) {
        return 'https://' + id;
    }
    // If it contains a domain, add https
    if (id.includes('facebook.com') || id.includes('instagram.com') || id.includes('twitter.com') || id.includes('x.com')) {
        return 'https://' + id;
    }
    // If numeric and Instagram, convert to shortcode URL
    if (/^\d+$/.test(id)) {
        const shortcode = instagramIdToShortcode(id);
        return `https://www.instagram.com/reel/${shortcode}/`;
    }
    return '#';
}

function parseNumber(val) {
    if (!val) return 0;
    return typeof val === 'string' ? parseInt(val.replace(/,/g, '')) || 0 : val;
}

function sumField(arr, field) {
    return arr.reduce((sum, r) => sum + parseNumber(r[field]), 0);
}

function formatNumber(val) {
    const num = parseNumber(val);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Open email modal
 */
function sendReport() {
    // Check if email service is configured
    if (!EMAIL_CONFIG.googleAppsScriptUrl) {
        alert('Email service not configured. Please set up Google Apps Script first.\nSee superbetin/google-apps-script.md for instructions.');
        return;
    }

    // Show modal
    document.getElementById('emailModal').classList.add('active');
    document.getElementById('emailInput').value = EMAIL_CONFIG.defaultRecipient;
    document.getElementById('emailInput').focus();
}

/**
 * Close email modal
 */
function closeEmailModal() {
    document.getElementById('emailModal').classList.remove('active');
    document.getElementById('emailInput').value = '';
}

/**
 * Confirm and send email
 */
async function confirmSendEmail() {
    const recipientEmail = document.getElementById('emailInput').value.trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
        document.getElementById('emailInput').style.borderColor = '#dc2626';
        return;
    }

    closeEmailModal();

    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinner-icon">
        <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"></circle>
    </svg><span>Sending...</span>`;

    try {
        const paper = document.getElementById('reportPaper');

        // Generate PDF (scale 1.5 for balance of quality/size)
        const canvas = await html2canvas(paper, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.7); // Use JPEG with 70% quality
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Scale to fit on ONE page
        const canvasAspect = canvas.width / canvas.height;
        const pageAspect = pageWidth / pageHeight;

        let imgWidth, imgHeight;
        if (canvasAspect > pageAspect) {
            imgWidth = pageWidth;
            imgHeight = pageWidth / canvasAspect;
        } else {
            imgHeight = pageHeight;
            imgWidth = pageHeight * canvasAspect;
        }

        const xOffset = (pageWidth - imgWidth) / 2;
        const yOffset = (pageHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);

        // Convert PDF to base64
        const pdfBase64 = pdf.output('datauristring').split(',')[1];

        // Get report stats
        const allData = [...(reportData.instagram?.data || []), ...(reportData.facebook?.data || [])];
        const filteredData = filterDataByRange(allData, currentFilter);
        const totalPosts = filteredData.length;
        const totalImpressions = sumField(filteredData, 'Impressions/Views');
        const today = new Date().toISOString().split('T')[0];

        const filterLabels = {
            '7days': 'Past 7 Days',
            'month': 'This Month',
            'all': 'All Time'
        };

        // Send to Google Apps Script
        const response = await fetch(EMAIL_CONFIG.googleAppsScriptUrl, {
            method: 'POST',
            body: JSON.stringify({
                recipientEmail: recipientEmail,
                pdfBase64: pdfBase64,
                reportDate: today,
                clientName: 'Superbetin',
                reportType: 'AI Micro-influencer Report'
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('Report sent successfully to ' + recipientEmail);
        } else {
            throw new Error(result.message || 'Failed to send email');
        }

    } catch (error) {
        console.error('Email error:', error);
        alert('Error sending email: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg><span>Send</span>`;
    }
}

// Export
window.refreshData = refreshData;
window.downloadPDF = downloadPDF;
window.sendReport = sendReport;
window.closeEmailModal = closeEmailModal;
window.confirmSendEmail = confirmSendEmail;
