/**
 * Hand-written style annotations for client presentation.
 * Labels sit in the left/right margins with arrows pointing to report sections.
 */

function toggleAnnotations(btn) {
    const wrapper = document.querySelector('.viewer');
    const isHidden = wrapper.classList.toggle('annotations-hidden');
    btn.classList.toggle('off', isHidden);
    const icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    btn.innerHTML = isHidden ? icon + ' Notes ON' : icon + ' Notes OFF';
}

(function () {
    const annotations = [
        {
            target: '.report-header',
            text: 'Client logo + report title\ncustomized per brand',
            side: 'left'
        },
        {
            target: '.report-filter',
            text: 'Time filter\n7 days / month / all time',
            side: 'right'
        },
        {
            target: '.stats-row',
            text: 'Key metrics at a glance\nauto-calculated from data',
            side: 'right'
        },
        {
            target: '.chart-grid',
            text: 'Interactive charts\nposts & impressions over time',
            side: 'left'
        },
        {
            target: '.top-posts-header',
            text: 'Top performing posts\npaginated + full CSV export',
            side: 'right'
        },
        {
            target: '.top-posts-list',
            text: 'Direct links to each\nvideo post',
            side: 'left'
        },
        {
            target: '.territories-section',
            text: 'Audience breakdown\nby territory / country',
            side: 'left'
        },
        {
            target: '.report-footer',
            text: 'Powered by JetQ Labs\nauto-generated report',
            side: 'right'
        }
    ];

    function createAnnotations() {
        // Remove old
        document.querySelectorAll('.margin-annotation').forEach(el => el.remove());

        const paper = document.getElementById('reportPaper');
        if (!paper) return;

        const viewer = paper.closest('.viewer');
        if (!viewer) return;

        // We need a positioning wrapper
        let wrapper = viewer.querySelector('.annotations-layer');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'annotations-layer';
            viewer.appendChild(wrapper);
        }
        wrapper.innerHTML = '';

        const paperRect = paper.getBoundingClientRect();
        const viewerRect = viewer.getBoundingClientRect();

        annotations.forEach(a => {
            const target = paper.querySelector(a.target);
            if (!target) return;

            const targetRect = target.getBoundingClientRect();
            const targetCenterY = targetRect.top - viewerRect.top + targetRect.height / 2;

            const el = document.createElement('div');
            el.className = 'margin-annotation margin-annotation-' + a.side;

            // Position vertically centered on the target
            el.style.top = targetCenterY + 'px';

            if (a.side === 'left') {
                el.style.right = (viewerRect.right - paperRect.left + 20) + 'px';
            } else {
                el.style.left = (paperRect.right - viewerRect.left + 20) + 'px';
            }

            // Arrow SVG
            const arrowW = 40;
            const arrowH = 2;
            const arrowDir = a.side === 'left' ? 'right' : 'left';
            const arrowSvg = a.side === 'left'
                ? `<svg class="annotation-arrow annotation-arrow-right" width="${arrowW}" height="20" viewBox="0 0 ${arrowW} 20">
                     <path d="M0,10 Q${arrowW * 0.6},3 ${arrowW - 6},10" stroke="#e53e3e" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <polygon points="${arrowW},10 ${arrowW - 8},6 ${arrowW - 8},14" fill="#e53e3e"/>
                   </svg>`
                : `<svg class="annotation-arrow annotation-arrow-left" width="${arrowW}" height="20" viewBox="0 0 ${arrowW} 20">
                     <path d="M${arrowW},10 Q${arrowW * 0.4},3 6,10" stroke="#e53e3e" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <polygon points="0,10 8,6 8,14" fill="#e53e3e"/>
                   </svg>`;

            el.innerHTML = `
                <div class="annotation-content">
                    ${a.side === 'left' ? `<span class="annotation-text">${a.text.replace(/\n/g, '<br>')}</span>${arrowSvg}` : `${arrowSvg}<span class="annotation-text">${a.text.replace(/\n/g, '<br>')}</span>`}
                </div>
            `;

            wrapper.appendChild(el);
        });
    }

    // Wait for report + extra sections to render
    const observer = new MutationObserver(() => {
        if (document.querySelector('.report-header')) {
            setTimeout(createAnnotations, 600);
        }
    });

    const paper = document.getElementById('reportPaper');
    if (paper) {
        observer.observe(paper, { childList: true, subtree: true });
    }

    window.addEventListener('resize', () => {
        if (!document.querySelector('.annotations-hidden')) {
            createAnnotations();
        }
    });
})();
