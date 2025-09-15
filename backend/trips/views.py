from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.conf import settings
from .models import Trip, Stop, RouteSegment
from .serializers import (
    TripSerializer, TripInputSerializer, 
    StopSerializer, RouteSegmentSerializer,
    GeocodingSerializer
)
from .utils import HOSCalculator, GeocodingService, DirectionsService, interpolate_along_linestring
import datetime
import json


class TripViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing trips
    """
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    
    def get_queryset(self):
        """Filter queryset to only return trips for the current user"""
        return self.queryset.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Set the user when creating a trip"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def calculate(self, request):
        """
        Calculate a trip with HOS compliance
        """
        serializer = TripInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get geocoding service
        geocoding_service = GeocodingService()
        
        # Geocode locations
        current_location = geocoding_service.geocode(serializer.validated_data['current_location'])
        pickup_location = geocoding_service.geocode(serializer.validated_data['pickup_location'])
        dropoff_location = geocoding_service.geocode(serializer.validated_data['dropoff_location'])
        
        # Check if geocoding was successful
        if not all([current_location['success'], pickup_location['success'], dropoff_location['success']]):
            errors = {}
            if not current_location['success']:
                errors['current_location'] = current_location['error']
            if not pickup_location['success']:
                errors['pickup_location'] = pickup_location['error']
            if not dropoff_location['success']:
                errors['dropoff_location'] = dropoff_location['error']
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        
        # Directions via Mapbox for precise routing
        directions = DirectionsService()
        leg1 = directions.route(
            (current_location['latitude'], current_location['longitude']),
            (pickup_location['latitude'], pickup_location['longitude'])
        )
        leg2 = directions.route(
            (pickup_location['latitude'], pickup_location['longitude']),
            (dropoff_location['latitude'], dropoff_location['longitude'])
        )
        if not leg1.get('success') or not leg2.get('success'):
            err = leg1.get('error') or leg2.get('error') or 'Routing failed'
            return Response({'errors': {'routing': err}}, status=status.HTTP_400_BAD_REQUEST)

        total_distance = (leg1['distance_miles'] + leg2['distance_miles'])
        total_driving_hours = (leg1['duration_hours'] + leg2['duration_hours'])

        # Calculate HOS plan using actual driving time
        hos_plan = HOSCalculator.plan_trip(
            total_distance,
            serializer.validated_data['current_cycle_hours'],
            driving_time_override=total_driving_hours,
        )

        if not hos_plan['feasible']:
            return Response({
                'success': False,
                'error': hos_plan['reason'],
                'details': hos_plan
            }, status=status.HTTP_400_BAD_REQUEST)

        # If authenticated, persist the trip. Otherwise, return a non-persistent plan
        trip_data = {
            'name': serializer.validated_data.get('trip_name', f"Trip to {dropoff_location['address']}") or f"Trip to {dropoff_location['address']}",
            'status': 'planned',
            'current_location': current_location['address'],
            'current_location_lat': current_location['latitude'],
            'current_location_lng': current_location['longitude'],
            'pickup_location': pickup_location['address'],
            'pickup_location_lat': pickup_location['latitude'],
            'pickup_location_lng': pickup_location['longitude'],
            'dropoff_location': dropoff_location['address'],
            'dropoff_location_lat': dropoff_location['latitude'],
            'dropoff_location_lng': dropoff_location['longitude'],
            'current_cycle_hours': serializer.validated_data['current_cycle_hours'],
            'total_distance': total_distance,
            'estimated_driving_time': total_driving_hours,
            'total_trip_time': hos_plan['total_trip_time'],
        }

        if request.user and request.user.is_authenticated:
            trip = Trip.objects.create(user=request.user, **trip_data)
        else:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            public_user, _ = User.objects.get_or_create(username='public')
            trip = Trip.objects.create(user=public_user, **trip_data)

        # Build precise stops (pickup, dropoff + HOS breaks/rests interpolated on leg2)
        stops = []
        seq = 1
        # Pickup stop at exact pickup point
        pick_stop = Stop.objects.create(
            trip=trip,
            stop_type='pickup',
            location=pickup_location['address'],
            latitude=pickup_location['latitude'],
            longitude=pickup_location['longitude'],
            arrival_time=datetime.datetime.utcnow(),
            departure_time=None,
            duration=HOSCalculator.PICKUP_DURATION,
            distance_from_start=geocoding_service.calculate_distance(
                (current_location['latitude'], current_location['longitude']),
                (pickup_location['latitude'], pickup_location['longitude'])
            ),
            sequence=seq,
        )
        stops.append(pick_stop)
        seq += 1

        # Interpolate markers for breaks and rest periods along pickup->dropoff route
        leg2_coords = [(lat, lng) for lat, lng in leg2['coordinates']]
        total_leg2_miles = geocoding_service.calculate_distance(
            (pickup_location['latitude'], pickup_location['longitude']),
            (dropoff_location['latitude'], dropoff_location['longitude'])
        )

        # Breaks
        breaks = max(0, hos_plan.get('break_count') or 0)
        for i in range(1, breaks + 1):
            frac = i / (breaks + 1)
            lat, lng = interpolate_along_linestring(leg2_coords, frac)
            s = Stop.objects.create(
                trip=trip,
                stop_type='break',
                location=f"Break at {lat:.5f},{lng:.5f}",
                latitude=lat,
                longitude=lng,
                arrival_time=datetime.datetime.utcnow(),
                departure_time=None,
                duration=HOSCalculator.BREAK_DURATION,
                distance_from_start=pick_stop.distance_from_start + (total_leg2_miles * frac),
                sequence=seq,
            )
            stops.append(s)
            seq += 1

        # Rests
        rests = max(0, hos_plan.get('rest_periods') or 0)
        for i in range(1, rests + 1):
            frac = i / (rests + 1)
            lat, lng = interpolate_along_linestring(leg2_coords, frac)
            s = Stop.objects.create(
                trip=trip,
                stop_type='rest',
                location=f"Rest at {lat:.5f},{lng:.5f}",
                latitude=lat,
                longitude=lng,
                arrival_time=datetime.datetime.utcnow(),
                departure_time=None,
                duration=HOSCalculator.REQUIRED_REST_PERIOD,
                distance_from_start=pick_stop.distance_from_start + (total_leg2_miles * frac),
                sequence=seq,
            )
            stops.append(s)
            seq += 1

        # Dropoff
        drop_stop = Stop.objects.create(
            trip=trip,
            stop_type='dropoff',
            location=dropoff_location['address'],
            latitude=dropoff_location['latitude'],
            longitude=dropoff_location['longitude'],
            arrival_time=datetime.datetime.utcnow(),
            departure_time=None,
            duration=HOSCalculator.DROPOFF_DURATION,
            distance_from_start=trip.total_distance,
            sequence=seq,
        )
        stops.append(drop_stop)

        # Create route segments with polylines (as raw coordinates JSON for simplicity)
        RouteSegment.objects.create(
            trip=trip,
            start_stop=pick_stop,
            end_stop=drop_stop,
            distance=leg2['distance_miles'],
            estimated_time=leg2['duration_hours'],
            polyline=json.dumps(leg2['coordinates']),
            sequence=1,
        )

        response_trip = TripSerializer(trip).data

        return Response({
            'success': True,
            'trip_id': trip.id,
            'trip': response_trip,
            'hos_plan': hos_plan,
            'route': {
                'current_to_pickup': {
                    'distance_miles': leg1['distance_miles'],
                    'duration_hours': leg1['duration_hours'],
                    'coordinates': leg1['coordinates'],
                },
                'pickup_to_dropoff': {
                    'distance_miles': leg2['distance_miles'],
                    'duration_hours': leg2['duration_hours'],
                    'coordinates': leg2['coordinates'],
                },
            },
        })


class GeocodingView(APIView):
    """
    View for geocoding, reverse geocoding, and place search
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = GeocodingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        geocoding_service = GeocodingService()
        data = serializer.validated_data
        if data.get('query'):
            result = geocoding_service.search(data['query'])
        elif data.get('lat') is not None and data.get('lng') is not None:
            result = geocoding_service.reverse(data['lat'], data['lng'])
        else:
            result = geocoding_service.geocode(data['address'])
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class MapboxTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        key = getattr(settings, 'MAP_API_KEY', '')
        return Response({ 'token': key })