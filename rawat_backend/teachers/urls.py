from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeacherViewSet

app_name = 'teachers'

router = DefaultRouter()
router.register(r'', TeacherViewSet, basename='teacher')

urlpatterns = [
    path('', include(router.urls)),
]
