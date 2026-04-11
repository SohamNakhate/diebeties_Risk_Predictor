document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('prediction-form');
    const formSection = document.getElementById('form-section');
    const resultSection = document.getElementById('result-section');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.getElementById('loading-spinner');
    const resetBtn = document.getElementById('reset-btn');

    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    // Check saved theme or system preference
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');

        localStorage.setItem('theme', isLight ? 'light' : 'dark');

        if (isLight) {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    });

    // Recommendations database based on risk level
    const recommendations = {
        'Low': [
            "Maintain your current healthy balanced diet.",
            "Continue getting at least 150 minutes of moderate aerobic activity per week.",
            "Keep up with routine check-ups with your healthcare provider.",
            "Ensure you are getting 7-8 hours of quality sleep per night."
        ],
        'Medium': [
            "Reduce intake of refined carbs and sugary beverages.",
            "Increase daily physical activity, aiming for a mix of cardio and strength training.",
            "Monitor your portion sizes and increase fiber intake.",
            "Consider tracking your blood sugar levels occasionally.",
            "Consult with a healthcare provider for personalized preventive strategies."
        ],
        'High': [
            "Schedule an appointment with an endocrinologist or primary care physician immediately.",
            "Strictly limit processed sugars and simple carbohydrates.",
            "Work with a registered dietitian to create a specific meal plan.",
            "Begin a structured exercise program under medical guidance.",
            "Monitor blood pressure and blood sugar levels regularly."
        ]
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI Loading state
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        submitBtn.disabled = true;

        // Gather data
        const formData = {
            pregnancies: document.getElementById('pregnancies').value,
            glucose: document.getElementById('glucose').value,
            bloodPressure: document.getElementById('bloodPressure').value,
            skinThickness: document.getElementById('skinThickness').value,
            insulin: document.getElementById('insulin').value,
            bmi: document.getElementById('bmi').value,
            dpf: document.getElementById('dpf').value,
            age: document.getElementById('age').value,
            hba1c: document.getElementById('hba1c').value,
        };

        window.latestInputs = formData;

        try {
            // Replace with actual API call to the Python backend later.
            // Simulating API delay
            const response = await fetch('http://localhost:8000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            displayResults(data.risk_level); // Expected: "Low", "Medium", or "High"

        } catch (error) {
            console.error('Error fetching prediction:', error);
            // Feature: Fallback for demonstration if backend is not running
            console.log("Backend not reachable. Running simulated prediction for demo.");
            setTimeout(() => {
                // Dummy logic for simulation
                const glucose = parseFloat(formData.glucose);
                const bmi = parseFloat(formData.bmi);
                let simulatedRisk = 'Low';
                if (glucose > 140 || bmi > 30) simulatedRisk = 'High';
                else if (glucose > 100 || bmi > 25) simulatedRisk = 'Medium';

                displayResults(simulatedRisk);
            }, 1500);
        } finally {
            // Restore button state
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });

    resetBtn.addEventListener('click', () => {
        // Hide results, show form
        resultSection.style.display = 'none';
        resultSection.classList.add('hidden');

        formSection.style.display = 'block';
        setTimeout(() => {
            formSection.classList.remove('hidden');
            formSection.classList.add('fade-in');
        }, 10);

        form.reset();

        // Remove focus labels by focusing and blurring
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => input.blur());

        const chartsSection = document.getElementById('charts-section');
        if (chartsSection) chartsSection.classList.add('hidden');
    });

    function displayResults(riskLevel) {
        // Hide form
        formSection.classList.add('hidden');
        setTimeout(() => {
            formSection.style.display = 'none';

            // Populate Results
            const riskBadge = document.getElementById('risk-badge');
            const riskText = document.getElementById('risk-level');
            const recommendationList = document.getElementById('recommendation-list');

            // Set classes and text
            riskBadge.className = `risk-badge risk-${riskLevel.toLowerCase()}`;
            riskText.textContent = `${riskLevel} Risk`;

            // Populate recommendations
            recommendationList.innerHTML = '';
            const recs = recommendations[riskLevel] || recommendations['Medium'];
            recs.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recommendationList.appendChild(li);
            });

            // Show results
            resultSection.style.display = 'block';
            setTimeout(() => {
                resultSection.classList.remove('hidden');
                resultSection.classList.add('fade-in');
            }, 50);

            const chartsSection = document.getElementById('charts-section');
            if (chartsSection) chartsSection.classList.remove('hidden');

            if (window.latestInputs) {
                const glucose = Number(window.latestInputs.glucose) || 0;
                const hba1c = Number(window.latestInputs.hba1c) || 0;
                renderCharts(glucose, hba1c);
            }
        }, 400); // Wait for transition out
    }

    function renderCharts(glucose, hba1c) {
        console.log("renderCharts called with glucose:", glucose, "hba1c:", hba1c);
        
        // Safety checks
        if (typeof Chart === "undefined") {
            console.error("Chart.js not loaded");
            return;
        }

        glucose = Number(glucose) || 0;
        hba1c = Number(hba1c) || 0;

        if (isNaN(glucose) || isNaN(hba1c)) {
            console.error("Invalid data");
            return;
        }

        // Get canvas elements
        const g = document.getElementById('glucoseChart');
        const h = document.getElementById('hba1cChart');

        if (!g || !h) {
            console.error("Canvas elements not found");
            return;
        }

        // Theme colors
        var isLight = document.body.classList.contains('light-theme');
        var textColor = isLight ? '#0f172a' : '#ffffff';

        // Destroy existing charts
        if (window.glucoseChart && typeof window.glucoseChart.destroy === "function") {
            window.glucoseChart.destroy();
        }
        if (window.hba1cChart && typeof window.hba1cChart.destroy === "function") {
            window.hba1cChart.destroy();
        }

        // ===== GLUCOSE GAUGE CHART (Semicircle with zones) =====
        try {
            // STATUS
            var glucoseStatus = "Normal";
            if (glucose >= 126) glucoseStatus = "Diabetic";
            else if (glucose >= 100) glucoseStatus = "Prediabetic";

            var glucoseConfig = {
                type: 'doughnut',
                data: {
                    labels: ['Normal\n(70-99)', 'Prediabetic\n(100-125)', 'Diabetic\n(126+)', 'Remaining'],
                    datasets: [{
                        data: [30, 26, 44, 0],
                        backgroundColor: [
                            '#10b981',  // Green - Normal
                            '#facc15',  // Yellow - Prediabetic
                            '#ef4444',  // Red - Diabetic
                            'rgba(100, 116, 139, 0.1)'  // Gray for visual
                        ],
                        borderColor: [
                            '#059669',
                            '#d97706',
                            '#dc2626',
                            'transparent'
                        ],
                        borderWidth: 2,
                        circumference: 180,
                        rotation: 270
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 2000,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                color: textColor,
                                font: { size: 11, weight: '600', family: "'Inter', sans-serif" },
                                padding: 15,
                                boxWidth: 10,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#06b6d4',
                            borderWidth: 2,
                            padding: 10
                        }
                    }
                },
                plugins: [{
                    id: 'gaugeNeedle',
                    afterDatasetsDraw: function(chart) {
                        const { ctx } = chart;
                        const meta = chart.getDatasetMeta(0);
                        const arc = meta.data[0];

                        const centerX = arc.x;
                        const centerY = arc.y;
                        const radius = arc.outerRadius - 10;

                        // RANGE
                        const min = 70;
                        const max = 200;
                        const clamped = Math.max(min, Math.min(glucose, max));
                        const percent = (clamped - min) / (max - min);

                        // ✅ CORRECT ANGLE
                        const angle = Math.PI + (percent * Math.PI);

                        ctx.save();

                        // Needle
                        ctx.beginPath();
                        ctx.lineWidth = 3;
                        ctx.strokeStyle = '#06b6d4';
                        ctx.moveTo(centerX, centerY);
                        ctx.lineTo(
                            centerX + radius * Math.cos(angle),
                            centerY + radius * Math.sin(angle)
                        );
                        ctx.stroke();

                        // Center dot
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
                        ctx.fillStyle = '#06b6d4';
                        ctx.fill();

                        // TEXT
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 22px Inter';
                        ctx.textAlign = 'center';
                        ctx.fillText(glucose + ' mg/dL', centerX, centerY - 20);

                        // STATUS
                        let status = "Normal";
                        let color = '#10b981';
                        if (glucose >= 126) { status = "Diabetic"; color = '#ef4444'; }
                        else if (glucose >= 100) { status = "Prediabetic"; color = '#facc15'; }

                        ctx.fillStyle = color;
                        ctx.font = 'bold 14px Inter';
                        ctx.fillText(status, centerX, centerY + 20);

                        ctx.restore();
                    }
                }]
            };
            
            window.glucoseChart = new Chart(g, glucoseConfig);
            console.log("Glucose gauge created successfully");
        } catch (err) {
            console.error("Error creating glucose gauge:", err);
        }

        // ===== RANGE BARS =====
        try {
            const rangeContainer = h.parentElement;
            rangeContainer.innerHTML = `
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 30px;">
                    <!-- Glucose Range Bar -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="color: ${textColor}; font-weight: 600; font-size: 14px;">Fasting Range (mg/dL)</span>
                            <span style="color: #06b6d4; font-weight: bold; font-size: 16px;">${glucose.toFixed(0)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: ${textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : '#475569'}; font-size: 12px;">70</span>
                            <div style="flex: 1; height: 20px; background: linear-gradient(90deg, #10b981 0%, #10b981 30%, #facc15 30%, #facc15 56%, #ef4444 56%, #ef4444 100%); border-radius: 10px; position: relative; overflow: visible;">
                                <div style="position: absolute; top: -8px; width: 24px; height: 36px; background: rgba(6, 182, 212, 0.2); border: 2px solid #06b6d4; border-radius: 4px; left: calc(${((glucose - 70) / 130) * 100}% - 12px); transition: left 0.3s;">
                                </div>
                            </div>
                            <span style="color: ${textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : '#475569'}; font-size: 12px;">160+</span>
                        </div>
                    </div>

                    <!-- HbA1c Range Bar -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="color: ${textColor}; font-weight: 600; font-size: 14px;">3-Month Average (%)</span>
                            <span style="color: #06b6d4; font-weight: bold; font-size: 16px;">${hba1c.toFixed(1)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="ccolor: ${textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : '#475569'}; font-size: 12px;">4.0</span>
                            <div style="flex: 1; height: 20px; background: linear-gradient(90deg, #06b6d4 0%, #06b6d4 30%, #10b981 30%, #10b981 50%, #facc15 50%, #facc15 70%, #ef4444 70%, #ef4444 100%); border-radius: 10px; position: relative; overflow: visible;">
                                <div style="position: absolute; top: -8px; width: 24px; height: 36px; background: rgba(6, 182, 212, 0.2); border: 2px solid #06b6d4; border-radius: 4px; left: calc(${(hba1c / 9) * 100}% - 12px); transition: left 0.3s;">
                                </div>
                            </div>
                            <span style="color: ${textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : '#475569'}; font-size: 12px;">9.0+</span>
                        </div>
                    </div>

                    <!-- Legend -->
                    <div style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 20px;
                        margin-top: 20px;
                        background: rgba(15, 23, 42, 0.6);
                        padding: 18px 24px;
                        border-radius: 12px;
                        backdrop-filter: blur(12px);
                        border: 1px solid rgba(255,255,255,0.08);
                    ">

                        ${[
                            {color:'#06b6d4', title:'Optimal', text:'HbA1c: 4.0-5.7%'},
                            {color:'#10b981', title:'Normal', text:'Glucose: 70-99 mg/dL'},
                            {color:'#facc15', title:'Prediabetic', text:'Glucose: 100-125 mg/dL<br>HbA1c: 5.7-6.5%'},
                            {color:'#ef4444', title:'Diabetic', text:'Glucose: 126+ mg/dL<br>HbA1c: 6.5%+'}
                        ].map(item => `
                            <div style="min-width: 180px;">
                                <div style="display:flex; gap:10px; align-items:center; margin-bottom:6px;">
                                    <div style="width:16px;height:16px;background:${item.color};border-radius:3px;"></div>
                                    <span style="color:${textColor}; font-weight:600; font-size:13px;">
                                        ${item.title}
                                    </span>
                                </div>
                                <div style="
                                    color:${textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : '#475569'};
                                    font-size:12px;
                                    line-height:1.5;
                                    margin-left:26px;
                                ">
                                    ${item.text}
                                </div>
                            </div>
                        `).join('')}

                    </div>
                </div>
            `;
            console.log("Range bars created successfully");
        } catch (err) {
            console.error("Error creating range bars:", err);
        }
    }
});
