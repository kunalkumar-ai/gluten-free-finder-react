import requests
import json
import os
import time 
import math
from dotenv import load_dotenv

load_dotenv()

GOOGLE_PLACES_API_KEY = os.getenv('GOOGLE_PLACES_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two points on Earth using the Haversine formula.
    Returns distance in kilometers.
    """
    R = 6371  # Radius of Earth in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) * math.sin(dLat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) * math.sin(dLon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def find_gluten_free_restaurants_places_api(api_key, type_, city_name=None, country_filter=None, lat=None, lon=None):
    """
    Searches for gluten-free establishments using Google Places API.
    Can search by city name (Text Search) or by latitude/longitude (Nearby Search).
    """
    if not api_key:
        print("Google Places API key is missing. Cannot perform search.")
        return []

    all_places = []
    params = {'key': api_key}
    
    if lat is not None and lon is not None:
        print(f"\n🔍 Performing Nearby Search for type: '{type_}' at lat:{lat}, lon:{lon}")
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params.update({
            'location': f"{lat},{lon}",
            'radius': 5000,
            'keyword': f"gluten-free {type_}",
            'type': type_
        })
    elif city_name:
        query_location_part = f"{city_name}, {country_filter.strip()}" if country_filter and country_filter.strip() else city_name
        text_query = f"gluten-free {type_} in {query_location_part}"
        print(f"\n🔍 Performing Text Search for type: '{type_}' with query: \"{text_query}\"")
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params.update({'query': text_query})
    else:
        print("❌ Search requires either city_name or lat/lon.")
        return []

    max_pages = 2
    for page_num in range(max_pages):
        try:
            current_params = params.copy()
            if page_num > 0 and 'pagetoken' in params:
                current_params = {'pagetoken': params['pagetoken'], 'key': api_key}
                time.sleep(2)
            elif page_num > 0:
                break

            response = requests.get(url, params=current_params)
            response.raise_for_status()
            places_data = response.json()

            if places_data.get("status") == "OK":
                for place_result in places_data.get("results", []):
                    if place_result.get('business_status') == 'OPERATIONAL':
                        place_lat = place_result['geometry']['location']['lat']
                        place_lon = place_result['geometry']['location']['lng']
                        
                        place_details = {
                            "name": place_result.get("name"),
                            "address": place_result.get("vicinity") or place_result.get("formatted_address"),
                            "rating": place_result.get("rating", "N/A"),
                            "user_ratings_total": place_result.get("user_ratings_total", 0),
                            'types': place_result.get('types', []),
                            'place_id': place_result.get('place_id'),
                            # FIX: Add the full geometry object so the frontend can find the coordinates
                            'geometry': place_result.get('geometry'),
                            'distance': None
                        }

                        if lat is not None and lon is not None:
                            place_details['distance'] = calculate_distance(lat, lon, place_lat, place_lon)
                        
                        all_places.append(place_details)

                next_page_token = places_data.get('next_page_token')
                if next_page_token:
                    params = {'pagetoken': next_page_token}
                else:
                    break
            else:
                print(f"⚠️ Places API returned status: {places_data.get('status')}")
                break
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Error calling Google Places API: {e}")
            break

    unique_places_dict = {place['place_id']: place for place in all_places if place.get('place_id')}
    final_places_list = list(unique_places_dict.values())
    
    if lat is not None and lon is not None:
        final_places_list.sort(key=lambda x: x['distance'])
        print(f"✅ Found {len(final_places_list)} unique places. Sorted by distance.")
    else:
        print(f"✅ Found {len(final_places_list)} unique places.")

    return final_places_list[:20]


# In find_places.py, replace the current get_gemini_description function with this one.

def get_gemini_description(establishments_list, api_key, type_, city_name=None):
    if not api_key:
        return "Error: Gemini API key missing."

    location_context = f"in {city_name}" if city_name else "near the user's current location"

    if not establishments_list:
        return f"No {type_} found matching your criteria {location_context}."

    establishment_details_for_prompt = []
    for r in establishments_list:
        # Include distance and types to give Gemini more context for its analysis
        distance_str = f", Distance: {r['distance']:.2f} km" if r.get('distance') is not None else ""
        types_str = ", ".join(r.get('types', []))
        detail = (f"Name: {r.get('name', 'N/A')}, "
                  f"Address: {r.get('address', 'N/A')}, "
                  f"Google Types: [{types_str}]{distance_str}")
        establishment_details_for_prompt.append(f"- {detail}")

    establishment_block_for_gemini = "\n".join(establishment_details_for_prompt)

    # This is the detailed, multi-step prompt for intelligent analysis
    gf_status_definitions = (
        "Gluten-Free (GF) Status Definitions:\n"
        "1. 'Dedicated GF': Classify if the name contains 'gluten-free' or regional equivalents (e.g., 'glutenfrei', 'sans gluten').\n"
        "2. 'Offers GF': Classify if it's a standard restaurant. The initial search used a 'gluten-free' keyword, so this is the likely category.\n"
        "3. 'Status Unclear': Classify if the name/type is ambiguous (e.g., a standard bakery not stating GF)."
    )

    prompt = (
        f"You are a meticulous gluten-free dining investigator for a user looking for '{type_}' {location_context}.\n"
        f"Here is a list of potential establishments:\n"
        f"{establishment_block_for_gemini}\n\n"
        f"Your task: For EACH establishment, assess its likely Gluten-Free (GF) status using its Name and Google Types.\n"
        f"{gf_status_definitions}\n\n"
        f"Output Formatting:\n"
        f"Create a numbered list. For EACH establishment, provide its Name and your assessed GF Status in the format: '[Number]. [Establishment Name] - [[Assessed GF Status]]'.\n"
        f"For example:\n"
        f"1. Purely GF Eats - [Dedicated GF]\n"
        f"2. City Pizzeria - [Offers GF]\n"
        f"3. Old Mill Bakery - [Status Unclear]\n\n"
        f"IMPORTANT: SORT by GF Status. List 'Dedicated GF' first, then 'Offers GF', and finally 'Status Unclear'.\n"
        f"If no establishments are found, return ONLY the message: 'No {type_} found matching your criteria {location_context}.'"
    )

    gemini_api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(gemini_api_url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        gemini_data = response.json()
        generated_text = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
        return generated_text.strip()
    except Exception as e:
        print(f"❌ Error calling Gemini API: {e}")
        return f"Error: Could not get a summary from the Gemini API."

if __name__ == "__main__":
    pass
