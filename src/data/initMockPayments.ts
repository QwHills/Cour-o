// Initialize mock payments & payouts for demo revenue screen
// Call this once at app startup

import { mockBookings } from './mockBookings';
import { paymentsService } from '../services/payments.service';

let initialized = false;

export function initMockPayments() {
  if (initialized) return;
  initialized = true;

  // For each completed booking, simulate the full payment cycle
  for (const booking of mockBookings) {
    if (booking.isFree) continue;

    // Create the original payment
    const payment = {
      amount: booking.priceTotal,
      currency: 'EUR' as const,
      bookingReference: booking.id,
    };

    // Synchronous mock: create payment intent
    paymentsService.createPaymentIntent(payment).then(() => {
      if (booking.status === 'completed') {
        // Course already happened → start release + auto-release
        paymentsService.startReleaseWindow(booking.id);
        paymentsService.releaseFunds(booking.id, booking.teacherId);
      } else {
        // Course upcoming or just happened → check if past
        const sessionTime = new Date(booking.sessionStartsAt).getTime();
        const now = Date.now();
        if (sessionTime < now) {
          // Course already happened → in release window
          paymentsService.startReleaseWindow(booking.id);
          // Don't auto-release — let user see it in "pending" state
        }
        // Future courses: payment stays in 'held' escrow
      }
    });
  }
}
