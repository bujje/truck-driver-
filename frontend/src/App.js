import React, { useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  useMediaQuery,
  Avatar,
  Divider,
  Chip,
  Badge,
  Grid,
  Card,
  CardContent,
  Stack,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Route as RouteIcon,
  Assignment as LogsIcon,
  Assignment as AssignmentIcon,
  LocalShipping as TruckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

import TripPlanner from './pages/TripPlanner';
import Logs from './pages/Logs';
import ErrorBoundary from './components/ErrorBoundary';

const drawerWidth = 280;

const navigationItems = [
  { text: 'Trip Planner', icon: <RouteIcon />, path: '/planner' },
  { text: 'Logs', icon: <LogsIcon />, path: '/logs', badge: 3 },
];

function Layout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const location = useLocation();

  const handleDrawerToggle = () => {
    console.log('Hamburger menu clicked!', { isMobile, mobileOpen, desktopOpen });
    if (isMobile) {
      setMobileOpen(!mobileOpen);
      console.log('Mobile drawer toggled to:', !mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
      console.log('Desktop drawer toggled to:', !desktopOpen);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Close Button for Desktop */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={handleDrawerToggle} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      {/* Logo and Brand */}
      <Box sx={{ p: 3, textAlign: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: 'primary.main',
            mx: 'auto',
            mb: 2,
          }}
        >
          <TruckIcon />
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          TruckDriver Pro
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Professional Trip Planning
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, px: 2, py: 1 }}>
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error" variant="dot">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.875rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            border: 'none',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
            zIndex: 1300,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={handleDrawerToggle}>
            <CloseIcon />
          </IconButton>
        </Box>
        {drawer}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="persistent"
        open={desktopOpen}
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            border: 'none',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.3s ease-in-out',
            zIndex: 1200,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease-in-out',
          marginLeft: { xs: 0, md: desktopOpen ? `${drawerWidth}px` : 0 },
          zIndex: 1000,
        }}
      >
        {/* Top App Bar */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
            zIndex: 1100,
          }}
        >
          <Toolbar sx={{ minHeight: '64px !important' }}>
            <Tooltip title={desktopOpen ? "Hide sidebar" : "Show sidebar"}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleDrawerToggle}
                startIcon={<MenuIcon />}
                sx={{ 
                  mr: 2,
                  display: 'flex !important',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  minWidth: '120px',
                  minHeight: '48px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    transform: 'scale(1.02)',
                  }
                }}
              >
                {desktopOpen ? 'Hide Menu' : 'Show Menu'}
              </Button>
            </Tooltip>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
              {navigationItems.find(item => 
                location.pathname === item.path || 
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
              )?.text || 'Dashboard'}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Help & Support
            </Button>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ flex: 1, p: 3 }}>
          <Container maxWidth="xl" sx={{ height: '100%' }}>
            <Box className="fade-in">
              {children}
            </Box>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}


export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/planner" replace />} />
        <Route path="/planner" element={<Layout><TripPlanner /></Layout>} />
        <Route path="/logs" element={<Layout><Logs /></Layout>} />
        <Route path="*" element={<Layout><Typography>Page not found</Typography></Layout>} />
      </Routes>
    </ErrorBoundary>
  );
}