import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Alert,
  Card,
  CardContent,
  Grid,
  Box,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Divider,
  Stack,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Assignment as AssignmentIcon,
  LocalShipping as TruckIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  CheckCircle as CertifyIcon,
  Draw as DrawIcon,
} from '@mui/icons-material';
import client from '../api/client';
import MultiLogSheet from '../components/MultiLogSheet';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function Logs() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'visual'
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [viewEditable, setViewEditable] = useState(true);

  const [openNew, setOpenNew] = useState(false);
  const [genForm, setGenForm] = useState({ trip_id: '', start_date: '', vehicle_number: '', trailer_number: '' });
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);

  const loadLogs = async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log('Loading logs...', forceRefresh ? '(forced refresh)' : '');
      let data;
      try {
        // Add timestamp to prevent caching when force refreshing
        const params = forceRefresh ? { t: Date.now(), _refresh: true } : { t: Date.now() };
        ({ data } = await client.get('logs/', { params }));
      } catch (err) {
        if (err?.response?.status === 404) {
          ({ data } = await client.get('logs'));
        } else {
          throw err;
        }
      }
      console.log('Logs loaded raw:', data);
      // DRF may return either a list or a paginated object with results
      const items = Array.isArray(data) ? data : (data?.results || []);
      console.log('Processed items:', items);
      console.log('Number of items:', items.length);
      setItems(items);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Refresh logs when navigating to this page (e.g., from trip planner)
  useEffect(() => {
    if (location.pathname === '/logs') {
      loadLogs(true); // Force refresh when navigating to logs page
    }
  }, [location.pathname]);

  // Refresh logs when the component becomes visible (e.g., when navigating from trip planner)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadLogs(true); // Force refresh when page becomes visible
      }
    };

    const handleFocus = () => {
      loadLogs(true); // Force refresh when window gains focus
    };

    // Listen for page visibility changes and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Also refresh when the component mounts (in case user navigated from trip planner)
    const timer = setTimeout(() => {
      loadLogs(true); // Force refresh on mount
    }, 100);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearTimeout(timer);
    };
  }, []);

  const handleMenuOpen = (event, log) => {
    setAnchorEl(event.currentTarget);
    setSelectedLog(log);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLog(null);
  };

  const handleRefresh = async () => {
    await loadLogs(true); // Force refresh when manually clicking refresh
  };

  const handlePrint = (log) => {
    // Try standard PDF route; fall back without trailing slash
    const url1 = `/api/logs/${log.id}/pdf/`;
    const url2 = `/api/logs/${log.id}/pdf`;
    // Use an image ping to detect 404 quickly is overkill here; just open url1
    // Most setups will handle one of these
    window.open(url1, '_blank') || window.open(url2, '_blank');
  };

  const handleDownload = (log) => {
    const url1 = `/api/logs/${log.id}/pdf/`;
    const url2 = `/api/logs/${log.id}/pdf`;
    window.open(url1, '_blank') || window.open(url2, '_blank');
  };

  const handleCertify = async (log) => {
    try {
      await client.post(`logs/${log.id}/certify/`);
      await loadLogs(true); // Force refresh after certifying
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      handleMenuClose();
    }
  };

  const handleDeleteLog = async (log) => {
    if (!log?.id) return;
    try {
      // Try with trailing slash first (DRF default)
      await client.delete(`logs/${log.id}/`);
    } catch (err) {
      if (err?.response?.status === 404) {
        // Fallback: try without trailing slash (if APPEND_SLASH=False)
        await client.delete(`logs/${log.id}`);
      } else {
        throw err;
      }
    }
    await loadLogs(true); // Force refresh after deleting
  };

  const handleGenerate = async (e) => {
    e?.preventDefault?.();
    try {
      setGenLoading(true);
      setGenError(null);
      if (!genForm.trip_id || !genForm.start_date) {
        setGenError('Trip ID and Start Date are required');
        return;
      }
      await client.post('logs/generate/', {
        trip_id: Number(genForm.trip_id),
        start_date: genForm.start_date,
        vehicle_number: genForm.vehicle_number,
        trailer_number: genForm.trailer_number,
      });
      setOpenNew(false);
      setGenForm({ trip_id: '', start_date: '', vehicle_number: '', trailer_number: '' });
      await loadLogs(true); // Force refresh after generating new logs
    } catch (err) {
      setGenError(err.response?.data?.error || JSON.stringify(err.response?.data) || err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleViewVisual = (log) => {
    setViewEditable(true);
    setSelectedTrip(log);
    setViewMode('visual');
  };

  const handleViewLog = (log) => {
    setViewEditable(false);
    setSelectedTrip(log);
    setViewMode('visual');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedTrip(null);
  };

  const handleSaveLog = async (logData, logSheet) => {
    try {
      // Save visual log data to backend
      try {
        await client.put(`logs/${logSheet.id}/update_visual_data/`, {
          visual_log_data: logData
        });
      } catch (err) {
        if (err?.response?.status === 404) {
          await client.put(`logs/${logSheet.id}/update_visual_data`, {
            visual_log_data: logData
          });
        } else {
          throw err;
        }
      }
      await loadLogs(true); // Force refresh after saving visual data
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handlePrintLog = (logData, logSheet) => {
    // Open print dialog for the log sheet
    window.open(`/api/logs/${logSheet.id}/pdf`, '_blank');
  };

  const handleDownloadLog = (logData, logSheet) => {
    // Download PDF of the log sheet
    window.open(`/api/logs/${logSheet.id}/pdf`, '_blank');
  };

  const handleCertifyLog = async (logData, logSheet) => {
    try {
      // Save current visual entries first so they persist
      try {
        await client.put(`logs/${logSheet.id}/update_visual_data/`, {
          visual_log_data: logData
        });
      } catch (err) {
        if (err?.response?.status === 404) {
          await client.put(`logs/${logSheet.id}/update_visual_data`, {
            visual_log_data: logData
          });
        } else {
          throw err;
        }
      }
      // Then certify
      try {
        await client.post(`logs/${logSheet.id}/certify/`);
      } catch (err) {
        if (err?.response?.status === 404) {
          await client.post(`logs/${logSheet.id}/certify`);
        } else {
          throw err;
        }
      }
      await loadLogs(true); // Force refresh after certifying log
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleGenerateNew = async (formData) => {
    try {
      await client.post('logs/generate/', formData);
      await loadLogs(true); // Force refresh after generating new logs
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  };

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      String(item.trip)?.toLowerCase().includes(term) ||
      String(item.date || '').toLowerCase().includes(term) ||
      String(item.vehicle_number || '').toLowerCase().includes(term) ||
      String(item.trailer_number || '').toLowerCase().includes(term) ||
      String(item.status || '').toLowerCase().includes(term)
    );
    const matchesStatus = statusFilter === 'all' || (item.status || '').toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'generated': return 'info';
      case 'certified': return 'success';
      case 'submitted': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'generated': return <AssignmentIcon />;
      case 'certified': return <CertifyIcon />;
      case 'submitted': return <ScheduleIcon />;
      default: return <AssignmentIcon />;
    }
  };

  // If in visual mode, show the multi-log sheet component
  if (viewMode === 'visual' && selectedTrip) {
    return (
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
              Visual Log Sheets
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Draw and fill out your ELD log sheets for Trip #{selectedTrip.trip}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ViewIcon />}
              onClick={() => setViewEditable((v) => !v)}
            >
              {viewEditable ? 'View Only' : 'Enable Edit'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleBackToList}
            >
              Back to List
            </Button>
          </Box>
        </Box>

        {/* Visual Log Sheet */}
        <MultiLogSheet
          trip={selectedTrip}
          logSheets={items.filter(item => item.trip === selectedTrip.trip)}
          onSave={handleSaveLog}
          onPrint={handlePrintLog}
          onDownload={handleDownloadLog}
          onCertify={handleCertifyLog}
          onGenerateNew={handleGenerateNew}
          isEditable={viewEditable}
        />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
          Log Sheets
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage your HOS-compliant log sheets and trip records.
        </Typography>
      </Box>

      {/* Filters and Search */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="generated">Generated</MenuItem>
                  <MenuItem value="certified">Certified</MenuItem>
                  <MenuItem value="submitted">Submitted</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
            <Grid item xs={12} sm={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ height: '56px' }}
                onClick={() => setOpenNew(true)}
              >
                New Log Sheet
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <ErrorMessage
          error={error}
          title="Error Loading Logs"
          onRetry={() => {
            setError(null);
            loadLogs();
          }}
          sx={{ mb: 3 }}
        />
      )}

      {/* Logs List */}
      {loading ? (
        <LoadingSpinner 
          message="Loading log sheets..." 
          fullScreen={false}
        />
      ) : filteredItems.length === 0 ? (
        <Card elevation={2}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No logs found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first log sheet to get started'
              }
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenNew(true)}>
              Create Log Sheet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredItems.map((log) => (
            <Grid item xs={12} md={6} lg={4} key={log.id}>
              <Card 
                elevation={2} 
                sx={{ 
                  height: '100%',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 40, height: 40 }}>
                        {getStatusIcon(log.status)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                          {`Trip #${log.trip}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {log.date}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, log)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  {/* Status */}
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={log.status || 'Unknown'}
                      color={getStatusColor(log.status)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  {/* Details */}
                  <Stack spacing={1} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TruckIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary">
                        Vehicle: {log.vehicle_number || 'Not specified'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary">
                        Trailer: {log.trailer_number || 'Not specified'}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Actions */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      sx={{ flex: 1 }}
                      onClick={() => handleViewLog(log)}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<DrawIcon />}
                      sx={{ flex: 1 }}
                      onClick={() => handleViewVisual(log)}
                    >
                      Draw
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      sx={{ flex: 1 }}
                      onClick={() => handlePrint(log)}
                    >
                      Print
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handlePrint(selectedLog); handleMenuClose(); }}>
          <PrintIcon sx={{ mr: 1 }} />
          Print / PDF
        </MenuItem>
        <MenuItem onClick={() => { handleDownload(selectedLog); handleMenuClose(); }}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <MenuItem onClick={() => handleCertify(selectedLog)}>
          <CertifyIcon sx={{ mr: 1 }} />
          Certify
        </MenuItem>
        <Divider />
        <MenuItem onClick={async () => {
          try {
            await handleDeleteLog(selectedLog);
          } catch (err) {
            setError(err.response?.data?.error || err.message);
          } finally {
            handleMenuClose();
          }
        }} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Close
        </MenuItem>
      </Menu>

      {/* Generate New Log Dialog */}
      <Dialog open={openNew} onClose={() => setOpenNew(false)} fullWidth maxWidth="sm">
        <DialogTitle>Generate Log Sheets</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Trip ID"
              value={genForm.trip_id}
              onChange={(e) => setGenForm({ ...genForm, trip_id: e.target.value })}
              required
            />
            <TextField
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={genForm.start_date}
              onChange={(e) => setGenForm({ ...genForm, start_date: e.target.value })}
              required
            />
            <TextField
              label="Vehicle Number (optional)"
              value={genForm.vehicle_number}
              onChange={(e) => setGenForm({ ...genForm, vehicle_number: e.target.value })}
            />
            <TextField
              label="Trailer Number (optional)"
              value={genForm.trailer_number}
              onChange={(e) => setGenForm({ ...genForm, trailer_number: e.target.value })}
            />
            {genError && <Alert severity="error">{genError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNew(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={genLoading} variant="contained">
            {genLoading ? <CircularProgress size={20} /> : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}