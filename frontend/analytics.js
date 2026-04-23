document.addEventListener('DOMContentLoaded', () => {
    // Explicit Theme Objects for Chart.js
    const chartThemes = {
        light: { text: '#475569', grid: 'rgba(0, 0, 0, 0.1)', tooltipBg: 'rgba(255, 255, 255, 0.9)' },
        dark: { text: '#e2e8f0', grid: 'rgba(255, 255, 255, 0.1)', tooltipBg: 'rgba(15, 23, 42, 0.9)' }
    };

    function updateChartThemes() {
        const isLight = document.body.classList.contains('light-theme');
        const theme = isLight ? chartThemes.light : chartThemes.dark;

        Object.values(window.chartInstances).forEach((chart) => {
            if (!chart || !chart.options) return;

            // Update scales (x and y) if they exist
            if (chart.options.scales) {
                if (chart.options.scales.x) {
                    if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = theme.grid;
                    if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = theme.text;
                    if (chart.options.scales.x.title) chart.options.scales.x.title.color = theme.text;
                }
                if (chart.options.scales.y) {
                    if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = theme.grid;
                    if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = theme.text;
                    if (chart.options.scales.y.title) chart.options.scales.y.title.color = theme.text;
                }
                // Handle radial scale for radar/polar charts
                if (chart.options.scales.r) {
                    if (chart.options.scales.r.grid) chart.options.scales.r.grid.color = theme.grid;
                    if (chart.options.scales.r.angleLines) chart.options.scales.r.angleLines.color = theme.grid;
                    if (chart.options.scales.r.pointLabels) chart.options.scales.r.pointLabels.color = theme.text;
                }
            }

            // Update legends and tooltips via plugins
            if (chart.options.plugins) {
                if (chart.options.plugins.legend && chart.options.plugins.legend.labels) {
                    chart.options.plugins.legend.labels.color = theme.text;
                }
                if (chart.options.plugins.tooltip) {
                    chart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
                    chart.options.plugins.tooltip.titleColor = isLight ? '#0f172a' : '#ffffff';
                    chart.options.plugins.tooltip.bodyColor = theme.text;
                }
            }

            // Update Polar area border color specifically
            if (chart.config.type === 'polarArea' && chart.data.datasets.length > 0) {
                chart.data.datasets[0].borderColor = isLight ? '#ffffff' : '#0f172a';
            }

            chart.update();
        });
    }

    // Theme logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
    } else {
        document.body.classList.remove('light-theme');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');

            if (isLight) {
                if (sunIcon) sunIcon.classList.add('hidden');
                if (moonIcon) moonIcon.classList.remove('hidden');
            } else {
                if (sunIcon) sunIcon.classList.remove('hidden');
                if (moonIcon) moonIcon.classList.add('hidden');
            }

            // Re-render charts by updating variables
            updateChartThemes();
        });
    }

    // Close Button
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.close();
        });
    }

    function init() {
        const dataStr = localStorage.getItem('analyticsData');
        if (!dataStr) {
            document.querySelector('.dashboard-grid').classList.add('hidden');
            const msg = document.getElementById('no-data-msg');
            if (msg) msg.classList.remove('hidden');
            return;
        }

        const data = JSON.parse(dataStr);
        renderAllCharts(data);
    }

    // Keep references to destroy old charts on theme toggle
    window.chartInstances = window.chartInstances || {};

    function renderAllCharts(data) {
        if (typeof Chart === "undefined") {
            console.error("Chart.js not loaded");
            return;
        }

        const isLight = document.body.classList.contains('light-theme');
        const theme = isLight ? chartThemes.light : chartThemes.dark;

        const accentBlue = '#06b6d4';
        const accentPurple = '#8b5cf6';
        const accentGreen = '#10b981';
        const accentRed = '#ef4444';
        const accentYellow = '#facc15';

        // Parse data safely
        const glucose = Number(data.glucose) || 100;
        const hba1c = Number(data.hba1c) || 5.5;
        const bmi = Number(data.bmi) || 25;
        const bp = Number(data.bloodPressure) || 80;
        const insulin = Number(data.insulin) || 15;
        const age = Number(data.age) || 30;
        const dpf = Number(data.dpf) || 0.5;

        // Destroy all existing instances
        Object.values(window.chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') chart.destroy();
        });
        window.chartInstances = {};

        // ----- 1. Systemic Health Radar -----
        const ctxRadar = document.getElementById('radarChart');
        if (ctxRadar) {
            window.chartInstances.radar = new Chart(ctxRadar, {
                type: 'radar',
                data: {
                    labels: ['Glucose', 'BMI', 'Blood Pressure', 'Insulin', 'Age Risk'],
                    datasets: [
                        {
                            label: 'Your Profile',
                            data: [
                                Math.min(glucose / 120 * 100, 100),
                                Math.min(bmi / 30 * 100, 100),
                                Math.min(bp / 120 * 100, 100),
                                Math.min(insulin / 25 * 100, 100),
                                Math.min(age / 80 * 100, 100)
                            ],
                            backgroundColor: 'rgba(6, 182, 212, 0.2)',
                            borderColor: accentBlue,
                            pointBackgroundColor: accentBlue,
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Healthy Baseline',
                            data: [75, 75, 75, 60, 50],
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderColor: accentGreen,
                            borderDash: [5, 5],
                            borderWidth: 2,
                            fill: true,
                            pointRadius: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: { color: theme.grid },
                            grid: { color: theme.grid },
                            pointLabels: { color: theme.text, font: { size: 12, family: 'Inter' } },
                            ticks: { display: false, max: 100, min: 0 }
                        }
                    },
                    plugins: { 
                        legend: { 
                            position: 'bottom',
                            align: 'center',
                            labels: { usePointStyle: true, boxWidth: 6, boxHeight: 6, padding: 16, color: theme.text, font: { size: 11, family: "'Inter', sans-serif" } } 
                        } 
                    }
                }
            });
        }

        // ----- 2. Risk Contribution Bars -----
        const ctxBar = document.getElementById('barChart');
        if (ctxBar) {
            // Simplistic hazard calculation for visualization
            const hazards = {
                'Blood Sugar': glucose > 125 ? 80 : (glucose > 100 ? 50 : 20),
                'Weight (BMI)': bmi > 30 ? 70 : (bmi > 25 ? 40 : 15),
                'Cardiovascular': bp > 130 ? 60 : (bp > 120 ? 30 : 10),
                'Age Factor': age > 45 ? 50 : 25
            };

            window.chartInstances.bar = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: Object.keys(hazards),
                    datasets: [{
                        label: 'Hazard Score',
                        data: Object.values(hazards),
                        backgroundColor: [
                            hazards['Blood Sugar'] > 60 ? accentRed : accentYellow,
                            hazards['Weight (BMI)'] > 60 ? accentRed : accentYellow,
                            hazards['Cardiovascular'] > 60 ? accentRed : accentYellow,
                            accentPurple
                        ],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                        x: { display: false, max: 100 },
                        y: {
                            grid: { display: false },
                            ticks: { color: theme.text, font: { weight: 'bold', family: 'Inter' } }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // ----- 3. Blood Sugar Gauge -----
        const ctxGauge = document.getElementById('gaugeChart');
        if (ctxGauge) {
            window.chartInstances.gauge = new Chart(ctxGauge, {
                type: 'doughnut',
                data: {
                    labels: ['Normal\n(70-99)', 'Prediabetic\n(100-125)', 'Diabetic\n(126+)', 'Remaining'],
                    datasets: [{
                        data: [59, 26, 114, 0],
                        backgroundColor: [accentGreen, accentYellow, accentRed, 'rgba(100, 116, 139, 0.1)'],
                        borderColor: ['#059669', '#d97706', '#dc2626', 'transparent'],
                        borderWidth: 2,
                        circumference: 180,
                        rotation: 270
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false } // Hidden for space
                    }
                },
                plugins: [{
                    id: 'gaugeNeedle',
                    afterDatasetsDraw: function (chart) {
                        const { ctx } = chart;
                        const meta = chart.getDatasetMeta(0);
                        const arc = meta.data[0];

                        const centerX = arc.x;
                        const centerY = arc.y;
                        const radius = arc.outerRadius - 15;

                        const min = 40;
                        const max = 240;
                        const clamped = Math.max(min, Math.min(glucose, max));
                        const percent = (clamped - min) / (max - min);

                        const angle = Math.PI + (percent * Math.PI);

                        ctx.save();
                        ctx.beginPath();
                        ctx.lineWidth = 3;
                        ctx.strokeStyle = accentBlue;
                        ctx.moveTo(centerX, centerY);
                        ctx.lineTo(
                            centerX + radius * Math.cos(angle),
                            centerY + radius * Math.sin(angle)
                        );
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
                        ctx.fillStyle = accentBlue;
                        ctx.fill();

                        // The overarching themes handle CSS natively so dynamically query body
                        // Fallback text rendering if var is not parsed properly is white, so use explicit theme object
                        const isLightNow = document.body.classList.contains('light-theme');
                        const dynamicTextColor = isLightNow ? '#475569' : '#e2e8f0';
                        ctx.fillStyle = dynamicTextColor;
                        ctx.font = 'bold 20px Inter';
                        ctx.textAlign = 'center';
                        ctx.fillText(glucose + ' mg/dL', centerX, centerY - 15);

                        let status = "Normal";
                        let color = accentGreen;
                        if (glucose >= 126) { status = "Diabetic"; color = accentRed; }
                        else if (glucose >= 100) { status = "Prediabetic"; color = accentYellow; }

                        ctx.fillStyle = color;
                        ctx.font = 'bold 12px Inter';
                        ctx.fillText(status, centerX, centerY + 20);
                        ctx.restore();
                    }
                }]
            });
        }

        // ----- 4. Vitals Correlation (Enhanced Scatter Chart) -----
        const ctxScatter = document.getElementById('scatterChart');
        if (ctxScatter) {
            // 1. Generate Synthetic Population Data for Context
            const populationData = [];
            for(let i = 0; i < 65; i++) {
                let randBMI = 18 + Math.random() * 22; // Range 18 to 40
                let baseBP = 90 + ((randBMI - 18) * 1.8); 
                let randBP = baseBP + (Math.random() * 30 - 15); // variance
                populationData.push({ x: randBMI.toFixed(1), y: randBP.toFixed(0) });
            }

            const targetZonePlugin = {
                id: 'targetZonePlugin',
                beforeDraw: (chart) => {
                    const { ctx, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart;
                    ctx.save();
                    const xLeft = x.getPixelForValue(18.5);
                    const xRight = x.getPixelForValue(24.9);
                    const yTop = y.getPixelForValue(120);
                    const yBottom = y.getPixelForValue(90);

                    ctx.fillStyle = isLight ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)';
                    ctx.fillRect(xLeft, yTop, xRight - xLeft, yBottom - yTop);
                    
                    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(xLeft, yTop, xRight - xLeft, yBottom - yTop);
                    ctx.restore();
                }
            };

            window.chartInstances.scatter = new Chart(ctxScatter, {
                type: 'scatter',
                data: {
                    datasets: [
                        {
                            label: 'Your Metrics',
                            data: [{ x: bmi, y: bp }],
                            backgroundColor: '#0ea5e9',
                            borderColor: '#ffffff',
                            borderWidth: 2,
                            pointRadius: 8,
                            pointHoverRadius: 10,
                            order: 1
                        },
                        {
                            label: 'General Population Trend',
                            data: populationData,
                            backgroundColor: isLight ? 'rgba(100, 116, 139, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'transparent',
                            pointRadius: 4,
                            order: 2
                        },
                        {
                            label: 'Optimal Health Target',
                            data: [], // Empty array because the plugin manually draws the zone
                            backgroundColor: isLight ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
                            borderColor: 'rgba(16, 185, 129, 0.6)',
                            borderWidth: 1,
                            pointStyle: 'rectRounded', // Make the legend icon a box
                            order: 3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: { display: true, text: 'BMI', color: theme.text, font: { weight: '600' } },
                            grid: { color: theme.grid },
                            ticks: { color: theme.text },
                            min: 15, 
                            max: 45
                        },
                        y: {
                            title: { display: true, text: 'Blood Pressure (mmHg)', color: theme.text, font: { weight: '600' } },
                            grid: { color: theme.grid },
                            ticks: { color: theme.text },
                            min: 70, 
                            max: 180
                        }
                    },
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            align: 'center',
                            labels: { usePointStyle: true, boxWidth: 6, boxHeight: 6, padding: 16, color: theme.text, font: { size: 11, family: "'Inter', sans-serif" } } 
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    if (context.datasetIndex === 0) {
                                        return `You: BMI ${context.raw.x}, BP ${context.raw.y}`;
                                    }
                                    return `Sample: BMI ${context.raw.x}, BP ${context.raw.y}`;
                                }
                            }
                        }
                    }
                },
                plugins: [targetZonePlugin]
            });
        }

        // ----- 5. Historical & Projected Glucose Trend -----
        const ctxLine = document.getElementById('lineLineChart') || document.getElementById('lineChart');
        if (ctxLine) {
            let history = JSON.parse(localStorage.getItem('diabetesHistory')) || [];

            const chronologicalHistory = [...history].reverse();
            
            // 1. Aggregate Historical Data by Month
            const monthMap = new Map();
            const monthKeys = [];
            
            chronologicalHistory.forEach(record => {
                const date = new Date(record.timestamp || Date.now());
                const key = `${date.getFullYear()}-${date.getMonth()}`; 
                const displayMonth = date.toLocaleString('default', { month: 'short' });
                const val = parseFloat(record.glucose);
                
                if (!monthMap.has(key)) {
                    monthMap.set(key, { display: displayMonth, sum: val, count: 1, lastRawDate: date });
                    monthKeys.push(key);
                } else {
                    const entry = monthMap.get(key);
                    entry.sum += val;
                    entry.count += 1;
                    entry.lastRawDate = date; // Track the very last date in reality
                }
            });

            const uniqueHistoricalMonths = [];
            const aggregatedHistoricalData = [];
            let lastHistoricalDate = new Date();

            monthKeys.forEach(k => {
                const entry = monthMap.get(k);
                uniqueHistoricalMonths.push(entry.display);
                aggregatedHistoricalData.push(entry.sum / entry.count);
                lastHistoricalDate = entry.lastRawDate;
            });

            if (aggregatedHistoricalData.length === 0) {
                uniqueHistoricalMonths.push(new Date().toLocaleString('default', { month: 'short' }));
                aggregatedHistoricalData.push(glucose);
            }

            // 3. Trend Calculation
            let trend = 2; // Default
            if (aggregatedHistoricalData.length > 1) {
                const oldestGlucose = aggregatedHistoricalData[0];
                const latestGlucose = aggregatedHistoricalData[aggregatedHistoricalData.length - 1];
                trend = (latestGlucose - oldestGlucose) / aggregatedHistoricalData.length;
                if (trend === 0) trend = 2;
            }

            // 2. Generate Future Timeline
            const projectedMonths = [];
            for (let i = 1; i <= 4; i++) {
                const d = new Date(lastHistoricalDate);
                d.setMonth(d.getMonth() + i);
                projectedMonths.push(d.toLocaleString('default', { month: 'short' }));
            }

            const chartLabels = [...uniqueHistoricalMonths, ...projectedMonths];

            // 3. Data Stitching
            // Pad the end of historicalData with nulls for the 4 projected months
            let historicalData = [...aggregatedHistoricalData, ...new Array(4).fill(null)];

            // Pad projectedData with nulls up to the exact last historical index so they connect
            let lastKnownGlucose = aggregatedHistoricalData[aggregatedHistoricalData.length - 1];
            let projectedData = new Array(aggregatedHistoricalData.length - 1).fill(null);
            projectedData.push(lastKnownGlucose); // Critical: connection point

            let projectionAccumulator = lastKnownGlucose;
            for (let i = 0; i < 4; i++) {
                projectionAccumulator += trend;
                projectedData.push(projectionAccumulator);
            }

            window.chartInstances.line = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: 'Historical',
                            data: historicalData,
                            borderColor: '#06b6d4',
                            backgroundColor: 'rgba(6, 182, 212, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 2,
                            pointBackgroundColor: '#06b6d4',
                            pointHoverRadius: 6
                        },
                        {
                            label: 'Projected Trend',
                            data: projectedData,
                            borderColor: '#ef4444',
                            borderWidth: 3,
                            borderDash: [5, 5],
                            tension: 0.4,
                            fill: false,
                            pointRadius: 2,
                            pointBackgroundColor: '#ef4444',
                            pointHoverRadius: 6
                        }
                    ]
                },
                options: {
                    spanGaps: true,
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: { color: theme.grid },
                            ticks: { color: theme.text, font: { weight: '600', family: 'Inter' } }
                        },
                        y: {
                            title: { display: true, text: 'Glucose (mg/dL)', color: theme.text },
                            grid: { color: theme.grid },
                            ticks: { color: theme.text },
                            suggestedMin: 60,
                            suggestedMax: 200
                        }
                    },
                    plugins: {
                        legend: { 
                            position: 'bottom', 
                            align: 'center',
                            labels: { usePointStyle: true, boxWidth: 6, boxHeight: 6, padding: 16, color: theme.text, font: { size: 11, family: "'Inter', sans-serif" } } 
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `Glucose: ${context.parsed.y.toFixed(1)} mg/dL`
                            }
                        }
                    }
                }
            });
        }

        // ----- 6. Lifestyle vs Genetics (Polar Area) -----
        const ctxPolar = document.getElementById('polarChart');
        if (ctxPolar) {
            const impactDiet = Math.min((glucose / 200) * 10, 10) || 0;
            const impactWeight = Math.min((bmi / 40) * 10, 10) || 0;
            const impactBP = Math.min((bp / 180) * 10, 10) || 0;
            const impactAge = Math.min((age / 80) * 10, 10) || 0;
            const impactGenetics = Math.min((dpf / 2.0) * 10, 10);

            window.chartInstances.polar = new Chart(ctxPolar, {
                type: 'polarArea',
                data: {
                    labels: ['Diet (Glucose)', 'Weight (BMI)', 'Activity (BP)', 'Age Factor', 'Genetics (DPF)'],
                    datasets: [{
                        label: 'Risk Impact Score',
                        data: [impactDiet, impactWeight, impactBP, impactAge, impactGenetics],
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.7)',   // Red
                            'rgba(249, 115, 22, 0.7)',  // Orange
                            'rgba(250, 204, 21, 0.7)',  // Yellow
                            'rgba(148, 163, 184, 0.7)', // Gray
                            'rgba(168, 85, 247, 0.7)'   // Purple
                        ],
                        borderColor: isLight ? '#ffffff' : '#0f172a',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            grid: { color: theme.grid },
                            angleLines: { color: theme.grid },
                            ticks: { display: false, min: 0, max: 10 }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: theme.text, font: { size: 11, family: 'Inter' } }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `Impact Score: ${context.raw.toFixed(1)} / 10`
                            }
                        }
                    }
                }
            });
        }

        // --- 1. Dynamic Analytical Summary Text ---
        let findings = [];
        if (bmi >= 30) findings.push(`carrying extra weight`);
        else if (bmi >= 25) findings.push(`feeling a bit heavy`);
        
        if (hba1c >= 6.5) findings.push(`high average blood sugar`);
        else if (hba1c >= 5.7) findings.push(`slightly high sugars`);

        if (bp > 130) findings.push(`some high blood pressure`);

        let summaryText;
        if (findings.length > 0) {
            const intros = [
                "Your body is currently managing ",
                "We're seeing indicators pointing to ",
                "Your profile highlights "
            ];
            const advicePool = [
                "Partnering with a medical professional and mapping out a manageable wellness plan can do wonders.",
                "Small, consistent choices in diet and gentle movement map directly back to lowering these metrics.",
                "These are reversible trends. Committing to steady, sustainable lifestyle habits will have a massive protective impact."
            ];
            let randIntro = intros[Math.floor(Math.random() * intros.length)];
            let randAdvice = advicePool[Math.floor(Math.random() * advicePool.length)];
            summaryText = `${randIntro}${findings.join(" and ")}. ${randAdvice}`;
        } else {
            summaryText = `Your core metrics are solidly in target zones! Keep up the momentum with your excellent healthy habits.`;
        }

        const summaryTextElement = document.getElementById('clinical-summary-text');
        if (summaryTextElement) summaryTextElement.innerText = summaryText;

        // --- 2. Update Range Bars (Card 7) ---
        const glucoseValElement = document.getElementById('indicator-glucose-val');
        if (glucoseValElement) glucoseValElement.innerText = glucose;

        const hba1cValElement = document.getElementById('indicator-hba1c-val');
        if (hba1cValElement) hba1cValElement.innerText = hba1c;

        // Calculate percentages for the marker positions (clamping between 2% and 98% to keep them visible)
        const clamp = (val, min, max) => Math.min(98, Math.max(2, ((val - min) / (max - min)) * 100));

        const markerg = document.getElementById('marker-glucose');
        if (markerg) markerg.style.left = clamp(glucose, 40, 300) + "%";

        const markerh = document.getElementById('marker-hba1c');
        if (markerh) markerh.style.left = clamp(hba1c, 3.0, 14.0) + "%";

        // --- 3. Update Risk Score (Card 8) ---
        let riskScore = Math.min(10, Math.max(1, (((glucose / 200) + (bmi / 40) + (hba1c / 10)) / 3 * 10)));
        
        const plarge = document.getElementById('percentile-large-text');
        if (plarge) plarge.innerText = riskScore.toFixed(1);

        const pmarker = document.getElementById('marker-percentile');
        if (pmarker) pmarker.style.left = clamp((riskScore * 10), 2, 98) + "%";
        
        const glucoseHighWarnings = [
            "Your fasting glucose is above target range. ",
            "We're seeing elevated glucose levels currently. ",
            "Your blood sugar is running higher than optimal right now. "
        ];
        const glucoseCautionWarnings = [
            "Your glucose is slightly elevated into the caution zone. ",
            "We're observing borderline glucose levels today. ",
            "Your fasting sugar is hovering slightly above ideal limits. "
        ];
        const glucoseNormal = [
            "Fantastic work—your glucose is perfectly within target range! ",
            "Great job maintaining optimal blood sugar levels! ",
            "Your glucose control is looking excellent right now. "
        ];

        let glucoseWarning = "";
        if (glucose >= 126) glucoseWarning = glucoseHighWarnings[Math.floor(Math.random() * glucoseHighWarnings.length)];
        else if (glucose >= 100) glucoseWarning = glucoseCautionWarnings[Math.floor(Math.random() * glucoseCautionWarnings.length)];
        else glucoseWarning = glucoseNormal[Math.floor(Math.random() * glucoseNormal.length)];

        let actionAdvice = [
            "Focus on pairing your carbs with protein to keep energy steady.",
            "Remember that even a 15-minute walk after meals makes a massive difference.",
            "Consistency is key—focus on small, sustainable daily habits.",
            "Hydration and sleep are just as important as diet for managing these numbers.",
            "You've got this! Keep prioritizing whole foods and staying active."
        ][Math.floor(Math.random() * 5)];

        if (riskScore >= 7.0) {
            actionAdvice = "Now is an ideal time to proactively consult your care team to safely refine your management plan.";
        }

        const pdesc = document.getElementById('percentile-desc-text');
        if (pdesc) {
            pdesc.innerText = `${glucoseWarning}${actionAdvice}`;
        }
    }

    // Start
    init();
});
