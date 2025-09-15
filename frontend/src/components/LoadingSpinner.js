import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';

const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 40, 
  showMessage = true,
  fullScreen = false 
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999,
        }),
      }}
    >
      <CircularProgress size={size} />
      {showMessage && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  return (
    <Fade in={true} timeout={300}>
      {content}
    </Fade>
  );
};

export default LoadingSpinner;

