from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import LogSheet, DutyStatusChange
from .serializers import (
    LogSheetSerializer, DutyStatusChangeSerializer,
    LogSheetGenerationSerializer, LogSheetCertificationSerializer
)
from .utils import LogGenerator
from trips.models import Trip, Stop
import datetime


class LogSheetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing log sheets
    """
    queryset = LogSheet.objects.all()
    serializer_class = LogSheetSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        """Return all log sheets (public visibility for demo)."""
        queryset = self.queryset
        count = queryset.count()
        print(f"Retrieving {count} log sheets")
        
        # Print recent logs for debugging
        recent_logs = queryset.order_by('-created_at')[:5]
        for log in recent_logs:
            print(f"  - Log {log.id}: Trip {log.trip.id} on {log.date} (Status: {log.status})")
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the user when creating a log sheet (fallback to anonymous/public)."""
        serializer.save()
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def generate(self, request):
        """
        Generate log sheets for a trip (public). No ownership checks for demo.
        """
        serializer = LogSheetGenerationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            trip = Trip.objects.get(id=serializer.validated_data['trip_id'])
        except Trip.DoesNotExist:
            return Response({'error': 'Trip not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get start date
        start_date = serializer.validated_data['start_date']
        print(f"Received start_date: {start_date} (type: {type(start_date)})")
        
        # Get vehicle and trailer numbers
        vehicle_number = serializer.validated_data.get('vehicle_number', '')
        trailer_number = serializer.validated_data.get('trailer_number', '')
        print(f"Vehicle: {vehicle_number}, Trailer: {trailer_number}")
        
        # Calculate trip duration in days
        trip_days = int(trip.total_trip_time / 24) + 1
        
        # Generate log sheets for each day
        log_sheets = []
        current_date = start_date
        
        print(f"Generating {trip_days} log sheets for trip {trip.id}")
        print(f"Start date: {start_date}, User: {trip.user}")
        
        for day in range(trip_days):
            # Create log sheet for this day (assign to trip.user)
            print(f"Creating log sheet for day {day}, date: {current_date}")
            try:
                # Check if log sheet already exists
                existing_log = LogSheet.objects.filter(
                    trip=trip,
                    user=trip.user,
                    date=current_date
                ).first()
                
                if existing_log:
                    print(f"Log sheet already exists for date {current_date}, using existing one: {existing_log.id}")
                    log_sheet = existing_log
                    # Update vehicle and trailer numbers if provided
                    if vehicle_number:
                        log_sheet.vehicle_number = vehicle_number
                    if trailer_number:
                        log_sheet.trailer_number = trailer_number
                    log_sheet.save()
                else:
                    log_sheet = LogSheet.objects.create(
                        trip=trip,
                        user=trip.user,
                        date=current_date,
                        vehicle_number=vehicle_number,
                        trailer_number=trailer_number
                    )
                    print(f"Successfully created new log sheet {log_sheet.id}")
            except Exception as e:
                print(f"Error creating log sheet for date {current_date}: {e}")
                raise e
            
            # Only create duty status changes for new log sheets
            if not existing_log:
                # Simplified duty status timeline
                if day == 0:
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='off_duty',
                        start_time=datetime.datetime.combine(current_date, datetime.time(0, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(8, 0)),
                        duration=8.0,
                        location=trip.current_location,
                        latitude=trip.current_location_lat,
                        longitude=trip.current_location_lng,
                        remarks='Start of day'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='on_duty',
                        start_time=datetime.datetime.combine(current_date, datetime.time(8, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(9, 0)),
                        duration=1.0,
                        location=trip.pickup_location,
                        latitude=trip.pickup_location_lat,
                        longitude=trip.pickup_location_lng,
                        remarks='Pickup operations'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='driving',
                        start_time=datetime.datetime.combine(current_date, datetime.time(9, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(17, 0)),
                        duration=8.0,
                        location=trip.pickup_location,
                        latitude=trip.pickup_location_lat,
                        longitude=trip.pickup_location_lng,
                        remarks='Driving'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='off_duty',
                        start_time=datetime.datetime.combine(current_date, datetime.time(17, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(23, 59)),
                        duration=7.0,
                        location='Rest Stop',
                        remarks='End of day rest'
                    )
                elif day == trip_days - 1:
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='off_duty',
                        start_time=datetime.datetime.combine(current_date, datetime.time(0, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(8, 0)),
                        duration=8.0,
                        location='Rest Stop',
                        remarks='Start of day'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='driving',
                        start_time=datetime.datetime.combine(current_date, datetime.time(8, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(12, 0)),
                        duration=4.0,
                        location='En Route',
                        remarks='Driving to destination'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='on_duty',
                        start_time=datetime.datetime.combine(current_date, datetime.time(12, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(13, 0)),
                        duration=1.0,
                        location=trip.dropoff_location,
                        latitude=trip.dropoff_location_lat,
                        longitude=trip.dropoff_location_lng,
                        remarks='Dropoff operations'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='off_duty',
                        start_time=datetime.datetime.combine(current_date, datetime.time(13, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(23, 59)),
                        duration=11.0,
                        location=trip.dropoff_location,
                        latitude=trip.dropoff_location_lat,
                        longitude=trip.dropoff_location_lng,
                        remarks='End of trip'
                    )
                else:
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='off_duty',
                        start_time=datetime.datetime.combine(current_date, datetime.time(0, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(6, 0)),
                        duration=6.0,
                        location='Rest Stop',
                        remarks='Start of day'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='driving',
                        start_time=datetime.datetime.combine(current_date, datetime.time(6, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(14, 0)),
                        duration=8.0,
                        location='En Route',
                        remarks='Morning driving'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='on_duty',
                        start_time=datetime.datetime.combine(current_date, datetime.time(14, 0)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(14, 30)),
                        duration=0.5,
                        location='Rest Area',
                        remarks='30-minute break'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='driving',
                        start_time=datetime.datetime.combine(current_date, datetime.time(14, 30)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(17, 30)),
                        duration=3.0,
                        location='En Route',
                        remarks='Afternoon driving'
                    )
                    DutyStatusChange.objects.create(
                        log_sheet=log_sheet,
                        status='off_duty',
                        start_time=datetime.datetime.combine(current_date, datetime.time(17, 30)),
                        end_time=datetime.datetime.combine(current_date, datetime.time(23, 59)),
                        duration=6.5,
                        location='Rest Stop',
                        remarks='End of day rest'
                    )
            
            log_sheets.append(log_sheet)
            print(f"Created log sheet {log_sheet.id} for date {current_date}")
            print(f"Log sheet details: Trip={log_sheet.trip.id}, User={log_sheet.user.username}, Date={log_sheet.date}, Status={log_sheet.status}")
            current_date += datetime.timedelta(days=1)
        
        print(f"Successfully generated {len(log_sheets)} log sheets")
        return Response({
            'success': True,
            'log_sheets': LogSheetSerializer(log_sheets, many=True).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def certify(self, request, pk=None):
        """
        Certify a log sheet (public demo; no auth enforced)
        """
        log_sheet = self.get_object()
        
        # Check if log sheet is already certified
        if log_sheet.status == 'certified':
            return Response({'error': 'Log sheet is already certified'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Update log sheet status
        log_sheet.status = 'certified'
        log_sheet.certified_by = None
        log_sheet.certified_at = timezone.now()
        log_sheet.save()
        
        return Response({
            'success': True,
            'log_sheet': LogSheetSerializer(log_sheet).data
        })
    
    @action(detail=True, methods=['put'], permission_classes=[AllowAny], authentication_classes=[])
    def update_visual_data(self, request, pk=None):
        """
        Update visual log data for a log sheet
        """
        log_sheet = self.get_object()
        
        # Update visual log data
        log_sheet.visual_log_data = request.data.get('visual_log_data', {})
        log_sheet.save()
        
        return Response({
            'success': True,
            'log_sheet': LogSheetSerializer(log_sheet).data
        })
    
    @action(detail=True, methods=['get'], permission_classes=[AllowAny], authentication_classes=[])
    def pdf(self, request, pk=None):
        """
        Generate PDF for a log sheet (public)
        """
        log_sheet = self.get_object()
        
        # Get driver information (fallback to trip.user username)
        driver_info = {
            'name': getattr(log_sheet.user, 'get_full_name', lambda: '')() or log_sheet.user.username,
            'id': log_sheet.user.username,
        }
        
        # Generate PDF
        pdf = LogGenerator.generate_pdf(log_sheet, driver_info)
        
        # Create response
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="log_sheet_{log_sheet.date}.pdf"'
        
        return response