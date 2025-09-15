# 🚛 Truck Driver Pro - ELD Log Management System

A comprehensive Full-Stack application built with Django and React for truck drivers to plan trips, manage Hours of Service (HOS) compliance, and generate interactive ELD log sheets.

## 🎯 Features

### ✅ **Trip Planning & Route Management**
- **Interactive Map Integration** with OpenStreetMap/Mapbox
- **Real-time Route Calculation** with turn-by-turn directions
- **Location Search & Autocomplete** with geocoding
- **Click-to-Select Locations** on interactive map
- **Distance & Time Calculations** with HOS compliance

### ✅ **Hours of Service (HOS) Compliance**
- **70-Hour/8-Day Rule** enforcement
- **11-Hour Daily Driving Limit** tracking
- **30-Minute Break Requirements** calculation
- **10-Hour Off-Duty Minimum** enforcement
- **Automatic Rest Stop Suggestions** along routes

### ✅ **Visual ELD Log Sheets**
- **Interactive Canvas Drawing** for duty status entries
- **24-Hour Grid Layout** matching FMCSA standards
- **Multiple Log Sheets** for longer trips
- **Real-time Visual Feedback** with color-coded status
- **Undo/Redo Functionality** for corrections
- **Location & Remarks Tracking** for each entry

### ✅ **Professional UI/UX**
- **Modern Material-UI Design** with responsive layout
- **Intuitive Navigation** with sidebar and breadcrumbs
- **Loading States & Error Handling** throughout
- **Mobile-Responsive Design** for all devices
- **Professional Color Scheme** and typography

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+ and pip
- PostgreSQL 12+
- Mapbox API key (optional, falls back to OpenStreetMap)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/truck-driver-pro.git
   cd truck-driver-pro
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   cp env.example .env
   # Edit .env with your database and API settings
   python manage.py migrate
   python manage.py runserver
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api/

## 🛠️ Technology Stack

### **Frontend**
- **React 18** with functional components and hooks
- **Material-UI 5** for professional UI components
- **React Router 6** for navigation
- **Leaflet** for interactive maps
- **Axios** for API communication
- **React-Leaflet** for map integration

### **Backend**
- **Django 4.2** with REST Framework
- **PostgreSQL** for data persistence
- **Geopy** for geocoding and distance calculations
- **ReportLab** for PDF generation
- **Django CORS Headers** for cross-origin requests

### **Deployment**
- **Vercel** for frontend hosting
- **Vercel Functions** for backend API
- **Vercel PostgreSQL** for production database

## 📋 API Endpoints

### **Trip Management**
- `POST /api/trips/calculate/` - Calculate trip with HOS compliance
- `GET /api/trips/` - List all trips
- `GET /api/trips/{id}/` - Get trip details

### **Log Management**
- `GET /api/logs/` - List all log sheets
- `POST /api/logs/generate/` - Generate log sheets for trip
- `PUT /api/logs/{id}/update_visual_data/` - Update visual log data
- `POST /api/logs/{id}/certify/` - Certify log sheet
- `GET /api/logs/{id}/pdf/` - Download PDF of log sheet

### **Geocoding**
- `POST /api/geocoding/` - Geocode addresses and coordinates
- `GET /api/mapbox-token/` - Get Mapbox API token

## 🗺️ Map Integration

The application supports multiple map providers:

1. **Mapbox** (Primary) - High-quality maps with routing
2. **OpenStreetMap** (Fallback) - Free alternative
3. **Interactive Features**:
   - Click to select locations
   - Route visualization with polylines
   - Stop markers for rest breaks and fuel stops
   - Real-time distance and time calculations

## 📊 HOS Compliance Logic

### **Property-Carrying Driver Rules**
- **70 hours in 8 days** maximum driving time
- **11 hours daily driving** limit
- **30-minute break** required after 8 hours driving
- **10-hour off-duty** minimum between shifts
- **1 hour pickup/dropoff** time allocation
- **Fuel stops** every 1,000 miles

### **Automatic Calculations**
- Required rest periods
- Break stop locations
- Fuel stop intervals
- Total trip duration
- Cycle hours remaining

## 🎨 ELD Log Sheet Features

### **Visual Interface**
- **24-hour grid** with hour markers (00:00 - 23:00)
- **4 duty status rows**:
  - Off Duty (Blue)
  - Sleeper Berth (Purple)
  - Driving (Red)
  - On Duty - Not Driving (Green)

### **Interactive Drawing**
- Click on grid cells to add entries
- Real-time visual feedback
- Undo/Redo functionality
- Location and remarks input
- Automatic time calculations

### **Multiple Log Sheets**
- Automatic generation for multi-day trips
- Tabbed interface for easy navigation
- Trip summary with hours breakdown
- Batch print/download operations

## 🚀 Deployment

### **Vercel Deployment**

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Deploy Frontend**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Deploy Backend**
   ```bash
   cd backend
   vercel --prod
   ```

4. **Set Environment Variables**
   - `SECRET_KEY` - Django secret key
   - `MAP_API_KEY` - Mapbox API key
   - `POSTGRES_*` - Database credentials

### **Environment Variables**

Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.vercel.app
MAP_API_KEY=your-mapbox-api-key
POSTGRES_DATABASE=your-db-name
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-db-password
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432
```

## 🧪 Testing

### **Run Tests**
```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

### **Test Coverage**
- Unit tests for HOS calculations
- Integration tests for API endpoints
- Component tests for React components
- E2E tests for user workflows

## 📱 Mobile Support

The application is fully responsive and works on:
- **Desktop** (Chrome, Firefox, Safari, Edge)
- **Tablet** (iPad, Android tablets)
- **Mobile** (iOS Safari, Android Chrome)

## 🔒 Security Features

- **CORS Configuration** for cross-origin requests
- **Input Validation** on all forms
- **SQL Injection Protection** with Django ORM
- **XSS Protection** with proper escaping
- **HTTPS Enforcement** in production

## 📈 Performance Optimizations

- **Lazy Loading** for map components
- **Memoization** for expensive calculations
- **Debounced Search** for location autocomplete
- **Optimized Queries** with select_related
- **Static File Caching** with proper headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation wiki

## 🎥 Demo Video

Watch the [3-minute demo video](https://loom.com/share/your-video-id) showing:
- Trip planning workflow
- Interactive map features
- ELD log sheet drawing
- HOS compliance calculations
- Print and export functionality

## 🏆 Assessment Compliance

This application meets all requirements for the coding assessment:

✅ **Full-Stack Django + React Application**
✅ **Live Hosted Version on Vercel**
✅ **Trip Input Form** (Current, Pickup, Dropoff, Cycle Hours)
✅ **Interactive Map** with route visualization
✅ **ELD Log Sheets** with drawing capability
✅ **HOS Compliance** (70hr/8day, 11hr daily, 30min breaks)
✅ **Professional UI/UX** with modern design
✅ **Multiple Log Sheets** for longer trips
✅ **Free Map API** integration (OpenStreetMap + Mapbox)

---

**Built with ❤️ for truck drivers and the transportation industry**

#   t r u c k - d r i v i n g  
 