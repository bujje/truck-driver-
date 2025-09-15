from django.db import models
from django.contrib.auth.models import User
from trips.models import Trip


class LogSheet(models.Model):
    """
    Model to store ELD log sheet information
    """
    STATUS_CHOICES = [
        ('generated', 'Generated'),
        ('certified', 'Certified'),
        ('submitted', 'Submitted'),
    ]
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='log_sheets')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='log_sheets')
    
    # Log sheet information
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generated')
    
    # Vehicle information
    vehicle_number = models.CharField(max_length=50, blank=True)
    trailer_number = models.CharField(max_length=50, blank=True)
    
    # Visual log data (JSON field to store the drawn log data)
    visual_log_data = models.JSONField(default=dict, blank=True)
    
    # Certification
    certified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                    related_name='certified_logs')
    certified_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Log for {self.user.username} on {self.date}"
    
    class Meta:
        unique_together = ['trip', 'user', 'date']
        ordering = ['-date']


class DutyStatusChange(models.Model):
    """
    Model to store duty status changes for a log sheet
    """
    STATUS_CHOICES = [
        ('off_duty', 'Off Duty'),
        ('sleeper_berth', 'Sleeper Berth'),
        ('driving', 'Driving'),
        ('on_duty', 'On Duty (Not Driving)'),
    ]
    
    log_sheet = models.ForeignKey(LogSheet, on_delete=models.CASCADE, related_name='status_changes')
    
    # Status information
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration = models.FloatField(help_text="Duration in hours", null=True, blank=True)
    
    # Location information
    location = models.CharField(max_length=255)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    # Remarks
    remarks = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.get_status_display()} at {self.start_time}"
    
    class Meta:
        ordering = ['start_time']