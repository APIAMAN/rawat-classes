from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FeeStructureViewSet,
    FeeInvoiceViewSet,
    FeePaymentViewSet,
    FeesDashboardView,
)

router = DefaultRouter()
router.register(r'structures', FeeStructureViewSet, basename='fee-structure')
router.register(r'invoices', FeeInvoiceViewSet, basename='fee-invoice')
router.register(r'payments', FeePaymentViewSet, basename='fee-payment')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', FeesDashboardView.as_view(), name='fees-dashboard'),
]
