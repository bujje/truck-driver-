import React, { useState, useRef, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Polyline, 
  Popup, 
  useMapEvents,
  Circle,
  Tooltip
} from 'react-leaflet';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  IconButton,
  Tooltip as MuiTooltip,
  Fab
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  MyLocation as MyLocationIcon,
  Layers as LayersIcon
} from '@mui/icons-material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapControls = ({ onZoomIn, onZoomOut, onCenter, onToggleLayers }) => {
  return (
    <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
      <Stack spacing={1}>
        <MuiTooltip title="Zoom In">
          <Fab size="small" onClick={onZoomIn} color="primary">
            <ZoomInIcon />
          </Fab>
        </MuiTooltip>
        <MuiTooltip title="Zoom Out">
          <Fab size="small" onClick={onZoomOut} color="primary">
            <ZoomOutIcon />
          </Fab>
        </MuiTooltip>
        <MuiTooltip title="Center Map">
          <Fab size="small" onClick={onCenter} color="secondary">
            <MyLocationIcon />
          </Fab>
        </MuiTooltip>
        <MuiTooltip title="Toggle Layers">
          <Fab size="small" onClick={onToggleLayers} color="default">
            <LayersIcon />
          </Fab>
        </MuiTooltip>
      </Stack>
    </Box>
  );
};

const RouteInfo = ({ route, onClose }) => {
  if (!route) return null;

  return (
    <Card sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, maxWidth: 300 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Route Information
        </Typography>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Distance:</Typography>
            <Chip label={`${route.distance?.toFixed(1)} miles`} size="small" color="primary" />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Duration:</Typography>
            <Chip label={`${route.duration?.toFixed(1)} hrs`} size="small" color="secondary" />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Stops:</Typography>
            <Chip label={route.stops?.length || 0} size="small" color="info" />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const AdvancedMap = ({ 
  center = [39.5, -98.35], 
  zoom = 4, 
  markers = [], 
  routes = [], 
  stops = [],
  onLocationClick,
  onMarkerClick,
  height = 500,
  showControls = true,
  showRouteInfo = true
}) => {
  const mapRef = useRef(null);
  const [mapLayers, setMapLayers] = useState('default');
  const [routeInfo, setRouteInfo] = useState(null);

  const map = mapRef.current;

  const handleZoomIn = () => {
    if (map) {
      map.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (map) {
      map.zoomOut();
    }
  };

  const handleCenter = () => {
    if (map) {
      map.setView(center, zoom);
    }
  };

  const handleToggleLayers = () => {
    setMapLayers(mapLayers === 'default' ? 'satellite' : 'default');
  };

  const getTileLayer = () => {
    switch (mapLayers) {
      case 'satellite':
        return (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        );
      default:
        return (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        );
    }
  };

  const getMarkerIcon = (type, color = 'blue') => {
    const iconColors = {
      current: '#1976d2',
      pickup: '#9c27b0',
      dropoff: '#388e3c',
      rest: '#ff9800',
      break: '#f44336',
      fuel: '#607d8b'
    };

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${iconColors[type] || color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
        ">
          ${type?.charAt(0)?.toUpperCase() || 'M'}
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  const getRouteColor = (type) => {
    const colors = {
      current_to_pickup: '#9c27b0',
      pickup_to_dropoff: '#1976d2',
      default: '#666'
    };
    return colors[type] || colors.default;
  };

  const getRouteWeight = (type) => {
    return type === 'pickup_to_dropoff' ? 5 : 3;
  };

  return (
    <Box sx={{ position: 'relative', height: height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        {getTileLayer()}
        
        {/* Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={[marker.lat, marker.lng]}
            icon={getMarkerIcon(marker.type, marker.color)}
            eventHandlers={{
              click: () => onMarkerClick?.(marker, index)
            }}
          >
            <Popup>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {marker.title || `${marker.type} Location`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {marker.description || `${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`}
                </Typography>
                {marker.address && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {marker.address}
                  </Typography>
                )}
              </Box>
            </Popup>
          </Marker>
        ))}

        {/* Routes */}
        {routes.map((route, index) => (
          <Polyline
            key={index}
            positions={route.coordinates}
            pathOptions={{
              color: getRouteColor(route.type),
              weight: getRouteWeight(route.type),
              opacity: 0.8
            }}
            eventHandlers={{
              click: () => setRouteInfo(route)
            }}
          />
        ))}

        {/* Stops with circles */}
        {stops.map((stop, index) => (
          <Circle
            key={index}
            center={[stop.latitude, stop.longitude]}
            radius={stop.radius || 1000} // 1km radius
            pathOptions={{
              color: stop.type === 'rest' ? '#ff9800' : '#f44336',
              fillColor: stop.type === 'rest' ? '#ff9800' : '#f44336',
              fillOpacity: 0.2,
              weight: 2
            }}
          >
            <Tooltip>
              <Box>
                <Typography variant="subtitle2">
                  {stop.type === 'rest' ? '10-Hour Rest Stop' : '30-Minute Break'}
                </Typography>
                <Typography variant="body2">
                  {stop.location}
                </Typography>
              </Box>
            </Tooltip>
          </Circle>
        ))}

        {/* Click handler */}
        <MapClickHandler onLocationClick={onLocationClick} />
      </MapContainer>

      {/* Map Controls */}
      {showControls && (
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onCenter={handleCenter}
          onToggleLayers={handleToggleLayers}
        />
      )}

      {/* Route Information */}
      {showRouteInfo && routeInfo && (
        <RouteInfo route={routeInfo} onClose={() => setRouteInfo(null)} />
      )}
    </Box>
  );
};

const MapClickHandler = ({ onLocationClick }) => {
  useMapEvents({
    click: (e) => {
      onLocationClick?.(e.latlng);
    }
  });
  return null;
};

export default AdvancedMap;
