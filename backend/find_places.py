import requests
import json
import os
import time 
from dotenv import load_dotenv

load_dotenv()

GOOGLE_PLACES_API_KEY = os.getenv('GOOGLE_PLACES_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# MODIFIED function signature
def find_gluten_free_restaurants_places_api(city_name, api_key, type_, country_filter=None):
    """
    Searches for gluten-free establishments in a given city and optional country using Google Places API.
    """
    if not api_key:
        print("Google Places API key is missing. Cannot perform search.")
        return [] 

    text_query_base = "" # Base for text query before city/country
    google_api_type_param = None 
    query_location_part = city_name
    
    # NEW: Incorporate country_filter into the query_location_part
    if country_filter and country_filter.strip():
        query_location_part = f"{city_name}, {country_filter.strip()}"
        print(f"ℹ️ Applying country filter: {country_filter.strip()}")

    if type_ == 'restaurants':
        text_query_base = "gluten-free restaurants in"
        google_api_type_param = 'restaurant'
    elif type_ == 'cafes':
        text_query_base = "gluten-free cafes in"
        google_api_type_param = 'cafe'
    elif type_ == 'bakery':
        text_query_base = "gluten-free bakeries in"
        google_api_type_param = 'bakery'
    else: 
        print(f"⚠️ Unexpected type_ value: '{type_}'. Falling back to general search.")
        text_query_base = "gluten-free establishments in"
    
    text_query = f"{text_query_base} {query_location_part}"
    
    print(f"\n🔍 Google Places Search for type: '{type_}' with text query: \"{text_query}\" and API type parameter: '{google_api_type_param}'...")

    all_places = []
    params = {'query': text_query, 'key': api_key}
    if google_api_type_param:
        params['type'] = google_api_type_param
    
    # NEW: Add region parameter if country_filter is a valid 2-letter code (optional enhancement)
    # For now, primary country filtering is via text_query.
    # if country_filter and len(country_filter.strip()) == 2: # Simple check for 2-letter code
    #     params['region'] = country_filter.strip().lower()
    #     print(f"ℹ️ Also using region parameter for API: {params['region']}")


    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    max_pages = 2 

    for page_num in range(max_pages):
        try:
            current_params = params.copy() 
            if page_num > 0 and 'pagetoken' in params:
                current_params = {'pagetoken': params['pagetoken'], 'key': api_key}
                print(f"\n🔍 Fetching page {page_num + 1} from Google Places using pagetoken...")
            elif page_num == 0:
                print(f"\n🔍 Making Google Places API request (Page 1) with params: {current_params}")
            else: 
                print("Error: Attempting to fetch next page without a pagetoken.")
                break

            response = requests.get(url, params=current_params)
            print(f"🔍 Google Places API Response Status Code: {response.status_code} for page {page_num + 1}")
            response.raise_for_status()
            places_data = response.json()

            if places_data.get("status") == "OK":
                page_results = []
                for place_result in places_data.get("results", []):
                    google_types_from_api = place_result.get('types', [])
                    if not isinstance(google_types_from_api, list): 
                        google_types_from_api = []
                    
                    if place_result.get('business_status') == 'OPERATIONAL' and place_result.get('place_id'):
                        page_results.append({
                            "name": place_result.get("name"),
                            "address": place_result.get("formatted_address"),
                            "rating": place_result.get("rating", "N/A"),
                            "user_ratings_total": place_result.get("user_ratings_total", 0),
                            'types': google_types_from_api, 
                            'place_id': place_result.get('place_id'), 
                            'business_status': place_result.get('business_status', ''),
                        })
                all_places.extend(page_results)
                print(f"✅ Page {page_num + 1}: Found {len(page_results)} operational establishments.")

                next_page_token = places_data.get('next_page_token')
                if next_page_token and page_num < max_pages - 1:
                    params['pagetoken'] = next_page_token 
                    params.pop('query', None) 
                    params.pop('type', None)
                    params.pop('region', None) # Also remove region if it was added for pagetoken use
                    print(f"ℹ️ next_page_token found. Waiting briefly before fetching next page...")
                    time.sleep(2)
                else:
                    if not next_page_token: print("ℹ️ No next_page_token found. Ending pagination.")
                    elif page_num >= max_pages -1: print(f"ℹ️ Reached max_pages ({max_pages}). Ending pagination.")
                    break 
            
            elif places_data.get("status") == "ZERO_RESULTS":
                print(f"✅ Places API (Text Search) returned ZERO_RESULTS for page {page_num + 1} with current query.")
                break 
            else:
                print(f"⚠️ Places API (Text Search) returned status: {places_data.get('status')} on page {page_num + 1}")
                if places_data.get("error_message"): print(f"   Error message: {places_data.get('error_message')}")
                break 
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Error calling Google Places API (Text Search) on page {page_num + 1}: {e}")
            break 
        except json.JSONDecodeError:
            print(f"❌ Error decoding JSON response from Places API (Text Search) on page {page_num + 1}.")
            break 
            
    count_before_deduplication = len(all_places)
    print(f"\nℹ️ Total items collected before deduplication: {count_before_deduplication}")

    unique_places_dict = {place['place_id']: place for place in all_places if place.get('place_id')}
    final_places_list = list(unique_places_dict.values())
    
    count_after_deduplication = len(final_places_list)
    print(f"✅ Total unique operational establishments found after deduplication by Place ID: {count_after_deduplication}")

    items_removed_count = count_before_deduplication - count_after_deduplication
    print(f"ℹ️ Number of duplicate items removed: {items_removed_count}")

    if not final_places_list:
        print("No operational establishments found by Google Places API after deduplication.")
    # else: # Keep console print minimal if saving to file
        # print("\n--- Unique Results from Google Places API (After Deduplication by Place ID) ---") 
        # for i, place in enumerate(final_places_list):
        #     print(f"  {i+1}. Name: {place.get('name')}, Place ID: {place.get('place_id')}, Address: {place.get('address')}, Types: {place.get('types')}") 
    
    # File saving logic
    file_output_path = "google_places_output.txt" # Renamed for clarity
    if final_places_list or count_before_deduplication > 0 : 
        with open(file_output_path, "w", encoding="utf-8") as f: 
            f.write(f"Search City: {city_name}\n")
            f.write(f"Search Country: {country_filter if country_filter else 'Not specified'}\n")
            f.write(f"Search Type: {type_}\n")
            f.write(f"Effective Text Query: {text_query}\n")
            f.write(f"Google API Type Parameter: {google_api_type_param if google_api_type_param else 'None'}\n\n")
            f.write(f"Total items collected before deduplication: {count_before_deduplication}\n")
            f.write(f"Total unique operational establishments found after deduplication: {count_after_deduplication}\n")
            f.write(f"Number of duplicate items removed: {items_removed_count}\n\n")
            if final_places_list:
                f.write("--- Unique Results from Google Places API (Deduplicated by Place ID) ---\n")
                for i, place in enumerate(final_places_list):
                    f.write(f"  {i+1}. Name: {place.get('name')}\n")
                    f.write(f"     Place ID: {place.get('place_id')}\n")
                    f.write(f"     Address: {place.get('address')}\n")
                    f.write(f"     Types: {place.get('types')}\n")
                    f.write(f"     Rating: {place.get('rating')}\n")
                    f.write(f"     User Ratings Total: {place.get('user_ratings_total')}\n")
                    f.write(f"     Business Status: {place.get('business_status')}\n\n")
            else:
                f.write("No operational establishments to list after deduplication.\n")
        print(f"✅ Google Places API results saved to {file_output_path}")
    else: 
        with open(file_output_path, "w", encoding="utf-8") as f:
            f.write(f"Search City: {city_name}\n")
            f.write(f"Search Country: {country_filter if country_filter else 'Not specified'}\n")
            f.write(f"Search Type: {type_}\n")
            f.write(f"Effective Text Query: {text_query}\n")
            f.write(f"Google API Type Parameter: {google_api_type_param if google_api_type_param else 'None'}\n\n")
            f.write("No operational establishments found by Google Places API.\n")
        print(f"✅ No results to save. {file_output_path} created with no results message.")
    
    return final_places_list

# --- get_gemini_description function remains as modified in the previous step ---
def get_gemini_description(establishments_list, city_name, api_key, type_):
    if not api_key:
        print("Gemini API key is missing. Cannot generate description.")
        return "Error: Gemini API key missing."

    if establishments_list:
        establishment_details_for_prompt = []
        for r_idx, r_val in enumerate(establishments_list):
            google_types_list = r_val.get('types', [])
            if not isinstance(google_types_list, list):
                google_types_list = []
            types_str = ", ".join(google_types_list)
            # Include address as it might give context for GF assessment
            detail = (f"Name: {r_val.get('name', 'N/A')}, "
                      f"Address: {r_val.get('address', 'N/A')}, " # Added Address
                      f"Google Types: [{types_str}]")
            establishment_details_for_prompt.append(detail)

        establishment_block_for_gemini = "\n".join([f"- {detail}" for detail in establishment_details_for_prompt])

        # --- Define GF Status Categories for Gemini ---
        gf_status_definitions = (
            "Gluten-Free (GF) Status Definitions:\n"
            "1. 'Dedicated GF': Classify as 'Dedicated GF' if the establishment's NAME contains the term 'gluten-free' or its direct regional language equivalents (e.g., 'glutenfrei', Glutenfreie, Sans gluten, Sin gluten, Senza glutine). Also use this if the name uses other strong indicators of being 100% gluten-free like 'celiac safe', 'entirely gluten-free', 'gluten-free kitchen', or their regional equivalents (e.g., 'glutenfrei Pur', 'Zöliakie sicher'), or if it's a brand you recognize from your training data as being exclusively gluten-free.\n"
            "2. 'Offers GF': Classify as 'Offers GF' if the establishment is a standard type (e.g., restaurant, pizzeria, cafe) that doesn't explicitly claim to be fully dedicated, but its name (which might include terms like 'gluten-free options' or regional equivalents like 'glutenfreie Optionen / Speisen') or its Google Types suggest it is likely to have specific gluten-free options or a separate menu. This is the most common category for general establishments catering to GF needs. The initial search already used a 'gluten-free' keyword, so lean towards this if not 'Dedicated GF' or clearly 'Unclear'.\n"
            "3. 'Unclear - Verify Directly': Classify as 'Unclear - Verify Directly' if the name and types provide insufficient information for a confident GF assessment, if it's a type of establishment where gluten is prevalent and cross-contamination is a high concern without explicit GF protocols (e.g., many standard bakeries not stating GF, some pizzerias), or if there's ambiguity. When in doubt, choose this status."
        )

        # --- Define Establishment Type Filtering Instructions ---
        establishment_type_filtering_instructions = ""
        if type_ == 'restaurants':
            establishment_type_filtering_instructions = (
                "For the 'restaurants' category:\n"
                "- Primary Match: Google Types includes 'restaurant'.\n"
                "- Acceptable: If 'restaurant' is present, other types like 'cafe', 'bar', 'food' are fine.\n"
                "- Caution: If types include 'bakery' but NOT 'restaurant', it's likely not a restaurant for this list.\n"
                "- Fallback: If 'restaurant' isn't in Google Types, but the Name strongly implies a full-service restaurant (e.g., 'XYZ Diner', 'Steakhouse', 'Italian Kitchen'), it can be included.\n"
                "- Regional Language: Names might use regional equivalents for 'restaurant' (e.g., 'Gasthaus', 'Wirtshaus', 'Pizzeria', 'Trattoria'). Consider these positive indicators.\n"
                "- Exclude: Solely bakeries or cafes not operating as full restaurants."
            )
        elif type_ == 'cafes':
            establishment_type_filtering_instructions = (
                "For the 'cafes' category:\n"
                "- Primary Match: Google Types includes 'cafe'.\n"
                "- Acceptable: If 'cafe' is present, other types like 'restaurant', 'bakery', 'food' are fine.\n"
                "- Also consider: If 'cafe' is absent, but types include 'bakery' AND the Name suggests a cafe setting (e.g., 'Artisan Bakery & Cafe'), include it.\n"
                "- Fallback: If 'cafe' isn't in Google Types, but the Name or other types (e.g., 'coffee_shop', 'tea_room') strongly indicate a primary cafe function, include it.\n"
                "- Regional Language: Names might use regional equivalents for 'cafe' (e.g., 'Kaffeehaus', 'Konditorei' with cafe service). Consider these positive indicators.\n"
                "- Exclude: Formal restaurants without a clear cafe component, standalone bakeries/stores with no cafe service."
            )
        elif type_ == 'bakery':
            establishment_type_filtering_instructions = (
                "For the 'bakery' category:\n"
                "- Primary Match: Google Types includes 'bakery'.\n"
                "- Acceptable: If 'bakery' is present, other types like 'cafe', 'store', 'food' are common and fine.\n"
                "- Regional Language: Names might use regional equivalents for 'bakery' (e.g., 'Bäckerei', 'Boulangerie', 'Panadería'). Consider these positive indicators.\n"
                "- Exclude: If 'bakery' is NOT in Google Types, exclude unless the name is exceptionally and explicitly a bakery (e.g., '100% Glutenfrei Bäckerei Mustermann'). Prioritize the 'bakery' type tag."
            )
        else:
            establishment_type_filtering_instructions = "Filter based on the general understanding of the requested establishment type."

        # --- Construct the Main Prompt ---
        prompt = (
            f"You are a meticulous gluten-free dining investigator for users in {city_name}.\n"
            f"The user has specifically requested establishments of type: '{type_}'.\n"
            f"The initial list of places was found using a 'gluten-free' keyword search.\n\n"
            f"Here is a list of potential establishments. Each item includes its 'Name', 'Address', and 'Google Types' array:\n"
            f"{establishment_block_for_gemini}\n\n"
            f"Your multi-step task for EACH establishment is:\n"
            f"1. Assess Gluten-Free (GF) Status: Based on its Name, Address, and Google Types, and using your knowledge, classify its likely GF status according to the definitions below.\n"
            f"{gf_status_definitions}\n\n"
            f"2. Match Establishment Type: After determining the GF status, check if the establishment matches the user's requested primary establishment type ('{type_}') using the category-specific rules below.\n"
            f"--- Rules for Matching Establishment Type: '{type_}' ---\n"
            f"{establishment_type_filtering_instructions}\n"
            f"--- End of Establishment Type Rules ---\n\n"
            f"Output Formatting:\n"
            f"Create a numbered list. For EACH establishment that you determine matches the requested establishment type ('{type_}'), provide its Name and your assessed GF Status in the format: '[Number]. [Establishment Name] - [[Assessed GF Status]]'.\n"
            f"For example:\n"
            f"1. Purely GF Eats - [Dedicated GF]\n"
            f"2. City Pizzeria - [Offers GF Menu]\n"
            f"3. The Corner Cafe - [Offers GF Menu]\n"
            f"4. Old Mill Bakery - [Unclear - Verify Directly]\n\n"
            f"IMPORTANT: SORT by GF Status. List all establishments with 'Dedicated GF' first, then 'Offers GF Menu', and finally 'Unclear - Verify Directly'.\n"
            f"IMPORTANT: Only include establishments that match the requested type ('{type_}'). List all such matches with their GF status, including those classified as 'Unclear - Verify Directly'.\n"
            f"If, after your detailed assessment, no establishments match the requested type OR if all potential matches have an 'Unclear - Verify Directly' status but you still listed them, that's fine. If there are truly no type matches at all, then return ONLY the message: 'No {type_} found matching your criteria in {city_name} after detailed review.'"
        )

    else: # No establishments_list provided
        prompt = (
            f"The user is looking for '{type_}' in {city_name}, but the initial search found no establishments.\n"
            f"Please return ONLY the message: 'No {type_} found matching your criteria in {city_name}.'"
        )

    print(f"\n🤖 Asking Gemini for type '{type_}' with NEW GF status assessment instructions...")
    # print(f"GEMINI PROMPT (first 1000 chars):\n{prompt[:1000]}\n--------------------") # For debugging

    gemini_api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2, # Slightly higher for nuanced assessment but still rule-bound
            "top_p": 0.95,
            "max_output_tokens": 3000 # Increased for potentially more verbose status and names
        }
    }
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(gemini_api_url, headers=headers, json=payload, timeout=120) # Increased timeout
        response.raise_for_status()
        gemini_data = response.json()

        if gemini_data.get("candidates") and \
           gemini_data["candidates"][0].get("content") and \
           gemini_data["candidates"][0]["content"].get("parts") and \
           gemini_data["candidates"][0]["content"]["parts"][0].get("text"):
            generated_text = gemini_data["candidates"][0]["content"]["parts"][0].get("text")
            print("✅ Gemini provided a response.")
            # print(f"Gemini Raw Text:\n{generated_text}") # For debugging
            return generated_text.strip()
        elif gemini_data.get("promptFeedback") and gemini_data["promptFeedback"].get("blockReason"):
            reason = gemini_data["promptFeedback"]["blockReason"]
            safety_ratings = gemini_data["promptFeedback"].get("safetyRatings", [])
            print(f"⚠️ Gemini API blocked the prompt. Reason: {reason}. SafetyRatings: {safety_ratings}")
            return f"Gemini API blocked the prompt (Reason: {reason}). Please refine your search or contact support if this persists."
        else:
            print(f"⚠️ Gemini API returned an unexpected response structure for {type_} in {city_name}.")
            # print(f"Full Gemini response for debugging: {json.dumps(gemini_data, indent=2)}")
            return f"Error: Gemini returned an unexpected response for {city_name} ({type_})."

    except requests.exceptions.Timeout:
        print(f"❌ Timeout error calling Gemini API for {type_} in {city_name}.")
        return f"Error: The request to Gemini API timed out for {city_name} ({type_}). Please try again."
    except requests.exceptions.RequestException as e:
        print(f"❌ Error calling Gemini API for {type_} in {city_name}: {e}")
        return f"Error: Could not connect to Gemini API for {city_name} ({type_})."
    except json.JSONDecodeError:
        print(f"❌ Error decoding JSON response from Gemini API for {type_} in {city_name}.")
        return f"Error: Could not decode Gemini's response for {city_name} ({type_})."


# --- Main Execution (for testing this file directly) ---
if __name__ == "__main__":
    if not GOOGLE_PLACES_API_KEY or not GEMINI_API_KEY:
        print("\nAPI keys missing. Please set them in .env or directly for testing.")
    else:
        target_city = input("Enter city: ").strip()
        target_country = input("Enter country (e.g., Germany, US - leave blank if not needed): ").strip()

        valid_types = ['restaurants', 'cafes', 'bakery']
        test_type_input_prompt = f"Enter type ({', '.join(valid_types)}, default: restaurants): "
        selected_test_type = input(test_type_input_prompt).lower().strip() or 'restaurants'

        if selected_test_type not in valid_types:
            print(f"Invalid type. Defaulting to 'restaurants'.")
            selected_test_type = 'restaurants'

        if target_city:
            print(f"\n--- Test: City='{target_city}', Country='{target_country if target_country else 'N/A'}', Type='{selected_test_type}' ---")

            places_from_google = find_gluten_free_restaurants_places_api(
                target_city,
                GOOGLE_PLACES_API_KEY,
                type_=selected_test_type,
                country_filter=target_country if target_country else None
            )

            if places_from_google is not None: # Check if list is not None
                print(f"\n--- Calling Gemini with {len(places_from_google)} places for GF Status Assessment ---")
                gemini_output = get_gemini_description(
                    places_from_google,
                    target_city,
                    GEMINI_API_KEY,
                    type_=selected_test_type
                )
                print("\n--- Gemini's Output (Name - [GF Status]) ---")
                print(gemini_output)

                # Add the advisory note here for testing purposes
                print("\n--- ADVISORY NOTE (App-Generated) ---")
                print("Reminder: Gluten-free status classifications are AI-assisted suggestions. Always call establishments directly to confirm their current gluten-free practices, menu, cross-contamination protocols, and to discuss your specific dietary needs, especially if you have celiac disease or severe sensitivities. Information can change.")

            else: # Should ideally not happen if find_gluten_free_restaurants_places_api always returns a list
                print("\nPlaces API function returned None or an issue occurred, skipping Gemini call.")
        else:
            print("No city entered.")
    print("\n--- Script Test Finished ---")