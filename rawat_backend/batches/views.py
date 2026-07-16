from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import IsAdmin
from .models import Batch, Schedule
from .serializers import BatchSerializer, ScheduleSerializer

class BatchViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet for managing Batch profiles and nested weekly schedules.
    Gated so only Admins can write, and Teachers only see their assigned batches.
    """
    serializer_class = BatchSerializer
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('is_active', 'subject', 'teacher')
    search_fields = ('name', 'subject', 'teacher__user__first_name', 'teacher__user__last_name', 'teacher__employee_id')

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Batch.objects.none()

        # Admin gets full access
        if user.role == 'admin':
            return Batch.objects.all().select_related('teacher__user').prefetch_related('schedules').order_by('-created_at')

        # Teacher gets only their assigned batches
        if user.role == 'teacher':
            return Batch.objects.filter(teacher__user=user).select_related('teacher__user').prefetch_related('schedules').order_by('-created_at')

        return Batch.objects.none()

    def get_permissions(self):
        permission_classes = [IsAuthenticated]
        
        # Write actions are restricted to Admins
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'add_schedule']:
            permission_classes.append(IsAdmin)
            
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['get', 'post'], url_path='schedule')
    def schedule(self, request, pk=None):
        """
        Nested endpoint to retrieve or append schedule items.
        GET /api/v1/batches/{id}/schedule/
        POST /api/v1/batches/{id}/schedule/
        """
        batch = self.get_object()
        
        if request.method == 'GET':
            schedules = batch.schedules.all()
            serializer = ScheduleSerializer(schedules, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        elif request.method == 'POST':
            # Verify permission is admin (this action is not standard CRUD, so we check manually)
            if request.user.role != 'admin':
                return Response(
                    {"detail": "Only admins can modify batch schedules."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            serializer = ScheduleSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(batch=batch)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
