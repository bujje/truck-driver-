---
description: Repository Information Overview
alwaysApply: true
---

# Truck Driver Trip Planner Information

## Summary
A full-stack web application using Django (backend) and React (frontend) that helps truck drivers plan trips while automatically calculating required rest stops and generating compliant ELD (Electronic Logging Device) daily log sheets according to FMCSA Hours of Service regulations.

## Structure
- `/backend`: Django REST Framework application
- `/frontend`: React application
- `/docs`: Documentation and reference materials

## Language & Runtime
**Backend Language**: Python (Django 4.2.10)
**Frontend Language**: JavaScript (React)
**Database**: PostgreSQL
**Package Managers**: pip (backend), npm (frontend)

## Dependencies
**Backend Dependencies**:
- Django REST Framework
- psycopg2-binary
- python-dotenv
- geopy (geocoding)
- reportlab (PDF generation)
- django-cors-headers

**Frontend Dependencies**:
- React
- Material-UI or Tailwind CSS
- Leaflet (mapping)
- Form validation libraries

## Build & Installation
**Backend Setup**:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend Setup**:
```bash
cd frontend
npm install
npm start
```

## API Endpoints
- `POST /api/trips/` - Calculate trip and generate logs
- `GET /api/trips/{id}/` - Retrieve saved trip
- `GET /api/logs/{trip_id}/` - Get generated log sheets
- `POST /api/geocoding/` - Convert addresses to coordinates

## Key Features
- Route calculation with HOS compliance
- Interactive map with waypoints
- ELD log generation in FMCSA-compliant format
- Trip data persistence
- Mobile-responsive design

## Deployment
**Frontend**: Vercel
**Backend**: Railway/Heroku
**Database**: PostgreSQL (managed service)