import React from 'react';
import { 
  Alert, 
  AlertTitle, 
  Box, 
  Typography, 
  Button,
  Collapse,
  IconButton
} from '@mui/material';
import { 
  Error as ErrorIcon, 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const ErrorMessage = ({ 
  error, 
  title = 'Error', 
  onRetry, 
  showDetails = false,
  severity = 'error',
  sx = {}
}) => {
  const [expanded, setExpanded] = React.useState(false);

  if (!error) return null;

  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.response?.data?.error) return error.response.data.error;
    if (error.response?.data?.detail) return error.response.data.detail;
    if (error.response?.data) return JSON.stringify(error.response.data);
    return 'An unexpected error occurred';
  };

  const getErrorDetails = (error) => {
    if (error.response?.data) {
      return {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
    }
    return null;
  };

  const errorMessage = getErrorMessage(error);
  const errorDetails = getErrorDetails(error);

  return (
    <Alert 
      severity={severity} 
      sx={{ 
        mb: 2, 
        ...sx 
      }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {onRetry && (
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
          {errorDetails && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              aria-label="show details"
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>
      }
    >
      <AlertTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorIcon />
          <Typography variant="h6">
            {title}
          </Typography>
        </Box>
      </AlertTitle>
      
      <Typography variant="body2">
        {errorMessage}
      </Typography>
      
      {errorDetails && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Error Details:
            </Typography>
            <Box sx={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.05)', 
              p: 1, 
              borderRadius: 1,
              fontSize: '0.75rem',
              fontFamily: 'monospace'
            }}>
              <div><strong>Status:</strong> {errorDetails.status} {errorDetails.statusText}</div>
              <div><strong>Data:</strong> {JSON.stringify(errorDetails.data, null, 2)}</div>
            </Box>
          </Box>
        </Collapse>
      )}
    </Alert>
  );
};

export default ErrorMessage;

