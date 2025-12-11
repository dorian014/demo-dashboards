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
 * Get date string (YYYY-MM-DD) from date
 */
function getDateKey(date) {
    return date.toISOString().split('T')[0];
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
 * Group data by date
 */
function groupByDate(data, range) {
    const grouped = {};
    const now = new Date();

    // Initialize all dates in range
    if (range === '7days') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            grouped[getDateKey(d)] = { posts: 0, impressions: 0 };
        }
    } else if (range === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        for (let d = new Date(startOfMonth); d <= now; d.setDate(d.getDate() + 1)) {
            grouped[getDateKey(d)] = { posts: 0, impressions: 0 };
        }
    } else {
        // For 'all', group by unique dates in data
        data.forEach(item => {
            const itemDate = parseDate(item['Created At']);
            if (itemDate) {
                const key = getDateKey(itemDate);
                if (!grouped[key]) grouped[key] = { posts: 0, impressions: 0 };
            }
        });
    }

    // Populate with actual data
    data.forEach(item => {
        const itemDate = parseDate(item['Created At']);
        if (itemDate) {
            const key = getDateKey(itemDate);
            if (grouped[key]) {
                grouped[key].posts++;
                grouped[key].impressions += parseNumber(item['Impressions/Views']);
            }
        }
    });

    // Sort by date and return
    const sortedKeys = Object.keys(grouped).sort();
    return {
        labels: sortedKeys.map(k => {
            const d = new Date(k);
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
    const totalLikes = sumField(filteredData, 'Likes');
    const totalComments = sumField(filteredData, 'Comments/Replies');

    // Group by date for charts
    const chartData = groupByDate(filteredData, currentFilter);

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
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-value">${totalPosts.toLocaleString()}</div>
                    <div class="stat-label">Total Posts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(totalImpressions)}</div>
                    <div class="stat-label">Impressions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(totalLikes)}</div>
                    <div class="stat-label">Likes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(totalComments)}</div>
                    <div class="stat-label">Comments</div>
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
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
            },
            y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
                ticks: { font: { size: 10 } }
            }
        }
    };

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
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.impressions,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#2563eb'
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
    token: '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'
};

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
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        const primaryColor = [37, 99, 235];
        const textColor = [30, 41, 59];
        const lightGray = [100, 116, 139];

        // Header - light background with blue accent
        doc.setFillColor(255, 255, 255);
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

        // Summary
        const instagramData = reportData.platforms?.instagram?.data || [];
        const facebookData = reportData.platforms?.facebook?.data || [];
        const allData = [...instagramData, ...facebookData];

        const totalPosts = allData.length;
        const totalImpressions = sumField(allData, 'Impressions/Views');

        // Summary boxes - just Posts and Impressions
        const stats = [
            { label: 'Total Posts', value: totalPosts, sub: `Instagram/X: ${instagramData.length} | Facebook: ${facebookData.length}` },
            { label: 'Total Impressions', value: totalImpressions, sub: `Instagram/X: ${formatNumber(sumField(instagramData, 'Impressions/Views'))} | Facebook: ${formatNumber(sumField(facebookData, 'Impressions/Views'))}` }
        ];

        const boxW = (pageWidth - margin * 2 - 10) / 2;
        stats.forEach((s, i) => {
            const x = margin + (boxW + 10) * i;
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(x, y, boxW, 28, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setTextColor(...lightGray);
            doc.text(s.label, x + 8, y + 8);
            doc.setFontSize(18);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text(formatNumber(s.value), x + 8, y + 18);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...lightGray);
            doc.text(s.sub, x + 8, y + 24);
        });

        y += 40;

        // Top 5 Posts Section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('Top 5 Posts by Impressions', margin, y);

        // Blue underline
        doc.setFillColor(...primaryColor);
        doc.rect(margin, y + 2, 60, 0.5, 'F');

        y += 10;

        // Get top 5 posts
        const top5Posts = [...allData]
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

            // Post link
            doc.setTextColor(...primaryColor);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            const postLink = String(post['Post ID'] || 'No link').substring(0, 70);
            doc.textWithLink(postLink, margin + 18, y + 13, { url: post['Post ID'] || '#' });

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
