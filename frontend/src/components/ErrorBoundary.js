import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Alert, 
  AlertTitle,
  Card,
  CardContent,
  Stack
} from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon />
                    <Typography variant="h6">
                      Something went wrong
                    </Typography>
                  </Box>
                </AlertTitle>
              </Alert>
              
              <Stack spacing={2}>
                <Typography variant="body1">
                  We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={this.handleRetry}
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </Box>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Error Details (Development Only)
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{ 
                      backgroundColor: 'grey.100', 
                      p: 2, 
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.75rem'
                    }}>
                      {this.state.error.toString()}
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

