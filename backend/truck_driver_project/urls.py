"""
URL configuration for truck_driver_project project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('trips.urls')),
    path('api/', include('logs.urls')),
    # Accept root-mounted API paths as well (for serverless routing differences)
    path('', include('trips.urls')),
    path('', include('logs.urls')),
]