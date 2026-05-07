# app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import dotenv
import traceback
import requests
from find_places import find_gluten_free_restaurants_places_api as find_places, categorize_places_with_gemini
from datetime import datetime

# --- CONFIGURATION ---
dotenv.load_dotenv()
app = Flask(__name__)
CORS(app)

GEMINI_API_KEY_FROM_ENV = os.getenv('GEMINI_API_KEY')
GOOGLE_PLACES_API_KEY_FROM_ENV = os.getenv('GOOGLE_PLACES_API_KEY')

# Airtable configuration (optional — only needed for waitlist endpoint)
AIRTABLE_API_KEY = os.getenv('AIRTABLE_API_KEY')
AIRTABLE_BASE_ID = os.getenv('AIRTABLE_BASE_ID')
AIRTABLE_TABLE_NAME = os.getenv('AIRTABLE_TABLE_NAME')

if not all([GEMINI_API_KEY_FROM_ENV, GOOGLE_PLACES_API_KEY_FROM_ENV]):
    raise ValueError("GEMINI_API_KEY and GOOGLE_PLACES_API_KEY must be set in the .env file.")
# --- END CONFIGURATION ---


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
        response.raise_for_status()
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


@app.route('/submit-feedback', methods=['POST'])
def submit_feedback_route():
    data = request.get_json()
    content = data.get('content')

    if not content:
        return jsonify({"error": "Feedback content is required."}), 400

    print(f"Feedback received: {content}")
    return jsonify({"message": "Feedback submitted successfully."}), 201


@app.route('/waitlist-count', methods=['GET'])
def waitlist_count_route():
    if not all([AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME]):
        return jsonify({"count": 0}), 200

    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_NAME}"
    headers = {"Authorization": f"Bearer {AIRTABLE_API_KEY}"}
    count = 0
    params = {"fields[]": "Email", "pageSize": 100}

    try:
        while True:
            r = requests.get(url, headers=headers, params=params, timeout=10)
            r.raise_for_status()
            data = r.json()
            count += len(data.get("records", []))
            offset = data.get("offset")
            if not offset:
                break
            params = {"fields[]": "Email", "pageSize": 100, "offset": offset}
        return jsonify({"count": count + 17}), 200
    except Exception as e:
        print(f"Error fetching waitlist count: {e}")
        return jsonify({"count": 0}), 200


@app.route('/join-waitlist', methods=['POST'])
def join_waitlist_route():
    if not all([AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME]):
        return jsonify({"error": "Waitlist is not configured on the server."}), 503

    data = request.get_json()
    email = (data.get('email') or '').strip()
    name = (data.get('name') or '').strip()
    plan = (data.get('plan') or 'Free').strip()

    if not email or not name:
        return jsonify({"error": "Email and name are required."}), 400

    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_NAME}"
    headers = {
        "Authorization": f"Bearer {AIRTABLE_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "fields": {
            "Email": email,
            "Name": name,
            "Plan": plan,
            "Timestamp": datetime.utcnow().isoformat() + "Z",
        }
    }

    try:
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        r.raise_for_status()
        return jsonify({"message": "Successfully joined the waitlist."}), 201
    except requests.exceptions.HTTPError as e:
        print(f"Airtable API error: {e.response.status_code} {e.response.text}")
        return jsonify({"error": "Failed to save to waitlist."}), 502
    except requests.exceptions.RequestException as e:
        print(f"Network error calling Airtable: {e}")
        return jsonify({"error": "Could not reach waitlist service."}), 503
    except Exception as e:
        print(f"An unexpected error occurred in join_waitlist_route: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred."}), 500


# --- MAIN API ROUTE ---
@app.route('/get-restaurants', methods=['GET'])
def get_establishments_route():
    city = request.args.get('city')
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    type_ = request.args.get('type', 'restaurants')
    country = request.args.get('country', None)

    if lat is None or lon is None:
        return jsonify({"error": "Latitude and longitude are required."}), 400

    try:
        places_list = find_places(api_key=GOOGLE_PLACES_API_KEY_FROM_ENV, type_=type_, city_name=city, country_filter=country, lat=lat, lon=lon)

        if not places_list:
            return jsonify({"error": f"No {type_} found matching your criteria."}), 404

        categorization = categorize_places_with_gemini(api_key=GEMINI_API_KEY_FROM_ENV, places_list=places_list, type_=type_, city_name=city)

        enriched_places = []
        for place in places_list:
            place_id = place.get('place_id')
            status = categorization.get(place_id, 'Offers GF')
            if status != 'Status Unclear':
                place['gf_status'] = status
                enriched_places.append(place)

        enriched_places.sort(key=lambda p: (0 if p.get('gf_status') == 'Dedicated GF' else 1, p.get('distance', 999)))

        return jsonify({"raw_data": enriched_places})

    except Exception as e:
        print(f"Critical error in /get-restaurants route: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred."}), 500


# --- APP RUN ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5007))
    app.run(host='0.0.0.0', port=port, debug=True)
