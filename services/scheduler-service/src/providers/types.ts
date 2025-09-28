// Enhanced scheduler provider interfaces

export interface Holiday {
  /** Holiday name */
  name: string;
  /** Holiday date (YYYY-MM-DD) */
  date: string;
  /** Holiday type (national, regional, observance) */
  type: string;
  /** Whether this holiday affects business operations */
  affectsBusiness: boolean;
  /** Optional description */
  description?: string;
}

export interface HolidayRequest {
  /** Year to check holidays for */
  year: number;
  /** Country code (ISO 2-letter) */
  country: string;
  /** Optional state/province for regional holidays */
  state?: string;
  /** Include non-business affecting holidays */
  includeObservances?: boolean;
}

export interface HolidayResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Array of holidays */
  holidays: Holiday[];
  /** Country and year requested */
  metadata: {
    country: string;
    year: number;
    state?: string;
  };
  /** Error message if request failed */
  error?: string;
}

export interface TimezoneInfo {
  /** Timezone identifier (e.g., America/New_York) */
  timezone: string;
  /** Current offset from UTC in minutes */
  offsetMinutes: number;
  /** Whether timezone observes daylight saving time */
  observesDST: boolean;
  /** Timezone abbreviation (e.g., EST, EDT) */
  abbreviation: string;
}

export interface TimezoneRequest {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Optional timestamp to get timezone for specific date */
  timestamp?: number;
}

export interface TimezoneResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Timezone information */
  timezone?: TimezoneInfo;
  /** Error message if request failed */
  error?: string;
}

export interface AppointmentSlot {
  /** Start time (ISO 8601) */
  startTime: string;
  /** End time (ISO 8601) */
  endTime: string;
  /** Whether this slot is available */
  available: boolean;
  /** Slot duration in minutes */
  duration: number;
  /** Confidence score for this slot (0-1) */
  confidence: number;
  /** Reason if not available */
  unavailableReason?: string;
}

export interface SchedulingRequest {
  /** Adjuster's current location */
  adjusterLocation: {
    latitude: number;
    longitude: number;
    timezone?: string;
  };
  /** Appointments to schedule */
  appointments: Array<{
    id: string;
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    /** Preferred time slots */
    preferredTimes?: string[];
    /** Duration in minutes */
    duration: number;
    /** Priority (1-10, higher = more important) */
    priority: number;
    /** Customer availability constraints */
    constraints?: {
      earliestStart?: string;
      latestEnd?: string;
      blackoutPeriods?: Array<{
        start: string;
        end: string;
      }>;
    };
  }>;
  /** Date range to schedule within */
  dateRange: {
    startDate: string;
    endDate: string;
  };
  /** Working hours configuration */
  workingHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
    days: number[]; // 0=Sunday, 1=Monday, etc.
  };
}

export interface SchedulingResponse {
  /** Whether scheduling was successful */
  success: boolean;
  /** Optimized schedule */
  schedule?: Array<{
    appointmentId: string;
    scheduledTime: AppointmentSlot;
    estimatedTravelTime: number;
    confidence: number;
  }>;
  /** Schedule optimization metrics */
  metrics?: {
    totalTravelTime: number;
    utilizationRate: number;
    averageConfidence: number;
    holidaysConsidered: number;
  };
  /** Conflicts or issues found */
  conflicts?: Array<{
    appointmentId: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  /** Error message if scheduling failed */
  error?: string;
}

export interface HolidayProvider {
  /** Get holidays for a specific country and year */
  getHolidays(request: HolidayRequest): Promise<HolidayResponse>;
  
  /** Check if a specific date is a holiday */
  isHoliday(date: string, country: string, state?: string): Promise<boolean>;
  
  /** Provider name for identification */
  readonly name: string;
}

export interface TimezoneProvider {
  /** Get timezone information for coordinates */
  getTimezone(request: TimezoneRequest): Promise<TimezoneResponse>;
  
  /** Convert time between timezones */
  convertTime(time: string, fromTimezone: string, toTimezone: string): Promise<string>;
  
  /** Provider name for identification */
  readonly name: string;
}

export interface SchedulerProvider {
  /** Generate optimal schedule for appointments */
  generateSchedule(request: SchedulingRequest): Promise<SchedulingResponse>;
  
  /** Find available time slots for an appointment */
  findAvailableSlots(
    location: { latitude: number; longitude: number },
    duration: number,
    dateRange: { startDate: string; endDate: string },
    constraints?: any
  ): Promise<AppointmentSlot[]>;
  
  /** Provider name for identification */
  readonly name: string;
}