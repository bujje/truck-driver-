# Vercel Serverless Function entrypoint for Django
import os
import sys
from pathlib import Path

# Add backend package and its project root to PYTHONPATH
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / 'backend'
PROJECT_DIR = BACKEND_DIR / 'truck_driver_project'
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

# Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'truck_driver_project.settings')

# Ensure Django can locate settings in serverless env
from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()

# Optional handler alias for some runtimes
handler = app