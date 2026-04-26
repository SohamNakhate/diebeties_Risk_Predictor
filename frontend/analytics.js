document.addEventListener('DOMContentLoaded', () => {
    // ─── Theme ────────────────────────────────────────────────────────────────
    const chartThemes = {
        light: { text: '#475569', grid: 'rgba(0, 0, 0, 0.08)', tooltipBg: 'rgba(255,255,255,0.95)', tooltipTitle: '#0f172a', tooltipBody: '#475569' },
        dark: { text: '#cbd5e1', grid: 'rgba(255,255,255,0.08)', tooltipBg: 'rgba(15,23,42,0.95)', tooltipTitle: '#f1f5f9', tooltipBody: '#cbd5e1' }
    };

    function getTheme() {
        return document.body.classList.contains('light-theme') ? chartThemes.light : chartThemes.dark;
    }

    function updateChartThemes() {
        const theme = getTheme();
        const isLight = document.body.classList.contains('light-theme');
        Object.values(window.chartInstances || {}).forEach(chart => {
            if (!chart || !chart.options) return;
            const scales = chart.options.scales || {};
            ['x', 'y', 'r'].forEach(k => {
                if (!scales[k]) return;
                if (scales[k].grid) scales[k].grid.color = theme.grid;
                if (scales[k].ticks) scales[k].ticks.color = theme.text;
                if (scales[k].title) scales[k].title.color = theme.text;
                if (scales[k].angleLines) scales[k].angleLines.color = theme.grid;
                if (scales[k].pointLabels) scales[k].pointLabels.color = theme.text;
            });
            if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = theme.text;
            if (chart.options.plugins?.tooltip) {
                chart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
                chart.options.plugins.tooltip.titleColor = theme.tooltipTitle;
                chart.options.plugins.tooltip.bodyColor = theme.tooltipBody;
            }
            chart.update();
        });
    }

    // ─── Theme toggle ─────────────────────────────────────────────────────────
    const themeBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    function applyStoredTheme() {
        if (localStorage.getItem('theme') === 'light') {
            document.body.classList.add('light-theme');
            sunIcon?.classList.add('hidden');
            moonIcon?.classList.remove('hidden');
        } else {
            document.body.classList.remove('light-theme');
            sunIcon?.classList.remove('hidden');
            moonIcon?.classList.add('hidden');
        }
    }
    applyStoredTheme();

    themeBtn?.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        if (isLight) { sunIcon?.classList.add('hidden'); moonIcon?.classList.remove('hidden'); }
        else { sunIcon?.classList.remove('hidden'); moonIcon?.classList.add('hidden'); }
        updateChartThemes();
    });

    document.getElementById('close-btn')?.addEventListener('click', () => window.close());

    // ─── Utilities ────────────────────────────────────────────────────────────
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const pct = (v, lo, hi) => clamp(((v - lo) / (hi - lo)) * 100, 2, 98);

    // Maps a clinical value to a standardized 0-100 Severity Scale
    // Normal limit = 40, Caution limit = 70.
    function normalizeScale(val, lo, norm, caution, hi) {
        if (val <= lo) return 0;
        if (val <= norm) return 40 * ((val - lo) / (norm - lo));
        if (val <= caution) return 40 + 30 * ((val - norm) / (caution - norm));
        if (val <= hi) return 70 + 30 * ((val - caution) / (hi - caution));
        return 100;
    }

    // Clinical reference ranges (ADA / JNC guidelines)
    const REF = {
        glucose: { lo: 70, prediab: 100, diab: 126, max: 300 },
        hba1c: { lo: 4.0, normal: 5.7, prediab: 6.5, max: 14 },
        bmi: { underweight: 18.5, normal: 25, overweight: 30, max: 45 },
        bp: { normal: 120, elevated: 130, stage1: 140, max: 200 },
        insulin: { lo: 2, normal: 25, high: 166, max: 300 },
    };

    // Color palette
    const C = {
        green: '#10b981', yellow: '#f59e0b', red: '#ef4444',
        blue: '#06b6d4', purple: '#8b5cf6', slate: '#64748b',
        greenA: 'rgba(16,185,129,0.18)', yellowA: 'rgba(245,158,11,0.18)',
        redA: 'rgba(239,68,68,0.18)', blueA: 'rgba(6,182,212,0.15)',
    };

    function statusColor(val, lo, mid, hi) {
        if (val < lo) return C.blue;
        if (val < mid) return C.green;
        if (val < hi) return C.yellow;
        return C.red;
    }

    // ─── Legend helper ────────────────────────────────────────────────────────
    function rangeLegend(items) {
        return items.map(i => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;font-size:0.78rem;color:var(--text-muted)"><span style="width:9px;height:9px;border-radius:50%;background:${i.c};display:inline-block;flex-shrink:0"></span>${i.label}</span>`).join('');
    }

    // ─── Shared Chart.js defaults ─────────────────────────────────────────────
    function basePlugins(theme, extra = {}) {
        return {
            legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 14, color: theme.text, font: { size: 11.5, family: 'Inter' } } },
            tooltip: { backgroundColor: theme.tooltipBg, titleColor: theme.tooltipTitle, bodyColor: theme.tooltipBody, borderColor: 'rgba(6,182,212,0.3)', borderWidth: 1, cornerRadius: 10, padding: 10 },
            ...extra
        };
    }

    // ─── Main ─────────────────────────────────────────────────────────────────
    window.chartInstances = {};

    function init() {
        const raw = localStorage.getItem('analyticsData');
        if (!raw) {
            document.querySelector('.dashboard-grid')?.classList.add('hidden');
            document.getElementById('no-data-msg')?.classList.remove('hidden');
            return;
        }
        renderAllCharts(JSON.parse(raw));
    }

    function renderAllCharts(data) {
        if (typeof Chart === 'undefined') { console.error('Chart.js not loaded'); return; }

        // Destroy old
        Object.values(window.chartInstances).forEach(c => c?.destroy?.());
        window.chartInstances = {};

        const theme = getTheme();
        const glucose = Number(data.glucose) || 100;
        const hba1c = Number(data.hba1c) || 5.5;
        const bmi = Number(data.bmi) || 25;
        const bp = Number(data.bloodPressure) || 80;
        const insulin = Number(data.insulin) || 15;
        const age = Number(data.age) || 35;
        const dpf = Number(data.dpf) || 0.3;
        const preg = Number(data.pregnancies) || 0;
        const skin = Number(data.skinThickness) || 20;

        // ── Clinical summary ─────────────────────────────────────────────────
        buildClinicalSummary({ glucose, hba1c, bmi, bp, insulin, age });

        // ── Chart 1 – Clinical Reference Ranges ──────────────────────────────
        // Shows each metric as a point on its actual clinical range.
        // No invented scores — raw values overlaid on ADA thresholds.
        buildReferenceRangeChart(theme, { glucose, hba1c, bmi, bp });

        // ── Chart 2 – ADA Risk Factor Panel ──────────────────────────────────
        // Horizontal bars showing where each metric sits within its clinical zone.
        buildRiskFactorPanel(theme, { glucose, hba1c, bmi, bp, insulin, dpf, age });

        // ── Chart 3 – HbA1c vs Fasting Glucose Quadrant ──────────────────────
        // A 2-axis scatter plot using ADA-defined quadrant thresholds.
        buildHba1cGlucoseQuadrant(theme, { glucose, hba1c });

        // ── Chart 4 – Historical Glucose Trend ───────────────────────────────
        // Real historical data from localStorage; no fabricated projection.
        buildGlucoseTrendChart(theme, glucose);

        // ── Chart 5 – BMI Classification Band ────────────────────────────────
        // Doughnut showing which WHO BMI category the patient falls in.
        buildBmiGauge(theme, bmi);

        // ── Chart 6 – Blood Pressure Classification ───────────────────────────
        // Doughnut gauge for BP using JNC 8 / AHA categories.
        buildBpGauge(theme, bp);

        // ── Card 7 – Clinical Marker Strips ──────────────────────────────────
        // Glucose and HbA1c range strips with clinical zone labels.
        buildMarkerStrips({ glucose, hba1c });

        // ── Card 8 – Established Risk Factors Summary ─────────────────────────
        buildRiskFactorSummaryCard({ glucose, hba1c, bmi, bp, age, dpf, preg });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHART 1 — Clinical Reference Range Overview (horizontal grouped bar)
    // Each metric shown at its real value against clinically annotated zones.
    // ════════════════════════════════════════════════════════════════════════
    function buildReferenceRangeChart(theme, { glucose, hba1c, bmi, bp }) {
        const ctx = document.getElementById('radarChart');
        if (!ctx) return;

        // Normalize each metric to a 0–100 scale using its own range,
        // then annotate the corresponding clinical thresholds.
        // Scale: 0 = lower bound of healthy, 100 = clearly diabetic/hypertensive
        const metrics = [
            { label: 'Glucose', val: glucose, lo: 70, norm: 100, caution: 126, hi: 200, unit: 'mg/dL' },
            { label: 'HbA1c', val: hba1c, lo: 4.0, norm: 5.7, caution: 6.5, hi: 10.0, unit: '%' },
            { label: 'BMI', val: bmi, lo: 18, norm: 25, caution: 30, hi: 40, unit: 'kg/m²' },
            { label: 'Blood Pressure', val: bp, lo: 60, norm: 120, caution: 140, hi: 180, unit: 'mmHg' },
        ];

        const labels = metrics.map(m => m.label);
        // Map all heights to the uniform 0-100 severity scale
        const values = metrics.map(m => normalizeScale(m.val, m.lo, m.norm, m.caution, m.hi));
        const normLine = metrics.map(m => 40);    // Normal threshold is ALWAYS 40 on severity scale
        const cautionLn = metrics.map(m => 70);   // Caution threshold is ALWAYS 70 on severity scale

        const barColors = metrics.map(m => {
            if (m.val < m.norm) return C.green;
            if (m.val < m.caution) return C.yellow;
            return C.red;
        });

        window.chartInstances.radar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Your Value',
                        data: values,
                        backgroundColor: barColors,
                        borderRadius: 6,
                        barPercentage: 0.5,
                        categoryPercentage: 0.8,
                        order: 1
                    },
                    {
                        label: 'Normal Upper Limit',
                        data: normLine,
                        type: 'line',
                        showLine: false,
                        borderColor: C.green,
                        backgroundColor: C.green,
                        pointStyle: 'line',
                        pointRadius: 15,
                        pointBorderWidth: 3,
                        order: 0
                    },
                    {
                        label: 'Caution Threshold',
                        data: cautionLn,
                        type: 'line',
                        showLine: false,
                        borderColor: C.red,
                        backgroundColor: C.red,
                        pointStyle: 'line',
                        pointRadius: 15,
                        pointBorderWidth: 3,
                        order: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 20, bottom: 10 }
                },
                scales: {
                    x: { grid: { color: theme.grid }, ticks: { color: theme.text, font: { size: 11, family: 'Inter' } } },
                    y: {
                        display: false,
                        max: 100,
                        grid: { color: theme.grid },
                        ticks: { color: theme.text }
                    }
                },
                plugins: {
                    ...basePlugins(theme),
                    legend: {
                        ...basePlugins(theme).legend,
                        labels: {
                            ...basePlugins(theme).legend.labels,
                            filter: item => item.text !== 'Your Value'
                        }
                    },
                    tooltip: {
                        ...basePlugins(theme).tooltip,
                        callbacks: {
                            label: ctx2 => {
                                const m = metrics[ctx2.dataIndex];
                                if (ctx2.dataset.label === 'Your Value') {
                                    let zone = m.val < m.norm ? 'Normal ✓' : m.val < m.caution ? 'Borderline ⚠' : 'Elevated ✗';
                                    return ` ${m.val} ${m.unit}  —  ${zone}`;
                                }
                                return ` ${ctx2.dataset.label}: ${ctx2.dataset.label === 'Normal Upper Limit' ? m.norm : m.caution} ${m.unit}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHART 2 — ADA Risk Factor Panel (horizontal % bars, zone-coloured)
    // Each metric expressed as % within its clinical range.
    // ════════════════════════════════════════════════════════════════════════
    function buildRiskFactorPanel(theme, { glucose, hba1c, bmi, bp, insulin, dpf, age }) {
        const ctx = document.getElementById('barChart');
        if (!ctx) return;

        // Each entry: { label, val, lo, hi, thresholds for color }
        const factors = [
            { label: 'Fasting Glucose', val: glucose, lo: 70, hi: 300, norm: 100, caution: 126 },
            { label: 'HbA1c (%)', val: hba1c, lo: 4, hi: 14, norm: 5.7, caution: 6.5 },
            { label: 'BMI (kg/m²)', val: bmi, lo: 15, hi: 45, norm: 25, caution: 30 },
            { label: 'Blood Pressure', val: bp, lo: 60, hi: 180, norm: 120, caution: 140 },
            { label: 'Insulin (µU/mL)', val: insulin, lo: 2, hi: 166, norm: 25, caution: 60 },
        ];

        // Map all items to the uniform severity scale (0-100)
        const pcts = factors.map(f => normalizeScale(f.val, f.lo, f.norm, f.caution, f.hi));
        const colors = factors.map(f => {
            if (f.val <= f.norm) return C.green;
            if (f.val <= f.caution) return C.yellow;
            return C.red;
        });

        // Threshold markers are always at 40 and 70 on this scale
        const normPcts = factors.map(f => 40);
        const cautionPcts = factors.map(f => 70);

        window.chartInstances.bar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: factors.map(f => f.label),
                datasets: [
                    {
                        label: 'Your Value',
                        data: pcts,
                        backgroundColor: colors,
                        borderRadius: 5,
                        barPercentage: 0.5,
                        categoryPercentage: 0.8,
                        order: 1
                    },
                    {
                        label: 'Normal Limit',
                        data: normPcts,
                        type: 'line',
                        showLine: false,
                        borderColor: C.green,
                        backgroundColor: C.green,
                        pointStyle: 'line',
                        pointRotation: 90,
                        pointRadius: 15,
                        pointBorderWidth: 3,
                        order: 0
                    },
                    {
                        label: 'Elevated Limit',
                        data: cautionPcts,
                        type: 'line',
                        showLine: false,
                        borderColor: C.red,
                        backgroundColor: C.red,
                        pointStyle: 'line',
                        pointRotation: 90,
                        pointRadius: 15,
                        pointBorderWidth: 3,
                        order: 0
                    }
                ]
            },
            options: {
                layout: {
                    padding: { left: 10, right: 30, top: 10, bottom: 10 }
                },
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: false,
                        max: 100,
                        grid: { display: false }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: theme.text, font: { size: 11, family: 'Inter', weight: '600' } }
                    }
                },
                plugins: {
                    ...basePlugins(theme),
                    legend: { 
                        ...basePlugins(theme).legend, 
                        position: 'bottom',
                        labels: {
                            ...basePlugins(theme).legend.labels,
                            filter: item => item.text !== 'Your Value'
                        }
                    },
                    tooltip: {
                        ...basePlugins(theme).tooltip,
                        callbacks: {
                            label: ctx2 => {
                                const f = factors[ctx2.dataIndex];
                                if (ctx2.dataset.label === 'Your Value') {
                                    const zone = f.val <= f.norm ? 'Normal' : f.val <= f.caution ? 'Borderline' : 'Elevated';
                                    return ` ${f.val}  (${zone})`;
                                }
                                return ` ${ctx2.dataset.label}: ${ctx2.dataset.label === 'Normal Limit' ? f.norm : f.caution}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHART 3 — HbA1c × Fasting Glucose Diagnostic Quadrant
    // ADA uses BOTH values independently for diagnosis. Quadrant shows
    // where the patient sits on the 2D diagnostic space.
    // ════════════════════════════════════════════════════════════════════════
    function buildHba1cGlucoseQuadrant(theme, { glucose, hba1c }) {
        const ctx = document.getElementById('gaugeChart');
        if (!ctx) return;

        // Background zone annotation plugin
        const zonePlugin = {
            id: 'quadrantZones',
            beforeDraw(chart) {
                const { ctx: c, chartArea: ca, scales: { x, y } } = chart;
                // ADA thresholds: glucose ≥ 126 || hba1c ≥ 6.5 → diabetes
                //                 glucose 100-125 || hba1c 5.7-6.4 → prediabetes
                const gNorm = x.getPixelForValue(100);
                const gDiab = x.getPixelForValue(126);
                const hNorm = y.getPixelForValue(5.7);
                const hDiab = y.getPixelForValue(6.5);

                c.save();
                // Normal zone (bottom-left)
                c.fillStyle = 'rgba(16,185,129,0.10)';
                c.fillRect(ca.left, hNorm, gNorm - ca.left, ca.bottom - hNorm);
                // Prediabetes zone (middle band)
                c.fillStyle = 'rgba(245,158,11,0.10)';
                c.fillRect(gNorm, ca.top, gDiab - gNorm, ca.bottom - ca.top);
                c.fillRect(ca.left, hDiab, ca.right - ca.left, hNorm - hDiab);
                // Diabetes zone (top-right)
                c.fillStyle = 'rgba(239,68,68,0.10)';
                c.fillRect(gDiab, ca.top, ca.right - gDiab, ca.bottom - ca.top);
                c.restore();
            }
        };

        window.chartInstances.gauge = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Your Reading',
                        data: [{ x: glucose, y: hba1c }],
                        backgroundColor: (() => {
                            if (glucose >= 126 || hba1c >= 6.5) return C.red;
                            if (glucose >= 100 || hba1c >= 5.7) return C.yellow;
                            return C.green;
                        })(),
                        borderColor: theme.text,
                        borderWidth: 2,
                        pointRadius: 10,
                        pointHoverRadius: 13,
                        pointStyle: 'star'
                    },
                    // Legend-only datasets (no visible data points)
                    { label: 'Normal Zone', data: [], backgroundColor: 'rgba(16,185,129,0.35)', pointStyle: 'rectRounded', pointRadius: 6 },
                    { label: 'Prediabetes Zone (ADA)', data: [], backgroundColor: 'rgba(245,158,11,0.35)', pointStyle: 'rectRounded', pointRadius: 6 },
                    { label: 'Diabetes Zone (ADA)', data: [], backgroundColor: 'rgba(239,68,68,0.35)', pointStyle: 'rectRounded', pointRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Fasting Glucose (mg/dL)', color: theme.text, font: { weight: '600', family: 'Inter' } },
                        min: 60, max: 260,
                        grid: { color: theme.grid },
                        ticks: { color: theme.text }
                    },
                    y: {
                        title: { display: true, text: 'HbA1c (%)', color: theme.text, font: { weight: '600', family: 'Inter' } },
                        min: 4.0, max: 11.0,
                        grid: { color: theme.grid },
                        ticks: { color: theme.text }
                    }
                },
                plugins: {
                    ...basePlugins(theme),
                    legend: { ...basePlugins(theme).legend, position: 'bottom' },
                    tooltip: {
                        ...basePlugins(theme).tooltip,
                        filter: ctx2 => ctx2.dataset.data.length > 0,
                        callbacks: {
                            label: () => {
                                const zone = (glucose >= 126 || hba1c >= 6.5) ? 'Diabetes range' :
                                    (glucose >= 100 || hba1c >= 5.7) ? 'Prediabetes range' : 'Normal range';
                                return [` Glucose: ${glucose} mg/dL`, ` HbA1c: ${hba1c}%`, ` ADA Zone: ${zone}`];
                            }
                        }
                    },
                }
            },
            plugins: [zonePlugin]
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHART 4 — Historical Glucose Trend (real data only, no fabricated projection)
    // ════════════════════════════════════════════════════════════════════════
    function buildGlucoseTrendChart(theme, currentGlucose) {
        const ctx = document.getElementById('scatterChart');
        if (!ctx) return;

        let history = JSON.parse(localStorage.getItem('diabetesHistory') || '[]');
        // history is newest-first; reverse to chronological
        const chron = [...history].reverse();

        // Monthly aggregate
        const monthMap = new Map();
        chron.forEach(r => {
            const d = new Date(r.timestamp || Date.now());
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            const lbl = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            const g = parseFloat(r.glucose);
            if (!isNaN(g)) {
                if (!monthMap.has(key)) monthMap.set(key, { lbl, sum: g, n: 1 });
                else { const e = monthMap.get(key); e.sum += g; e.n++; }
            }
        });

        const sortedKeys = [...monthMap.keys()].sort();
        const labels = sortedKeys.map(k => monthMap.get(k).lbl);
        const values = sortedKeys.map(k => {
            const e = monthMap.get(k); return +(e.sum / e.n).toFixed(1);
        });

        // If no history, just show the current point
        if (labels.length === 0) {
            labels.push(new Date().toLocaleString('default', { month: 'short', year: '2-digit' }));
            values.push(currentGlucose);
        }

        // Reference line data (ADA normal upper = 99 mg/dL)
        const normalLine = labels.map(() => 99);
        const prediabLine = labels.map(() => 126);

        window.chartInstances.scatter = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Avg Fasting Glucose',
                        data: values,
                        borderColor: C.blue,
                        backgroundColor: C.blueA,
                        borderWidth: 3,
                        tension: 0.35,
                        fill: true,
                        pointRadius: 6,
                        pointBackgroundColor: values.map(v => {
                            if (v >= 126) return C.red;
                            if (v >= 100) return C.yellow;
                            return C.green;
                        }),
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1.5,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Normal (<100)',
                        data: normalLine,
                        borderColor: C.green,
                        backgroundColor: C.green,
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointStyle: false,
                        fill: false,
                        tension: 0
                    },
                    {
                        label: 'Diabetes Limit (≥126)',
                        data: prediabLine,
                        borderColor: C.red,
                        backgroundColor: C.red,
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointStyle: false,
                        fill: false,
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: theme.grid }, ticks: { color: theme.text, font: { size: 11 } } },
                    y: {
                        title: { display: true, text: 'Glucose (mg/dL)', color: theme.text, font: { weight: '600', family: 'Inter' } },
                        suggestedMin: 70, suggestedMax: 180,
                        grid: { color: theme.grid },
                        ticks: { color: theme.text }
                    }
                },
                plugins: { ...basePlugins(theme) }
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHART 5 — BMI Classification Gauge (WHO categories)
    // ════════════════════════════════════════════════════════════════════════
    function buildBmiGauge(theme, bmi) {
        const ctx = document.getElementById('lineChart');
        if (!ctx) return;

        // WHO BMI categories with fixed widths representing the range width
        // Scale: 15–45 range = 30 units total
        const cats = [
            { label: 'Underweight (<18.5)', width: 3.5, color: C.blue },
            { label: 'Normal (18.5–24.9)', width: 6.4, color: C.green },
            { label: 'Overweight (25–29.9)', width: 5, color: C.yellow },
            { label: 'Obese (≥30)', width: 15, color: C.red },
        ];

        // Which category is the patient in?
        const activeIdx = bmi < 18.5 ? 0 : bmi < 25 ? 1 : bmi < 30 ? 2 : 3;

        window.chartInstances.line = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: cats.map(c => c.label),
                datasets: [{
                    data: cats.map(c => c.width),
                    backgroundColor: cats.map((c, i) => i === activeIdx ? c.color : c.color + '44'),
                    borderColor: cats.map((c, i) => i === activeIdx ? c.color : 'transparent'),
                    borderWidth: cats.map((_, i) => i === activeIdx ? 3 : 0),
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    ...basePlugins(theme),
                    legend: { ...basePlugins(theme).legend, position: 'bottom' },
                    tooltip: {
                        ...basePlugins(theme).tooltip,
                        callbacks: {
                            label: ctx2 => {
                                const isActive = ctx2.dataIndex === activeIdx;
                                return ` ${cats[ctx2.dataIndex].label}${isActive ? '  ← Your BMI ' + bmi : ''}`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'bmiLabel',
                afterDatasetsDraw(chart) {
                    const { ctx: c, width, height } = chart;
                    const catName = ['Underweight', 'Normal', 'Overweight', 'Obese'][activeIdx];
                    const catColor = cats[activeIdx].color;
                    c.save();
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    const cx = width / 2, cy = height / 2 - 10;
                    const isLight = document.body.classList.contains('light-theme');
                    c.fillStyle = isLight ? '#0f172a' : '#f1f5f9';
                    c.font = `bold 22px Inter`;
                    c.fillText(bmi.toFixed(1), cx, cy);
                    c.fillStyle = catColor;
                    c.font = `600 12px Inter`;
                    c.fillText(catName, cx, cy + 22);
                    c.restore();
                }
            }]
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHART 6 — Blood Pressure Classification (AHA 2017)
    // ════════════════════════════════════════════════════════════════════════
    function buildBpGauge(theme, bp) {
        const ctx = document.getElementById('polarChart');
        if (!ctx) return;

        const cats = [
            { label: 'Normal (<120)', thresh: 120, color: C.green },
            { label: 'Elevated (120–129)', thresh: 130, color: C.blue },
            { label: 'Stage 1 (130–139)', thresh: 140, color: C.yellow },
            { label: 'Stage 2 (≥140)', thresh: 180, color: C.red },
        ];

        const activeIdx = bp < 120 ? 0 : bp < 130 ? 1 : bp < 140 ? 2 : 3;

        window.chartInstances.polar = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: cats.map(c => c.label),
                datasets: [{
                    data: [20, 10, 10, 40],  // relative visual widths for the arc
                    backgroundColor: cats.map((c, i) => i === activeIdx ? c.color : c.color + '44'),
                    borderColor: cats.map((c, i) => i === activeIdx ? c.color : 'transparent'),
                    borderWidth: cats.map((_, i) => i === activeIdx ? 3 : 0),
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    ...basePlugins(theme),
                    legend: { ...basePlugins(theme).legend, position: 'bottom' },
                    tooltip: {
                        ...basePlugins(theme).tooltip,
                        callbacks: {
                            label: ctx2 => {
                                const isActive = ctx2.dataIndex === activeIdx;
                                return ` ${cats[ctx2.dataIndex].label}${isActive ? '  ← Your BP ' + bp + ' mmHg' : ''}`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'bpLabel',
                afterDatasetsDraw(chart) {
                    const { ctx: c, width, height } = chart;
                    const catName = ['Normal', 'Elevated', 'Stage 1 HBP', 'Stage 2 HBP'][activeIdx];
                    const catColor = cats[activeIdx].color;
                    c.save();
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    const cx = width / 2, cy = height / 2 - 10;
                    const isLight = document.body.classList.contains('light-theme');
                    c.fillStyle = isLight ? '#0f172a' : '#f1f5f9';
                    c.font = `bold 22px Inter`;
                    c.fillText(bp + ' mmHg', cx, cy);
                    c.fillStyle = catColor;
                    c.font = `600 12px Inter`;
                    c.fillText(catName, cx, cy + 22);
                    c.restore();
                }
            }]
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CARD 7 — Clinical Marker Strips (Glucose + HbA1c)
    // ════════════════════════════════════════════════════════════════════════
    function buildMarkerStrips({ glucose, hba1c }) {
        // Glucose strip
        const gEl = document.getElementById('indicator-glucose-val');
        if (gEl) {
            const zone = glucose < 100 ? 'Normal' : glucose < 126 ? 'Prediabetes' : 'Diabetes';
            const col = glucose < 100 ? C.green : glucose < 126 ? C.yellow : C.red;
            gEl.textContent = glucose;
            gEl.style.color = col;
        }
        const mg = document.getElementById('marker-glucose');
        if (mg) mg.style.left = clamp(normalizeScale(glucose, 60, 99, 125, 300), 0, 100) + '%';

        // HbA1c strip
        const hEl = document.getElementById('indicator-hba1c-val');
        if (hEl) {
            const col = hba1c < 5.7 ? C.green : hba1c < 6.5 ? C.yellow : C.red;
            hEl.textContent = hba1c;
            hEl.style.color = col;
        }
        const mh = document.getElementById('marker-hba1c');
        if (mh) mh.style.left = clamp(normalizeScale(hba1c, 4.0, 5.69, 6.49, 14.0), 0, 100) + '%';
    }

    // ════════════════════════════════════════════════════════════════════════
    // CARD 8 — Evidence-based Risk Factor Summary
    // Shows discrete ADA/CDC risk factors with green/amber/red status.
    // No invented composite score — just transparent factor checklist.
    // ════════════════════════════════════════════════════════════════════════
    function buildRiskFactorSummaryCard({ glucose, hba1c, bmi, bp, age, dpf, preg }) {
        const container = document.getElementById('percentile-large-text');
        const desc = document.getElementById('percentile-desc-text');
        const marker = document.getElementById('marker-percentile');

        // ADA-recognised independent risk factors for Type 2 diabetes
        const factors = [
            { label: 'Fasting Glucose', ok: glucose < 100, warn: glucose < 126, val: `${glucose} mg/dL` },
            { label: 'HbA1c', ok: hba1c < 5.7, warn: hba1c < 6.5, val: `${hba1c}%` },
            { label: 'BMI', ok: bmi < 25, warn: bmi < 30, val: `${bmi}` },
            { label: 'Blood Pressure', ok: bp < 120, warn: bp < 140, val: `${bp} mmHg` },
            { label: 'Age', ok: age < 35, warn: age < 45, val: `${age} yrs` },
            { label: 'Family History DPF', ok: dpf < 0.3, warn: dpf < 0.6, val: dpf.toFixed(2) },
        ];

        const elevated = factors.filter(f => !f.ok && !f.warn).length;
        const caution = factors.filter(f => !f.ok && f.warn).length;

        if (container) {
            container.innerHTML = factors.map(f => {
                const status = f.ok ? 'Normal' : f.warn ? 'Borderline' : 'Elevated';
                const col = f.ok ? C.green : f.warn ? C.yellow : C.red;
                const icon = f.ok ? '✓' : f.warn ? '⚠' : '✗';
                return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--glass-border)">
                    <span style="font-size:0.85rem;color:var(--text-main)">${f.label}</span>
                    <span style="display:flex;gap:8px;align-items:center">
                        <span style="font-size:0.82rem;color:var(--text-muted)">${f.val}</span>
                        <span style="font-size:0.78rem;font-weight:600;color:${col};min-width:72px;text-align:right">${icon} ${status}</span>
                    </span>
                </div>`;
            }).join('');
        }

        // Marker: fraction of factors elevated
        if (marker) {
            const riskPct = Math.round(((elevated + caution * 0.5) / factors.length) * 100);
            marker.style.left = clamp(riskPct, 3, 97) + '%';
        }

        if (desc) {
            if (elevated === 0 && caution === 0) {
                desc.textContent = 'All assessed markers within normal ADA ranges. Continue current lifestyle habits.';
            } else {
                const parts = [];
                if (elevated > 0) parts.push(`${elevated} marker${elevated > 1 ? 's' : ''} in the elevated range`);
                if (caution > 0) parts.push(`${caution}  marker${caution > 1 ? 's' : ''} borderline`);
                desc.textContent = `${parts.join(' and ')}. Review with your healthcare provider for personalised guidance.`;
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Clinical Summary Text
    // ════════════════════════════════════════════════════════════════════════
    function buildClinicalSummary({ glucose, hba1c, bmi, bp, insulin, age }) {
        const el = document.getElementById('clinical-summary-text');
        if (!el) return;

        const notes = [];

        // ADA diagnostic criteria (any one sufficient for prediabetes/diabetes)
        if (glucose >= 126) notes.push(`Fasting glucose of ${glucose} mg/dL meets the ADA threshold for diabetes (≥126 mg/dL).`);
        else if (glucose >= 100) notes.push(`Fasting glucose of ${glucose} mg/dL falls in the prediabetes range (100–125 mg/dL).`);
        else notes.push(`Fasting glucose of ${glucose} mg/dL is within the normal range (<100 mg/dL).`);

        if (hba1c >= 6.5) notes.push(`HbA1c of ${hba1c}% meets the ADA diagnostic criterion for diabetes (≥6.5%).`);
        else if (hba1c >= 5.7) notes.push(`HbA1c of ${hba1c}% indicates prediabetes (5.7%–6.4% per ADA).`);
        else notes.push(`HbA1c of ${hba1c}% is within the normal range.`);

        if (bmi >= 30) notes.push(`BMI of ${bmi} kg/m² is in the obese category — a significant modifiable risk factor.`);
        else if (bmi >= 25) notes.push(`BMI of ${bmi} kg/m² is in the overweight range; modest weight reduction lowers diabetes risk.`);

        if (bp >= 140) notes.push(`Blood pressure of ${bp} mmHg is Stage 2 hypertension (AHA). Often co-occurs with insulin resistance.`);
        else if (bp >= 130) notes.push(`Blood pressure of ${bp} mmHg is Stage 1 hypertension.`);
        else if (bp >= 120) notes.push(`Blood pressure of ${bp} mmHg is elevated (AHA definition).`);

        el.innerHTML = notes.map(n => `<span style="display:block;margin-bottom:4px">• ${n}</span>`).join('');
    }

    // ─── Run ──────────────────────────────────────────────────────────────────
    init();
});
