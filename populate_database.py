import requests
import time
import json

# --- CONFIGURATION ---

# You can expand this list with up to 100 cities as you planned
CITIES_TO_PREPOPULATE = [
    # Top 100
    "Paris, France", "Madrid, Spain", "Tokyo, Japan", "Rome, Italy", "Milan, Italy",
    "New York, USA", "Amsterdam, Netherlands", "Sydney, Australia", "Singapore", "Barcelona, Spain",
    "Taipei, Taiwan", "Seoul, South Korea", "London, UK", "Dubai, UAE", "Berlin, Germany",
    "Osaka, Japan", "Bangkok, Thailand", "Los Angeles, USA", "Istanbul, Turkey", "Melbourne, Australia",
    "Hong Kong", "Munich, Germany", "Las Vegas, USA", "Florence, Italy", "Prague, Czech Republic",
    "Dublin, Ireland", "Kyoto, Japan", "Vienna, Austria", "Lisbon, Portugal", "Venice, Italy",
    "Kuala Lumpur, Malaysia", "Athens, Greece", "Orlando, USA", "Toronto, Canada", "Miami, USA",
    "San Francisco, USA", "Shanghai, China", "Frankfurt, Germany", "Copenhagen, Denmark", "Zurich, Switzerland",
    "Washington D.C., USA", "Vancouver, Canada", "Stockholm, Sweden", "Mexico City, Mexico", "Oslo, Norway",
    "São Paulo, Brazil", "Phuket, Thailand", "Helsinki, Finland", "Brussels, Belgium", "Budapest, Hungary",
    "Guangzhou, China", "Nice, France", "Palma de Mallorca, Spain", "Honolulu, USA", "Beijing, China",
    "Warsaw, Poland", "Seville, Spain", "Valencia, Spain", "Shenzhen, China", "Doha, Qatar",
    "Abu Dhabi, UAE", "Antalya, Turkey", "Fukuoka, Japan", "Sapporo, Japan", "Busan, South Korea",
    "Macau", "Edinburgh, Scotland", "Montreal, Canada", "Cancún, Mexico", "Bologna, Italy",
    "Rhodes, Greece", "Verona, Italy", "Delhi, India", "Porto, Portugal", "Ho Chi Minh City, Vietnam",
    "Buenos Aires, Argentina", "Rio de Janeiro, Brazil", "Kraków, Poland", "Heraklion, Greece", "Johor Bahru, Malaysia",
    "Hanoi, Vietnam", "Tel Aviv, Israel", "Sharjah, UAE", "Thessaloniki, Greece", "Lima, Peru",
    "Medina, Saudi Arabia", "Tbilisi, Georgia", "Riyadh, Saudi Arabia", "Tallinn, Estonia", "Marrakech, Morocco",
    "Mecca, Saudi Arabia", "Pattaya, Thailand", "Mumbai, India", "Denpasar, Indonesia", "Agra, India",

    # Cities 101-200
    "Chicago, USA", "Jaipur, India", "Cairns, Australia", "Jerusalem, Israel", "Penang, Malaysia",
    "Moscow, Russia", "Saint Petersburg, Russia", "Cairo, Egypt", "Nairobi, Kenya", "Cape Town, South Africa",
    "Auckland, New Zealand", "Queenstown, New Zealand", "Santiago, Chile", "Bogotá, Colombia", "Cartagena, Colombia",
    "Quito, Ecuador", "Reykjavik, Iceland", "Bergen, Norway", "Gothenburg, Sweden", "Hamburg, Germany",
    "Cologne, Germany", "Düsseldorf, Germany", "Salzburg, Austria", "Innsbruck, Austria", "Geneva, Switzerland",
    "Lyon, France", "Marseille, France", "Turin, Italy", "Naples, Italy", "Pisa, Italy",
    "Malaga, Spain", "Granada, Spain", "Ibiza, Spain", "Funchal, Portugal", "Gdańsk, Poland",
    "Ljubljana, Slovenia", "Zagreb, Croatia", "Dubrovnik, Croatia", "Split, Croatia", "Belgrade, Serbia",
    "Sofia, Bulgaria", "Bucharest, Romania", "Kiev, Ukraine", "Minsk, Belarus", "Vilnius, Lithuania",
    "Riga, Latvia", "Bratislava, Slovakia", "Luxembourg City, Luxembourg", "Valletta, Malta", "Nicosia, Cyprus",
    "Amman, Jordan", "Beirut, Lebanon", "Muscat, Oman", "Kuwait City, Kuwait", "Manama, Bahrain",
    "Baku, Azerbaijan", "Yerevan, Armenia", "Almaty, Kazakhstan", "Tashkent, Uzbekistan", "Ulaanbaatar, Mongolia",
    "Tallinn, Estonia",
    "Colombo, Sri Lanka", "Kathmandu, Nepal", "Dhaka, Bangladesh", "Yangon, Myanmar", "Phnom Penh, Cambodia",
    "Vientiane, Laos", "Manila, Philippines", "Cebu City, Philippines", "Jakarta, Indonesia", "Bandung, Indonesia",
    "Surabaya, Indonesia", "Adelaide, Australia", "Perth, Australia", "Brisbane, Australia", "Wellington, New Zealand",
    "Christchurch, New Zealand", "Suva, Fiji", "Papeete, Tahiti", "Nouméa, New Caledonia", "Apia, Samoa",
    "Nuku'alofa, Tonga", "Port Moresby, Papua New Guinea", "Honiara, Solomon Islands", "Port Vila, Vanuatu", "Majuro, Marshall Islands",
    "Palikir, Micronesia", "Koror, Palau", "Yaren, Nauru", "Funafuti, Tuvalu", "South Tarawa, Kiribati"
]

FILTERS = ["restaurants", "cafes", "bakery"]

# The URL of your running backend server
BACKEND_BASE_URL = "http://localhost:5007"

# --- SCRIPT LOGIC ---

def populate_data():
    """
    Loops through cities and filters, calling the backend API to populate the database.
    """
    print(f"Starting data population for {len(CITIES_TO_PREPOPULATE)} cities...")

    for city in CITIES_TO_PREPOPULATE:
        print(f"\n--- Processing city: {city} ---")
        
        # --- STEP 1: Get coordinates for the city ---
        coords = None
        try:
            print(f"  Step 1: Finding coordinates for '{city}'...")
            coords_url = f"{BACKEND_BASE_URL}/find-city-coordinates?city={requests.utils.quote(city)}"
            coords_response = requests.get(coords_url, timeout=30)

            if coords_response.status_code == 200:
                coords = coords_response.json()
                print(f"    SUCCESS: Found coordinates: {coords}")
            else:
                print(f"    ERROR: Could not find coordinates for '{city}'. Status: {coords_response.status_code}. Skipping this city.")
                # A pause even on failure
                time.sleep(5)
                continue # Go to the next city
        except requests.exceptions.RequestException as e:
            print(f"    CRITICAL ERROR: The request for coordinates failed for '{city}'. Error: {e}")
            # A pause even on failure
            time.sleep(5)
            continue # Go to the next city


        # --- STEP 2: Fetch places for each filter using the coordinates ---
        if coords:
            print(f"  Step 2: Fetching places for '{city}' using its coordinates...")
            for filter_type in FILTERS:
                # Construct the URL with the coordinates we just found
                request_url = f"{BACKEND_BASE_URL}/get-restaurants?lat={coords['lat']}&lon={coords['lng']}&type={filter_type}&city={requests.utils.quote(city)}"

                print(f"    Fetching {filter_type}...")
                try:
                    # Make the request with a long timeout, as the Gemini call can be slow
                    response = requests.get(request_url, timeout=120)

                    if response.status_code == 200:
                        print(f"      SUCCESS: Data for '{filter_type}' populated.")
                    else:
                        print(f"      ERROR: Failed to get data for '{filter_type}'. Status Code: {response.status_code}")
                        print(f"        Response: {response.text}")
                    
                    # Wait for a moment between individual filter requests
                    time.sleep(1)

                except requests.exceptions.RequestException as e:
                    print(f"      CRITICAL ERROR: The request for places failed for '{filter_type}'. Error: {e}")

        # A longer pause between each city to be respectful of API rate limits
        print(f"--- Finished processing {city}. Waiting before next city... ---")
        time.sleep(5)

    print("\nData population script finished!")


if __name__ == "__main__":
    populate_data()