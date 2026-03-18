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
        };

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
        }, 400); // Wait for transition out
    }
});
