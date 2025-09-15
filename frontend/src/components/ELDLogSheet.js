import React, { useState, useRef, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Divider,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CertifyIcon,
} from '@mui/icons-material';

const ELDLogSheet = ({ 
  logSheet, 
  onSave, 
  onPrint, 
  onDownload, 
  onCertify,
  isEditable = true 
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('off_duty');
  const [currentHour, setCurrentHour] = useState(0);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [location, setLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [logData, setLogData] = useState({});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'

  // Status colors
  const statusColors = {
    off_duty: '#E3F2FD',
    sleeper_berth: '#F3E5F5',
    driving: '#FFEBEE',
    on_duty: '#E8F5E8'
  };

  const statusBorders = {
    off_duty: '#1976D2',
    sleeper_berth: '#7B1FA2',
    driving: '#D32F2F',
    on_duty: '#388E3C'
  };

  // Initialize log data
  useEffect(() => {
    if (!logSheet) return;

    // Prefer saved visual_log_data if present; otherwise fall back to status_changes
    if (logSheet.visual_log_data && Object.keys(logSheet.visual_log_data || {}).length > 0) {
      setLogData(logSheet.visual_log_data);
      return;
    }

    if (logSheet.status_changes) {
      const data = {};
      logSheet.status_changes.forEach(change => {
        const date = new Date(change.start_time).toDateString();
        if (!data[date]) data[date] = {};
        const hour = new Date(change.start_time).getHours();
        data[date][hour] = {
          status: change.status,
          location: change.location,
          remarks: change.remarks,
          startTime: change.start_time,
          endTime: change.end_time
        };
      });
      setLogData(data);
    }
  }, [logSheet]);

  // Draw the ELD grid
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    canvas.width = 1200;
    canvas.height = 400;
    
    // Draw grid
    const cellWidth = canvas.width / 25; // 24 hours + status column
    const cellHeight = canvas.height / 5; // 4 status rows + header
    
    // Draw header
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, cellHeight);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, cellHeight);
    
    // Draw status column
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, cellWidth, canvas.height);
    ctx.strokeRect(0, 0, cellWidth, canvas.height);
    
    // Draw hour headers
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Status labels
    const statusLabels = ['Off Duty', 'Sleeper Berth', 'Driving', 'On Duty'];
    statusLabels.forEach((label, index) => {
      const y = cellHeight + (index * cellHeight) + (cellHeight / 2);
      ctx.fillText(label, cellWidth / 2, y);
    });
    
    // Hour labels
    for (let hour = 0; hour < 24; hour++) {
      const x = cellWidth + (hour * cellWidth) + (cellWidth / 2);
      ctx.fillText(hour.toString().padStart(2, '0'), x, cellHeight / 2);
    }
    
    // Draw grid lines
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let i = 0; i <= 25; i++) {
      const x = i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= 5; i++) {
      const y = i * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw existing log data
    drawLogData();
  };

  const drawLogData = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cellWidth = canvas.width / 25;
    const cellHeight = canvas.height / 5;
    
    Object.values(logData).forEach(dayData => {
      Object.entries(dayData).forEach(([hour, data]) => {
        const statusIndex = getStatusIndex(data.status);
        const x = cellWidth + (parseInt(hour) * cellWidth);
        const y = cellHeight + (statusIndex * cellHeight);
        
        // Fill cell with status color
        ctx.fillStyle = statusColors[data.status] || '#fff';
        ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
        
        // Draw border
        ctx.strokeStyle = statusBorders[data.status] || '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
      });
    });
  };

  const getStatusIndex = (status) => {
    const statusMap = {
      'off_duty': 0,
      'sleeper_berth': 1,
      'driving': 2,
      'on_duty': 3
    };
    return statusMap[status] || 0;
  };

  const getStatusFromIndex = (index) => {
    const statusMap = {
      0: 'off_duty',
      1: 'sleeper_berth',
      2: 'driving',
      3: 'on_duty'
    };
    return statusMap[index] || 'off_duty';
  };

  const handleCanvasClick = (event) => {
    if (!isEditable) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const cellWidth = canvas.width / 25;
    const cellHeight = canvas.height / 5;
    
    // Check if click is in status area
    if (x < cellWidth) return;
    
    const hour = Math.floor((x - cellWidth) / cellWidth);
    const statusIndex = Math.floor((y - cellHeight) / cellHeight);
    
    if (hour >= 0 && hour < 24 && statusIndex >= 0 && statusIndex < 4) {
      setCurrentHour(hour);
      setCurrentStatus(getStatusFromIndex(statusIndex));
      setShowAddEntry(true);
    }
  };

  const handleAddEntry = async () => {
    const newEntry = {
      status: currentStatus,
      hour: currentHour,
      location: location.trim(),
      remarks: remarks.trim(),
      startTime: new Date(logSheet.date),
      endTime: new Date(logSheet.date)
    };
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ action: 'add', entry: newEntry });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Update log data
    const dateKey = new Date(logSheet.date).toDateString();
    const newLogData = { ...logData };
    if (!newLogData[dateKey]) newLogData[dateKey] = {};
    newLogData[dateKey][currentHour] = newEntry;
    setLogData(newLogData);
    
    // Automatically save the drawing entry to the backend
    if (onSave) {
      try {
        setSaveStatus('saving');
        await onSave(newLogData);
        setSaveStatus('saved');
        // Clear the saved status after 2 seconds
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (error) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    }
    
    // Redraw canvas
    setTimeout(() => {
      drawGrid();
    }, 100);
    
    setShowAddEntry(false);
    setLocation('');
    setRemarks('');
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      // Apply previous state
      // This would need more complex state management
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      // Apply next state
      // This would need more complex state management
    }
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all entries?')) {
      const clearedLogData = {};
      setLogData(clearedLogData);
      setHistory([]);
      setHistoryIndex(-1);
      
      // Automatically save the cleared state to the backend
      if (onSave) {
        try {
          setSaveStatus('saving');
          await onSave(clearedLogData);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 2000);
        } catch (error) {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus(null), 3000);
        }
      }
      
      drawGrid();
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(logData);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint(logData);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(logData);
    }
  };

  const handleCertify = () => {
    if (onCertify) {
      onCertify(logData);
    }
  };

  useEffect(() => {
    drawGrid();
  }, [logData]);

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h2">
            Driver's Daily Log - {logSheet?.date ? new Date(logSheet.date).toLocaleDateString() : 'N/A'}
          </Typography>
          {saveStatus && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: saveStatus === 'saving' ? 'info.main' : 
                      saveStatus === 'saved' ? 'success.main' : 'error.main',
                fontWeight: 'bold'
              }}
            >
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'saved' ? 'Entry saved!' : 'Save failed'}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isEditable && (
            <>
              <Tooltip title="Undo">
                <IconButton onClick={handleUndo} disabled={historyIndex <= 0}>
                  <UndoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Redo">
                <IconButton onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                  <RedoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear All">
                <IconButton onClick={handleClear}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Print">
            <IconButton onClick={handlePrint}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton onClick={handleDownload}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          {isEditable && (
            <Tooltip title="Save">
              <IconButton onClick={handleSave}>
                <SaveIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Driver Info */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Driver Name"
            value={logSheet?.user?.username || 'N/A'}
            disabled
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Vehicle Number"
            value={logSheet?.vehicle_number || 'N/A'}
            disabled
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Trailer Number"
            value={logSheet?.trailer_number || 'N/A'}
            disabled
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Chip
            label={logSheet?.status || 'Generated'}
            color={logSheet?.status === 'certified' ? 'success' : 'default'}
            icon={logSheet?.status === 'certified' ? <CertifyIcon /> : null}
          />
        </Grid>
      </Grid>

      {/* ELD Grid */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Hours of Service Grid
        </Typography>
        <Box
          sx={{
            border: '2px solid #000',
            borderRadius: 1,
            overflow: 'hidden',
            cursor: isEditable ? 'crosshair' : 'default'
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              width: '100%',
              height: '400px',
              display: 'block'
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {isEditable ? 'Click on a cell to add a duty status entry' : 'View-only mode'}
        </Typography>
      </Box>

      {/* Status Legend */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Status Legend
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {Object.entries(statusColors).map(([status, color]) => (
            <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: color,
                  border: `2px solid ${statusBorders[status]}`,
                  borderRadius: 1
                }}
              />
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {status.replace('_', ' ')}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {isEditable && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddEntry(true)}
          >
            Add Entry
          </Button>
        )}
        {isEditable && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CertifyIcon />}
            onClick={handleCertify}
          >
            Certify Log
          </Button>
        )}
      </Box>

      {/* Add Entry Dialog */}
      <Dialog open={showAddEntry} onClose={() => setShowAddEntry(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Duty Status Entry</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={currentStatus}
                    label="Status"
                    onChange={(e) => setCurrentStatus(e.target.value)}
                  >
                    <MenuItem value="off_duty">Off Duty</MenuItem>
                    <MenuItem value="sleeper_berth">Sleeper Berth</MenuItem>
                    <MenuItem value="driving">Driving</MenuItem>
                    <MenuItem value="on_duty">On Duty (Not Driving)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Hour"
                  type="number"
                  value={currentHour}
                  onChange={(e) => setCurrentHour(parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 23 }}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <TextField
              fullWidth
              label="Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddEntry(false)}>Cancel</Button>
          <Button onClick={handleAddEntry} variant="contained">
            Add Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ELDLogSheet;
