from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TripViewSet, GeocodingView, MapboxTokenView

router = DefaultRouter()
router.register(r'trips', TripViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('geocoding/', GeocodingView.as_view(), name='geocoding'),
    path('mapbox-token/', MapboxTokenView.as_view(), name='mapbox-token'),
]