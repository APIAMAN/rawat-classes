from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceSessionViewSet, AttendanceRecordListView, AttendanceSummaryView

router = DefaultRouter()
router.register(r'sessions', AttendanceSessionViewSet, basename='attendance-session')

urlpatterns = [
    path('', include(router.urls)),
    path('records/', AttendanceRecordListView.as_view(), name='attendance-records'),
    path('summary/', AttendanceSummaryView.as_view(), name='attendance-summary'),
]
