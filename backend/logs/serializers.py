from rest_framework import serializers
from .models import LogSheet, DutyStatusChange


class DutyStatusChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DutyStatusChange
        fields = [
            'id', 'status', 'start_time', 'end_time', 'duration',
            'location', 'latitude', 'longitude', 'remarks'
        ]


class LogSheetSerializer(serializers.ModelSerializer):
    status_changes = DutyStatusChangeSerializer(many=True, read_only=True)
    
    class Meta:
        model = LogSheet
        fields = [
            'id', 'trip', 'user', 'date', 'status',
            'vehicle_number', 'trailer_number', 'visual_log_data',
            'certified_by', 'certified_at',
            'created_at', 'updated_at', 'status_changes'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LogSheetGenerationSerializer(serializers.Serializer):
    """
    Serializer for log sheet generation input
    """
    trip_id = serializers.IntegerField()
    start_date = serializers.DateField()
    vehicle_number = serializers.CharField(max_length=50, required=False)
    trailer_number = serializers.CharField(max_length=50, required=False)


class LogSheetCertificationSerializer(serializers.Serializer):
    """
    Serializer for log sheet certification
    """
    log_sheet_id = serializers.IntegerField()
    certification_remarks = serializers.CharField(required=False)