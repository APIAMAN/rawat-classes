from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BatchViewSet

app_name = 'batches'

router = DefaultRouter()
router.register(r'', BatchViewSet, basename='batch')

urlpatterns = [
    path('', include(router.urls)),
]
