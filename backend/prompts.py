def get_restaurants_prompt(city: str, type_: str = "restaurants") -> str:
    """
    Generate a prompt for finding gluten-free establishments in a specific city,
    focusing on strict output formatting and knowledge retrieval.
    
    Args:
        city (str): The city name to search for establishments.
        type_ (str): Type of establishment to search for ('restaurants' or 'cafes').
        
    Returns:
        str: Formatted prompt string.
    """
    if type_ == "cafes":
        establishment_type_plural = "cafes or bakeries"
        establishment_type_singular = "cafe or bakery"
        forbidden_type = "restaurants"
        instruction_target = "cafes and bakeries" # Used for clarity in the 'allowed to search' line
    else:
        establishment_type_plural = "restaurants"
        establishment_type_singular = "restaurant"
        forbidden_type = "cafes or bakeries"
        instruction_target = "restaurants"

    return f"""
    You are an AI assistant that functions as a data retrieval and formatting tool.
    Your response MUST strictly adhere to the output instructions.
    Do NOT include any conversational phrases, explanations, apologies, or any text outside of the requested list or the specified keyword for no results.

    Your task is to retrieve information from your knowledge base. You are only allowed to list {instruction_target}, not {forbidden_type}.

    Query:
    1.  Primary Search: Based on your knowledge, list up to 20 {establishment_type_plural} in {city} that are **entirely gluten-free**.
    2.  Secondary Search: If your knowledge contains no {establishment_type_plural} in {city} that are entirely gluten-free, then list up to 20 {establishment_type_plural} in {city} that are known to offer **gluten-free menu options**.

    Output Format:
    -   Return **ONLY the names** of the {establishment_type_plural} along with type of Gluten free (entirely or menu options) like this 1. Establishment Name (Dedicated GF) or 1. Establishment Name (GF menu options).
    -   The names MUST be formatted as a **simple numbered list**.
    -   Each name must be on a new line, preceded by a number and a period (e.g., "1. Establishment Name").
    -   List up to 20 names. If fewer are known according to your knowledge, list all known ones.
    -   **CRITICAL: Do NOT include**:
        -   Any mention of "{forbidden_type}".
        -   Labels (e.g., "gluten-free," "GF options," "(serves gluten-free items)").
        -   Descriptions, addresses, or any other details.
        -   The city name within the list items.
        -   Any introductory, concluding, or explanatory sentences.
        -   If, after checking both primary and secondary search criteria against your knowledge, you have no relevant {establishment_type_singular} names to list for {city}, you MUST return only the single word: None
"""