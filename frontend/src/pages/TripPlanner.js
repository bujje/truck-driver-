import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Stack, 
  Alert, 
  Paper, 
  Typography, 
  CircularProgress, 
  Divider,
  Card,
  CardContent,
  Grid,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import client from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import SimpleMap from '../components/SimpleMap';
import {
  Room as RoomIcon,
  LocalShipping as LocalShippingIcon,
  Place as PlaceIcon,
  Route as RouteIcon,
  Schedule as ScheduleIcon,
  Directions as DirectionsIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  Assignment as LogsIcon,
} from '@mui/icons-material';

// Remove ClickPicker function as it's now handled by AdvancedMap

export default function TripPlanner() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_hours: 70,
    trip_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [genError, setGenError] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genOk, setGenOk] = useState(null);
  const [genForm, setGenForm] = useState({ start_date: '', vehicle_number: '', trailer_number: '' });

  // State for map selection and which field is active
  const [activeField, setActiveField] = useState(null); // 'current' | 'pickup' | 'dropoff'
  const [markers, setMarkers] = useState({ current: null, pickup: null, dropoff: null });

  // Suggestions state for each field
  const [suggestions, setSuggestions] = useState({ current: [], pickup: [], dropoff: [] });
  const [searchLoading, setSearchLoading] = useState({ current: false, pickup: false, dropoff: false });

  // Mapbox token
  const [mapboxToken, setMapboxToken] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('mapbox-token/');
        setMapboxToken(data?.token || '');
      } catch {}
    })();
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const searchPlaces = async (fieldKey, query, categories = []) => {
    if (!query || query.length < 3) {
      setSuggestions((s) => ({ ...s, [fieldKey]: [] }));
      return;
    }
    setSearchLoading((l) => ({ ...l, [fieldKey]: true }));
    try {
      if (mapboxToken) {
        // Use stable Mapbox Geocoding API for autocomplete
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&autocomplete=true&limit=8&types=poi,place,address`;
        const res = await fetch(url);
        const json = await res.json();
        let feats = (json?.features || []).map((f) => ({
          label: f.place_name,
          lat: f.center?.[1],
          lng: f.center?.[0],
          title: f.text,
          subtitle: f.properties?.category || f.properties?.address || '',
          categoryText: (f.properties?.category || '').toLowerCase(),
        }));
        // Client-side category filter when provided
        if (categories && categories.length) {
          const needles = categories.map((c) => String(c).toLowerCase());
          const filtered = feats.filter((o) =>
            needles.some((n) => o.categoryText.includes(n) || (o.title || '').toLowerCase().includes(n))
          );
          feats = filtered.length ? filtered : feats; // fallback to unfiltered if empty
        }
        setSuggestions((s) => ({ ...s, [fieldKey]: feats }));
      } else {
        // Fallback to backend Nominatim
        const { data } = await client.post('geocoding/', { query });
        const opts = (data?.results || []).map((r) => ({ label: r.address, lat: r.latitude, lng: r.longitude }));
        setSuggestions((s) => ({ ...s, [fieldKey]: opts }));
      }
    } catch (e) {
      setSuggestions((s) => ({ ...s, [fieldKey]: [] }));
    } finally {
      setSearchLoading((l) => ({ ...l, [fieldKey]: false }));
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      if (mapboxToken) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&limit=1`;
        const res = await fetch(url);
        const json = await res.json();
        const name = json?.features?.[0]?.place_name;
        if (name) return name;
      }
      // Fallback to backend
      const { data } = await client.post('geocoding/', { address: `${lat}, ${lng}` });
      return data?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const applyPick = async (latlng) => {
    if (!activeField) return;
    const address = await reverseGeocode(latlng.lat, latlng.lng);
    setMarkers((m) => ({ ...m, [activeField]: latlng }));
    if (activeField === 'current') setForm((f) => ({ ...f, current_location: address }));
    if (activeField === 'pickup') setForm((f) => ({ ...f, pickup_location: address }));
    if (activeField === 'dropoff') setForm((f) => ({ ...f, dropoff_location: address }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setGenOk(null);
    try {
      // POST /api/trips/calculate/
      const { data } = await client.post('trips/calculate/', {
        ...form,
        current_cycle_hours: parseFloat(form.current_cycle_hours),
      });
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.error || JSON.stringify(err.response?.data) || err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onGenerateLogs = async (e) => {
    e.preventDefault();
    if (!result?.trip_id) return;
    setGenLoading(true);
    setGenError(null);
    setGenOk(null);
    try {
      // Normalize date to YYYY-MM-DD if user typed MM/DD/YYYY
      const normalizeDate = (s) => {
        if (!s) return s;
        if (s.includes('/')) {
          const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (m) {
            const mm = m[1].padStart(2, '0');
            const dd = m[2].padStart(2, '0');
            const yyyy = m[3];
            return `${yyyy}-${mm}-${dd}`;
          }
        }
        return s; // already ISO from <input type="date">
      };

      const payload = { 
        trip_id: result.trip_id, 
        ...genForm, 
        start_date: normalizeDate(genForm.start_date)
      };
      console.log('Generating logs with payload:', payload);
      console.log('Start date type:', typeof payload.start_date);
      console.log('Start date value:', payload.start_date);
      // Ensure start_date exists
      if (!payload.start_date) throw new Error('Start date is required');
      const response = await client.post('logs/generate/', payload);
      console.log('Log generation response:', response.data);
      console.log('Response status:', response.status);
      setGenOk('Log sheets generated successfully! Redirecting to logs page...');
      // Redirect to logs page after a short delay
      setTimeout(() => {
        navigate('/logs', { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Error generating logs:', err);
      const msg = err.response?.data?.error || JSON.stringify(err.response?.data) || err.message;
      setGenError(msg);
    } finally {
      setGenLoading(false);
    }
  };

  // Prepare map data for AdvancedMap
  const mapData = React.useMemo(() => {
    const t = result?.trip;
    if (!t) return { markers: [], routes: [], stops: [] };

    const markers = [];
    const routes = [];
    const stops = [];

    // Add location markers
    if (t.current_location_lat && t.current_location_lng) {
      markers.push({
        lat: t.current_location_lat,
        lng: t.current_location_lng,
        type: 'current',
        title: 'Current Location',
        address: t.current_location
      });
    }

    if (t.pickup_location_lat && t.pickup_location_lng) {
      markers.push({
        lat: t.pickup_location_lat,
        lng: t.pickup_location_lng,
        type: 'pickup',
        title: 'Pickup Location',
        address: t.pickup_location
      });
    }

    if (t.dropoff_location_lat && t.dropoff_location_lng) {
      markers.push({
        lat: t.dropoff_location_lat,
        lng: t.dropoff_location_lng,
        type: 'dropoff',
        title: 'Dropoff Location',
        address: t.dropoff_location
      });
    }

    // Add route data
    if (result?.route?.current_to_pickup?.coordinates) {
      routes.push({
        coordinates: result.route.current_to_pickup.coordinates,
        type: 'current_to_pickup',
        distance: result.route.current_to_pickup.distance_miles,
        duration: result.route.current_to_pickup.duration_hours
      });
    }

    if (result?.route?.pickup_to_dropoff?.coordinates) {
      routes.push({
        coordinates: result.route.pickup_to_dropoff.coordinates,
        type: 'pickup_to_dropoff',
        distance: result.route.pickup_to_dropoff.distance_miles,
        duration: result.route.pickup_to_dropoff.duration_hours
      });
    }

    // Add HOS stops
    if (t.stops) {
      t.stops.forEach(stop => {
        stops.push({
          latitude: stop.latitude,
          longitude: stop.longitude,
          type: stop.stop_type,
          location: stop.location,
          radius: stop.stop_type === 'rest' ? 2000 : 1000
        });
      });
    }

    return { markers, routes, stops };
  }, [result]);

  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    'Enter Trip Details',
    'Select Locations',
    'Review & Calculate',
    'Generate Logs'
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
          Trip Planner
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Plan your route, calculate driving time, and generate HOS-compliant log sheets.
        </Typography>
        
        {/* Progress Stepper */}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Form */}
        <Grid item xs={12} lg={6}>
          <Card elevation={2} sx={{ height: 'fit-content' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <RouteIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Trip Information
                </Typography>
              </Box>
              
              <form onSubmit={onSubmit}>
                <Stack spacing={3}>
                  {/* Current Location */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                      Current Location
                    </Typography>
                    <Autocomplete
                      freeSolo
                      options={suggestions.current}
                      loading={searchLoading.current}
                      onInputChange={(_, value) => { setForm((f) => ({ ...f, current_location: value })); searchPlaces('current', value); }}
                      onChange={(_, value) => {
                        if (!value) return;
                        const label = typeof value === 'string' ? value : value.label;
                        setForm((f) => ({ ...f, current_location: label }));
                        if (value && typeof value !== 'string' && value.lat && value.lng) {
                          setMarkers((m) => ({ ...m, current: { lat: value.lat, lng: value.lng } }));
                        }
                      }}
                      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                      renderOption={(props, option) => (
                        <li {...props}>
                          <RoomIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                          <span>
                            <div>{option.title || option.label}</div>
                            {option.subtitle && <div style={{ fontSize: 12, opacity: 0.7 }}>{option.subtitle}</div>}
                          </span>
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          placeholder="Enter your current location"
                          name="current_location" 
                          value={form.current_location} 
                          required 
                          fullWidth 
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <RoomIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                        />
                      )}
                    />
                  </Box>

                  {/* Pickup Location */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                      Pickup Location
                    </Typography>
                    <Autocomplete
                      freeSolo
                      options={suggestions.pickup}
                      loading={searchLoading.pickup}
                      onInputChange={(_, value) => { setForm((f) => ({ ...f, pickup_location: value })); searchPlaces('pickup', value); }}
                      onChange={(_, value) => {
                        if (!value) return;
                        const label = typeof value === 'string' ? value : value.label;
                        setForm((f) => ({ ...f, pickup_location: label }));
                        if (value && typeof value !== 'string' && value.lat && value.lng) {
                          setMarkers((m) => ({ ...m, pickup: { lat: value.lat, lng: value.lng } }));
                        }
                      }}
                      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                      renderOption={(props, option) => (
                        <li {...props}>
                          <LocalShippingIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} />
                          <span>
                            <div>{option.title || option.label}</div>
                            {option.subtitle && <div style={{ fontSize: 12, opacity: 0.7 }}>{option.subtitle}</div>}
                          </span>
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          placeholder="Enter pickup location"
                          name="pickup_location" 
                          value={form.pickup_location} 
                          required 
                          fullWidth 
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <LocalShippingIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                        />
                      )}
                    />
                  </Box>

                  {/* Dropoff Location */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                      Dropoff Location
                    </Typography>
                    <Autocomplete
                      freeSolo
                      options={suggestions.dropoff}
                      loading={searchLoading.dropoff}
                      onInputChange={(_, value) => { setForm((f) => ({ ...f, dropoff_location: value })); searchPlaces('dropoff', value); }}
                      onChange={(_, value) => {
                        if (!value) return;
                        const label = typeof value === 'string' ? value : value.label;
                        setForm((f) => ({ ...f, dropoff_location: label }));
                        if (value && typeof value !== 'string' && value.lat && value.lng) {
                          setMarkers((m) => ({ ...m, dropoff: { lat: value.lat, lng: value.lng } }));
                        }
                      }}
                      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                      renderOption={(props, option) => (
                        <li {...props}>
                          <PlaceIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                          <span>
                            <div>{option.title || option.label}</div>
                            {option.subtitle && <div style={{ fontSize: 12, opacity: 0.7 }}>{option.subtitle}</div>}
                          </span>
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          placeholder="Enter dropoff location"
                          name="dropoff_location" 
                          value={form.dropoff_location} 
                          required 
                          fullWidth 
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <PlaceIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                        />
                      )}
                    />
                  </Box>

                  {/* Additional Trip Details */}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                        Current Cycle Hours
                      </Typography>
                      <TextField 
                        name="current_cycle_hours" 
                        type="number" 
                        inputProps={{ step: 0.5, min: 0, max: 70 }} 
                        value={form.current_cycle_hours} 
                        onChange={onChange} 
                        required 
                        fullWidth
                        placeholder="0-70 hours"
                        InputProps={{
                          startAdornment: <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                        Trip Name (Optional)
                      </Typography>
                      <TextField 
                        name="trip_name" 
                        value={form.trip_name} 
                        onChange={onChange} 
                        fullWidth
                        placeholder="Enter trip name"
                        InputProps={{
                          startAdornment: <DirectionsIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    </Grid>
                  </Grid>

                  {/* Map Selection Buttons */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                      Map Selection
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button 
                        variant={activeField === 'current' ? 'contained' : 'outlined'} 
                        onClick={() => setActiveField('current')}
                        startIcon={<RoomIcon />}
                        size="small"
                        sx={{ mb: 1 }}
                      >
                        Pick Current
                      </Button>
                      <Button 
                        variant={activeField === 'pickup' ? 'contained' : 'outlined'} 
                        onClick={() => setActiveField('pickup')}
                        startIcon={<LocalShippingIcon />}
                        size="small"
                        sx={{ mb: 1 }}
                      >
                        Pick Pickup
                      </Button>
                      <Button 
                        variant={activeField === 'dropoff' ? 'contained' : 'outlined'} 
                        onClick={() => setActiveField('dropoff')}
                        startIcon={<PlaceIcon />}
                        size="small"
                        sx={{ mb: 1 }}
                      >
                        Pick Dropoff
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={() => setActiveField(null)}
                        startIcon={<ClearIcon />}
                        size="small"
                        sx={{ mb: 1 }}
                      >
                        Clear Selection
                      </Button>
                    </Stack>
                    {activeField && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Click on the map to select your {activeField} location
                      </Alert>
                    )}
                  </Box>

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <DirectionsIcon />}
                      size="large"
                      sx={{ flex: 1 }}
                    >
                      {loading ? 'Calculating...' : 'Calculate Trip'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={() => { 
                        setForm({ current_location: '', pickup_location: '', dropoff_location: '', current_cycle_hours: 70, trip_name: '' }); 
                        setMarkers({ current: null, pickup: null, dropoff: null }); 
                        setActiveField(null);
                      }} 
                      disabled={loading}
                      startIcon={<ClearIcon />}
                      size="large"
                    >
                      Clear
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Map */}
        <Grid item xs={12} lg={6}>
          <Card elevation={2} sx={{ height: 'fit-content' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <RouteIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Interactive Map
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Click on the map to select locations or use the search fields above
                </Typography>
              </Box>
              
              <SimpleMap
                center={result?.trip ? [result.trip.pickup_location_lat, result.trip.pickup_location_lng] : [39.5, -98.35]}
                zoom={result?.trip ? 6 : 4}
                markers={result?.trip ? mapData.markers : [
                  ...(markers.current ? [{
                    lat: markers.current.lat,
                    lng: markers.current.lng,
                    type: 'current',
                    title: 'Current Location'
                  }] : []),
                  ...(markers.pickup ? [{
                    lat: markers.pickup.lat,
                    lng: markers.pickup.lng,
                    type: 'pickup',
                    title: 'Pickup Location'
                  }] : []),
                  ...(markers.dropoff ? [{
                    lat: markers.dropoff.lat,
                    lng: markers.dropoff.lng,
                    type: 'dropoff',
                    title: 'Dropoff Location'
                  }] : [])
                ]}
                routes={mapData.routes}
                stops={mapData.stops}
                onLocationClick={applyPick}
                height={500}
                showControls={true}
                showRouteInfo={!!result?.trip}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Display */}
      {error && (
        <ErrorMessage
          error={error}
          title="Trip Calculation Error"
          onRetry={() => {
            setError(null);
            onSubmit({ preventDefault: () => {} });
          }}
          showDetails={true}
        />
      )}

      {/* Results Display */}
      {result && result.success && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', mb: 3 }}>
            Trip Calculation Results
          </Typography>
          
          <Grid container spacing={3}>
            {/* Trip Summary Card */}
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Trip Summary
                    </Typography>
                  </Box>
                  
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Trip ID</Typography>
                      <Chip label={String(result.trip_id ?? 'not saved')} size="small" color="primary" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Total Distance</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {result.trip?.total_distance?.toFixed?.(2)} miles
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Driving Time</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {result.trip?.estimated_driving_time} hrs
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Total Trip Time</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {result.trip?.total_trip_time} hrs
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* HOS Summary Card */}
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ScheduleIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      HOS Compliance
                    </Typography>
                  </Box>
                  
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">30-min Breaks</Typography>
                      <Chip label={result.hos_plan?.break_count || 0} size="small" color="info" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">10-hr Rest Periods</Typography>
                      <Chip label={result.hos_plan?.rest_periods || 0} size="small" color="warning" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Fuel Stops</Typography>
                      <Chip label={result.hos_plan?.fuel_stops || 0} size="small" color="secondary" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Driving Days</Typography>
                      <Chip label={result.hos_plan?.driving_days || 0} size="small" color="primary" />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Log Generation Card */}
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <LogsIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Generate Log Sheets
                    </Typography>
                  </Box>
                  
                  <form onSubmit={onGenerateLogs}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={4}>
                        <TextField 
                          label="Start Date" 
                          name="start_date" 
                          type="date" 
                          InputLabelProps={{ shrink: true }} 
                          value={genForm.start_date} 
                          onChange={(e) => setGenForm({ ...genForm, start_date: e.target.value })} 
                          required 
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField 
                          label="Vehicle Number (optional)" 
                          name="vehicle_number" 
                          value={genForm.vehicle_number} 
                          onChange={(e) => setGenForm({ ...genForm, vehicle_number: e.target.value })} 
                          fullWidth
                          placeholder="Enter vehicle number"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField 
                          label="Trailer Number (optional)" 
                          name="trailer_number" 
                          value={genForm.trailer_number} 
                          onChange={(e) => setGenForm({ ...genForm, trailer_number: e.target.value })} 
                          fullWidth
                          placeholder="Enter trailer number"
                        />
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                      <Button 
                        type="submit" 
                        variant="contained" 
                        disabled={genLoading || !result?.trip_id}
                        startIcon={genLoading ? <CircularProgress size={20} /> : <LogsIcon />}
                        size="large"
                      >
                        {genLoading ? 'Generating...' : 'Generate Logs'}
                      </Button>
                    </Box>
                    
                    {genError && (
                      <ErrorMessage
                        error={genError}
                        title="Log Generation Error"
                        onRetry={() => {
                          setGenError(null);
                          onGenerateLogs({ preventDefault: () => {} });
                        }}
                        sx={{ mt: 2 }}
                      />
                    )}
                    {genOk && (
                      <Alert 
                        severity="success" 
                        sx={{ mt: 2 }}
                        action={
                          <Button 
                            color="inherit" 
                            size="small" 
                            onClick={() => navigate('/logs')}
                            sx={{ fontWeight: 600 }}
                          >
                            View Logs Now
                          </Button>
                        }
                      >
                        {genOk}
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}