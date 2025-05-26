from flask import Flask, render_template, jsonify, request
import google.generativeai as genai # Assuming this is how you use the SDK
from flask_cors import CORS
import os
import dotenv
import json 
import traceback 

from find_places import find_gluten_free_restaurants_places_api, get_gemini_description

dotenv.load_dotenv()

app = Flask(__name__)
CORS(app)


GEMINI_API_KEY_FROM_ENV = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY_FROM_ENV:
    raise ValueError("GEMINI_API_KEY not found in environment variables.")

# Configure Gemini API (using the SDK method if that's your primary way)
# If find_places.py makes direct REST calls, this configuration here is for other app parts
# genai.configure(api_key=GEMINI_API_KEY_FROM_ENV)
# gemini_model = genai.GenerativeModel(model_name='gemini-1.0-pro-flash') # Or gemini-1.5-flash if SDK supports

GOOGLE_PLACES_API_KEY_FROM_ENV = os.getenv('GOOGLE_PLACES_API_KEY')
if not GOOGLE_PLACES_API_KEY_FROM_ENV:
    raise ValueError("GOOGLE_PLACES_API_KEY not found in environment variables.")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/news')
def news():
    example_news_articles = [
        {"title": "Example News 1", "content": "Content for news 1...", "date": "2025-05-21"},
        {"title": "Example News 2", "content": "Content for news 2...", "date": "2025-05-20"}
    ]
    return render_template('news.html', articles=example_news_articles)

@app.route('/apps')
def apps():
    return render_template('apps.html')

@app.route('/scanner')
def scanner():
    return render_template('scanner.html') 

@app.route('/check-product', methods=['POST'])
def check_product():
    data = request.get_json()
    if not data or 'barcode' not in data:
        return jsonify({"error": "Barcode not provided"}), 400
    barcode = data.get('barcode')
    
    try:
        # This part uses the Gemini SDK, ensure genai and gemini_model are configured above
        # For consistency, you might want all Gemini calls (SDK or REST) to use the same model.
        # This uses an SDK model instance which might be different from find_places.py's REST call.
        if 'gemini_model' not in globals(): # Basic check if model is initialized
             genai.configure(api_key=GEMINI_API_KEY_FROM_ENV)
             # Choose a model consistent with what you expect, e.g., 'gemini-1.5-flash-latest' via SDK
             # Check SDK documentation for available model names.
             # Using 'gemini-pro' as a placeholder if specific flash model isn't via this SDK path.
             current_gemini_model = genai.GenerativeModel(model_name='gemini-pro')
        else:
            current_gemini_model = gemini_model


        current_generation_config = genai.types.GenerationConfig(temperature=0.2) 
        prompt = f"""Given this product barcode: {barcode}
        1. Is this product gluten-free? Yes/No/Cannot Determine
        2. What is the product name? (If known)
        3. What is the brand? (If known)
        4. Provide a brief suggestion for gluten-free alternatives if not gluten-free or if status is 'Cannot Determine'.
        
        Respond ONLY in JSON format like this:
        {{
            "isGlutenFree": "Yes" | "No" | "Cannot Determine",
            "productName": "string or null",
            "brand": "string or null",
            "suggestion": "string or null"
        }}
        If you cannot find information for the barcode, respond with "Cannot Determine" for isGlutenFree and null for other fields.
        """
        
        response = current_gemini_model.generate_content(prompt, generation_config=current_generation_config)
        result_text = response.text
        
        try:
            if result_text.strip().startswith("```json"):
                result_text = result_text.strip()[7:-3].strip()
            elif result_text.strip().startswith("```"):
                 result_text = result_text.strip()[3:-3].strip()

            result_dict = json.loads(result_text)
            return jsonify(result_dict)
        except json.JSONDecodeError as e:
            print(f"JSONDecodeError from Gemini response in /check-product: {e}")
            print(f"Problematic Gemini response text: {result_text}")
            return jsonify({
                "isGlutenFree": "Cannot Determine",
                "productName": None,
                "brand": None,
                "suggestion": "Could not reliably determine product status from barcode. Please check ingredients manually."
            }), 200 
    except Exception as e:
        print(f"Error in /check-product: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/get-news')
def get_news_api(): 
    try:
        example_news_articles = [
            {"id": 1, "title": "Understanding Gluten Sensitivity", "summary": "Learn the difference...", "date": "2025-05-20"},
            {"id": 2, "title": "New GF Products on the Market", "summary": "Discover exciting new options...", "date": "2025-05-18"}
        ]
        return jsonify({"articles": example_news_articles})
    except Exception as e:
        print(f"Error in /get-news: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/get-restaurants')
def get_establishments_route():
    try:
        city = request.args.get('city')
        type_ = request.args.get('type', 'restaurants') # Default to restaurants
        # NEW: Get country parameter, default to None if not provided
        country = request.args.get('country', None) 
        
        if not city:
            return jsonify({"error": "Please provide a city name"}), 400
            
        print(f"Received request for city: {city}, type: {type_}, country: {country}")

        places_list = find_gluten_free_restaurants_places_api(
            city, 
            GOOGLE_PLACES_API_KEY_FROM_ENV,
            type_=type_,
            country_filter=country # MODIFIED: Pass country to the function
        )
        
        if not places_list: 
            # If Google Places API found nothing, Gemini will be called with an empty list
            # and should return a "No type_ found..." message based on its prompt.
            print(f"No establishments found for {type_} in {city} (country: {country}) by Google Places API.")
            # Call Gemini with empty list to get the standard "no results" message
            description = get_gemini_description(
                [], 
                city, 
                GEMINI_API_KEY_FROM_ENV, # Use the globally loaded key for find_places.py
                type_=type_
                # country_context=country # Optionally pass country to Gemini for context if its prompt uses it
            )
            return jsonify({"result": description, "raw_data": []})

        print(f"ℹ️ Found {len(places_list)} unique places from Places API. Sending all to Gemini.")
        
        description = get_gemini_description(
            places_list, 
            city, 
            GEMINI_API_KEY_FROM_ENV, # Use the globally loaded key for find_places.py
            type_=type_
            # country_context=country # Optionally pass country to Gemini for context if its prompt uses it
        )
        
        # This fallback logic might need adjustment based on how Gemini's "no results" vs. error messages are structured
        if not description or description.strip() == "" or description.startswith("Error:") or "Gemini API blocked" in description:
            print(f"\n❌ Gemini returned an empty or error description for city: {city}, type: {type_}. Description: '{description}'")
            fallback_message = f"Could not retrieve a detailed summary for {type_} in {city}."
            if description and ("No " in description and " found matching" in description): # Check if it's a Gemini "no results"
                 fallback_message = description # Use Gemini's "no results" message
            return jsonify({"result": fallback_message, "raw_data": places_list if places_list else []})
            
        return jsonify({
            "result": description,
            "raw_data": places_list 
        })
    except Exception as e:
        print(f"Critical error in /get-establishments route: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred. Please try again later."}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5007))
    flask_debug_env = os.environ.get('FLASK_DEBUG', 'False') 
    debug_mode = flask_debug_env.lower() not in ['false', '0', 'no']
    
    print(f"Starting Flask app on http://0.0.0.0:{port}/ with debug mode: {debug_mode}")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)