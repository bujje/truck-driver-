# Vercel Serverless Function entrypoint for Django
import os
from pathlib import Path

# Ensure backend is on PYTHONPATH
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / 'backend'
import sys
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'truck_driver_project.settings')

# Load WSGI application
from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()

def handler(request, context):
    # For Vercel Python runtime, exporting `app` is enough.
    # Keeping handler for compatibility.
    return app