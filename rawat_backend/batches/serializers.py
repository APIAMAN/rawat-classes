from rest_framework import serializers
from django.db import transaction
from .models import Batch, Schedule
from teachers.models import Teacher

class ScheduleSerializer(serializers.ModelSerializer):
    """
    Serializer for timing schedules.
    """
    class Meta:
        model = Schedule
        fields = ('id', 'day_of_week', 'start_time', 'end_time')

class BatchSerializer(serializers.ModelSerializer):
    """
    Serializer for Batch.
    Supports write-actions with validation checks and nested schedules manipulation.
    """
    schedules = ScheduleSerializer(many=True, required=False, default=[])

    class Meta:
        model = Batch
        fields = (
            'id', 'name', 'subject', 'teacher', 'start_date', 'end_date',
            'capacity', 'is_active', 'schedules', 'student_count', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at', 'student_count')

    def validate_teacher(self, value):
        # Validate that the teacher is active
        if not value.is_active:
            raise serializers.ValidationError("Cannot assign a batch to an inactive teacher.")
        return value

    def create(self, validated_data):
        schedules_data = validated_data.pop('schedules', [])
        
        with transaction.atomic():
            batch = Batch.objects.create(**validated_data)
            
            # Create nested weekly schedules
            for schedule_item in schedules_data:
                Schedule.objects.create(batch=batch, **schedule_item)
                
            return batch

    def update(self, instance, validated_data):
        schedules_data = validated_data.pop('schedules', None)
        
        with transaction.atomic():
            # Update core batch fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            # If schedules data was provided, replace all schedules
            if schedules_data is not None:
                instance.schedules.all().delete()
                for schedule_item in schedules_data:
                    Schedule.objects.create(batch=instance, **schedule_item)
                    
            return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Import dynamically to avoid circular dependencies
        from teachers.serializers import TeacherSerializer
        
        # Serialize nested details for the frontend
        representation['teacher'] = TeacherSerializer(instance.teacher, context=self.context).data
        representation['schedules'] = ScheduleSerializer(instance.schedules.all(), many=True).data
        return representation
