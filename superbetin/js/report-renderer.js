// Superbetin Report Renderer
// Renders report data directly on the page

let reportData = null;

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
 * Filter data by time range
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
        return allData; // 'all' - no filter
    }

    return allData.filter(item => {
        const itemDate = parseDate(item['Created At']);
        return itemDate && itemDate >= startDate;
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
            <h1 class="report-title">Influencer Performance Report</h1>
            <p class="report-subtitle">AI Micro-Influencer Analytics</p>
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
                                <div class="top-post-agent">${escapeHtml(post['Agent Name'] || 'Unknown')} · ${escapeHtml(post['Platform'] || '-')}</div>
                                <a href="${escapeHtml(post['Post ID'] || '#')}" target="_blank" class="top-post-link">${escapeHtml(post['Post ID'] || 'No link')}</a>
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
 * Download PDF
 */
async function downloadPDF() {
    const btn = document.getElementById('downloadBtn');
    btn.disabled = true;

    try {
        // Check if data is available
        if (!reportData || !reportData.platforms) {
            alert('No data available. Please wait for data to load.');
            btn.disabled = false;
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        const primaryColor = [37, 99, 235];
        const textColor = [30, 41, 59];
        const lightGray = [100, 116, 139];

        // Header - light gray background with blue accent
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setFillColor(...primaryColor);
        doc.rect(0, 35, pageWidth, 1.5, 'F');

        doc.setTextColor(...textColor);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('SUPERBETIN', margin, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...primaryColor);
        doc.text('Influencer Performance Report', margin, 26);

        const today = new Date();
        doc.setTextColor(...lightGray);
        doc.text(today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin, 22, { align: 'right' });

        let y = 47;

        // Get data and apply current filter
        const instagramData = reportData.platforms?.instagram?.data || [];
        const facebookData = reportData.platforms?.facebook?.data || [];
        const allData = [...instagramData, ...facebookData];
        const filteredData = filterDataByRange(allData, currentFilter);

        const totalPosts = filteredData.length;
        const totalImpressions = sumField(filteredData, 'Impressions/Views');

        const filterLabels = { '7days': 'Past 7 Days', 'month': 'This Month', 'all': 'All Time' };

        // Summary boxes - just Posts and Impressions
        const stats = [
            { label: 'Total Posts', value: totalPosts },
            { label: 'Total Impressions', value: totalImpressions }
        ];

        const boxW = (pageWidth - margin * 2 - 10) / 2;
        stats.forEach((s, i) => {
            const x = margin + (boxW + 10) * i;
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(x, y, boxW, 22, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setTextColor(...lightGray);
            doc.text(s.label, x + 8, y + 8);
            doc.setFontSize(18);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text(formatNumber(s.value), x + 8, y + 18);
        });

        y += 32;

        // Show filter period
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...lightGray);
        doc.text(`Period: ${filterLabels[currentFilter]}`, margin, y);
        y += 10;

        // Top 5 Posts Section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('Top 5 Posts by Impressions', margin, y);

        // Blue underline
        doc.setFillColor(...primaryColor);
        doc.rect(margin, y + 2, 60, 0.5, 'F');

        y += 10;

        // Get top 5 posts from filtered data
        const top5Posts = [...filteredData]
            .sort((a, b) => parseNumber(b['Impressions/Views']) - parseNumber(a['Impressions/Views']))
            .slice(0, 5);

        top5Posts.forEach((post, idx) => {
            if (y > pageHeight - 30) { doc.addPage(); y = 20; }

            // Background
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'F');

            // Rank circle
            doc.setFillColor(...primaryColor);
            doc.circle(margin + 8, y + 9, 5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(String(idx + 1), margin + 8, y + 11, { align: 'center' });

            // Agent name and platform
            doc.setTextColor(...textColor);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            const agentText = `${post['Agent Name'] || 'Unknown'} · ${post['Platform'] || '-'}`;
            doc.text(agentText.substring(0, 40), margin + 18, y + 7);

            // Post ID
            doc.setTextColor(...lightGray);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            const postId = String(post['Post ID'] || 'No ID');
            doc.text(`ID: ${postId.substring(0, 50)}`, margin + 18, y + 13);

            // Impressions
            doc.setTextColor(...primaryColor);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(formatNumber(post['Impressions/Views']), pageWidth - margin - 5, y + 9, { align: 'right' });
            doc.setFontSize(6);
            doc.setTextColor(...lightGray);
            doc.setFont('helvetica', 'normal');
            doc.text('IMPRESSIONS', pageWidth - margin - 5, y + 14, { align: 'right' });

            y += 22;
        });

        // Footer
        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(...lightGray);
            doc.text(`Generated by QStarLabs | Page ${i}/${pages}`, pageWidth/2, pageHeight - 8, { align: 'center' });
        }

        doc.save(`Superbetin_Report_${today.toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF: ' + error.message);
    } finally {
        btn.disabled = false;
    }
}

// Helpers
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

// Export
window.refreshData = refreshData;
window.downloadPDF = downloadPDF;
