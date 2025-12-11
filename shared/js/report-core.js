/**
 * Report Core - Shared functionality for all client reports
 * Requires CLIENT_CONFIG to be defined before loading this script
 */

// Verify config is loaded
if (typeof CLIENT_CONFIG === 'undefined') {
    console.error('CLIENT_CONFIG must be defined before loading report-core.js');
}

let reportData = null;
let currentFilter = '7days';
let postsChart = null;
let impressionsChart = null;

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
        document.getElementById('reportPaper').innerHTML = `
            <div class="loading">
                <p style="color: #dc2626;">Error loading report data</p>
            </div>
        `;
    }
}

// ============ Date Utilities ============

function parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============ Data Processing ============

function filterDataByRange(allData, range) {
    const now = new Date();
    let startDate;

    if (range === '7days') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    } else if (range === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        startDate = null;
    }

    return allData.filter(item => {
        const mediaType = (item['Media Type'] || '').toUpperCase();
        const isVideo = item['Is Video'] === 'Yes' || mediaType === 'VIDEO' || mediaType === 'REEL';
        if (!isVideo) return false;

        if (startDate) {
            const itemDate = parseDate(item['Created At']);
            return itemDate && itemDate >= startDate;
        }
        return true;
    });
}

function groupByDate(data) {
    const grouped = {};

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

    const sortedKeys = Object.keys(grouped).sort();
    return sortedKeys.map(key => ({
        date: key,
        ...grouped[key]
    }));
}

// ============ Number Utilities ============

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

// ============ URL Utilities ============

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

function fixInstagramUrl(url) {
    if (!url) return null;
    const match = url.match(/instagram\.com\/(?:p|reel)\/(\d+)/);
    if (match) {
        const numericId = match[1];
        const shortcode = instagramIdToShortcode(numericId);
        return `https://www.instagram.com/reel/${shortcode}/`;
    }
    return url;
}

function getPostUrl(postId) {
    if (!postId) return '#';
    const id = String(postId);

    if (id.startsWith('http://') || id.startsWith('https://')) return id;
    if (id.startsWith('www.')) return 'https://' + id;
    if (id.includes('facebook.com') || id.includes('instagram.com') || id.includes('twitter.com') || id.includes('x.com')) {
        return 'https://' + id;
    }
    if (/^\d+$/.test(id)) {
        const shortcode = instagramIdToShortcode(id);
        return `https://www.instagram.com/reel/${shortcode}/`;
    }
    return '#';
}

// ============ Toast Notifications ============

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toast.classList.remove('success', 'error');
    toast.classList.add(type);
    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ============ Email Modal ============

function sendReport() {
    if (!CLIENT_CONFIG.emailServiceUrl) {
        showToast('Email service not configured', 'error');
        return;
    }

    document.getElementById('emailModal').classList.add('active');
    document.getElementById('emailInput').value = '';
    document.getElementById('emailInput').focus();
}

function closeEmailModal() {
    document.getElementById('emailModal').classList.remove('active');
    document.getElementById('emailInput').value = '';
}

async function confirmSendEmail() {
    const recipientEmail = document.getElementById('emailInput').value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
        document.getElementById('emailInput').style.borderColor = '#dc2626';
        return;
    }

    closeEmailModal();

    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"></circle>
    </svg><span>Sending...</span>`;

    try {
        const paper = document.getElementById('reportPaper');

        const canvas = await html2canvas(paper, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.7);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

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

        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const today = new Date().toISOString().split('T')[0];

        const response = await fetch(CLIENT_CONFIG.emailServiceUrl, {
            method: 'POST',
            body: JSON.stringify({
                recipientEmail: recipientEmail,
                pdfBase64: pdfBase64,
                reportDate: today,
                clientName: CLIENT_CONFIG.name,
                reportType: CLIENT_CONFIG.reportType
            })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Report sent successfully to ' + recipientEmail, 'success');
        } else {
            throw new Error(result.message || 'Failed to send email');
        }

    } catch (error) {
        console.error('Email error:', error);
        showToast('Error sending email: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg><span>Send</span>`;
    }
}

// ============ PDF Download ============

async function downloadPDF() {
    const btn = document.getElementById('downloadBtn');
    btn.disabled = true;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"></circle>
    </svg><span>Generating...</span>`;

    try {
        const paper = document.getElementById('reportPaper');

        const canvas = await html2canvas(paper, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.7);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

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
        const scale = imgWidth / paper.offsetWidth;

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);

        // Add clickable links
        const linkElements = paper.querySelectorAll('.top-post-link');
        linkElements.forEach((link) => {
            const rect = link.getBoundingClientRect();
            const paperRect = paper.getBoundingClientRect();

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
        pdf.save(`${CLIENT_CONFIG.name}_Report_${today.toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('PDF generation error:', error);
        showToast('Error generating PDF: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg><span>Download PDF</span>`;
    }
}

// ============ Data Refresh ============

const GITHUB_CONFIG = CLIENT_CONFIG.github || {};

function canRefresh() {
    const lastRefresh = localStorage.getItem('lastDataRefresh');
    if (!lastRefresh) return { allowed: true };

    const cooldownMs = (GITHUB_CONFIG.cooldownMinutes || 5) * 60 * 1000;
    const elapsed = Date.now() - parseInt(lastRefresh);

    if (elapsed < cooldownMs) {
        const remainingMs = cooldownMs - elapsed;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        return { allowed: false, remainingMinutes };
    }

    return { allowed: true };
}

async function refreshData() {
    if (!GITHUB_CONFIG.owner || !GITHUB_CONFIG.repo || !GITHUB_CONFIG.workflow || !GITHUB_CONFIG.token) {
        showToast('Refresh not configured', 'error');
        return;
    }

    const btn = document.getElementById('refreshBtn');

    const refreshCheck = canRefresh();
    if (!refreshCheck.allowed) {
        showToast(`Please wait ${refreshCheck.remainingMinutes} more minute(s) before refreshing.`, 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg><span>Refreshing...</span>`;

    try {
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions/workflows/${GITHUB_CONFIG.workflow}/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ref: 'main' })
            }
        );

        if (response.status === 204) {
            localStorage.setItem('lastDataRefresh', Date.now().toString());
            showToast('Data refresh triggered! Please wait 1-2 minutes and reload.', 'success');
        } else {
            throw new Error(`GitHub API returned ${response.status}`);
        }

    } catch (error) {
        console.error('Refresh error:', error);
        showToast('Error triggering refresh: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg><span>Refresh</span>`;
    }
}

// ============ Filter Change ============

function onFilterChange(value) {
    currentFilter = value;
    renderReport(reportData);
}

// ============ Chart Rendering ============

function renderCharts(dateData) {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#2563eb';

    const labels = dateData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            datalabels: {
                anchor: 'end',
                align: 'top',
                color: '#1e293b',
                font: { weight: 'bold', size: 11 },
                formatter: (value) => value.toLocaleString()
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grace: '15%',
                grid: { color: '#e2e8f0' },
                ticks: { color: '#64748b', font: { size: 10 } }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10 } }
            }
        },
        layout: { padding: { top: 20 } }
    };

    // Destroy existing charts
    if (postsChart) postsChart.destroy();
    if (impressionsChart) impressionsChart.destroy();

    // Posts chart
    const postsCtx = document.getElementById('postsChart');
    if (postsCtx) {
        postsChart = new Chart(postsCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: dateData.map(d => d.posts),
                    backgroundColor: primaryColor,
                    borderRadius: 4
                }]
            },
            options: chartOptions,
            plugins: [ChartDataLabels]
        });
    }

    // Impressions chart
    const impressionsCtx = document.getElementById('impressionsChart');
    if (impressionsCtx) {
        impressionsChart = new Chart(impressionsCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: dateData.map(d => d.impressions),
                    backgroundColor: primaryColor,
                    borderRadius: 4
                }]
            },
            options: chartOptions,
            plugins: [ChartDataLabels]
        });
    }
}

// ============ Report Rendering ============

function renderReport(data) {
    const paper = document.getElementById('reportPaper');
    if (!paper) return;

    // Support both data.platforms.x.data and data.x.data formats
    const instagramData = data.platforms?.instagram?.data || data.instagram?.data || [];
    const facebookData = data.platforms?.facebook?.data || data.facebook?.data || [];
    const allData = [...instagramData, ...facebookData];
    const filteredData = filterDataByRange(allData, currentFilter);
    const dateData = groupByDate(filteredData);

    const totalPosts = filteredData.length;
    const totalImpressions = sumField(filteredData, 'Impressions/Views');

    const top5Posts = [...filteredData]
        .sort((a, b) => parseNumber(b['Impressions/Views']) - parseNumber(a['Impressions/Views']))
        .slice(0, 5);

    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const filterLabels = {
        '7days': 'Past 7 Days',
        'month': 'This Month',
        'all': 'All Time'
    };

    paper.innerHTML = `
        <!-- Report Header -->
        <div class="report-header">
            <div class="report-header-top">
                <img src="${CLIENT_CONFIG.logo}" alt="${CLIENT_CONFIG.name}" class="report-logo">
                <div class="report-date">
                    <div>${dateStr}</div>
                    <div class="report-filter">
                        <select onchange="onFilterChange(this.value)">
                            <option value="7days" ${currentFilter === '7days' ? 'selected' : ''}>Past 7 Days</option>
                            <option value="month" ${currentFilter === 'month' ? 'selected' : ''}>This Month</option>
                            <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>All Time</option>
                        </select>
                    </div>
                </div>
            </div>
            <h1 class="report-title">${CLIENT_CONFIG.reportTitle}</h1>
            <p class="report-subtitle">${CLIENT_CONFIG.reportSubtitle}</p>
        </div>

        <!-- Report Body -->
        <div class="report-body">
            <!-- Stats Row -->
            <div class="stats-row" style="grid-template-columns: repeat(2, 1fr);">
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(totalPosts)}</div>
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
                Powered by <img src="${CLIENT_CONFIG.footerLogo}" alt="QStarLabs">
            </div>
        </div>
    `;

    // Render charts after DOM update
    setTimeout(() => renderCharts(dateData), 0);
}

// ============ Exports ============

window.refreshData = refreshData;
window.downloadPDF = downloadPDF;
window.sendReport = sendReport;
window.closeEmailModal = closeEmailModal;
window.confirmSendEmail = confirmSendEmail;
window.onFilterChange = onFilterChange;
