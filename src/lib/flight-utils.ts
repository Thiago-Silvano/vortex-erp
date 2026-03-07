import { FlightLeg } from '@/types/quote';

/**
 * Calculate day offset indicator for a flight leg
 * Returns "+1" if arrival is on a different day than departure, "+2" for 2 days later, etc.
 * Returns empty string if arrival is on the same day as departure
 */
export function getFlightDayOffset(leg: FlightLeg): string {
  if (!leg.departureDate || !leg.arrivalDate) return '';
  
  const depDate = new Date(leg.departureDate);
  const arrDate = new Date(leg.arrivalDate);
  
  const dayDiff = Math.floor((arrDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (dayDiff <= 0) return '';
  return `+${dayDiff}`;
}
