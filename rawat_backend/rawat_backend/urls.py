from django.urls import path, include
from core.views import health_check
from core.admin import admin_site

api_urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('core/', include('core.urls')),
    path('dashboard/', include('core.urls')),
    path('auth/', include('accounts.urls')),
    path('teachers/', include('teachers.urls')),
    path('batches/', include('batches.urls')),
    path('students/', include('students.urls')),
    path('attendance/', include('attendance.urls')),
    path('fees/', include('fees.urls')),
]

urlpatterns = [
    path('admin/', admin_site.urls),
    path('api/v1/', include(api_urlpatterns)),
]
