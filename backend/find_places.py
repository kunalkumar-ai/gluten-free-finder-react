import requests
import json
import os
import time 
import math
from dotenv import load_dotenv
import re

load_dotenv()

# --- Helper Functions ---

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371 
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# --- Google Places API Function ---

def find_gluten_free_restaurants_places_api(api_key, type_, city_name=None, country_filter=None, lat=None, lon=None):
    if not api_key:
        print("Google Places API key is missing.")
        return []

    all_places = []
    params = {'key': api_key}
    
    # Logic to choose between Text Search and Nearby Search
    if lat is not None and lon is not None:
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params.update({'location': f"{lat},{lon}", 'radius': 5000, 'keyword': f"gluten-free {type_}", 'type': type_})
    elif city_name:
        query_location_part = f"{city_name}, {country_filter.strip()}" if country_filter and country_filter.strip() else city_name
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params.update({'query': f"gluten-free {type_} in {query_location_part}"})
    else:
        return []

    max_pages = 2
    for _ in range(max_pages):
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "OK":
                for result in data.get("results", []):
                    if result.get('business_status') == 'OPERATIONAL':
                        place_details = {
                            "name": result.get("name"), "address": result.get("vicinity") or result.get("formatted_address"),
                            "rating": result.get("rating", "N/A"), "user_ratings_total": result.get("user_ratings_total", 0),
                            'types': result.get('types', []), 'place_id': result.get('place_id'),
                            'geometry': result.get('geometry'), 'distance': None
                        }
                        if lat is not None and lon is not None:
                            place_lat = result['geometry']['location']['lat']
                            place_lon = result['geometry']['location']['lng']
                            place_details['distance'] = calculate_distance(lat, lon, place_lat, place_lon)
                        all_places.append(place_details)
            
            next_page_token = data.get('next_page_token')
            if next_page_token:
                params = {'pagetoken': next_page_token, 'key': api_key}
                time.sleep(2)
            else:
                break
        except requests.exceptions.RequestException as e:
            print(f"Error calling Google Places API: {e}")
            break

    unique_places = {place['place_id']: place for place in all_places}.values()
    return list(unique_places)


# --- NEW: Gemini Categorization Function ---

def categorize_places_with_gemini(api_key, places_list, type_, city_name=None):
    if not api_key or not places_list:
        return {}

    location_context = f"in {city_name}" if city_name else "near the user's location"
    
    # Create a simplified list for the prompt
    prompt_list = [
        {"place_id": p["place_id"], "name": p["name"], "types": p.get("types", [])}
        for p in places_list
    ]

    prompt = f"""
    You are a meticulous gluten-free dining investigator. Your task is to analyze the following list of establishments found for a user searching for '{type_}' {location_context}.
    For EACH establishment, you must assess and categorize its Gluten-Free (GF) status.

    Here is the list of establishments in JSON format:
    {json.dumps(prompt_list, indent=2)}

    **Analysis Criteria:**
    1.  **"Dedicated GF"**: Assign this status ONLY if the establishment's name explicitly contains "gluten-free", "glutenfrei", "sans gluten", "celiac", or other direct equivalents. This is the highest level of safety.
    2.  **"Offers GF"**: Assign this status to standard restaurants, cafes, etc. The initial search used a 'gluten-free' keyword, so they likely have options, but are not fully dedicated. This is the default for most places.
    3.  **"Status Unclear"**: Assign this ONLY if the name and type are highly ambiguous and don't strongly suggest it's a place that serves food (e.g., a "Hotel" with no 'restaurant' or 'bar' type).

    **Your Response MUST be a valid JSON object.**
    The JSON object should have a single key "categorization".
    The value of "categorization" should be an array of objects.
    Each object in the array must have two keys: "place_id" (string) and "gf_status" (string, one of "Dedicated GF", "Offers GF", or "Status Unclear").

    Example of required JSON output format:
    {{
      "categorization": [
        {{
          "place_id": "ChIJ...",
          "gf_status": "Dedicated GF"
        }},
        {{
          "place_id": "ChIJ...",
          "gf_status": "Offers GF"
        }}
      ]
    }}
    """
    
    gemini_api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(gemini_api_url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        raw_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        
        # Clean the response to extract only the JSON part
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', raw_text)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_str = raw_text

        data = json.loads(json_str)
        
        # Convert the list of objects into a more efficient dictionary for lookup
        categorization_dict = {
            item["place_id"]: item["gf_status"] 
            for item in data.get("categorization", [])
        }
        return categorization_dict

    except Exception as e:
        print(f"Error processing Gemini response: {e}")
        return {}
