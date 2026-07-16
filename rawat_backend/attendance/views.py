from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q

from .models import AttendanceSession, AttendanceRecord
from .serializers import (
    AttendanceSessionSerializer,
    AttendanceSessionCreateSerializer,
    AttendanceBulkMarkSerializer,
    AttendanceRecordSerializer,
    AttendanceSummaryItemSerializer,
)
from students.models import Student, StudentBatchEnrollment
from core.permissions import IsAdmin, IsTeacher, IsStudent


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    """
    Manages attendance sessions.
    POST  /sessions/           — create session + auto-generate ABSENT records
    GET   /sessions/           — list, filter by ?batch=&date=
    PATCH /sessions/{id}/mark/ — bulk-update record statuses
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['batch', 'date']

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceSession.objects.select_related('batch', 'batch__teacher', 'marked_by')

        if user.role == 'admin':
            return qs
        elif user.role == 'teacher':
            # Only sessions for batches assigned to this teacher
            try:
                teacher = user.teacher_profile
                return qs.filter(batch__teacher=teacher)
            except Exception:
                return qs.none()
        elif user.role == 'student':
            # Students can view sessions for batches they are enrolled in
            try:
                student = user.student_profile
                batch_ids = StudentBatchEnrollment.objects.filter(
                    student=student, is_active=True
                ).values_list('batch_id', flat=True)
                return qs.filter(batch_id__in=batch_ids)
            except Exception:
                return qs.none()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return AttendanceSessionCreateSerializer
        return AttendanceSessionSerializer

    def create(self, request, *args, **kwargs):
        """Create session — teachers can only create for their own batches."""
        user = request.user
        if user.role == 'teacher':
            batch_id = request.data.get('batch')
            try:
                teacher = user.teacher_profile
                from batches.models import Batch
                batch = Batch.objects.get(id=batch_id)
                if batch.teacher != teacher:
                    return Response(
                        {'detail': 'You can only create sessions for your own batches.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Exception as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        elif user.role == 'student':
            return Response({'detail': 'Students cannot create sessions.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        session = serializer.save()
        # Return full session with records
        out_serializer = AttendanceSessionSerializer(session, context={'request': request})
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='mark')
    def mark(self, request, pk=None):
        """Bulk-update attendance records for a session."""
        session = self.get_object()
        user = request.user

        # Teachers can only mark sessions in their batches
        if user.role == 'teacher':
            try:
                if session.batch.teacher != user.teacher_profile:
                    return Response(
                        {'detail': 'You can only mark attendance for your own batches.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Exception:
                return Response({'detail': 'Teacher profile not found.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'student':
            return Response({'detail': 'Students cannot mark attendance.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AttendanceBulkMarkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(session=session)

        # Return updated session
        out_serializer = AttendanceSessionSerializer(session, context={'request': request})
        return Response(out_serializer.data)


class AttendanceRecordListView(APIView):
    """
    GET /api/v1/attendance/records/
    Query params: ?batch=&student=&from=&to=
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = AttendanceRecord.objects.select_related(
            'session', 'session__batch', 'student', 'student__user'
        )

        # Permission filtering
        if user.role == 'teacher':
            try:
                teacher = user.teacher_profile
                qs = qs.filter(session__batch__teacher=teacher)
            except Exception:
                return Response([])
        elif user.role == 'student':
            try:
                student = user.student_profile
                qs = qs.filter(student=student)
            except Exception:
                return Response([])

        # Query param filters
        batch_id = request.query_params.get('batch')
        student_id = request.query_params.get('student')
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')

        if batch_id:
            qs = qs.filter(session__batch_id=batch_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if from_date:
            qs = qs.filter(session__date__gte=from_date)
        if to_date:
            qs = qs.filter(session__date__lte=to_date)

        serializer = AttendanceRecordSerializer(qs, many=True)
        return Response(serializer.data)


class AttendanceSummaryView(APIView):
    """
    GET /api/v1/attendance/summary/
    Query params: ?batch=&student=&from=&to=
    Returns per-student attendance percentage.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        batch_id = request.query_params.get('batch')
        student_id = request.query_params.get('student')
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')

        # Build base session filter
        session_filter = Q()
        if batch_id:
            session_filter &= Q(session__batch_id=batch_id)
        if from_date:
            session_filter &= Q(session__date__gte=from_date)
        if to_date:
            session_filter &= Q(session__date__lte=to_date)

        # Build student queryset
        student_qs = Student.objects.select_related('user')

        if user.role == 'teacher':
            try:
                teacher = user.teacher_profile
                enrolled_student_ids = StudentBatchEnrollment.objects.filter(
                    batch__teacher=teacher
                ).values_list('student_id', flat=True)
                student_qs = student_qs.filter(id__in=enrolled_student_ids)
            except Exception:
                return Response([])
        elif user.role == 'student':
            try:
                student_qs = student_qs.filter(id=user.student_profile.id)
            except Exception:
                return Response([])

        if student_id:
            student_qs = student_qs.filter(id=student_id)

        if batch_id and user.role == 'admin':
            enrolled_ids = StudentBatchEnrollment.objects.filter(
                batch_id=batch_id
            ).values_list('student_id', flat=True)
            student_qs = student_qs.filter(id__in=enrolled_ids)

        # Aggregate per student
        results = []
        for student in student_qs:
            records = AttendanceRecord.objects.filter(
                student=student
            ).filter(session_filter)

            total = records.count()
            present = records.filter(status='PRESENT').count()
            late = records.filter(status='LATE').count()
            absent = records.filter(status='ABSENT').count()
            excused = records.filter(status='EXCUSED').count()
            percentage = round(((present + late) / total * 100), 1) if total > 0 else 0.0

            results.append({
                'student_id': student.id,
                'student_name': student.user.get_full_name() or student.user.username,
                'enrollment_no': student.enrollment_no,
                'total_sessions': total,
                'present_count': present,
                'late_count': late,
                'absent_count': absent,
                'excused_count': excused,
                'attendance_percentage': percentage,
            })

        serializer = AttendanceSummaryItemSerializer(results, many=True)
        return Response(serializer.data)
