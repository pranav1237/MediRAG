import os
import json
from dotenv import load_dotenv

# Load .env from backend folder
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
print('ENV GEMINI_API_KEY=', os.environ.get('GEMINI_API_KEY'))

try:
    from google import genai
    print('Imported google.genai')
    client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))
    print('Client created')
    # Try models.list
    try:
        models = client.models.list()
        print('models.list result:', type(models))
        try:
            print(json.dumps(models, default=lambda o: getattr(o, '__dict__', str(o)), indent=2))
        except Exception as e:
            print('Could not json dump models.list:', e)
    except Exception as e:
        print('models.list failed:', e)
    # Try alternative
    try:
        models2 = client.list_models()
        print('client.list_models result:', type(models2))
        try:
            print(json.dumps(models2, default=lambda o: getattr(o, '__dict__', str(o)), indent=2))
        except Exception as e:
            print('Could not json dump models2:', e)
    except Exception as e:
        print('client.list_models failed:', e)
    # Try an embedding call using configured model if available
    try:
        from app.config import settings
        emb_model = os.environ.get('EMBEDDING_MODEL') or getattr(settings, 'EMBEDDING_MODEL', None) or 'gemini-embedding-001'
    except Exception:
        emb_model = os.environ.get('EMBEDDING_MODEL', 'gemini-embedding-001')

    try:
        print('Attempting embed with model:', emb_model)
        resp = client.models.embed_content(model=emb_model, contents=['test'])
        print('embed_content OK, type:', type(resp))
        try:
            print('embed resp summary:', str(resp)[:1000])
        except Exception as e:
            print('Could not print embed resp:', e)
    except Exception as e:
        print('embed_content failed:', e)

except Exception as e:
    print('Import google.genai failed:', e)
