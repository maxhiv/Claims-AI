// Enhanced scheduler provider with AI optimization

import { format, addMinutes, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import type { 
  SchedulerProvider, 
  SchedulingRequest, 
  SchedulingResponse, 
  AppointmentSlot 
} from './types.js';
import { getHolidayProvider, getTimezoneProvider } from './index.js';

export class EnhancedSchedulerProvider implements SchedulerProvider {
  readonly name = 'enhanced-scheduler';

  async generateSchedule(request: SchedulingRequest): Promise<SchedulingResponse> {
    try {
      const holidayProvider = getHolidayProvider();
      const timezoneProvider = getTimezoneProvider();
      
      // Get timezone for adjuster location
      const adjusterTimezone = await this.getLocationTimezone(
        request.adjusterLocation.latitude,
        request.adjusterLocation.longitude,
        timezoneProvider
      );

      // Get holidays for the date range
      const holidays = await this.getHolidaysInRange(
        request.dateRange.startDate,
        request.dateRange.endDate,
        holidayProvider
      );

      // Generate optimized schedule
      const optimizedSchedule = await this.optimizeAppointments(
        request,
        adjusterTimezone,
        holidays
      );

      // Calculate metrics
      const metrics = this.calculateMetrics(optimizedSchedule, holidays.length);

      return {
        success: true,
        schedule: optimizedSchedule,
        metrics,
        conflicts: []
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async findAvailableSlots(
    location: { latitude: number; longitude: number },
    duration: number,
    dateRange: { startDate: string; endDate: string },
    constraints?: any
  ): Promise<AppointmentSlot[]> {
    try {
      const timezoneProvider = getTimezoneProvider();
      const holidayProvider = getHolidayProvider();
      
      // Get timezone for location
      const timezone = await this.getLocationTimezone(
        location.latitude,
        location.longitude,
        timezoneProvider
      );

      // Get holidays
      const holidays = await this.getHolidaysInRange(
        dateRange.startDate,
        dateRange.endDate,
        holidayProvider
      );

      const slots: AppointmentSlot[] = [];
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      // Generate slots for each day
      for (let currentDate = startDate; currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const daySlots = await this.generateDaySlots(
          new Date(currentDate),
          duration,
          timezone,
          holidays,
          constraints
        );
        slots.push(...daySlots);
      }

      return slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    } catch (error) {
      console.error('Error finding available slots:', error);
      return [];
    }
  }

  private async optimizeAppointments(
    request: SchedulingRequest,
    adjusterTimezone: string,
    holidays: string[]
  ): Promise<Array<{
    appointmentId: string;
    scheduledTime: AppointmentSlot;
    estimatedTravelTime: number;
    confidence: number;
  }>> {
    const optimizedSchedule = [];
    
    // Sort appointments by priority and geographic clustering
    const sortedAppointments = this.sortAppointmentsByOptimization(
      request.appointments,
      request.adjusterLocation
    );

    let lastLocation = request.adjusterLocation;
    let currentTime = new Date(request.dateRange.startDate);

    for (const appointment of sortedAppointments) {
      // Calculate travel time from last location
      const travelTime = this.estimateTravelTime(lastLocation, appointment.location);
      
      // Find best available slot
      const availableSlots = await this.findAvailableSlots(
        appointment.location,
        appointment.duration,
        {
          startDate: currentTime.toISOString(),
          endDate: request.dateRange.endDate
        },
        appointment.constraints
      );

      // Filter out holiday slots
      const validSlots = availableSlots.filter(slot => 
        !this.isHoliday(new Date(slot.startTime), holidays)
      );

      if (validSlots.length > 0) {
        const bestSlot = validSlots[0]; // Already sorted by preference
        
        optimizedSchedule.push({
          appointmentId: appointment.id,
          scheduledTime: bestSlot,
          estimatedTravelTime: travelTime,
          confidence: this.calculateSlotConfidence(bestSlot, appointment)
        });

        // Update position and time for next appointment
        lastLocation = appointment.location;
        currentTime = addMinutes(new Date(bestSlot.endTime), travelTime);
      }
    }

    return optimizedSchedule;
  }

  private async generateDaySlots(
    date: Date,
    duration: number,
    timezone: string,
    holidays: string[],
    constraints?: any
  ): Promise<AppointmentSlot[]> {
    const slots: AppointmentSlot[] = [];
    
    // Skip weekends and holidays
    if (date.getDay() === 0 || date.getDay() === 6 || this.isHoliday(date, holidays)) {
      return slots;
    }

    // Default working hours: 9 AM to 5 PM
    const workStart = new Date(date);
    workStart.setHours(9, 0, 0, 0);
    const workEnd = new Date(date);
    workEnd.setHours(17, 0, 0, 0);

    // Generate 30-minute slots
    const slotDuration = 30; // minutes
    let currentSlot = new Date(workStart);

    while (currentSlot < workEnd && addMinutes(currentSlot, duration) <= workEnd) {
      const slotEnd = addMinutes(currentSlot, duration);
      
      const slot: AppointmentSlot = {
        startTime: currentSlot.toISOString(),
        endTime: slotEnd.toISOString(),
        available: this.isSlotAvailable(currentSlot, slotEnd, constraints),
        duration,
        confidence: this.calculateTimeSlotConfidence(currentSlot)
      };

      if (!slot.available) {
        slot.unavailableReason = 'Outside working hours or conflicting constraint';
      }

      slots.push(slot);
      currentSlot = addMinutes(currentSlot, slotDuration);
    }

    return slots;
  }

  private sortAppointmentsByOptimization(
    appointments: any[],
    adjusterLocation: { latitude: number; longitude: number }
  ): any[] {
    // Sort by a combination of priority and geographic distance
    return appointments.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (Math.abs(priorityDiff) > 2) return priorityDiff;

      // If priorities are similar, sort by distance
      const distanceA = this.calculateDistance(adjusterLocation, a.location);
      const distanceB = this.calculateDistance(adjusterLocation, b.location);
      
      return distanceA - distanceB;
    });
  }

  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLng = this.toRadians(point2.longitude - point1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * Math.cos(this.toRadians(point2.latitude)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private estimateTravelTime(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number {
    const distance = this.calculateDistance(from, to);
    // Estimate 1 km = 1.5 minutes (accounting for city traffic)
    return Math.round(distance * 1.5);
  }

  private isSlotAvailable(startTime: Date, endTime: Date, constraints?: any): boolean {
    if (!constraints) return true;

    // Check against blackout periods
    if (constraints.blackoutPeriods) {
      for (const blackout of constraints.blackoutPeriods) {
        const blackoutStart = new Date(blackout.start);
        const blackoutEnd = new Date(blackout.end);
        
        if (isWithinInterval(startTime, { start: blackoutStart, end: blackoutEnd }) ||
            isWithinInterval(endTime, { start: blackoutStart, end: blackoutEnd })) {
          return false;
        }
      }
    }

    return true;
  }

  private calculateTimeSlotConfidence(slotTime: Date): number {
    const hour = slotTime.getHours();
    
    // Higher confidence for mid-morning and early afternoon
    if (hour >= 9 && hour <= 11) return 0.9;  // 9-11 AM
    if (hour >= 13 && hour <= 15) return 0.85; // 1-3 PM
    if (hour >= 8 && hour <= 17) return 0.7;   // Regular business hours
    
    return 0.3; // Early morning or late afternoon
  }

  private calculateSlotConfidence(slot: AppointmentSlot, appointment: any): number {
    let confidence = slot.confidence;
    
    // Adjust for preferred times
    if (appointment.preferredTimes) {
      const slotHour = new Date(slot.startTime).getHours();
      const hasPreferredTime = appointment.preferredTimes.some((time: string) => {
        const preferredHour = new Date(time).getHours();
        return Math.abs(slotHour - preferredHour) <= 1;
      });
      
      if (hasPreferredTime) confidence += 0.1;
    }
    
    return Math.min(confidence, 1);
  }

  private isHoliday(date: Date, holidays: string[]): boolean {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.includes(dateStr);
  }

  private async getLocationTimezone(
    latitude: number,
    longitude: number,
    timezoneProvider: any
  ): Promise<string> {
    try {
      const response = await timezoneProvider.getTimezone({ latitude, longitude });
      return response.success ? response.timezone?.timezone || 'UTC' : 'UTC';
    } catch {
      return 'UTC';
    }
  }

  private async getHolidaysInRange(
    startDate: string,
    endDate: string,
    holidayProvider: any
  ): Promise<string[]> {
    try {
      const year = new Date(startDate).getFullYear();
      const response = await holidayProvider.getHolidays({
        year,
        country: 'US', // Default to US - could be configurable
        includeObservances: false
      });
      
      return response.success ? 
        response.holidays.filter((h: any) => h.affectsBusiness).map((h: any) => h.date) : 
        [];
    } catch {
      return [];
    }
  }

  private calculateMetrics(schedule: any[], holidaysCount: number): any {
    if (schedule.length === 0) {
      return {
        totalTravelTime: 0,
        utilizationRate: 0,
        averageConfidence: 0,
        holidaysConsidered: holidaysCount
      };
    }

    const totalTravelTime = schedule.reduce((sum, item) => sum + item.estimatedTravelTime, 0);
    const averageConfidence = schedule.reduce((sum, item) => sum + item.confidence, 0) / schedule.length;
    const totalWorkingMinutes = schedule.reduce((sum, item) => sum + item.scheduledTime.duration, 0);
    const utilizationRate = totalWorkingMinutes / (totalWorkingMinutes + totalTravelTime);

    return {
      totalTravelTime,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      holidaysConsidered: holidaysCount
    };
  }
}