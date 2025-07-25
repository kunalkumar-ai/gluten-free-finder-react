# app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import dotenv
import json 
import traceback 
import threading # NEW: To run database saves in the background
from supabase import create_client, Client # NEW: Supabase imports
import requests
from find_places import find_gluten_free_restaurants_places_api as find_places, categorize_places_with_gemini
from datetime import datetime, timedelta
from fuzzywuzzy import fuzz
# --- CONFIGURATION ---
dotenv.load_dotenv()
app = Flask(__name__)
CORS(app)

# API Key validation
GEMINI_API_KEY_FROM_ENV = os.getenv('GEMINI_API_KEY')
GOOGLE_PLACES_API_KEY_FROM_ENV = os.getenv('GOOGLE_PLACES_API_KEY')

# NEW: Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not all([GEMINI_API_KEY_FROM_ENV, GOOGLE_PLACES_API_KEY_FROM_ENV, SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("All API keys and Supabase credentials must be set in the .env file.")

# NEW: Initialize the Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# --- END CONFIGURATION ---


def save_to_supabase_async(lat, lon, search_type, gemini_result, city_name=None):
    """Saves a single search record to the Supabase 'search_live' table."""
    try:
        data_to_save = {
            'latitude': lat,
            'longitude': lon,
            'search_type': search_type,
            'results': gemini_result
        }
        # If a city_name is provided, convert it to lowercase and add it
        if city_name:
            data_to_save['city_name'] = city_name.lower()
        
        response = supabase.table('search_live').insert(data_to_save).execute()

        if response.data:
            print(f"Successfully saved search (lat: {lat}, lon: {lon}, city: {city_name}) to Supabase.")
        else:
            print(f"Failed to save search to Supabase. Response: {response.error}")

    except Exception as e:
        print(f"Error saving data to Supabase in background thread: {e}")
        traceback.print_exc()


# NEW: Route to find coordinates for a city
@app.route('/find-city-coordinates', methods=['GET'])
def find_city_coordinates_route():
    city_name = request.args.get('city')
    if not city_name:
        return jsonify({"error": "A 'city' parameter is required."}), 400

    url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
    params = {
        "input": city_name,
        "inputtype": "textquery",
        "fields": "geometry",
        "key": GOOGLE_PLACES_API_KEY_FROM_ENV
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        data = response.json()

        if data.get("status") == "OK" and data.get("candidates"):
            location = data["candidates"][0]["geometry"]["location"]
            return jsonify({"lat": location["lat"], "lng": location["lng"]})
        else:
            return jsonify({"error": f"Could not find coordinates for city: {city_name}"}), 404

    except requests.exceptions.RequestException as e:
        print(f"Error calling Google Places API: {e}")
        return jsonify({"error": "Failed to communicate with Google Places API."}), 500
    except Exception as e:
        print(f"An unexpected error occurred in find_city_coordinates_route: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred."}), 500


# NEW: Route to submit user feedback
@app.route('/submit-feedback', methods=['POST'])
def submit_feedback_route():
    data = request.get_json()
    content = data.get('content')

    if not content:
        return jsonify({"error": "Feedback content is required."}), 400

    try:
        response = supabase.table('feedback').insert({"content": content}).execute()

        if response.data:
            return jsonify({"message": "Feedback submitted successfully."}), 201
        else:
            print(f"Failed to save feedback to Supabase. Response: {response.error}")
            return jsonify({"error": "Failed to save feedback."}), 500

    except Exception as e:
        print(f"An unexpected error occurred in submit_feedback_route: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred."}), 500

# In app.py

# --- MAIN API ROUTE ---
@app.route('/get-restaurants', methods=['GET'])
def get_establishments_route():
    # Get parameters from the request URL
    city = request.args.get('city')
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    type_ = request.args.get('type', 'restaurants')
    country = request.args.get('country', None)

    if lat is None or lon is None:
        return jsonify({"error": "Latitude and longitude are required."}), 400

# --- UPDATED CACHE CHECKING LOGIC ---
    try:
        # Step 1: Check for a cached result by city name if provided
        if city:
            print(f"Checking cache for city: '{city}' and type: '{type_}'")
            
            # Calculate the timestamp for 7 days ago
            seven_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            
            # Query for a case-insensitive city name and type match within the last 7 days
            #cached_city_search = supabase.table('search_live').select('results').ilike('city_name', city).eq('search_type', type_).gte('created_at', seven_days_ago).limit(1).execute()
            cached_city_search = supabase.table('search_live').select('results').ilike('city_name', f'%{city.lower()}%').eq('search_type', type_).gte('created_at', seven_days_ago).limit(1).execute()
            
            if cached_city_search.data:
                print(f"CITY CACHE HIT! Returning data for '{city}'.")
                return jsonify({"raw_data": cached_city_search.data[0]['results']})

        # Step 2: If no city cache hit, fall back to GPS proximity check
        print(f"Checking GPS cache for type: {type_} at lat: {lat}, lon: {lon}")
        cached_response = supabase.rpc(
            'find_nearby_searches',
            {
                'request_lat': lat,
                'request_lon': lon,
                'request_type': type_,
                'radius_meters': 500
            }
        ).execute()

        if cached_response.data:
            print("GPS PROXIMITY CACHE HIT! Returning data from Supabase.")
            cached_places = cached_response.data[0]['results']
            return jsonify({"raw_data": cached_places})

        print("CACHE MISS. Fetching fresh data from APIs...")

    except Exception as e:
        print(f"Error checking cache, proceeding to fetch fresh data. Error: {e}")
    # --- END UPDATED CACHE LOGIC ---


    try:
        # Step 1: Get the full list of places from Google
        places_list = find_places(api_key=GOOGLE_PLACES_API_KEY_FROM_ENV, type_=type_, city_name=city, country_filter=country, lat=lat, lon=lon)

        if not places_list:
            return jsonify({"error": f"No {type_} found matching your criteria."}), 404

        # Step 2: Get the categorization for the list from Gemini
        categorization = categorize_places_with_gemini(api_key=GEMINI_API_KEY_FROM_ENV, places_list=places_list, type_=type_, city_name=city)

        # Step 3: Combine data, add gf_status, and filter
        enriched_places = []
        for place in places_list:
            place_id = place.get('place_id')
            status = categorization.get(place_id, 'Offers GF')
            if status != 'Status Unclear':
                place['gf_status'] = status
                enriched_places.append(place)
        
        # Step 4: Sort the final list
        if lat is not None and lon is not None:
             enriched_places.sort(key=lambda p: (0 if p.get('gf_status') == 'Dedicated GF' else 1, p.get('distance', 999)))
        else:
            enriched_places.sort(key=lambda p: (0 if p.get('gf_status') == 'Dedicated GF' else 1))

        # --- Save the new results to Supabase in the background ---
        if enriched_places:
            save_thread = threading.Thread(
                target=save_to_supabase_async,
                args=(lat, lon, type_, enriched_places,city)
            )
            save_thread.start()
        # --- END ---

        return jsonify({"raw_data": enriched_places})

    except Exception as e:
        print(f"Critical error in /get-establishments route: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred."}), 500

# --- APP RUN ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5007))
    app.run(host='0.0.0.0', port=port, debug=True)