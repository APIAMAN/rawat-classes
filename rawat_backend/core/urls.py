from django.urls import path
from .views import dashboard_stats

app_name = 'core'

urlpatterns = [
    path('stats/', dashboard_stats, name='dashboard_stats'),
]
