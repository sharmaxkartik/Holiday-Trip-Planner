# WanderLust - AI Holiday Trip Planner 🌴✨

An AI-powered, modern web application that generates personalized holiday itineraries and fetches real-time flight and hotel data. Built with an intuitive, glassmorphism UI to provide a premium user experience.

## Features
- **AI Day-by-Day Itinerary**: Uses Google's Gemini API to create a detailed, multi-day itinerary based on your interests and travel dates.
- **Top Places to Explore**: Integrates with TripAdvisor (via SerpAPI) to fetch and display the best-rated attractions and accommodations for your destination.
- **Real-Time Flights**: Fetches real flight schedules and prices using Google Flights (via SerpAPI), automatically highlighting the cheapest option.
- **Real-Time Hotels**: Fetches current hotel rates and ratings using Google Hotels (via SerpAPI), automatically highlighting the best-rated option.
- **Beautiful UI/UX**: Features a stunning, responsive layout with glassmorphism cards, animated gradients, and smooth tab navigation.
- **Dark Mode**: Integrated dark mode toggle that saves your preference.
- **Trip Caching**: Saves your most recently planned trip to local storage so you don't lose it if you refresh the page.

## Tech Stack
- **Frontend**: HTML5, CSS3 (Vanilla, modern UI/UX principles), Vanilla JavaScript.
- **Backend**: Node.js, Express.js.
- **APIs**:
  - SerpAPI (Google Flights Engine)
  - SerpAPI (Google Hotels Engine)
  - SerpAPI (TripAdvisor Engine)
  - Gemini 1.5 API (Generative AI for Itinerary)

## Setup & Installation

1. **Clone or Download the Repository**

2. **Install Dependencies**
   Navigate to the project folder and run:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   The project requires API keys to fetch real data. 
   - Rename the `.env.example` file to `.env`.
   - Add your [SerpAPI](https://serpapi.com/) key and [Gemini API](https://aistudio.google.com/app/apikey) key:
   ```env
   SERP_API_KEY=your_serp_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```
   *(Note: The app has mock fallbacks, so if an API key fails or isn't provided, it will still display mock data to ensure the UI remains testable!)*

4. **Start the Server**
   ```bash
   npm start
   ```

5. **Open the App**
   Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

## Usage
1. Enter your Source and Destination (e.g. `DEL` to `BOM`).
2. Select your travel dates.
3. Enter your budget and interests (e.g. "Adventure, Culture").
4. Click "Plan Trip ✨" and let the AI build your dream holiday!

## Project Structure
- `/public`: Contains all the frontend assets (`index.html`, `style.css`, `script.js`).
- `server.js`: The Express backend that securely handles API keys and proxies requests to SerpAPI and Gemini.
- `package.json`: Project dependencies and start scripts.
