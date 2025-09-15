"""
Vercel serverless function handler for Django
"""
import os
import sys
from pathlib import Path

# Add the project directory to the Python path
project_dir = Path(__file__).parent
sys.path.insert(0, str(project_dir))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'truck_driver_project.settings')

import django
from django.core.wsgi import get_wsgi_application

# Initialize Django
django.setup()
application = get_wsgi_application()

# Vercel handler
def handler(request):
    from django.http import HttpResponse
    from django.core.handlers.wsgi import WSGIHandler
    
    # Create WSGI handler
    wsgi_handler = WSGIHandler()
    
    # Convert Vercel request to WSGI environ
    environ = {
        'REQUEST_METHOD': request.get('method', 'GET'),
        'PATH_INFO': request.get('path', '/'),
        'QUERY_STRING': request.get('query', ''),
        'CONTENT_TYPE': request.get('headers', {}).get('content-type', ''),
        'CONTENT_LENGTH': str(len(request.get('body', ''))),
        'SERVER_NAME': 'localhost',
        'SERVER_PORT': '8000',
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': 'https',
        'wsgi.input': request.get('body', ''),
        'wsgi.errors': sys.stderr,
        'wsgi.multithread': False,
        'wsgi.multiprocess': True,
        'wsgi.run_once': False,
    }
    
    # Add headers
    for key, value in request.get('headers', {}).items():
        environ[f'HTTP_{key.upper().replace("-", "_")}'] = value
    
    # Process request
    response = wsgi_handler(environ, lambda *args: None)
    
    return {
        'statusCode': response.status_code,
        'headers': dict(response.items()),
        'body': response.content.decode('utf-8')
    }

