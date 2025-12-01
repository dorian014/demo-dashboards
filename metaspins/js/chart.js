// Spartans Dashboard - Chart Configuration

document.addEventListener('DOMContentLoaded', function() {
    initTimelineChart();
    initToggleButtons();
});

function initTimelineChart() {
    const ctx = document.getElementById('timelineChart').getContext('2d');

    // Mock data for the timeline
    const labels = ['Sep 26', 'Sep 27', 'Sep 28', 'Sep 29', 'Sep 30', 'Oct 1', 'Oct 2'];
    const postsData = [420, 460, 480, 510, 490, 520, 540];
    const viewsData = [320000, 580000, 890000, 1400000, 2100000, 3200000, 4100000];

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Posts',
                    data: postsData,
                    borderColor: '#00d26a',
                    backgroundColor: createGradient(ctx),
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00d26a',
                    pointBorderColor: '#00d26a',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    yAxisID: 'y'
                },
                {
                    label: 'Views',
                    data: viewsData,
                    borderColor: '#007b8d',
                    backgroundColor: 'rgba(0, 123, 141, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#007b8d',
                    pointBorderColor: '#007b8d',
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
                        color: '#ffffff',
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
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#00d26a',
                    bodyColor: '#ffffff',
                    borderColor: '#00d26a',
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
                        color: 'rgba(0, 210, 106, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            family: 'Work Sans',
                            size: 12
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 210, 106, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#00d26a',
                        font: {
                            family: 'Work Sans',
                            size: 12
                        },
                        callback: function(value) {
                            return value;
                        }
                    },
                    beginAtZero: true,
                    max: 600
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        color: '#007b8d',
                        font: { family: 'Work Sans', size: 12 },
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                            return value;
                        }
                    },
                    max: 4500000
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
    gradient.addColorStop(0, 'rgba(0, 210, 106, 0.4)');
    gradient.addColorStop(0.5, 'rgba(0, 210, 106, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 210, 106, 0)');
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

    const postsData = [420, 460, 480, 510, 490, 520, 540];
    const viewsData = [320000, 580000, 890000, 1400000, 2100000, 3200000, 4100000];
    // Normalize views to fit on same scale as posts (divide by 2500)
    const viewsNormalized = viewsData.map(v => v / 2500);

    if (metric === 'BOTH') {
        chart.data.datasets = [
            {
                label: 'Posts',
                data: postsData,
                borderColor: '#00d26a',
                backgroundColor: createGradient(ctx),
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00d26a',
                pointBorderColor: '#00d26a',
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y'
            },
            {
                label: 'Views',
                data: viewsData,
                borderColor: '#007b8d',
                backgroundColor: 'rgba(0, 123, 141, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#007b8d',
                pointBorderColor: '#007b8d',
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y1'
            }
        ];
        chart.options.scales.y.max = 600;
        chart.options.scales.y.display = true;
        chart.options.scales.y1 = {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
                color: '#007b8d',
                font: { family: 'Work Sans', size: 12 },
                callback: function(value) {
                    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                    return value;
                }
            },
            max: 4500000
        };
        chart.options.scales.y.ticks.callback = function(value) {
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value;
        };
    } else if (metric === 'VIEWS') {
        chart.data.datasets = [{
            label: 'Views',
            data: viewsData,
            borderColor: '#00d26a',
            backgroundColor: createGradient(ctx),
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00d26a',
            pointBorderColor: '#00d26a',
            pointRadius: 6,
            pointHoverRadius: 8,
            yAxisID: 'y'
        }];
        chart.options.scales.y.max = 4500000;
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
            borderColor: '#00d26a',
            backgroundColor: createGradient(ctx),
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00d26a',
            pointBorderColor: '#00d26a',
            pointRadius: 6,
            pointHoverRadius: 8,
            yAxisID: 'y'
        }];
        chart.options.scales.y.max = 600;
        chart.options.scales.y.display = true;
        delete chart.options.scales.y1;
        chart.options.scales.y.ticks.callback = function(value) {
            return value;
        };
    }

    chart.update();
}
