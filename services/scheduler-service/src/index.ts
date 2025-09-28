// Enhanced Scheduler Service - Holiday checks, timezone handling, and appointment optimization
// Provides intelligent scheduling with geographic and temporal optimization

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { 
  getHolidayProvider, 
  getTimezoneProvider, 
  getSchedulerProvider,
  initializeAllProviders 
} from './providers/index.js';
import type { 
  HolidayRequest, 
  TimezoneRequest, 
  SchedulingRequest 
} from './providers/types.js';

const app = express();
const port = Number(process.env.PORT) || 6800;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const providerStatus = await initializeAllProviders();
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'scheduler-service',
      version: '1.0.0',
      providers: {
        holiday: Object.fromEntries(providerStatus.holiday),
        timezone: Object.fromEntries(providerStatus.timezone),
        scheduler: Object.fromEntries(providerStatus.scheduler)
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        dryRun: process.env.DRY_RUN === '1',
        defaults: {
          holiday: process.env.SCHEDULER_HOLIDAY_PROVIDER || 'calendarific',
          timezone: process.env.SCHEDULER_TIMEZONE_PROVIDER || 'worldtime',
          scheduler: process.env.SCHEDULER_PROVIDER || 'enhanced'
        }
      }
    };

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get holidays endpoint
app.post('/holidays', async (req, res) => {
  try {
    const request: HolidayRequest = req.body;
    
    // Validate required fields
    if (!request.year || !request.country) {
      return res.status(400).json({
        success: false,
        holidays: [],
        error: 'Year and country fields are required'
      });
    }

    const provider = getHolidayProvider();
    const result = await provider.getHolidays(request);
    
    res.json(result);
  } catch (error) {
    console.error('Holiday lookup error:', error);
    res.status(500).json({
      success: false,
      holidays: [],
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Check if date is holiday endpoint
app.post('/is-holiday', async (req, res) => {
  try {
    const { date, country, state } = req.body;
    
    if (!date || !country) {
      return res.status(400).json({
        success: false,
        isHoliday: false,
        error: 'Date and country fields are required'
      });
    }

    const provider = getHolidayProvider();
    const isHoliday = await provider.isHoliday(date, country, state);
    
    res.json({
      success: true,
      isHoliday,
      date,
      country,
      state
    });
  } catch (error) {
    console.error('Holiday check error:', error);
    res.status(500).json({
      success: false,
      isHoliday: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Get timezone endpoint
app.post('/timezone', async (req, res) => {
  try {
    const request: TimezoneRequest = req.body;
    
    if (request.latitude === undefined || request.longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude fields are required'
      });
    }

    const provider = getTimezoneProvider();
    const result = await provider.getTimezone(request);
    
    res.json(result);
  } catch (error) {
    console.error('Timezone lookup error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Convert time between timezones endpoint
app.post('/convert-time', async (req, res) => {
  try {
    const { time, fromTimezone, toTimezone } = req.body;
    
    if (!time || !fromTimezone || !toTimezone) {
      return res.status(400).json({
        success: false,
        error: 'Time, fromTimezone, and toTimezone fields are required'
      });
    }

    const provider = getTimezoneProvider();
    const convertedTime = await provider.convertTime(time, fromTimezone, toTimezone);
    
    res.json({
      success: true,
      originalTime: time,
      fromTimezone,
      toTimezone,
      convertedTime
    });
  } catch (error) {
    console.error('Time conversion error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Generate optimized schedule endpoint
app.post('/generate-schedule', async (req, res) => {
  try {
    const request: SchedulingRequest = req.body;
    
    // Validate required fields
    if (!request.adjusterLocation || !request.appointments || !request.dateRange) {
      return res.status(400).json({
        success: false,
        error: 'adjusterLocation, appointments, and dateRange fields are required'
      });
    }

    if (!Array.isArray(request.appointments) || request.appointments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one appointment is required'
      });
    }

    const provider = getSchedulerProvider();
    const result = await provider.generateSchedule(request);
    
    res.json(result);
  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Find available slots endpoint
app.post('/available-slots', async (req, res) => {
  try {
    const { location, duration, dateRange, constraints } = req.body;
    
    if (!location || !duration || !dateRange) {
      return res.status(400).json({
        success: false,
        slots: [],
        error: 'location, duration, and dateRange fields are required'
      });
    }

    const provider = getSchedulerProvider();
    const slots = await provider.findAvailableSlots(location, duration, dateRange, constraints);
    
    res.json({
      success: true,
      slots,
      totalSlots: slots.length,
      availableSlots: slots.filter(slot => slot.available).length
    });
  } catch (error) {
    console.error('Available slots error:', error);
    res.status(500).json({
      success: false,
      slots: [],
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Optimize existing schedule endpoint
app.post('/optimize-schedule', async (req, res) => {
  try {
    const request: SchedulingRequest = req.body;
    
    if (!request.appointments || !Array.isArray(request.appointments)) {
      return res.status(400).json({
        success: false,
        error: 'appointments array is required'
      });
    }

    const provider = getSchedulerProvider();
    const result = await provider.generateSchedule(request);
    
    // Add optimization suggestions
    const optimizationReport = {
      ...result,
      optimizations: result.success ? {
        travelTimeReduction: result.metrics?.totalTravelTime ? 
          Math.round((1 - (result.metrics.totalTravelTime / 480)) * 100) : 0, // vs 8hrs
        utilizationImprovement: result.metrics?.utilizationRate ? 
          Math.round((result.metrics.utilizationRate - 0.6) * 100) : 0, // vs 60% baseline
        conflictsResolved: result.conflicts?.length || 0
      } : undefined
    };
    
    res.json(optimizationReport);
  } catch (error) {
    console.error('Schedule optimization error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Provider status endpoint
app.get('/providers', async (req, res) => {
  try {
    const providerStatus = await initializeAllProviders();
    
    res.json({
      holiday: {
        available: Array.from(providerStatus.holiday.keys()),
        status: Object.fromEntries(providerStatus.holiday),
        default: process.env.SCHEDULER_HOLIDAY_PROVIDER || 'calendarific'
      },
      timezone: {
        available: Array.from(providerStatus.timezone.keys()),
        status: Object.fromEntries(providerStatus.timezone),
        default: process.env.SCHEDULER_TIMEZONE_PROVIDER || 'worldtime'
      },
      scheduler: {
        available: Array.from(providerStatus.scheduler.keys()),
        status: Object.fromEntries(providerStatus.scheduler),
        default: process.env.SCHEDULER_PROVIDER || 'enhanced'
      },
      dryRun: process.env.DRY_RUN === '1'
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`📅 Enhanced Scheduler Service running on port ${port}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 DRY_RUN: ${process.env.DRY_RUN === '1' ? 'ENABLED' : 'DISABLED'}`);
  console.log('🎯 Default Providers:');
  console.log(`   Holiday: ${process.env.SCHEDULER_HOLIDAY_PROVIDER || 'calendarific'}`);
  console.log(`   Timezone: ${process.env.SCHEDULER_TIMEZONE_PROVIDER || 'worldtime'}`);
  console.log(`   Scheduler: ${process.env.SCHEDULER_PROVIDER || 'enhanced'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /health              - Service health check');
  console.log('  POST /holidays            - Get holidays for year/country');
  console.log('  POST /is-holiday          - Check if date is holiday');
  console.log('  POST /timezone            - Get timezone for coordinates');
  console.log('  POST /convert-time        - Convert time between timezones');
  console.log('  POST /generate-schedule   - Generate optimized schedule');
  console.log('  POST /available-slots     - Find available appointment slots');
  console.log('  POST /optimize-schedule   - Optimize existing schedule');
  console.log('  GET  /providers           - List available providers');
});