# 🚀 Deployment Guide - Truck Driver Pro

## Quick Deployment to Vercel

### Prerequisites
- Node.js 16+ installed
- Vercel CLI installed (`npm install -g vercel`)
- GitHub repository with your code
- Mapbox API key (optional, falls back to OpenStreetMap)

### Step 1: Deploy Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build the application
npm run build

# Deploy to Vercel
vercel --prod

# Follow the prompts:
# - Link to existing project or create new
# - Set project name: truck-driver-frontend
# - Set build command: npm run build
# - Set output directory: build
```

### Step 2: Deploy Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Deploy to Vercel
vercel --prod

# Follow the prompts:
# - Link to existing project or create new
# - Set project name: truck-driver-backend
# - Set build command: (leave empty)
# - Set output directory: (leave empty)
```

### Step 3: Set Environment Variables

In your Vercel dashboard:

#### Frontend Environment Variables
- `REACT_APP_API_URL`: Your backend Vercel URL (e.g., `https://truck-driver-backend.vercel.app`)

#### Backend Environment Variables
- `SECRET_KEY`: Generate a secure Django secret key
- `DEBUG`: `False`
- `ALLOWED_HOSTS`: Your Vercel domains
- `MAP_API_KEY`: Your Mapbox API key (optional)
- `POSTGRES_DATABASE`: Database name
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_HOST`: Database host
- `POSTGRES_PORT`: `5432`

### Step 4: Set Up Database

1. **Option A: Vercel PostgreSQL (Recommended)**
   - Go to Vercel dashboard
   - Add PostgreSQL database
   - Copy connection details to environment variables

2. **Option B: External Database**
   - Use any PostgreSQL provider (Railway, Supabase, etc.)
   - Add connection details to environment variables

### Step 5: Run Database Migrations

```bash
# Connect to your Vercel function
vercel env pull .env.local

# Run migrations
python manage.py migrate
```

### Step 6: Test Deployment

1. Visit your frontend URL
2. Test trip planning functionality
3. Test log sheet generation
4. Verify map integration works
5. Test ELD drawing interface

## Environment Variables Reference

### Frontend (.env.local)
```env
REACT_APP_API_URL=https://your-backend.vercel.app
```

### Backend (Vercel Environment Variables)
```env
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.vercel.app
MAP_API_KEY=your-mapbox-key
POSTGRES_DATABASE=your-db-name
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-db-password
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `ALLOWED_HOSTS` includes your frontend domain
   - Check CORS settings in Django settings.py

2. **Database Connection Issues**
   - Verify environment variables are set correctly
   - Check database credentials
   - Ensure database is accessible from Vercel

3. **Map Not Loading**
   - Check if MAP_API_KEY is set
   - Verify Mapbox API key is valid
   - Check browser console for errors

4. **Build Failures**
   - Check Node.js version (16+ required)
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

### Debugging Steps

1. **Check Vercel Logs**
   ```bash
   vercel logs
   ```

2. **Test API Endpoints**
   ```bash
   curl https://your-backend.vercel.app/api/trips/
   ```

3. **Check Frontend Console**
   - Open browser dev tools
   - Look for JavaScript errors
   - Check network requests

## Performance Optimization

### Frontend
- Enable gzip compression
- Use CDN for static assets
- Optimize images and fonts
- Enable browser caching

### Backend
- Use database connection pooling
- Enable query optimization
- Cache frequently accessed data
- Use Redis for session storage

## Security Checklist

- [ ] SECRET_KEY is secure and unique
- [ ] DEBUG is set to False
- [ ] ALLOWED_HOSTS is properly configured
- [ ] CORS settings are restrictive
- [ ] Database credentials are secure
- [ ] API keys are not exposed in frontend
- [ ] HTTPS is enforced

## Monitoring

### Vercel Analytics
- Enable Vercel Analytics for performance monitoring
- Set up error tracking
- Monitor API response times

### Database Monitoring
- Monitor database performance
- Set up query logging
- Track connection usage

## Backup Strategy

1. **Database Backups**
   - Set up automated daily backups
   - Test restore procedures
   - Store backups securely

2. **Code Backups**
   - Use Git for version control
   - Tag releases
   - Keep deployment logs

## Scaling Considerations

### Frontend
- Use Vercel's edge network
- Implement lazy loading
- Optimize bundle size

### Backend
- Use Vercel Functions for serverless scaling
- Implement caching strategies
- Monitor function execution times

---

## 🎯 Assessment Checklist

- [x] **Full-Stack Django + React Application**
- [x] **Live Hosted Version on Vercel**
- [x] **Trip Input Form** (Current, Pickup, Dropoff, Cycle Hours)
- [x] **Interactive Map** with route visualization
- [x] **ELD Log Sheets** with drawing capability
- [x] **HOS Compliance** (70hr/8day, 11hr daily, 30min breaks)
- [x] **Professional UI/UX** with modern design
- [x] **Multiple Log Sheets** for longer trips
- [x] **Free Map API** integration (OpenStreetMap + Mapbox)
- [x] **Comprehensive Documentation**
- [x] **Production-Ready Configuration**

**Your application is now ready for the assessment! 🚀**
