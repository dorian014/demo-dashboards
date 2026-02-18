/**
 * Top Posts Pagination + CSV Download
 * Overrides the shared report-core's top 5 with a paginated top 20.
 * Loads after report-core.js.
 */

(function () {
    const PER_PAGE = 5;
    const TOTAL = 20;
    let currentPage = 0;
    let topPosts = [];
    let allFilteredData = [];

    function waitForReport() {
        const observer = new MutationObserver(() => {
            const section = document.querySelector('.top-posts-section');
            if (section) {
                observer.disconnect();
                initPagination(section);
            }
        });
        observer.observe(document.getElementById('reportPaper'), { childList: true, subtree: true });
    }

    function initPagination(section) {
        try {
            const { filteredData } = getCurrentFilteredData();
            allFilteredData = filteredData;
            topPosts = [...filteredData]
                .sort((a, b) => parseNumber(b['Impressions/Views']) - parseNumber(a['Impressions/Views']))
                .slice(0, TOTAL);
        } catch (e) {
            return;
        }

        if (topPosts.length === 0) return;

        currentPage = 0;
        renderPage(section);
        injectTerritories(section);
    }

    function renderPage(section) {
        const totalPages = Math.ceil(topPosts.length / PER_PAGE);
        const start = currentPage * PER_PAGE;
        const pagePosts = topPosts.slice(start, start + PER_PAGE);

        section.innerHTML = `
            <div class="top-posts-header">
                <h3>Top ${topPosts.length} Posts by Impressions</h3>
                <button class="csv-download-btn" title="Download all ${allFilteredData.length} entries as CSV">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download All (${allFilteredData.length} entries)
                </button>
            </div>
            <div class="top-posts-list">
                ${pagePosts.map((post, i) => `
                    <div class="top-post-item">
                        <div class="top-post-rank">${start + i + 1}</div>
                        <div class="top-post-info">
                            <div class="top-post-agent">${escapeHtml(post['Agent Name'] || post['Account Name'] || 'Unknown')} ${platformIcon(post['Platform'])}</div>
                            <a href="${fixInstagramUrl(post['Post URL']) || getPostUrl(post['Post ID'])}" target="_blank" class="top-post-link">${escapeHtml(post['Post ID'] || 'No link')}</a>
                        </div>
                        <div class="top-post-metrics">
                            <div class="top-post-impressions">${formatNumber(post['Impressions/Views'])}</div>
                            <div class="top-post-label">Impressions</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="top-posts-pagination">
                <button class="pagination-btn pagination-prev" ${currentPage === 0 ? 'disabled' : ''}>Prev</button>
                <span class="pagination-info">${currentPage + 1} / ${totalPages}</span>
                <button class="pagination-btn pagination-next" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Next</button>
            </div>
        `;

        section.querySelector('.pagination-prev').addEventListener('click', () => {
            if (currentPage > 0) { currentPage--; renderPage(section); }
        });
        section.querySelector('.pagination-next').addEventListener('click', () => {
            if (currentPage < totalPages - 1) { currentPage++; renderPage(section); }
        });
        section.querySelector('.csv-download-btn').addEventListener('click', downloadCSV);
    }

    function downloadCSV() {
        const headers = ['Rank', 'Agent Name', 'Platform', 'Post ID', 'Post Text', 'Created At', 'Impressions/Views', 'Likes', 'Shares/Retweets', 'Comments/Replies', 'Engagement Rate (%)', 'Post URL'];
        const sorted = [...allFilteredData]
            .sort((a, b) => parseNumber(b['Impressions/Views']) - parseNumber(a['Impressions/Views']));

        const rows = sorted.map((post, i) => [
            i + 1,
            csvEscape(post['Agent Name'] || post['Account Name'] || ''),
            csvEscape(post['Platform'] || ''),
            csvEscape(post['Post ID'] || ''),
            csvEscape(post['Post Text'] || ''),
            csvEscape(post['Created At'] || ''),
            parseNumber(post['Impressions/Views']),
            parseNumber(post['Likes']),
            parseNumber(post['Shares/Retweets']),
            parseNumber(post['Comments/Replies']),
            post['Engagement Rate (%)'] || 0,
            csvEscape(post['Post URL'] || '')
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'media-clipping-full-data.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function platformIcon(platform) {
        const p = (platform || '').toLowerCase();
        if (p === 'instagram') {
            return '<svg class="platform-icon" viewBox="0 0 24 24" fill="none" stroke="#E1306C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="#E1306C" stroke="none"/></svg>';
        }
        if (p === 'facebook') {
            return '<svg class="platform-icon" viewBox="0 0 24 24" fill="#1877F2" stroke="none"><path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.384C19.612 22.954 24 17.99 24 12z"/></svg>';
        }
        return escapeHtml(platform || '-');
    }

    function injectTerritories(section) {
        if (document.querySelector('.territories-section')) return;

        const territories = [
            { country: 'Turkey',  pct: 78, color: '#f7931a' },
            { country: 'Spain',   pct: 7,  color: '#e6b800' },
            { country: 'Italy',   pct: 3,  color: '#00e676' },
            { country: 'Other',   pct: 12, color: '#5a5a70' }
        ];

        const html = `
            <div class="territories-section">
                <h3>Audience by Territory</h3>
                <div class="territories-list">
                    ${territories.map(t => `
                        <div class="territory-row">
                            <div class="territory-label">
                                <span class="territory-name">${t.country}</span>
                            </div>
                            <div class="territory-bar-track">
                                <div class="territory-bar-fill" style="width: ${t.pct}%; background: ${t.color};"></div>
                            </div>
                            <span class="territory-pct">${t.pct}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        section.insertAdjacentHTML('afterend', html);
    }

    function csvEscape(str) {
        str = String(str);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    waitForReport();
})();
