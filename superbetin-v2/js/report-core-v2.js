/**
 * Report Core V2 - Static data version without top 5 posts
 * Requires CLIENT_CONFIG and DataLoader to be defined before loading this script
 */

if (typeof CLIENT_CONFIG === 'undefined') {
    console.error('CLIENT_CONFIG must be defined before loading report-core-v2.js');
}

let reportData = null;
let currentFilter = 'all';
let postsChart = null;
let impressionsChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndRenderReport();
});

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

        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const { jsPDF } = window.jspdf;

        // Calculate page size based on content (fit to content)
        const pxToMm = 0.264583;
        const imgWidthMm = canvas.width * pxToMm / 1.5; // divide by scale
        const imgHeightMm = canvas.height * pxToMm / 1.5;

        // Create PDF with custom size matching content
        const pdf = new jsPDF({
            orientation: imgWidthMm > imgHeightMm ? 'l' : 'p',
            unit: 'mm',
            format: [imgWidthMm, imgHeightMm]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidthMm, imgHeightMm);

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

    const baseChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            datalabels: {
                anchor: 'end',
                align: 'top',
                color: '#1e293b',
                font: { weight: 'bold', size: 9 }
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
                ticks: { color: '#64748b', font: { size: 8 } }
            }
        },
        layout: { padding: { top: 20 } }
    };

    // Destroy existing charts
    if (postsChart) postsChart.destroy();
    if (impressionsChart) impressionsChart.destroy();

    // Posts chart - show full numbers
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
            options: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    datalabels: {
                        ...baseChartOptions.plugins.datalabels,
                        formatter: (value) => value.toLocaleString()
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    // Impressions chart - use K/M format
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
            options: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    datalabels: {
                        ...baseChartOptions.plugins.datalabels,
                        formatter: (value) => formatNumber(value)
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }
}

// ============ Report Rendering (No Top 5 Posts) ============

function renderReport(data) {
    const paper = document.getElementById('reportPaper');
    if (!paper) return;

    const instagramData = data.platforms?.instagram?.data || data.instagram?.data || [];
    const facebookData = data.platforms?.facebook?.data || data.facebook?.data || [];
    const allData = [...instagramData, ...facebookData];
    const filteredData = filterDataByRange(allData, currentFilter);
    const dateData = groupByDate(filteredData);

    const totalPosts = filteredData.length;
    const totalImpressions = sumField(filteredData, 'Impressions/Views');

    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

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

window.downloadPDF = downloadPDF;
window.onFilterChange = onFilterChange;
