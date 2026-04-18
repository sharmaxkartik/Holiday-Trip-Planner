document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('planner-form');
    const planBtn = document.getElementById('plan-btn');
    const btnText = planBtn.querySelector('span');
    const btnSpinner = document.getElementById('btn-spinner');
    
    const loadingState = document.getElementById('loading-state');
    const resultsSection = document.getElementById('results-section');
    const regenerateBtn = document.getElementById('regenerate-btn');
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const themeToggle = document.getElementById('theme-toggle');

    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    // Load saved trip
    const savedTrip = localStorage.getItem('latestTrip');
    if (savedTrip) {
        try {
            const parsedTrip = JSON.parse(savedTrip);
            renderResults(parsedTrip);
            resultsSection.classList.remove('hidden');
        } catch (e) {
            console.error('Error parsing saved trip');
        }
    }

    // Tabs logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const source = document.getElementById('source').value;
        const destination = document.getElementById('destination').value;
        const departureDate = document.getElementById('departure-date').value;
        const returnDate = document.getElementById('return-date').value;
        const budget = document.getElementById('budget').value;
        const interests = document.getElementById('interests').value;

        // UI Loading
        btnText.textContent = 'Planning...';
        btnSpinner.classList.remove('hidden');
        planBtn.disabled = true;
        
        resultsSection.classList.add('hidden');
        loadingState.classList.remove('hidden');

        try {
            // Parallel fetch
            const baseUrl = 'http://localhost:3000';
            const [itineraryRes, flightsRes, hotelsRes] = await Promise.all([
                fetch(`${baseUrl}/api/itinerary`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source, destination, dates: `${departureDate} to ${returnDate}`, interests })
                }),
                fetch(`${baseUrl}/api/flights?departure_id=${source}&arrival_id=${destination}&outbound_date=${departureDate}${returnDate ? `&return_date=${returnDate}` : ''}`),
                // Assuming hotel check out is 2 days later if return date not provided
                fetch(`${baseUrl}/api/hotels?q=${destination}&check_in_date=${departureDate}&check_out_date=${returnDate || addDays(departureDate, 2)}`)
            ]);

            const itineraryData = await itineraryRes.json();
            const flightsData = await flightsRes.json();
            const hotelsData = await hotelsRes.json();

            const tripData = {
                itinerary: itineraryData.itinerary || [],
                flights: parseFlights(flightsData),
                hotels: parseHotels(hotelsData)
            };

            // Save to localStorage
            localStorage.setItem('latestTrip', JSON.stringify(tripData));
            
            renderResults(tripData);
            
            loadingState.classList.add('hidden');
            resultsSection.classList.remove('hidden');

        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to plan trip. Please ensure the backend is running and API keys are set.');
            loadingState.classList.add('hidden');
        } finally {
            btnText.textContent = 'Plan Trip ✨';
            btnSpinner.classList.add('hidden');
            planBtn.disabled = false;
        }
    });

    regenerateBtn.addEventListener('click', () => {
        form.dispatchEvent(new Event('submit'));
    });

    // Helper to add days
    function addDays(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    // Parse SerpAPI flights response safely
    function parseFlights(data) {
        if (!data || !data.best_flights && !data.other_flights) return [];
        let allFlights = [];
        if (data.best_flights) allFlights.push(...data.best_flights);
        if (data.other_flights) allFlights.push(...data.other_flights);
        
        // Return structured data
        return allFlights.slice(0, 5).map((f, index) => {
            return {
                airline: f.flights[0].airline,
                departure_time: f.flights[0].departure_airport.time,
                arrival_time: f.flights[f.flights.length - 1].arrival_airport.time,
                duration: f.total_duration,
                price: f.price,
                isCheapest: index === 0 // Assuming they are sorted or we can sort them
            };
        });
    }

    // Parse SerpAPI hotels response safely
    function parseHotels(data) {
        if (!data || !data.properties) return [];
        
        return data.properties.slice(0, 6).map((h, index) => {
            return {
                name: h.name,
                price: h.rate_per_night?.lowest || h.total_rate?.lowest || 'Check site',
                rating: h.overall_rating || 'N/A',
                image: h.images?.[0]?.thumbnail || 'https://via.placeholder.com/400x200?text=Hotel',
                isBest: index === 0 && h.overall_rating > 4.5
            };
        });
    }

    // Render logic
    function renderResults(data) {
        // Render AI Itinerary & Top Places
        const itinContainer = document.getElementById('itinerary-results');
        itinContainer.innerHTML = '';
        
        if (!data.itinerary) {
            itinContainer.innerHTML = '<p>No data found.</p>';
        } else {
            // Render Day-by-Day
            if (data.itinerary.days && data.itinerary.days.length > 0) {
                const daysWrapper = document.createElement('div');
                daysWrapper.className = 'results-grid';
                daysWrapper.style.marginBottom = '3rem';
                
                data.itinerary.days.forEach(day => {
                    const dayCard = document.createElement('div');
                    dayCard.className = 'result-card day-card';
                    
                    let actsHtml = '';
                    day.activities.forEach(act => {
                        actsHtml += `<div class="activity"><span>${act.time}</span>${act.description}</div>`;
                    });

                    dayCard.innerHTML = `
                        <h3>${day.day}</h3>
                        ${actsHtml}
                    `;
                    daysWrapper.appendChild(dayCard);
                });
                itinContainer.appendChild(daysWrapper);
            }

            // Render Places
            if (data.itinerary.places && data.itinerary.places.length > 0) {
                const placesTitle = document.createElement('h3');
                placesTitle.style.marginBottom = '1.5rem';
                placesTitle.style.borderTop = '1px solid var(--card-border)';
                placesTitle.style.paddingTop = '1.5rem';
                placesTitle.innerText = '📍 Top Places to Explore';
                itinContainer.appendChild(placesTitle);

                const placesWrapper = document.createElement('div');
                placesWrapper.className = 'results-grid';
                
                data.itinerary.places.forEach(place => {
                    const placeCard = document.createElement('div');
                    placeCard.className = 'result-card hotel-card'; // Reuse hotel-card style for image
                    
                    placeCard.innerHTML = `
                        <span class="badge badge-hotel" style="background:var(--accent); box-shadow:0 4px 10px rgba(139, 92, 246, 0.3);">${place.type}</span>
                        <img src="${place.thumbnail}" alt="${place.title}" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
                        <div class="hotel-header">
                            <h3 style="font-size:1.1rem">${place.title}</h3>
                            <span class="hotel-rating">★ ${place.rating}</span>
                        </div>
                        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${place.description}</p>
                    `;
                    placesWrapper.appendChild(placeCard);
                });
                itinContainer.appendChild(placesWrapper);
            }
        }

        // Render Flights
        const flightsContainer = document.getElementById('flights-results');
        flightsContainer.innerHTML = '';
        
        if (!data.flights || data.flights.length === 0) {
            flightsContainer.innerHTML = '<p>No flights found for this route/date.</p>';
        } else {
            // Sort by price to find cheapest
            const sortedFlights = [...data.flights].sort((a, b) => a.price - b.price);
            if (sortedFlights.length > 0) sortedFlights[0].isCheapest = true;

            data.flights.forEach(f => {
                const fCard = document.createElement('div');
                fCard.className = 'result-card flight-card';
                
                const cheapestBadge = f.isCheapest ? `<span class="badge badge-flight">🔥 Cheapest</span>` : '';
                
                fCard.innerHTML = `
                    ${cheapestBadge}
                    <div class="flight-info">
                        <div class="flight-route">${f.departure_time.split(' ')[0]} ➔ ${f.arrival_time.split(' ')[0]}</div>
                        <div class="flight-airline">${f.airline} • ${f.duration}m</div>
                    </div>
                    <div class="flight-price">₹${f.price}</div>
                `;
                flightsContainer.appendChild(fCard);
            });
        }

        // Render Hotels
        const hotelsContainer = document.getElementById('hotels-results');
        hotelsContainer.innerHTML = '';
        
        if (!data.hotels || data.hotels.length === 0) {
            hotelsContainer.innerHTML = '<p>No hotels found.</p>';
        } else {
            // Sort by rating to find best
            let bestHotelIdx = -1;
            let highestRating = 0;
            data.hotels.forEach((h, i) => {
                if (h.rating !== 'N/A' && h.rating > highestRating) {
                    highestRating = h.rating;
                    bestHotelIdx = i;
                }
            });

            data.hotels.forEach((h, i) => {
                const hCard = document.createElement('div');
                hCard.className = 'result-card hotel-card';
                
                const bestBadge = (i === bestHotelIdx) ? `<span class="badge badge-hotel">⭐ Best Rated</span>` : '';
                
                hCard.innerHTML = `
                    ${bestBadge}
                    <img src="${h.image}" alt="${h.name}">
                    <div class="hotel-header">
                        <h3 style="font-size:1.1rem">${h.name}</h3>
                        <span class="hotel-rating">★ ${h.rating}</span>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.9rem;">From ${h.price}</p>
                `;
                hotelsContainer.appendChild(hCard);
            });
        }
    }
});
