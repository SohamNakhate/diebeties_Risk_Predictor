document.addEventListener('DOMContentLoaded', () => {
    // History Persistence Setup
    function initHistory() {
        let history = JSON.parse(localStorage.getItem('diabetesHistory'));
        // Force pre-populate realistic 6-month prediabetic history if empty or under 13 points (demo purposes)
        if (!history || history.length < 13) {
            const now = Date.now();
            const twoWeeksMs = 1000 * 60 * 60 * 24 * 14; 
            const newHistory = [];
            
            // 13 biweekly data points (approx 6 months), realistic prediabetic ups and downs
            const glucosePath = [121, 118, 122, 115, 110, 105, 108, 112, 115, 118, 114, 111, 109];
            const bmiPath = [28.5, 28.5, 28.4, 28.2, 28.0, 27.9, 27.9, 28.0, 28.1, 28.1, 28.0, 27.8, 27.7];
            // Added corresponding realistic HBA1C and Blood Pressure
            const hba1cPath = [6.4, 6.3, 6.4, 6.1, 5.9, 5.8, 5.8, 5.9, 6.0, 6.2, 6.0, 5.9, 5.8];
            const bpPath = [132, 130, 131, 128, 125, 122, 122, 124, 126, 129, 126, 124, 123];

            // Older logs first, newest logs last
            for (let i = 0; i < 13; i++) {
                newHistory.push({
                    timestamp: new Date(now - (12 - i) * twoWeeksMs).toISOString(),
                    // Expanding to include all 9 identical database inputs for the form
                    pregnancies: 1, // static
                    glucose: glucosePath[i],
                    bloodPressure: bpPath[i],
                    skinThickness: 22, // static for this patient profile
                    insulin: 50, // static moderately elevated
                    bmi: bmiPath[i],
                    dpf: 0.45, // static genetic constant
                    age: 45, // static
                    hba1c: hba1cPath[i],
                    risk_level: 'Medium'
                });
            }
            
            // LocalStorage expects index 0 to be newest (reverse the chronological array)
            localStorage.setItem('diabetesHistory', JSON.stringify(newHistory.reverse()));
        }
    }
    initHistory();

    const form = document.getElementById('prediction-form');
    const formSection = document.getElementById('form-section');
    const resultSection = document.getElementById('result-section');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.getElementById('loading-spinner');
    const resetBtn = document.getElementById('reset-btn');
    const viewVisualsBtn = document.getElementById('view-visuals-btn');

    if (viewVisualsBtn) {
        viewVisualsBtn.addEventListener('click', () => {
            window.open('analytics.html', '_blank');
        });
    }

    // Modal UI logic mapped to buttons
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const historyModalOverlay = document.getElementById('history-modal-overlay');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', () => {
            renderHistory();
            historyModalOverlay.classList.remove('hidden');
        });
    }

    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => {
            historyModalOverlay.classList.add('hidden');
        });
    }

    if (historyModalOverlay) {
        historyModalOverlay.addEventListener('click', (e) => {
            if (e.target === historyModalOverlay) {
                historyModalOverlay.classList.add('hidden');
            }
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (window.confirm("Are you sure you want to clear your entire prediction history?")) {
                localStorage.removeItem('diabetesHistory');
                renderHistory(); // Refresh immediately to empty state
            }
        });
    }

    // Render History Modal
    function renderHistory() {
        const listContainer = document.getElementById('history-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        let history = JSON.parse(localStorage.getItem('diabetesHistory')) || [];
        
        if (history.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No history found. Try running an analysis.</p>';
            return;
        }

        history.forEach(session => {
            const dateObj = new Date(session.timestamp);
            const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            
            let pillClass = '';
            if (session.risk_level === 'High') pillClass = 'var(--risk-high)';
            if (session.risk_level === 'Medium') pillClass = 'var(--risk-medium)';
            if (session.risk_level === 'Low') pillClass = 'var(--risk-low)';

            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-card-header">
                    <span class="history-card-date">${dateStr} • ${timeStr}</span>
                    <span class="history-pill" style="background-color: ${pillClass}33; color: ${pillClass}; border: 1px solid ${pillClass};">${session.risk_level} Risk</span>
                </div>
                <div class="history-card-metrics">
                    <span>Glucose: <strong>${session.glucose}</strong></span>
                    <span>BMI: <strong>${session.bmi}</strong></span>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    function saveToHistory(inputs, riskLevel) {
        let history = JSON.parse(localStorage.getItem('diabetesHistory')) || [];
        
        // Build payload
        const record = {
            timestamp: new Date().toISOString(),
            glucose: inputs.glucose,
            bmi: inputs.bmi,
            risk_level: riskLevel
        };

        // Insert at the beginning
        history.unshift(record);

        // Cap at 30 logic per implementation plan constraints
        if (history.length > 30) {
            history.pop();
        }

        localStorage.setItem('diabetesHistory', JSON.stringify(history));
    }

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

    // Account Avatar Dropdown & Sign Out
    const accountAvatar = document.getElementById('account-avatar');
    const accountDropdown = document.getElementById('account-dropdown');
    const signoutBtn = document.getElementById('signout-btn');

    accountAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        accountDropdown.classList.toggle('open');
    });

    // Close dropdown when clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!accountAvatar.contains(e.target)) {
            accountDropdown.classList.remove('open');
        }
    });

    // Sign Out
    signoutBtn.addEventListener('click', () => {
        localStorage.removeItem('loggedIn');
        window.location.href = 'login.html';
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
            saveToHistory(formData, data.risk_level); // Save locally before showing
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

                saveToHistory(formData, simulatedRisk); // Save simulated payload
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

        // No charts section inline anymore

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

            if (window.latestInputs) {
                // Save context so the new tab can access it
                localStorage.setItem('analyticsData', JSON.stringify(window.latestInputs));
            }
        }, 400); // Wait for transition out
    }

    // renderCharts has been moved to analytics.js
});
