"""
WSGI config for truck_driver_project project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'truck_driver_project.settings')

# Standard Django WSGI application for local/dev servers
application = get_wsgi_application()

# Expose a Vercel-compatible handler for serverless usage
try:
    from vercel_wsgi import handle as handler
    app = application  # Optional alias if needed by some tooling
except Exception:
    # If vercel-wsgi isn't installed locally, keep local usage working
    handler = None
    app = application