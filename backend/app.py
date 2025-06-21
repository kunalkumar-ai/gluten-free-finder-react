# app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import dotenv
import json 
import traceback 
import threading # NEW: To run database saves in the background
from supabase import create_client, Client # NEW: Supabase imports

from find_places import find_gluten_free_restaurants_places_api as find_places, categorize_places_with_gemini

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


# NEW: Function to save data to the single 'search_live' table in the background
def save_to_supabase_async(lat, lon, search_type, gemini_result):
    """Saves a single search record to the Supabase 'search_live' table."""
    try:
        # Prepare the row to be inserted
        data_to_save = {
            'latitude': lat,
            'longitude': lon,
            'search_type': search_type,
            'results': gemini_result # The 'results' column is JSONB, so it can take the list directly
        }
        
        # Insert the data into the 'search_live' table
        response = supabase.table('search_live').insert(data_to_save).execute()

        # Optional: Check if the insert was successful
        if response.data:
            print(f"Successfully saved search (lat: {lat}, lon: {lon}) to Supabase.")
        else:
            print(f"Failed to save search to Supabase. Response: {response.error}")

    except Exception as e:
        print(f"Error saving data to Supabase in background thread: {e}")
        traceback.print_exc()


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

    # --- NEW: CACHE CHECKING LOGIC ---
    try:
        print(f"Checking cache for type: {type_} at lat: {lat}, lon: {lon}")
        # Call the database function we created in the Supabase SQL Editor
        cached_response = supabase.rpc(
            'find_nearby_searches',
            {
                'request_lat': lat,
                'request_lon': lon,
                'request_type': type_,
                'radius_meters': 500
            }
        ).execute()

        # If the function returned data, we have a cache hit!
        if cached_response.data:
            print("CACHE HIT! Returning data from Supabase.")
            # The 'results' column from the cached row contains the list of places
            cached_places = cached_response.data[0]['results']
            return jsonify({"raw_data": cached_places})

        print("CACHE MISS. Fetching fresh data from APIs...")

    except Exception as e:
        print(f"Error checking cache, proceeding to fetch fresh data. Error: {e}")
    # --- END NEW CACHE LOGIC ---


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
                args=(lat, lon, type_, enriched_places)
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