import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  CheckCircle as CertifyIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import ELDLogSheet from './ELDLogSheet';

const MultiLogSheet = ({ 
  trip, 
  logSheets = [], 
  onSave, 
  onPrint, 
  onDownload, 
  onCertify,
  onGenerateNew,
  isEditable = true 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    start_date: '',
    vehicle_number: '',
    trailer_number: ''
  });
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  // Sort log sheets by date
  const sortedLogSheets = [...logSheets].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleGenerateNew = async () => {
    if (!generateForm.start_date) {
      setGenerateError('Start date is required');
      return;
    }

    try {
      setGenerateLoading(true);
      setGenerateError(null);

      // trip prop can be either a Trip object (with id) or a Log object (with trip FK id)
      const tripId = trip?.id ?? trip?.trip;
      if (!tripId) {
        throw new Error('Missing trip identifier to generate log sheets');
      }
      
      if (onGenerateNew) {
        await onGenerateNew({
          trip_id: tripId,
          start_date: generateForm.start_date,
          vehicle_number: generateForm.vehicle_number,
          trailer_number: generateForm.trailer_number
        });
      }
      
      setShowGenerateDialog(false);
      setGenerateForm({
        start_date: '',
        vehicle_number: '',
        trailer_number: ''
      });
    } catch (err) {
      setGenerateError(err.message || 'Failed to generate log sheets');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleSaveLog = (logData, logSheet) => {
    if (onSave) {
      onSave(logData, logSheet);
    }
  };

  const handlePrintLog = (logData, logSheet) => {
    if (onPrint) {
      onPrint(logData, logSheet);
    }
  };

  const handleDownloadLog = (logData, logSheet) => {
    if (onDownload) {
      onDownload(logData, logSheet);
    }
  };

  const handleCertifyLog = (logData, logSheet) => {
    if (onCertify) {
      onCertify(logData, logSheet);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'generated': return 'info';
      case 'certified': return 'success';
      case 'submitted': return 'warning';
      default: return 'default';
    }
  };

  const getTotalHours = (logSheet) => {
    if (!logSheet.status_changes) return 0;
    return logSheet.status_changes.reduce((total, change) => {
      return total + (change.duration || 0);
    }, 0);
  };

  const getDrivingHours = (logSheet) => {
    if (!logSheet.status_changes) return 0;
    return logSheet.status_changes
      .filter(change => change.status === 'driving')
      .reduce((total, change) => total + (change.duration || 0), 0);
  };

  const getOffDutyHours = (logSheet) => {
    if (!logSheet.status_changes) return 0;
    return logSheet.status_changes
      .filter(change => change.status === 'off_duty')
      .reduce((total, change) => total + (change.duration || 0), 0);
  };

  if (sortedLogSheets.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          No Log Sheets Available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Generate log sheets for this trip to get started.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowGenerateDialog(true)}
        >
          Generate Log Sheets
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Trip Log Sheets - {trip?.name || `Trip #${trip?.id}`}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {sortedLogSheets.length} log sheet{sortedLogSheets.length !== 1 ? 's' : ''} for this trip
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setShowGenerateDialog(true)}
          >
            Generate More
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => {
              // Print all log sheets
              sortedLogSheets.forEach(logSheet => {
                handlePrintLog({}, logSheet);
              });
            }}
          >
            Print All
          </Button>
        </Box>
      </Box>

      {/* Log Sheets Tabs */}
      <Paper elevation={2}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {sortedLogSheets.map((logSheet, index) => (
            <Tab
              key={logSheet.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    {new Date(logSheet.date).toLocaleDateString()}
                  </Typography>
                  <Chip
                    label={logSheet.status}
                    size="small"
                    color={getStatusColor(logSheet.status)}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          {sortedLogSheets.map((logSheet, index) => (
            <Box
              key={logSheet.id}
              sx={{ display: activeTab === index ? 'block' : 'none' }}
            >
              {/* Log Sheet Summary */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="h6" color="primary">
                        {new Date(logSheet.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Total Hours: {getTotalHours(logSheet).toFixed(1)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Driving Hours: {getDrivingHours(logSheet).toFixed(1)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Off Duty Hours: {getOffDutyHours(logSheet).toFixed(1)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handlePrintLog({}, logSheet)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="small"
                    startIcon={<PrintIcon />}
                    onClick={() => handlePrintLog({}, logSheet)}
                  >
                    Print
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadLog({}, logSheet)}
                  >
                    Download
                  </Button>
                  {isEditable && logSheet.status !== 'certified' && (
                    <Button
                      size="small"
                      color="success"
                      startIcon={<CertifyIcon />}
                      onClick={() => handleCertifyLog({}, logSheet)}
                    >
                      Certify
                    </Button>
                  )}
                </CardActions>
              </Card>

              {/* ELD Log Sheet */}
              <ELDLogSheet
                logSheet={logSheet}
                onSave={(logData) => handleSaveLog(logData, logSheet)}
                onPrint={(logData) => handlePrintLog(logData, logSheet)}
                onDownload={(logData) => handleDownloadLog(logData, logSheet)}
                onCertify={(logData) => handleCertifyLog(logData, logSheet)}
                isEditable={isEditable && logSheet.status !== 'certified'}
              />
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Generate New Log Sheets Dialog */}
      <Dialog open={showGenerateDialog} onClose={() => setShowGenerateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate New Log Sheets</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={generateForm.start_date}
              onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Vehicle Number (optional)"
              value={generateForm.vehicle_number}
              onChange={(e) => setGenerateForm({ ...generateForm, vehicle_number: e.target.value })}
              fullWidth
            />
            <TextField
              label="Trailer Number (optional)"
              value={generateForm.trailer_number}
              onChange={(e) => setGenerateForm({ ...generateForm, trailer_number: e.target.value })}
              fullWidth
            />
            {generateError && (
              <Alert severity="error">{generateError}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleGenerateNew} 
            variant="contained"
            disabled={generateLoading}
          >
            {generateLoading ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MultiLogSheet;
