from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import dotenv
import json 
import traceback 

from find_places import find_gluten_free_restaurants_places_api as find_places, categorize_places_with_gemini

# --- CONFIGURATION ---
dotenv.load_dotenv()
app = Flask(__name__)
CORS(app)

# API Key validation
GEMINI_API_KEY_FROM_ENV = os.getenv('GEMINI_API_KEY')
GOOGLE_PLACES_API_KEY_FROM_ENV = os.getenv('GOOGLE_PLACES_API_KEY')
if not GEMINI_API_KEY_FROM_ENV or not GOOGLE_PLACES_API_KEY_FROM_ENV:
    raise ValueError("Both GEMINI_API_KEY and GOOGLE_PLACES_API_KEY must be set.")
# --- END CONFIGURATION ---


# --- MAIN API ROUTE ---
@app.route('/get-restaurants', methods=['GET'])
def get_establishments_route():
    # Get parameters from the request URL
    city = request.args.get('city')
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    type_ = request.args.get('type', 'restaurants')
    country = request.args.get('country', None)
    
    try:
        # Step 1: Get the full list of places from Google
        places_list = find_places(
            api_key=GOOGLE_PLACES_API_KEY_FROM_ENV,
            type_=type_,
            city_name=city,
            country_filter=country,
            lat=lat,
            lon=lon
        )

        if not places_list:
            return jsonify({"error": f"No {type_} found matching your criteria."}), 404

        # Step 2: Get the categorization for the list from Gemini
        categorization = categorize_places_with_gemini(
            api_key=GEMINI_API_KEY_FROM_ENV,
            places_list=places_list,
            type_=type_,
            city_name=city
        )

        # Step 3: Combine data, add gf_status, and filter
        enriched_places = []
        for place in places_list:
            place_id = place.get('place_id')
            # Get the status from Gemini's response, default to 'Offers GF' if not found
            status = categorization.get(place_id, 'Offers GF') 
            
            # Filter out "Status Unclear"
            if status != 'Status Unclear':
                place['gf_status'] = status
                enriched_places.append(place)
        
        # Step 4: Sort the final list to show "Dedicated GF" first
        # We give "Dedicated GF" a lower sort order (0) so it comes first.
        enriched_places.sort(key=lambda p: (0 if p.get('gf_status') == 'Dedicated GF' else 1))

        # Sort by distance if it's a location search
        if lat is not None and lon is not None:
             enriched_places.sort(key=lambda p: (0 if p.get('gf_status') == 'Dedicated GF' else 1, p.get('distance', 999)))


        # NOTE: Caching and other routes would be here. For now, focusing on the core logic.
        return jsonify({"raw_data": enriched_places})

    except Exception as e:
        print(f"Critical error in /get-establishments route: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred."}), 500


# --- APP RUN ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5007))
    app.run(host='0.0.0.0', port=port, debug=True)
