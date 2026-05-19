// Navigation param lists (typed)
import type { EnrichedCourse } from '../services/courses.service';
import type { Booking } from '../types/domain';

export type UserStackParamList = {
  MapHome: undefined;
  CourseDetail: { courseId: string };
  SlotPicker: { courseId: string };
  Checkout: { courseId: string; sessionId: string };
  BookingConfirmed: { bookingId: string };
  BookingDetail: { bookingId: string };
};

export type ProStackParamList = {
  Dashboard: undefined;
  Planning: undefined;
  Classes: undefined;
  CreateClass: undefined;
  ProBookings: undefined;
  Revenue: undefined;
  CalendarSync: undefined;
  Settings: undefined;
};
