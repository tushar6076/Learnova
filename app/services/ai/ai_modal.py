import json
import logging
from google.api_core import exceptions
from .utils import get_ai_client

logger = logging.getLogger(__name__)

def get_ai_response(prompt, system_instruction=None, json_mode=False):
    """
    Common AI Engine for Chat, PDF Data, and Curriculum Generation.
    """
    try:
        client = get_ai_client()
        
        # Lower temperature for JSON mode to increase factual consistency
        config = {
            'system_instruction': system_instruction,
            'temperature': 0.7 if not json_mode else 0.3, 
        }
        
        if json_mode:
            config['response_mime_type'] = 'application/json'

        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt,
            config=config
        )
        
        raw_text = response.text
        return json.loads(raw_text) if json_mode else raw_text

    except exceptions.ResourceExhausted:
        # Standardized error return for internal handling
        return {"error": "rate_limit", "message": "Rate limit hit", "status_code": 429}
    except Exception as e:
        logger.error(f"GenAI Universal Engine Error: {e}")
        return None