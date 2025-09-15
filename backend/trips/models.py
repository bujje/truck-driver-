from django.db import models
from django.contrib.auth.models import User


class Trip(models.Model):
    """
    Model to store trip information including route, stops, and HOS compliance data
    """
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trips')
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    
    # Location information
    current_location = models.CharField(max_length=255)
    current_location_lat = models.FloatField()
    current_location_lng = models.FloatField()
    
    pickup_location = models.CharField(max_length=255)
    pickup_location_lat = models.FloatField()
    pickup_location_lng = models.FloatField()
    
    dropoff_location = models.CharField(max_length=255)
    dropoff_location_lat = models.FloatField()
    dropoff_location_lng = models.FloatField()
    
    # HOS information
    current_cycle_hours = models.FloatField(help_text="Hours already worked in current 8-day cycle")
    
    # Trip calculations
    total_distance = models.FloatField(null=True, blank=True)
    estimated_driving_time = models.FloatField(null=True, blank=True)
    total_trip_time = models.FloatField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name


class Stop(models.Model):
    """
    Model to store information about stops along a trip route
    """
    STOP_TYPE_CHOICES = [
        ('rest', '10-Hour Rest Stop'),
        ('break', '30-Minute Break'),
        ('fuel', 'Fuel Stop'),
        ('pickup', 'Pickup Location'),
        ('dropoff', 'Dropoff Location'),
    ]
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='stops')
    stop_type = models.CharField(max_length=20, choices=STOP_TYPE_CHOICES)
    location = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    
    # Timing information
    arrival_time = models.DateTimeField()
    departure_time = models.DateTimeField(null=True, blank=True)
    duration = models.FloatField(help_text="Duration in hours")
    
    # Distance information
    distance_from_start = models.FloatField(help_text="Distance from trip start in miles")
    
    # Ordering
    sequence = models.IntegerField(help_text="Order of stop in the trip")
    
    def __str__(self):
        return f"{self.get_stop_type_display()} at {self.location}"
    
    class Meta:
        ordering = ['sequence']


class RouteSegment(models.Model):
    """
    Model to store information about segments of the route between stops
    """
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='route_segments')
    start_stop = models.ForeignKey(Stop, on_delete=models.CASCADE, related_name='outgoing_segments')
    end_stop = models.ForeignKey(Stop, on_delete=models.CASCADE, related_name='incoming_segments')
    
    # Route information
    distance = models.FloatField(help_text="Distance in miles")
    estimated_time = models.FloatField(help_text="Estimated driving time in hours")
    
    # Polyline for map rendering
    polyline = models.TextField(help_text="Encoded polyline for the route segment")
    
    # Ordering
    sequence = models.IntegerField(help_text="Order of segment in the trip")
    
    def __str__(self):
        return f"Route from {self.start_stop.location} to {self.end_stop.location}"
    
    class Meta:
        ordering = ['sequence']