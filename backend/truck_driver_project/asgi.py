"""
ASGI config for truck_driver_project project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'truck_driver_project.settings')

application = get_asgi_application()