from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LogSheetViewSet

router = DefaultRouter()
router.register(r'logs', LogSheetViewSet)

urlpatterns = [
    path('', include(router.urls)),
]