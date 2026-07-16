from django.urls import path
from .views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    CustomLogoutView,
    UserMeView
)

app_name = 'accounts'

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='refresh'),
    path('logout/', CustomLogoutView.as_view(), name='logout'),
    path('me/', UserMeView.as_view(), name='me'),
]
