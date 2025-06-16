from flask import Flask, render_template, jsonify, request
import google.generativeai as genai
from flask_cors import CORS
import os
import dotenv
import json 
import traceback 
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

from find_places import find_gluten_free_restaurants_places_api, get_gemini_description

# --- CONFIGURATION ---
dotenv.load_dotenv()
app = Flask(__name__)
CORS(app)

# Supabase Configuration
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# API Key validation
GEMINI_API_KEY_FROM_ENV = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY_FROM_ENV:
    raise ValueError("GEMINI_API_KEY not found in environment variables.")

GOOGLE_PLACES_API_KEY_FROM_ENV = os.getenv('GOOGLE_PLACES_API_KEY')
if not GOOGLE_PLACES_API_KEY_FROM_ENV:
    raise ValueError("GOOGLE_PLACES_API_KEY not found in environment variables.")
# --- END CONFIGURATION ---


# --- STATIC PAGE ROUTES ---
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
# --- END STATIC PAGE ROUTES ---


# --- API ROUTES ---
@app.route('/check-product', methods=['POST'])
def check_product():
    data = request.get_json()
    if not data or 'barcode' not in data:
        return jsonify({"error": "Barcode not provided"}), 400
    barcode = data.get('barcode')
    
    try:
        genai.configure(api_key=GEMINI_API_KEY_FROM_ENV)
        current_gemini_model = genai.GenerativeModel(model_name='gemini-pro')
        
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
    city = request.args.get('city')
    type_ = request.args.get('type', 'restaurants')
    country = request.args.get('country', None) 
    
    if not city:
        return jsonify({"error": "Please provide a city name"}), 400
    
    city_normalized = city.lower()


    # --- SUPABASE CACHING LOGIC STARTS HERE ---
    
    # 1. Check if we have a recent, cached result.
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Query Supabase instead of SQLite
    response = supabase.table('search_cache').select('result_data').eq('city', city_normalized).eq('type', type_).gte('created_at', seven_days_ago.isoformat()).execute()
    
    if response.data:
        print(f"✅ Found fresh cache for {type_} in {city}. Serving from Supabase.")
        # FIX: The data from the 'text' column is a JSON string. We must parse it back into a dictionary.
        cached_data_string = response.data[0]['result_data']
        return jsonify(json.loads(cached_data_string))
        
    # --- SUPABASE CACHING LOGIC ENDS HERE ---

    print(f"❌ No fresh cache found for {type_} in {city}. Fetching from APIs.")
    
    try:
        places_list = find_gluten_free_restaurants_places_api(
            city, 
            GOOGLE_PLACES_API_KEY_FROM_ENV,
            type_=type_,
            country_filter=country
        )
        
        description = get_gemini_description(
            places_list, 
            city, 
            GEMINI_API_KEY_FROM_ENV,
            type_=type_
        )
        
        final_response_data = {
            "result": description,
            "raw_data": places_list 
        }

        # --- SAVE TO SUPABASE CACHE ---
        # When saving, the supabase client converts the dictionary to a JSON string for the 'text' column.
        supabase.table('search_cache').insert({
            'city': city_normalized,
            'type': type_,
            'result_data': json.dumps(final_response_data) 
        }).execute()
        print(f"✅ Saved new data for {type_} in {city} to Supabase cache.")
        # --- END SAVE TO CACHE ---
            
        return jsonify(final_response_data)
        
    except Exception as e:
        print(f"Critical error in /get-establishments route: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred. Please try again later."}), 500
# --- END API ROUTES ---


# --- APP RUN ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5007))
    flask_debug_env = os.environ.get('FLASK_DEBUG', 'False') 
    debug_mode = flask_debug_env.lower() not in ['false', '0', 'no']
    
    print(f"Starting Flask app on http://0.0.0.0:{port}/ with debug mode: {debug_mode}")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
