import config from './config.js';

// Language options with their native names
const languageOptions = {
    'en': 'English',
    'hi': 'हिन्दी',
    'ta': 'தமிழ்',
    'te': 'తెలుగు',
    'kn': 'ಕನ್ನಡ',
    'ml': 'മലയാളം',
    'mr': 'मराठी',
    'gu': 'ગુજરાતી',
    'pa': 'ਪੰਜਾਬੀ',
    'bn': 'বাংলা'
};

// Current selected language
let currentLanguage = localStorage.getItem('selectedLanguage') || 'en';

// Translation cache
const translationCache = {};

// Crop rotation database
const cropRotationData = {
    wheat: {
        nextCrops: ["soybean", "corn", "potato"],
        benefits: {
            soybean: "Soybeans fix nitrogen in the soil, which wheat depletes.",
            corn: "Corn has different nutrient needs and pest profiles than wheat.",
            potato: "Potatoes break disease cycles and utilize different soil layers.",
        },
        organicFertilizers: [
            { name: "Compost", description: "Rich in nutrients and improves soil structure." },
            { name: "Green Manure", description: "Plant cover crops like clover to enrich soil." },
            { name: "Bone Meal", description: "High in phosphorus, good for root development." },
        ],
    },
    rice: {
        nextCrops: ["legumes", "potato", "wheat"],
        benefits: {
            legumes: "Legumes fix nitrogen depleted by rice cultivation.",
            potato: "Potatoes have different disease profiles and break pest cycles.",
            wheat: "Wheat has different water requirements, allowing soil to dry out.",
        },
        organicFertilizers: [
            { name: "Azolla", description: "Aquatic fern that fixes nitrogen in rice paddies." },
            { name: "Rice Straw Compost", description: "Recycles nutrients and reduces burning." },
            { name: "Fish Emulsion", description: "Liquid fertilizer rich in nitrogen and micronutrients." },
        ],
    },
    corn: {
        nextCrops: ["soybean", "wheat", "alfalfa"],
        benefits: {
            soybean: "Soybeans fix nitrogen depleted by corn.",
            wheat: "Wheat has different root structures and disease profiles.",
            alfalfa: "Deep roots break compaction and fix nitrogen.",
        },
        organicFertilizers: [
            { name: "Composted Manure", description: "High in nitrogen needed for corn growth." },
            { name: "Cover Crops", description: "Plant winter rye to prevent erosion and add organic matter." },
            { name: "Worm Castings", description: "Rich in microbes and nutrients for soil health." },
        ],
    },
    soybean: {
        nextCrops: ["corn", "wheat", "cotton"],
        benefits: {
            corn: "Corn benefits from nitrogen fixed by soybeans.",
            wheat: "Wheat has different disease profiles and nutrient needs.",
            cotton: "Cotton benefits from improved soil structure after soybeans.",
        },
        organicFertilizers: [
            { name: "Rock Phosphate", description: "Slow-release phosphorus source." },
            { name: "Kelp Meal", description: "Rich in micronutrients and growth hormones." },
            { name: "Wood Ash", description: "Good source of potassium and calcium." },
        ],
    },
    cotton: {
        nextCrops: ["wheat", "corn", "soybean"],
        benefits: {
            wheat: "Wheat has different pest profiles and breaks disease cycles.",
            corn: "Corn has different nutrient requirements than cotton.",
            soybean: "Soybeans fix nitrogen depleted by cotton.",
        },
        organicFertilizers: [
            { name: "Composted Cotton Burr", description: "Recycles nutrients and improves soil structure." },
            { name: "Neem Cake", description: "Adds nutrients and has pest-repellent properties." },
            { name: "Alfalfa Meal", description: "Provides nitrogen and stimulates soil microbes." },
        ],
    },
    potato: {
        nextCrops: ["legumes", "corn", "wheat"],
        benefits: {
            legumes: "Legumes fix nitrogen and have different disease profiles.",
            corn: "Corn has different pest profiles and nutrient needs.",
            wheat: "Wheat helps break potato disease cycles.",
        },
        organicFertilizers: [
            { name: "Composted Manure", description: "Balanced nutrients for potato growth." },
            { name: "Seaweed Extract", description: "Rich in potassium for tuber development." },
            { name: "Fish Bone Meal", description: "Provides phosphorus for root development." },
        ],
    },
    tomato: {
        nextCrops: ["beans", "corn", "lettuce"],
        benefits: {
            beans: "Beans fix nitrogen depleted by tomatoes.",
            corn: "Corn has different disease profiles and nutrient needs.",
            lettuce: "Shallow-rooted lettuce won't disturb soil after tomatoes.",
        },
        organicFertilizers: [
            { name: "Compost Tea", description: "Liquid fertilizer rich in beneficial microbes." },
            { name: "Eggshell Powder", description: "Provides calcium to prevent blossom end rot." },
            { name: "Vermicompost", description: "Worm castings rich in nutrients and beneficial microbes." },
        ],
    },
}

// Function to translate text using the translator.py backend
async function translateText(text, targetLanguage, toEnglish = false) {
    if (targetLanguage === 'en' && !toEnglish) return text;
    
    const cacheKey = `${text}_${targetLanguage}_${toEnglish}`;
    if (translationCache[cacheKey]) {
        return translationCache[cacheKey];
    }

    try {
        console.log(`Translating text ${toEnglish ? 'to English' : 'from English'}:`, text.substring(0, 50) + '...');
        
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                target_language: targetLanguage,
                to_english: toEnglish
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Translation API error:', errorData);
            throw new Error(`Translation failed: ${errorData.error}`);
        }

        const data = await response.json();
        console.log('Translation successful:', data.translated_text.substring(0, 50) + '...');
        
        if (data.translated_text) {
            translationCache[cacheKey] = data.translated_text;
            return data.translated_text;
        } else {
            throw new Error('No translation returned');
        }
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

// Function to handle form submission with translations
async function handleFormSubmission(event) {
    event.preventDefault();
    
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'en';
    
    // Get form values
    const previousCrop = document.getElementById('previous-crop').value;
    const soilType = document.getElementById('soil-type').value;
    const region = document.getElementById('region').value;
    const farmSize = document.getElementById('farm-size').value;

    // If not in English, translate inputs to English first
    let englishInputs = {
        previousCrop,
        soilType,
        region,
        farmSize
    };

    if (currentLanguage !== 'en') {
        try {
            englishInputs.previousCrop = await translateText(previousCrop, currentLanguage, true);
            englishInputs.soilType = await translateText(soilType, currentLanguage, true);
            englishInputs.region = await translateText(region, currentLanguage, true);
        } catch (error) {
            console.error('Error translating inputs to English:', error);
        }
    }

    // Get recommendations using English inputs
    const recommendations = await getRecommendations(englishInputs);

    // Translate recommendations back to user's language if needed
    if (currentLanguage !== 'en') {
        try {
            const translatedRecommendations = await processRecommendationsWithTranslation(recommendations, currentLanguage);
            displayRecommendations(translatedRecommendations);
        } catch (error) {
            console.error('Error translating recommendations:', error);
            displayRecommendations(recommendations); // Fallback to English
        }
    } else {
        displayRecommendations(recommendations);
    }
}

// Function to update all text content in the crop rotation tool
async function updateLanguage(newLanguage) {
    console.log('Updating language to:', newLanguage);
    currentLanguage = newLanguage;
    localStorage.setItem('selectedLanguage', newLanguage);

    try {
        // Translate all visible text elements
        const textElements = document.querySelectorAll('[data-translate]');
        for (const element of textElements) {
            const originalText = element.getAttribute('data-original-text') || element.textContent;
            element.setAttribute('data-original-text', originalText);
            
            const translatedText = await translateText(originalText, newLanguage);
            element.textContent = translatedText;
        }

        // Translate form labels and options
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
            const originalText = label.getAttribute('data-original-text') || label.textContent;
            label.setAttribute('data-original-text', originalText);
            label.textContent = await translateText(originalText, newLanguage);
        }

        // Translate select options
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
            for (const option of select.options) {
                const originalText = option.getAttribute('data-original-text') || option.text;
                option.setAttribute('data-original-text', originalText);
                option.text = await translateText(originalText, newLanguage);
            }
        }

        // If there are any recommendations displayed, translate them
        const resultsContent = document.querySelector('.results-content');
        if (resultsContent && !resultsContent.style.display.includes('none')) {
            const recommendations = JSON.parse(localStorage.getItem('lastRecommendations') || '{}');
            if (Object.keys(recommendations).length > 0) {
                const translatedRecommendations = await processRecommendationsWithTranslation(recommendations, newLanguage);
                displayRecommendations(translatedRecommendations);
            }
        }

    } catch (error) {
        console.error('Error updating language:', error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize user data from localStorage
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  // Initialize AQI Comparison Chart
  const ctx = document.getElementById('aqiComparisonChart').getContext('2d');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Enhanced AQI data with more realistic seasonal variations
  const withoutRotationData = [165, 175, 190, 185, 170, 160, 165, 175, 190, 210, 205, 180];
  const withRotationData = [120, 125, 130, 125, 115, 110, 115, 120, 135, 150, 140, 130];

  const aqiChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Without Crop Rotation',
          data: withoutRotationData,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgba(255, 99, 132, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3
        },
        {
          label: 'With Crop Rotation',
          data: withRotationData,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgba(75, 192, 192, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(75, 192, 192, 1)',
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 2000,
        easing: 'easeInOutQuart',
        onProgress: function(animation) {
          animation.chart.data.datasets.forEach(dataset => {
            dataset.pointRadius = animation.currentStep / animation.numSteps * 5;
          });
        },
        onComplete: function(animation) {
          animation.chart.data.datasets.forEach(dataset => {
            dataset.pointRadius = 5;
          });
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        title: {
          display: true,
          text: 'Annual AQI Levels Comparison',
          font: {
            size: 20,
            weight: 'bold'
          },
          padding: 20
        },
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: '#333',
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyColor: '#666',
          bodyFont: {
            size: 13
          },
          borderColor: '#ddd',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              let quality = '';
              if (value <= 50) quality = '(Good)';
              else if (value <= 100) quality = '(Moderate)';
              else if (value <= 150) quality = '(Unhealthy for Sensitive Groups)';
              else if (value <= 200) quality = '(Unhealthy)';
              else quality = '(Very Unhealthy)';
              return `${label}: ${value} AQI ${quality}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Air Quality Index (AQI)',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
            drawBorder: false
          },
          ticks: {
            callback: function(value) {
              return value + ' AQI';
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          title: {
            display: true,
            text: 'Months',
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        }
      }
    }
  });

  // Add hover effect for legend items
  document.querySelectorAll('.legend-item').forEach((item, index) => {
    item.addEventListener('mouseenter', () => {
      const dataset = aqiChart.data.datasets[index];
      dataset.borderWidth = 5;
      dataset.pointRadius = 8;
      aqiChart.update();
    });

    item.addEventListener('mouseleave', () => {
      const dataset = aqiChart.data.datasets[index];
      dataset.borderWidth = 3;
      dataset.pointRadius = 5;
      aqiChart.update();
    });
  });

  // If user is logged in, update UI
  if (token && user) {
    updateUIForLoginStatus();
  }

  // AQI data and recommendations
  const aqiRecommendations = {
    good: {
      status: "Good",
      color: "#009966",
      activities: [
        "Ideal time for plowing and tilling to minimize dust",
        "Good conditions for harvesting crops",
        "Excellent time for planting and transplanting",
        "Optimal conditions for spraying organic pesticides",
      ],
    },
    moderate: {
      status: "Moderate",
      color: "#ffde33",
      activities: [
        "Good time for most farming activities",
        "Consider using dust reduction techniques when plowing",
        "Suitable for harvesting and field work",
        "Good conditions for irrigation and fertilization",
      ],
    },
    unhealthySensitive: {
      status: "Unhealthy for Sensitive Groups",
      color: "#ff9933",
      activities: [
        "Limit dust-generating activities like plowing",
        "Consider postponing burning of any agricultural waste",
        "Still suitable for harvesting and low-dust activities",
        "Good time for planning and maintenance work",
      ],
    },
    unhealthy: {
      status: "Unhealthy",
      color: "#cc0033",
      activities: [
        "Avoid plowing, tilling, and other dust-generating activities",
        "Postpone burning of agricultural waste",
        "Consider indoor farming activities and planning",
        "Use respiratory protection if outdoor work is necessary",
      ],
    },
    veryUnhealthy: {
      status: "Very Unhealthy",
      color: "#660099",
      activities: [
        "Avoid all outdoor farming activities if possible",
        "Focus on indoor tasks and planning",
        "Postpone all burning and dust-generating activities",
        "Ensure proper irrigation to prevent dust from dry soil",
      ],
    },
  }

  // Update API configuration for Groq
  const GROQ_API_KEY = config.GROQ_API_KEY;
  const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

  // Form submission handler
  const cropForm = document.getElementById("crop-form")
  cropForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const previousCrop = document.getElementById("previous-crop").value
    const soilType = document.getElementById("soil-type").value
    const region = document.getElementById("region").value
    const farmSize = document.getElementById("farm-size").value

    // Generate recommendations
    generateRecommendations(previousCrop, soilType, region, farmSize)

    // Show results
    document.querySelector(".results-placeholder").style.display = "none"
    document.querySelector(".results-content").style.display = "block"
  })

  // Modified generateRecommendations function to use Groq API
  async function generateRecommendations(previousCrop, soilType, region, farmSize) {
    try {
        const prompt = `As an expert agricultural advisor specializing in Indian farming, create a 3-year crop rotation plan for a farm with the following details:
        - Previous crop: ${previousCrop}
        - Soil type: ${soilType}
        - Region/Climate: ${region}
        - Farm size: ${farmSize} acres

        Please provide recommendations in the following format:

        YEAR 1 (IMMEDIATE NEXT CROP):
        [Best next crop name]
        [Detailed explanation of why this crop is recommended]
        [Specific benefits for soil health and yield]

        YEAR 2:
        [Second crop name]
        [Explanation of why this crop follows the first crop]
        [Benefits of this crop in the rotation]

        YEAR 3:
        [Third crop name]
        [Explanation of why this crop completes the rotation]
        [Benefits of this crop and how it prepares soil for the next cycle]

        SOIL HEALTH BENEFITS:
        [Explanation of how this 3-year rotation improves soil health]
        [Specific nutrient management benefits]

        ORGANIC FERTILIZERS:
        [List of recommended organic fertilizers for each crop]
        [Traditional Indian farming practices to incorporate]

        AQI RECOMMENDATIONS:
        [List of farming activities recommended based on typical AQI conditions]
        [Best times for planting and harvesting each crop]`;

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert agricultural advisor specializing in Indian farming practices and crop rotation. Focus on traditional and modern sustainable farming methods suitable for Indian conditions. Consider local climate, soil types, and traditional farming knowledge."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        let recommendations = data.choices[0].message.content;

        // Translate recommendations if not in English
        if (currentLanguage !== 'en') {
            recommendations = await translateText(recommendations, currentLanguage);
        }

        // Parse and display the recommendations
        displayRecommendations(recommendations);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        const errorMessage = await translateText(
            "Sorry, there was an error generating recommendations. Please try again later.",
            currentLanguage
        );
        document.getElementById("next-crop-recommendation").innerHTML = `<p>${errorMessage}</p>`;
    }
  }

  function displayRecommendations(recommendations) {
    // Split the recommendations into sections based on the format
    const sections = recommendations.split('\n\n');
    
    // Create HTML for each section
    const year1HTML = formatSection(sections.find(s => s.startsWith('YEAR 1')));
    const year2HTML = formatSection(sections.find(s => s.startsWith('YEAR 2')));
    const year3HTML = formatSection(sections.find(s => s.startsWith('YEAR 3')));
    const soilHealthHTML = formatSection(sections.find(s => s.startsWith('SOIL HEALTH BENEFITS')));
    const fertilizersHTML = formatSection(sections.find(s => s.startsWith('ORGANIC FERTILIZERS')));
    const aqiHTML = formatSection(sections.find(s => s.startsWith('AQI RECOMMENDATIONS')));
    
    // Display the formatted sections
    document.getElementById("next-crop-recommendation").innerHTML = `
        <div class="rotation-plan">
            <h3>3-Year Crop Rotation Plan</h3>
            <div class="year-section">
                <h4>Year 1</h4>
                ${year1HTML}
            </div>
            <div class="year-section">
                <h4>Year 2</h4>
                ${year2HTML}
            </div>
            <div class="year-section">
                <h4>Year 3</h4>
                ${year3HTML}
            </div>
            <div class="soil-health-section">
                <h4>Soil Health Benefits</h4>
                ${soilHealthHTML}
            </div>
        </div>`;
    
    document.getElementById("fertilizer-recommendation").innerHTML = `
        <div class="fertilizer-section">
            <h4>Organic Fertilizers & Traditional Practices</h4>
            ${fertilizersHTML}
        </div>`;
    
    document.getElementById("aqi-recommendation").innerHTML = `
        <div class="aqi-section">
            <h4>AQI-Based Recommendations</h4>
            ${aqiHTML}
        </div>`;
  }

  function formatSection(section) {
    if (!section) return '';
    
    // Remove the section header
    const content = section.split('\n').slice(1).join('\n');
    
    // Convert the content to HTML with proper formatting
    return `<div class="recommendation-content">
        ${content.split('\n').map(line => `<p>${line}</p>`).join('')}
    </div>`;
  }

  // Simulate AQI data and update recommendations
  function updateAQIRecommendations() {
    try {
        // Simulate AQI value (in a real app, this would come from an API)
        const aqiValue = Math.floor(Math.random() * 200) + 1;

        // Determine AQI category
        let aqiCategory = "moderate"; // default category
        if (aqiValue <= 50) {
            aqiCategory = "good";
        } else if (aqiValue <= 100) {
            aqiCategory = "moderate";
        } else if (aqiValue <= 150) {
            aqiCategory = "unhealthySensitive";
        } else if (aqiValue <= 200) {
            aqiCategory = "unhealthy";
        } else {
            aqiCategory = "veryUnhealthy";
        }

        // Get elements
        const aqiNumberElement = document.getElementById("aqi-number");
        const aqiStatusElement = document.getElementById("aqi-status");
        const aqiValueElement = document.getElementById("aqi-value");
        const aqiActivitiesElement = document.getElementById("aqi-activities");
        const aqiRecommendationElement = document.getElementById("aqi-recommendation");

        // Update elements if they exist
        if (aqiNumberElement) {
            aqiNumberElement.textContent = aqiValue;
        }
        if (aqiStatusElement && aqiRecommendations[aqiCategory]) {
            aqiStatusElement.textContent = aqiRecommendations[aqiCategory].status;
        }
        if (aqiValueElement && aqiRecommendations[aqiCategory]) {
            aqiValueElement.style.background = `conic-gradient(
                ${aqiRecommendations[aqiCategory].color} 0% 100%
            )`;
        }

        // Update AQI-based activity recommendations
        if (aqiActivitiesElement && aqiRecommendations[aqiCategory]) {
            let aqiActivitiesHTML = "";
            aqiRecommendations[aqiCategory].activities.forEach((activity) => {
                aqiActivitiesHTML += `<li>${activity}</li>`;
            });
            aqiActivitiesElement.innerHTML = aqiActivitiesHTML;
        }

        // Generate farming schedule based on AQI
        if (aqiRecommendationElement && aqiRecommendations[aqiCategory]) {
            let scheduleHTML = `
                <div class="aqi-schedule">
                    <p>Based on current AQI (${aqiValue} - ${aqiRecommendations[aqiCategory].status}):</p>
                    <ul>
            `;

            aqiRecommendations[aqiCategory].activities.forEach((activity) => {
                scheduleHTML += `<li>${activity}</li>`;
            });

            scheduleHTML += `
                    </ul>
                    <p class="schedule-note">AQI forecasts are updated daily. Check back for the most current recommendations.</p>
                </div>
            `;

            aqiRecommendationElement.innerHTML = scheduleHTML;
        }
    } catch (error) {
        console.error('Error updating AQI recommendations:', error);
    }
  }

  // Initialize AQI display on page load
  function initializeAQI() {
    updateAQIRecommendations()

    // Update AQI every 30 seconds to simulate real-time data
    setInterval(updateAQIRecommendations, 30000)
  }

  // Update UI based on login status
  function updateUIForLoginStatus() {
    const nav = document.querySelector('nav ul');
    
    // Clear all authentication-related elements
    Array.from(nav.children).forEach(child => {
        if (child.classList.contains('user-menu') || 
            child.querySelector('a[href="login.html"]') ||
            child.querySelector('a[href="register.html"]')) {
            child.remove();
        }
    });

    if (token && user) {
        // Add user menu with profile and logout
        const userMenu = document.createElement('li');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <span class="user-greeting">Welcome, ${user.name}</span>
            <div class="dropdown-content">
                <a href="javascript:void(0)" onclick="window.showProfile()">Profile</a>
                <a href="saved-searches.html">Saved Searches</a>
                <a href="javascript:void(0)" onclick="window.logout()">Logout</a>
            </div>
        `;
        nav.appendChild(userMenu);

        // Toggle dropdown on user greeting click
        const userGreeting = userMenu.querySelector('.user-greeting');
        userGreeting.onclick = function(e) {
            e.stopPropagation();
            const dropdown = userMenu.querySelector('.dropdown-content');
            dropdown.classList.toggle('show');
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const dropdowns = document.querySelectorAll('.dropdown-content');
            dropdowns.forEach(dropdown => {
                if (dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                }
            });
        });

        // Prevent dropdown from closing when clicking inside
        const dropdown = userMenu.querySelector('.dropdown-content');
        dropdown.onclick = function(e) {
            e.stopPropagation();
        };
    } else {
        // Add login/register links
        const loginLink = document.createElement('li');
        loginLink.innerHTML = '<a href="login.html">Login</a>';
        const registerLink = document.createElement('li');
        registerLink.innerHTML = '<a href="register.html">Register</a>';
        nav.appendChild(loginLink);
        nav.appendChild(registerLink);
    }
  }

  // Make functions globally accessible
  window.showProfile = function() {
    const mainContent = document.querySelector('main');
    const profileSection = document.createElement('section');
    profileSection.className = 'profile-section';
    
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
        alert('Please log in to view your profile');
        return;
    }
    
    // Get stats data
    const stats = {
        totalSearches: 15,
        savedRotations: 8,
        areaOptimized: "45 acres",
        emissionsReduced: "30%"
    };
    
    profileSection.innerHTML = `
        <div class="container">
            <h2>Your Profile</h2>
            <div class="profile-content">
                <div class="profile-info">
                    <h3>Personal Information</h3>
                    <p><strong>Name:</strong> ${userData.name}</p>
                    <p><strong>Email:</strong> ${userData.email}</p>
                    <p><strong>Phone:</strong> ${userData.phone || 'Not provided'}</p>
                    <p><strong>Location:</strong> ${userData.location || 'Not provided'}</p>
                </div>
                <div class="profile-stats">
                    <h3>Your Activity</h3>
                    <p><strong>Total Searches:</strong> ${stats.totalSearches}</p>
                    <p><strong>Saved Rotation Plans:</strong> ${stats.savedRotations}</p>
                    <p><strong>Area Optimized:</strong> ${stats.areaOptimized}</p>
                    <p><strong>Emissions Reduced:</strong> ${stats.emissionsReduced}</p>
                </div>
            </div>
            <div class="profile-actions">
                <button onclick="window.editProfile()" class="edit-btn">Edit Profile</button>
                <button onclick="window.hideProfile()" class="close-btn">Close Profile</button>
            </div>
        </div>
    `;
    mainContent.appendChild(profileSection);
  };

  window.hideProfile = function() {
    const profileSection = document.querySelector('.profile-section');
    if (profileSection) {
        profileSection.remove();
    }
  };

  window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  };

  // Show saved searches
  function showSavedSearches() {
    window.location.href = 'saved-searches.html';
  }

  // Load profile statistics
  async function loadProfileStats() {
    try {
        // Get user data from localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData) {
            throw new Error('User data not found');
        }

        // Get search history
        const response = await fetch('/api/search-history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load search history');
        }

        const searches = await response.json();
        
        // Calculate statistics
        const totalSearches = searches.length;
        const memberSince = new Date(userData.createdAt || Date.now()).toLocaleDateString();
        const lastSearch = searches.length > 0 
            ? new Date(searches[0].timestamp).toLocaleDateString() 
            : 'No searches yet';

        // Update the profile stats display
        const statsContainer = document.querySelector('.profile-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <h3>Your Activity</h3>
                <p><strong>Total Searches:</strong> ${totalSearches}</p>
                <p><strong>Member Since:</strong> ${memberSince}</p>
                <p><strong>Last Search:</strong> ${lastSearch}</p>
                <p><strong>Account Type:</strong> ${userData.role || 'Standard User'}</p>
            `;
        }
    } catch (error) {
        console.error('Error loading profile stats:', error);
        const statsContainer = document.querySelector('.profile-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <h3>Your Activity</h3>
                <p><strong>Error loading statistics. Please try again later.</strong></p>
            `;
        }
    }
  }

  // View search details
  function viewSearchDetails(search) {
    const mainContent = document.querySelector('main');
    const detailsSection = document.createElement('section');
    detailsSection.className = 'search-details-section';
    detailsSection.innerHTML = `
        <div class="container">
            <h2>Search Details</h2>
            <div class="details-content">
                <div class="search-info">
                    <h3>Search Information</h3>
                    <p><strong>Date:</strong> ${new Date(search.timestamp).toLocaleDateString()}</p>
                    <p><strong>Previous Crop:</strong> ${search.previousCrop}</p>
                    <p><strong>Soil Type:</strong> ${search.soilType}</p>
                    <p><strong>Region:</strong> ${search.region}</p>
                    <p><strong>Farm Size:</strong> ${search.farmSize} acres</p>
                </div>
                <div class="recommendations">
                    <h3>Recommendations</h3>
                    <div class="recommendations-content">
                        ${search.recommendations.split('\n').map(line => `<p>${line}</p>`).join('')}
                    </div>
                </div>
            </div>
            <div class="action-buttons">
                <button onclick="downloadSearchPDF(${JSON.stringify(search)})" class="download-btn">
                    Download PDF
                </button>
                <button onclick="hideSearchDetails()" class="close-btn">Close</button>
            </div>
        </div>
    `;
    mainContent.appendChild(detailsSection);
  }

  // Hide search details
  function hideSearchDetails() {
    const detailsSection = document.querySelector('.search-details-section');
    if (detailsSection) {
        detailsSection.remove();
    }
  }

  // Edit profile function
  window.editProfile = function() {
    const profileSection = document.querySelector('.profile-section');
    const userData = JSON.parse(localStorage.getItem('user'));
    
    profileSection.innerHTML = `
        <div class="container">
            <h2>Edit Profile</h2>
            <form id="edit-profile-form">
                <div class="form-group">
                    <label for="edit-name">Name:</label>
                    <input type="text" id="edit-name" value="${userData.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-email">Email:</label>
                    <input type="email" id="edit-email" value="${userData.email || ''}" readonly>
                    <small style="color: #666;">Email cannot be changed</small>
                </div>
                <div class="form-group">
                    <label for="edit-phone">Phone:</label>
                    <input type="tel" id="edit-phone" value="${userData.phone || ''}" pattern="[0-9]{10}">
                    <small style="color: #666;">Enter 10-digit phone number</small>
                </div>
                <div class="form-group">
                    <label for="edit-location">Location:</label>
                    <input type="text" id="edit-location" value="${userData.location || ''}">
                </div>
                <div class="form-actions">
                    <button type="button" onclick="window.hideProfile()" class="cancel-btn">Cancel</button>
                    <button type="submit" class="save-btn">Save Changes</button>
                </div>
            </form>
        </div>
    `;

    // Add submit event listener to the form
    const form = document.getElementById('edit-profile-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        window.saveProfile();
    });
  };

  window.saveProfile = async function() {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const updatedData = {
            ...userData,
            name: document.getElementById('edit-name').value,
            phone: document.getElementById('edit-phone').value,
            location: document.getElementById('edit-location').value,
            email: document.getElementById('edit-email').value
        };

        // Validate phone number
        if (updatedData.phone && !/^\d{10}$/.test(updatedData.phone)) {
            alert('Please enter a valid 10-digit phone number');
            return;
        }

        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedData));

        // Show success message
        alert('Profile updated successfully!');

        // Return to profile view
        window.showProfile();
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
    }
  };

  // Update the initApp function
  function initApp() {
    // Add language selector
    const header = document.querySelector('header .container');
    const languageSelector = document.createElement('div');
    languageSelector.className = 'language-selector';
    languageSelector.innerHTML = `
        <select id="language-select">
            ${Object.entries(languageOptions).map(([code, name]) => 
                `<option value="${code}" ${code === currentLanguage ? 'selected' : ''}>${name}</option>`
            ).join('')}
        </select>
    `;
    header.appendChild(languageSelector);

    // Add language change listener
    document.getElementById('language-select').addEventListener('change', (e) => {
        updateLanguage(e.target.value);
    });

    // Add IDs to form labels and buttons
    const cropForm = document.getElementById('crop-form');
    if (cropForm) {
        const labels = cropForm.querySelectorAll('label');
        labels.forEach(label => {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
                label.id = `${forAttr}-label`;
                label.setAttribute('data-original-text', label.textContent);
            }
        });

        const submitButton = cropForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.id = 'submit-button';
            submitButton.setAttribute('data-original-text', submitButton.textContent);
        }

        const autoFillButton = document.querySelector('button[onclick="autoFillDetails()"]');
        if (autoFillButton) {
            autoFillButton.id = 'auto-fill-button';
            autoFillButton.setAttribute('data-original-text', autoFillButton.textContent);
        }
    }

    // Initialize language
    updateLanguage(currentLanguage);

    // Add smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            const targetId = this.getAttribute("href");
            if (targetId === '#') return;
            
            e.preventDefault();
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: "smooth",
                });
            }
        });
    });

    // Initialize AQI display if elements exist
    if (document.getElementById('aqi-number')) {
        initializeAQI();
    }

    // Add click handler for "Get Started" button
    const getStartedBtn = document.getElementById("get-started-btn");
    if (getStartedBtn) {
        getStartedBtn.addEventListener("click", () => {
            const toolSection = document.getElementById("crop-rotation-tool");
            if (toolSection) {
                window.scrollTo({
                    top: toolSection.offsetTop - 80,
                    behavior: "smooth",
                });
            }
        });
    }

    // Update UI based on login status
    updateUIForLoginStatus();
    
    // Load search history if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        loadSearchHistory();
    }
  }

  // Add auto-fill functionality
  window.autoFillDetails = async function() {
    const cropSelect = document.getElementById("previous-crop");
    const soilSelect = document.getElementById("soil-type");
    const regionSelect = document.getElementById("region");
    
    if (!cropSelect.value) {
        soilSelect.value = "";
        regionSelect.value = "";
        return;
    }

    try {
        const prompt = `As an agricultural expert, determine the most suitable soil type and region/climate for growing ${cropSelect.value} in India. 
        Please provide your response in this exact format:
        SOIL_TYPE: [clay/sandy/loamy/silty/peaty]
        REGION: [tropical/subtropical/temperate/arid/mediterranean]
        
        Consider:
        1. Traditional growing regions for this crop in India
        2. Most common soil types where this crop thrives
        3. Typical climate conditions required for optimal growth`;

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert agricultural advisor specializing in Indian farming. Provide precise soil type and region recommendations based on traditional and modern farming practices in India."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const recommendations = data.choices[0].message.content;

        // Parse the recommendations
        const soilMatch = recommendations.match(/SOIL_TYPE:\s*(\w+)/i);
        const regionMatch = recommendations.match(/REGION:\s*(\w+)/i);

        if (soilMatch && regionMatch) {
            const recommendedSoil = soilMatch[1].toLowerCase();
            const recommendedRegion = regionMatch[1].toLowerCase();

            // Set the recommended values
            soilSelect.value = recommendedSoil;
            regionSelect.value = recommendedRegion;

            // Add visual feedback
            soilSelect.classList.add('auto-filled');
            regionSelect.classList.add('auto-filled');
            
            // Remove the highlight after 2 seconds
            setTimeout(() => {
                soilSelect.classList.remove('auto-filled');
                regionSelect.classList.remove('auto-filled');
            }, 2000);
        }
    } catch (error) {
        console.error('Error auto-filling details:', error);
        // Don't show error to user, just keep the fields empty
    }
  };

  // Profile Statistics Loading Function
  window.loadProfileStats = function() {
    const stats = {
        totalSearches: 15,
        savedRotations: 8,
        areaOptimized: "45 acres",
        emissionsReduced: "30%"
    };

    const profileStatsElement = document.querySelector('.profile-stats');
    if (profileStatsElement) {
        profileStatsElement.innerHTML = `
            <h3>Your Activity</h3>
            <p><strong>Total Searches:</strong> ${stats.totalSearches}</p>
            <p><strong>Saved Rotation Plans:</strong> ${stats.savedRotations}</p>
            <p><strong>Area Optimized:</strong> ${stats.areaOptimized}</p>
            <p><strong>Emissions Reduced:</strong> ${stats.emissionsReduced}</p>
        `;
    }
  };

  // Search History Loading Function
  window.loadSearchHistory = function() {
    // Simulated search history - replace with actual API call in production
    const searchHistory = [
        {
            date: '2024-02-20',
            crop: 'Wheat',
            recommendation: 'Rotate with Pulses',
            status: 'Active'
        },
        {
            date: '2024-02-15',
            crop: 'Rice',
            recommendation: 'Rotate with Maize',
            status: 'Completed'
        }
    ];

    const searchHistoryElement = document.getElementById('search-history');
    if (searchHistoryElement) {
        if (searchHistory.length === 0) {
            searchHistoryElement.innerHTML = '<p>No search history available.</p>';
            return;
        }

        const historyHTML = searchHistory.map(search => `
            <div class="search-item">
                <h4>Search on ${search.date}</h4>
                <p>Previous Crop: ${search.crop}</p>
                <p>Recommendation: ${search.recommendation}</p>
                <p>Status: ${search.status}</p>
                <div class="search-actions">
                    <button class="view-btn" onclick="viewSearchDetails('${search.date}')">View Details</button>
                    <button class="download-btn" onclick="downloadResults('${search.date}')">Download PDF</button>
                </div>
            </div>
        `).join('');

        searchHistoryElement.innerHTML = historyHTML;
    }
  };

  // View Search Details Function
  window.viewSearchDetails = function(date) {
    // Implement view details functionality
    console.log(`Viewing details for search on ${date}`);
  };

  // Download Results Function - Simplified and Fast
  window.downloadResults = async function() {
    try {
        // Get current form data
        const formData = {
            previousCrop: document.getElementById('previous-crop').value,
            soilType: document.getElementById('soil-type').value,
            region: document.getElementById('region').value,
            farmSize: document.getElementById('farm-size').value,
            recommendations: {
                year1: document.querySelector('.year-section:nth-child(1)').textContent,
                year2: document.querySelector('.year-section:nth-child(2)').textContent,
                year3: document.querySelector('.year-section:nth-child(3)').textContent,
                soilHealth: document.querySelector('.soil-health-section').textContent
            }
        };

        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFillColor(46, 125, 50);
        doc.rect(0, 0, 210, 40, 'F');
        
        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('Crop Rotation Report', 105, 25, { align: 'center' });

        // Farm Details
        let y = 50;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Farm Details', 20, y);
        
        y += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Previous Crop: ${formData.previousCrop}`, 20, y);
        y += 8;
        doc.text(`Soil Type: ${formData.soilType}`, 20, y);
        y += 8;
        doc.text(`Region: ${formData.region}`, 20, y);
        y += 8;
        doc.text(`Farm Size: ${formData.farmSize} acres`, 20, y);

        // Recommendations
        y += 20;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Rotation Plan', 20, y);

        // Year boxes with colors
        const colors = [[76, 175, 80], [33, 150, 243], [255, 152, 0]];
        const years = ['Year 1', 'Year 2', 'Year 3'];
        
        y += 10;
        years.forEach((year, index) => {
            doc.setFillColor(...colors[index]);
            doc.rect(20, y, 170, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.text(year, 25, y + 8);
            doc.setFontSize(11);
            doc.text(formData.recommendations[`year${index + 1}`].substring(0, 150), 25, y + 18);
            y += 35;
        });

        // AQI Chart
        y += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text('Air Quality Impact', 20, y);
        
        // Add chart
        const chartCanvas = document.getElementById('aqiComparisonChart');
        const chartImage = await html2canvas(chartCanvas);
        const chartData = chartImage.toDataURL('image/png');
        doc.addImage(chartData, 'PNG', 20, y + 5, 170, 80);

        // Footer
        doc.setFillColor(46, 125, 50);
        doc.rect(0, 277, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('EcoFarm Assistant - Sustainable Farming Solutions', 105, 287, { align: 'center' });

        // Save PDF
        doc.save('Crop-Rotation-Plan.pdf');

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
  };

  // Initialize the app when DOM is loaded
  initApp()
})