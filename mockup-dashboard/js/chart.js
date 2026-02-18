// Dashboard - Chart Configuration (Crypto Dark Theme)

document.addEventListener('DOMContentLoaded', function() {
    initTimelineChart();
    initToggleButtons();
});

function initTimelineChart() {
    const ctx = document.getElementById('timelineChart').getContext('2d');

    // Mock data for the timeline
    const labels = ['Sep 26', 'Sep 27', 'Sep 28', 'Sep 29', 'Sep 30', 'Oct 1', 'Oct 2'];
    const postsData = [380, 395, 410, 420, 390, 415, 405];
    const viewsData = [280000, 520000, 780000, 1200000, 1800000, 2500000, 3200000];

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Posts',
                    data: postsData,
                    borderColor: '#f7931a',
                    backgroundColor: createGradient(ctx),
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f7931a',
                    pointBorderColor: '#f7931a',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    yAxisID: 'y'
                },
                {
                    label: 'Views',
                    data: viewsData,
                    borderColor: '#00e676',
                    backgroundColor: 'rgba(0, 230, 118, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00e676',
                    pointBorderColor: '#00e676',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#e8e8f0',
                        font: {
                            family: 'Work Sans',
                            size: 12,
                            weight: 600
                        },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(13, 13, 20, 0.95)',
                    titleColor: '#f7931a',
                    bodyColor: '#e8e8f0',
                    borderColor: '#f7931a',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    titleFont: {
                        family: 'Work Sans',
                        size: 14,
                        weight: 600
                    },
                    bodyFont: {
                        family: 'Work Sans',
                        size: 13
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(247, 147, 26, 0.08)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#5a5a70',
                        font: {
                            family: 'Work Sans',
                            size: 12
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(247, 147, 26, 0.08)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#f7931a',
                        font: {
                            family: 'Work Sans',
                            size: 12
                        },
                        callback: function(value) {
                            return value;
                        }
                    },
                    beginAtZero: true,
                    max: 500
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        color: '#00e676',
                        font: { family: 'Work Sans', size: 12 },
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                            return value;
                        }
                    },
                    max: 3500000
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // Store chart reference for toggle functionality
    window.timelineChart = chart;
}

function createGradient(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(247, 147, 26, 0.35)');
    gradient.addColorStop(0.5, 'rgba(247, 147, 26, 0.12)');
    gradient.addColorStop(1, 'rgba(247, 147, 26, 0)');
    return gradient;
}

function initToggleButtons() {
    const buttons = document.querySelectorAll('.chart-toggle-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all
            buttons.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            this.classList.add('active');

            // Update chart data based on selection
            const metric = this.textContent.trim();
            updateChartData(metric);
        });
    });
}

function updateChartData(metric) {
    const chart = window.timelineChart;
    const ctx = document.getElementById('timelineChart').getContext('2d');

    const postsData = [380, 395, 410, 420, 390, 415, 405];
    const viewsData = [280000, 520000, 780000, 1200000, 1800000, 2500000, 3200000];

    if (metric === 'BOTH') {
        chart.data.datasets = [
            {
                label: 'Posts',
                data: postsData,
                borderColor: '#f7931a',
                backgroundColor: createGradient(ctx),
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#f7931a',
                pointBorderColor: '#f7931a',
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y'
            },
            {
                label: 'Views',
                data: viewsData,
                borderColor: '#00e676',
                backgroundColor: 'rgba(0, 230, 118, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00e676',
                pointBorderColor: '#00e676',
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y1'
            }
        ];
        chart.options.scales.y.max = 500;
        chart.options.scales.y.display = true;
        chart.options.scales.y1 = {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
                color: '#00e676',
                font: { family: 'Work Sans', size: 12 },
                callback: function(value) {
                    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                    return value;
                }
            },
            max: 3500000
        };
        chart.options.scales.y.ticks.callback = function(value) {
            return value;
        };
    } else if (metric === 'VIEWS') {
        chart.data.datasets = [{
            label: 'Views',
            data: viewsData,
            borderColor: '#f7931a',
            backgroundColor: createGradient(ctx),
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#f7931a',
            pointBorderColor: '#f7931a',
            pointRadius: 6,
            pointHoverRadius: 8,
            yAxisID: 'y'
        }];
        chart.options.scales.y.max = 3500000;
        chart.options.scales.y.display = true;
        delete chart.options.scales.y1;
        chart.options.scales.y.ticks.callback = function(value) {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
            return value;
        };
    } else {
        chart.data.datasets = [{
            label: 'Posts',
            data: postsData,
            borderColor: '#f7931a',
            backgroundColor: createGradient(ctx),
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#f7931a',
            pointBorderColor: '#f7931a',
            pointRadius: 6,
            pointHoverRadius: 8,
            yAxisID: 'y'
        }];
        chart.options.scales.y.max = 500;
        chart.options.scales.y.display = true;
        delete chart.options.scales.y1;
        chart.options.scales.y.ticks.callback = function(value) {
            return value;
        };
    }

    chart.update();
}
