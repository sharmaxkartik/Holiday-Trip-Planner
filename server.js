const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { getJson } = require('serpapi');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fetch Flights from SerpAPI
app.get('/api/flights', async (req, res) => {
    try {
        const { departure_id, arrival_id, outbound_date, return_date } = req.query;
        if (!departure_id || !arrival_id || !outbound_date) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const apiKey = process.env.SERP_API_KEY;
        if (!apiKey) {
            console.log('No SERP_API_KEY found. Returning mock flight data.');
            return res.json({
                best_flights: [
                    {
                        flights: [{ airline: 'Mock Airlines', departure_airport: { time: '10:00 AM' }, arrival_airport: { time: '12:30 PM' } }],
                        total_duration: 150,
                        price: 5500
                    },
                    {
                        flights: [{ airline: 'Dummy Air', departure_airport: { time: '02:00 PM' }, arrival_airport: { time: '04:45 PM' } }],
                        total_duration: 165,
                        price: 4800
                    }
                ]
            });
        }
        
        const params = {
            engine: "google_flights",
            departure_id: departure_id,
            arrival_id: arrival_id,
            outbound_date: outbound_date,
            currency: "INR",
            hl: "en",
            api_key: apiKey
        };
        
        if (return_date) {
            params.return_date = return_date;
            params.type = "1";
        } else {
            params.type = "2";
        }

        const data = await new Promise((resolve) => {
            getJson(params, resolve);
        });

        res.json(data);
    } catch (error) {
        console.error('Error fetching flights:', error);
        res.status(500).json({ error: 'Failed to fetch flights' });
    }
});

// Fetch Hotels from SerpAPI
app.get('/api/hotels', async (req, res) => {
    try {
        const { q, check_in_date, check_out_date } = req.query;
        if (!q || !check_in_date || !check_out_date) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const apiKey = process.env.SERP_API_KEY;
        if (!apiKey) {
            console.log('No SERP_API_KEY found. Returning mock hotel data.');
            return res.json({
                properties: [
                    {
                        name: 'The Grand Mock Hotel',
                        overall_rating: 4.8,
                        rate_per_night: { lowest: '₹4,500' },
                        images: [{ thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }]
                    },
                    {
                        name: 'Cozy Dummy Stay',
                        overall_rating: 4.2,
                        rate_per_night: { lowest: '₹2,800' },
                        images: [{ thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }]
                    }
                ]
            });
        }
        
        const params = {
            engine: "google_hotels",
            q: q,
            check_in_date: check_in_date,
            check_out_date: check_out_date,
            currency: "INR",
            hl: "en",
            api_key: apiKey
        };

        const data = await new Promise((resolve) => {
            getJson(params, resolve);
        });

        res.json(data);
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ error: 'Failed to fetch hotels' });
    }
});

// Itinerary & Top Places Generation
app.post('/api/itinerary', async (req, res) => {
    try {
        const { source, destination, dates, interests } = req.body;
        const serpKey = process.env.SERP_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        let daysItinerary = [];
        let places = [];

        // 1. Fetch Gemini Itinerary
        if (geminiKey) {
            try {
                const prompt = `Create a detailed, multi-day holiday itinerary for a trip from ${source} to ${destination} on these dates: ${dates}. Interests: ${interests || 'general'}. If the dates span is unclear or too short, please generate a full 3-day itinerary. Return ONLY a valid JSON array of objects, where each object has a 'day' (e.g. "Day 1") and 'activities'. 'activities' must be an array of objects with 'time' (e.g. "Morning", "Afternoon", "Evening") and 'description'. Do not use markdown blocks, just raw JSON.`;
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
                const geminiRes = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { response_mime_type: "application/json" }
                    })
                });
                const geminiData = await geminiRes.json();
                if (geminiData.candidates && geminiData.candidates[0].content.parts[0].text) {
                    daysItinerary = JSON.parse(geminiData.candidates[0].content.parts[0].text);
                }
            } catch (err) {
                console.error("Gemini error:", err);
            }
        }

        if (daysItinerary.length === 0) {
            daysItinerary = [
                {
                    day: "Day 1",
                    activities: [
                        { time: "Morning", description: `Arrival in ${destination} and hotel check-in.` },
                        { time: "Afternoon", description: `Explore local markets and popular spots.` },
                        { time: "Evening", description: `Welcome dinner at a local restaurant.` }
                    ]
                },
                {
                    day: "Day 2",
                    activities: [
                        { time: "Morning", description: `Visit major landmarks and historical sites.` },
                        { time: "Afternoon", description: `Guided tour based on your interests.` },
                        { time: "Evening", description: `Sunset views from a popular vantage point.` }
                    ]
                },
                {
                    day: "Day 3",
                    activities: [
                        { time: "Morning", description: `Leisurely morning with breakfast at a cafe.` },
                        { time: "Afternoon", description: `Souvenir shopping and packing.` },
                        { time: "Evening", description: `Departure back home.` }
                    ]
                }
            ];
        }

        // 2. Fetch TripAdvisor Places
        if (serpKey) {
            try {
                const params = { engine: "tripadvisor", q: destination, ssrc: "a", api_key: serpKey };
                const tripData = await new Promise((resolve) => getJson(params, resolve));
                places = (tripData.places || []).slice(0, 6).map(p => ({
                    title: p.title,
                    description: p.description || p.highlighted_review?.text || "Highly recommended place to visit.",
                    rating: p.rating || "N/A",
                    thumbnail: p.thumbnail || "https://via.placeholder.com/400x200?text=No+Image",
                    type: p.place_type || "ATTRACTION"
                }));
            } catch (err) {
                console.error("TripAdvisor error:", err);
            }
        } else {
            places = [
                { title: "Mock Place 1", description: "A wonderful mock place to visit.", rating: 4.5, thumbnail: "https://via.placeholder.com/400x200?text=Place+1", type: "ATTRACTION" },
                { title: "Mock Place 2", description: "Another amazing mock place.", rating: 4.8, thumbnail: "https://via.placeholder.com/400x200?text=Place+2", type: "ACCOMMODATION" }
            ];
        }

        res.json({ itinerary: { days: daysItinerary, places: places } });
    } catch (error) {
        console.error('Error generating itinerary:', error);
        res.status(500).json({ error: 'Failed to generate itinerary' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
