from flask import Flask, render_template, jsonify, request
import google.generativeai as genai
from flask_cors import CORS
import os
import dotenv
import json 
import traceback 
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

# MODIFIED: Renamed the import for clarity
from find_places import find_gluten_free_restaurants_places_api as find_places, get_gemini_description

# --- CONFIGURATION ---
dotenv.load_dotenv()
app = Flask(__name__)
CORS(app)

# Supabase Configuration
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
if not url or not key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in your .env file")
supabase: Client = create_client(url, key)

# API Key validation
GEMINI_API_KEY_FROM_ENV = os.getenv('GEMINI_API_KEY')
GOOGLE_PLACES_API_KEY_FROM_ENV = os.getenv('GOOGLE_PLACES_API_KEY')
if not GEMINI_API_KEY_FROM_ENV or not GOOGLE_PLACES_API_KEY_FROM_ENV:
    raise ValueError("Both GEMINI_API_KEY and GOOGLE_PLACES_API_KEY must be set.")
# --- END CONFIGURATION ---


# --- STATIC PAGE ROUTES (for reference, can be removed if frontend handles all routing) ---
@app.route('/')
def home():
    return "Backend is running."

# --- API ROUTES ---

@app.route('/get-restaurants', methods=['GET'])
def get_establishments_route():
    # Get all possible parameters from the request URL
    city = request.args.get('city')
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    type_ = request.args.get('type', 'restaurants')
    country = request.args.get('country', None)
    
    # --- BRANCH LOGIC: Decide which type of search to perform ---

    # --- Case 1: Search by City (with Caching) ---
    if city:
        city_normalized = city.lower()
        print(f"🔍 Initiating search for city: '{city}' (Normalized: '{city_normalized}')")
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        # Check cache first
        try:
            response = supabase.table('search_cache').select('result_data').eq('city', city_normalized).eq('type', type_).gte('created_at', seven_days_ago.isoformat()).execute()
            if response.data:
                print(f"✅ Found fresh cache for {type_} in {city}. Serving from Supabase.")
                cached_data_string = response.data[0]['result_data']
                return jsonify(json.loads(cached_data_string))
        except Exception as e:
            print(f"⚠️ Error checking Supabase cache: {e}. Proceeding with live API call.")

        print(f"❌ No fresh cache for {type_} in {city}. Fetching from APIs.")
        
        try:
            # Call API using city name
            places_list = find_places(
                api_key=GOOGLE_PLACES_API_KEY_FROM_ENV,
                type_=type_,
                city_name=city, 
                country_filter=country
            )
            
            description = get_gemini_description(
                places_list, 
                api_key=GEMINI_API_KEY_FROM_ENV,
                type_=type_,
                city_name=city
            )
            
            final_response_data = {"result": description, "raw_data": places_list}

            # Save the new result to the cache
            supabase.table('search_cache').insert({
                'city': city_normalized,
                'type': type_,
                'result_data': json.dumps(final_response_data) 
            }).execute()
            print(f"✅ Saved new data for {type_} in {city} to Supabase cache.")
                
            return jsonify(final_response_data)
        except Exception as e:
            print(f"Critical error during city search for '{city}': {e}")
            traceback.print_exc()
            return jsonify({"error": f"An error occurred while searching for {city}."}), 500

    # --- Case 2: Search by Location (No Caching) ---
    elif lat is not None and lon is not None:
        print(f"🛰️ Performing live location search for lat:{lat}, lon:{lon}.")
        try:
            # Call API using latitude and longitude
            places_list = find_places(
                api_key=GOOGLE_PLACES_API_KEY_FROM_ENV,
                type_=type_,
                lat=lat,
                lon=lon
            )

            description = get_gemini_description(
                places_list,
                api_key=GEMINI_API_KEY_FROM_ENV,
                type_=type_
            )
            
            return jsonify({"result": description, "raw_data": places_list})
        except Exception as e:
            print(f"Critical error during location search at lat:{lat}, lon:{lon}: {e}")
            traceback.print_exc()
            return jsonify({"error": "An error occurred during location search."}), 500
            
    # --- Case 3: Invalid Parameters ---
    else:
        return jsonify({"error": "Request must include either 'city' or both 'lat' and 'lon'"}), 400


# Your other API routes like /check-product can remain here
@app.route('/check-product', methods=['POST'])
def check_product():
    # This is a placeholder for your existing /check-product logic
    # Make sure to copy your full implementation here
    return jsonify({"message": "check-product endpoint is active"})

@app.route('/get-news')
def get_news_api(): 
    # This is a placeholder for your existing /get-news logic
    # Make sure to copy your full implementation here
    return jsonify({"message": "get-news endpoint is active"})


# --- APP RUN ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5007))
    # Use debug=False for production environments
    app.run(host='0.0.0.0', port=port, debug=True)
