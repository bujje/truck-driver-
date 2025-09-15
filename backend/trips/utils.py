"""
Utility functions for trip planning, HOS compliance, and Mapbox-powered geocoding/directions
"""
import math
import datetime
from typing import List, Tuple

import requests
from django.conf import settings
from geopy.distance import geodesic


class HOSCalculator:
    """
    Class for calculating Hours of Service compliance
    """
    # HOS constants
    DAILY_DRIVING_LIMIT = 11  # hours
    DAILY_DUTY_WINDOW = 14  # hours
    REQUIRED_REST_PERIOD = 10  # hours
    BREAK_AFTER_DRIVING = 8  # hours
    BREAK_DURATION = 0.5  # 30 minutes
    WEEKLY_LIMIT = 70  # hours in 8 days
    RESTART_HOURS = 34  # consecutive hours off-duty for restart

    # Trip constants
    AVERAGE_SPEED = 55  # mph (used only as a fallback)
    PICKUP_DURATION = 1  # hour
    DROPOFF_DURATION = 1  # hour
    FUEL_STOP_INTERVAL = 1000  # miles
    FUEL_STOP_DURATION = 0.25  # 15 minutes

    @staticmethod
    def calculate_driving_time(distance_miles):
        """Calculate driving time based on average speed (fallback when API duration is absent)."""
        return distance_miles / HOSCalculator.AVERAGE_SPEED

    @staticmethod
    def calculate_required_breaks(driving_time):
        """Calculate number of 30-minute breaks required"""
        return math.floor(driving_time / HOSCalculator.BREAK_AFTER_DRIVING)

    @staticmethod
    def calculate_required_rest_periods(total_trip_time):
        """Calculate number of 10-hour rest periods required"""
        return math.floor(total_trip_time / HOSCalculator.DAILY_DUTY_WINDOW)

    @staticmethod
    def calculate_fuel_stops(distance_miles):
        """Calculate number of fuel stops required"""
        return math.floor(distance_miles / HOSCalculator.FUEL_STOP_INTERVAL)

    @staticmethod
    def plan_trip(distance_miles, current_cycle_hours, driving_time_override=None):
        """
        Plan a trip with HOS compliance

        Args:
            distance_miles: Total trip distance in miles
            current_cycle_hours: Hours already used in current 8-day cycle
            driving_time_override: If provided, use this driving time (hours) instead of estimating

        Returns:
            Dictionary with trip plan details
        """
        # Basic calculations
        driving_time = (
            float(driving_time_override)
            if driving_time_override is not None
            else HOSCalculator.calculate_driving_time(distance_miles)
        )
        available_cycle_hours = HOSCalculator.WEEKLY_LIMIT - current_cycle_hours

        # Check if trip is possible with available hours
        if driving_time > available_cycle_hours:
            return {
                'feasible': False,
                'reason': 'Trip exceeds available cycle hours',
                'available_hours': available_cycle_hours,
                'required_hours': driving_time,
            }

        # Calculate breaks and rest periods
        required_breaks = HOSCalculator.calculate_required_breaks(driving_time)
        break_time = required_breaks * HOSCalculator.BREAK_DURATION

        # Calculate fuel stops
        fuel_stops = HOSCalculator.calculate_fuel_stops(distance_miles)
        fuel_stop_time = fuel_stops * HOSCalculator.FUEL_STOP_DURATION

        # Calculate total driving days
        daily_max_driving = min(
            HOSCalculator.DAILY_DRIVING_LIMIT,
            HOSCalculator.DAILY_DUTY_WINDOW
            - HOSCalculator.PICKUP_DURATION
            - HOSCalculator.DROPOFF_DURATION
            - break_time,
        )
        driving_days = math.ceil(driving_time / daily_max_driving)

        # Calculate rest periods (10-hour breaks between duty periods)
        rest_periods = max(0, driving_days - 1)
        rest_time = rest_periods * HOSCalculator.REQUIRED_REST_PERIOD

        # Calculate total trip time
        total_trip_time = (
            driving_time
            + break_time
            + fuel_stop_time
            + HOSCalculator.PICKUP_DURATION
            + HOSCalculator.DROPOFF_DURATION
            + rest_time
        )

        return {
            'feasible': True,
            'distance_miles': distance_miles,
            'driving_time': driving_time,
            'break_count': required_breaks,
            'break_time': break_time,
            'fuel_stops': fuel_stops,
            'fuel_stop_time': fuel_stop_time,
            'rest_periods': rest_periods,
            'rest_time': rest_time,
            'pickup_time': HOSCalculator.PICKUP_DURATION,
            'dropoff_time': HOSCalculator.DROPOFF_DURATION,
            'total_trip_time': total_trip_time,
            'driving_days': driving_days,
            'cycle_hours_used': driving_time,
            'cycle_hours_remaining': available_cycle_hours - driving_time,
        }


class GeocodingService:
    """
    Mapbox-based geocoding/search service with graceful fallback messages
    """

    def __init__(self):
        self.token = getattr(settings, 'MAP_API_KEY', '')

    def geocode(self, address):
        try:
            if not self.token:
                return {'success': False, 'error': 'Map API key missing'}
            url = (
                f"https://api.mapbox.com/geocoding/v5/mapbox.places/"
                f"{requests.utils.quote(address)}.json?access_token={self.token}&limit=1"
            )
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            js = r.json()
            feat = (js.get('features') or [None])[0]
            if feat and feat.get('center'):
                lng, lat = feat['center']
                return {
                    'success': True,
                    'latitude': lat,
                    'longitude': lng,
                    'address': feat.get('place_name') or address,
                }
            return {'success': False, 'error': 'Location not found'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def reverse(self, latitude, longitude):
        try:
            if not self.token:
                return {'success': False, 'error': 'Map API key missing'}
            url = (
                f"https://api.mapbox.com/geocoding/v5/mapbox.places/"
                f"{longitude},{latitude}.json?access_token={self.token}&limit=1"
            )
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            js = r.json()
            feat = (js.get('features') or [None])[0]
            if feat:
                return {
                    'success': True,
                    'latitude': latitude,
                    'longitude': longitude,
                    'address': feat.get('place_name') or f"{latitude},{longitude}",
                }
            return {'success': False, 'error': 'Address not found'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def search(self, query, limit=5):
        try:
            if not self.token:
                return {'success': False, 'error': 'Map API key missing', 'results': []}
            url = (
                f"https://api.mapbox.com/geocoding/v5/mapbox.places/"
                f"{requests.utils.quote(query)}.json?access_token={self.token}&autocomplete=true&limit={int(limit)}"
            )
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            js = r.json()
            items = []
            for f in js.get('features', []):
                c = f.get('center') or [None, None]
                items.append({
                    'address': f.get('place_name'),
                    'latitude': c[1],
                    'longitude': c[0],
                })
            return {'success': True, 'results': items}
        except Exception as e:
            return {'success': False, 'error': str(e), 'results': []}

    @staticmethod
    def calculate_distance(origin: Tuple[float, float], destination: Tuple[float, float]):
        """Great-circle distance (miles) as a fallback utility"""
        return geodesic(origin, destination).miles


class DirectionsService:
    """Mapbox Directions wrapper returning geojson coordinates and summary."""

    def __init__(self):
        self.token = getattr(settings, 'MAP_API_KEY', '')

    def route(self, origin: Tuple[float, float], destination: Tuple[float, float]):
        """
        Returns dict with:
        - success: bool
        - distance_miles: float
        - duration_hours: float
        - coordinates: List[[lat, lng], ...]  (geojson order is [lng, lat], we'll convert)
        """
        try:
            if not self.token:
                return {'success': False, 'error': 'Map API key missing'}
            # Mapbox expects lng,lat
            o_lnglat = f"{origin[1]},{origin[0]}"
            d_lnglat = f"{destination[1]},{destination[0]}"
            url = (
                "https://api.mapbox.com/directions/v5/mapbox/driving/"
                f"{o_lnglat};{d_lnglat}?access_token={self.token}&overview=full&geometries=geojson"
            )
            r = requests.get(url, timeout=15)
            r.raise_for_status()
            js = r.json()
            routes = js.get('routes') or []
            if not routes:
                return {'success': False, 'error': 'No route found'}
            best = routes[0]
            distance_meters = float(best.get('distance') or 0.0)
            duration_seconds = float(best.get('duration') or 0.0)
            coords = best.get('geometry', {}).get('coordinates') or []  # [lng,lat]
            latlngs = [[c[1], c[0]] for c in coords]
            return {
                'success': True,
                'distance_miles': distance_meters / 1609.344,
                'duration_hours': duration_seconds / 3600.0,
                'coordinates': latlngs,
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}


def _total_length_miles(coords: List[Tuple[float, float]]) -> float:
    total = 0.0
    for i in range(1, len(coords)):
        total += geodesic(coords[i - 1], coords[i]).miles
    return total


def interpolate_along_linestring(coords: List[Tuple[float, float]], fraction: float) -> Tuple[float, float]:
    """
    Return a coordinate at the given fraction [0,1] along a linestring, by distance.
    """
    if not coords:
        return None
    fraction = max(0.0, min(1.0, fraction))
    target = _total_length_miles(coords) * fraction
    acc = 0.0
    for i in range(1, len(coords)):
        seg_len = geodesic(coords[i - 1], coords[i]).miles
        if acc + seg_len >= target:
            # interpolate within this segment
            remain = target - acc
            t = 0.0 if seg_len == 0 else remain / seg_len
            lat = coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t
            lng = coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t
            return (lat, lng)
        acc += seg_len
    return coords[-1]