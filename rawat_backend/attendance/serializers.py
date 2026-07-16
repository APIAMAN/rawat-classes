from rest_framework import serializers
from django.db import transaction
from .models import AttendanceSession, AttendanceRecord
from students.models import StudentBatchEnrollment


class AttendanceRecordSerializer(serializers.ModelSerializer):
    """Flat record with student name, enrollment number, and session date."""
    student_id = serializers.IntegerField(source='student.id', read_only=True)
    student_name = serializers.SerializerMethodField()
    enrollment_no = serializers.CharField(source='student.enrollment_no', read_only=True)
    session_date = serializers.DateField(source='session.date', read_only=True)
    session_id = serializers.IntegerField(source='session.id', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'session_id', 'session_date', 'student_id', 'student_name', 'enrollment_no', 'status']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name() or obj.student.user.username


class AttendanceSessionSerializer(serializers.ModelSerializer):
    """Read-only session representation with nested records."""
    batch_name = serializers.CharField(source='batch.name', read_only=True)
    marked_by_name = serializers.SerializerMethodField()
    records = AttendanceRecordSerializer(many=True, read_only=True)
    record_count = serializers.IntegerField(source='records.count', read_only=True)

    class Meta:
        model = AttendanceSession
        fields = ['id', 'batch', 'batch_name', 'date', 'marked_by', 'marked_by_name',
                  'created_at', 'record_count', 'records']

    def get_marked_by_name(self, obj):
        if obj.marked_by:
            return obj.marked_by.get_full_name() or obj.marked_by.username
        return None


class AttendanceSessionCreateSerializer(serializers.ModelSerializer):
    """
    Creates a session and auto-generates one ABSENT record per enrolled student.
    Uses atomic transaction to ensure consistency.
    """
    class Meta:
        model = AttendanceSession
        fields = ['id', 'batch', 'date']

    def validate(self, attrs):
        batch = attrs.get('batch')
        date = attrs.get('date')
        if AttendanceSession.objects.filter(batch=batch, date=date).exists():
            raise serializers.ValidationError(
                f"An attendance session already exists for '{batch.name}' on {date}."
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        session = AttendanceSession.objects.create(
            **validated_data,
            marked_by=request.user if request else None
        )
        # Auto-generate ABSENT records for all active enrolled students
        enrollments = StudentBatchEnrollment.objects.filter(
            batch=session.batch,
            is_active=True
        ).select_related('student')

        records = [
            AttendanceRecord(session=session, student=enrollment.student, status='ABSENT')
            for enrollment in enrollments
        ]
        AttendanceRecord.objects.bulk_create(records)
        return session


class BulkRecordUpdateItemSerializer(serializers.Serializer):
    """A single item in the bulk-mark request body."""
    student_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])


class AttendanceBulkMarkSerializer(serializers.Serializer):
    """
    Bulk update records for a session.
    Accepts: { records: [{student_id, status}, ...] }
    """
    records = BulkRecordUpdateItemSerializer(many=True)

    @transaction.atomic
    def save(self, session):
        updates = self.validated_data['records']
        for item in updates:
            AttendanceRecord.objects.filter(
                session=session,
                student_id=item['student_id']
            ).update(status=item['status'])
        return session


class AttendanceSummaryItemSerializer(serializers.Serializer):
    """Per-student attendance percentage summary."""
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    enrollment_no = serializers.CharField()
    total_sessions = serializers.IntegerField()
    present_count = serializers.IntegerField()
    late_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    excused_count = serializers.IntegerField()
    attendance_percentage = serializers.FloatField()
