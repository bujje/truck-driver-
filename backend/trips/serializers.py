from rest_framework import serializers
from .models import Trip, Stop, RouteSegment


class StopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stop
        fields = [
            'id', 'stop_type', 'location', 'latitude', 'longitude',
            'arrival_time', 'departure_time', 'duration',
            'distance_from_start', 'sequence'
        ]


class RouteSegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteSegment
        fields = [
            'id', 'start_stop', 'end_stop', 'distance',
            'estimated_time', 'polyline', 'sequence'
        ]


class TripSerializer(serializers.ModelSerializer):
    stops = StopSerializer(many=True, read_only=True)
    route_segments = RouteSegmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Trip
        fields = [
            'id', 'user', 'name', 'status',
            'current_location', 'current_location_lat', 'current_location_lng',
            'pickup_location', 'pickup_location_lat', 'pickup_location_lng',
            'dropoff_location', 'dropoff_location_lat', 'dropoff_location_lng',
            'current_cycle_hours', 'total_distance', 'estimated_driving_time',
            'total_trip_time', 'created_at', 'updated_at', 'stops', 'route_segments'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'total_distance', 
                           'estimated_driving_time', 'total_trip_time']


class TripInputSerializer(serializers.Serializer):
    """
    Serializer for trip calculation input
    """
    current_location = serializers.CharField(max_length=255)
    pickup_location = serializers.CharField(max_length=255)
    dropoff_location = serializers.CharField(max_length=255)
    current_cycle_hours = serializers.FloatField(min_value=0, max_value=70)
    trip_name = serializers.CharField(max_length=255, required=False)


class GeocodingSerializer(serializers.Serializer):
    """
    Serializer for geocoding requests
    """
    address = serializers.CharField(max_length=255)
    lat = serializers.FloatField(required=False)
    lng = serializers.FloatField(required=False)
    query = serializers.CharField(max_length=255, required=False)
    
    def validate(self, data):
        # Accept either address, or lat/lng for reverse, or query for search
        if not data.get('address') and not (data.get('lat') and data.get('lng')) and not data.get('query'):
            raise serializers.ValidationError("Provide 'address' or 'lat'+'lng' or 'query'.")
        return data