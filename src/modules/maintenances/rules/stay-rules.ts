/**
 * Stay date rules (RN-01 and RN-05).
 * Used by the DTO class level validator and available for the service layer.
 */
export interface StayDates {
  checkInDate?: string;
  checkOutDate?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

export const todayIso = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getStayErrors = (dates: StayDates): string[] => {
  const errors: string[] = [];
  const { checkInDate, checkOutDate } = dates;

  // A malformed value is already reported by the property validator itself.
  if (!checkInDate || !ISO_DATE.test(checkInDate)) {
    return errors;
  }

  if (checkInDate.slice(0, 10) < todayIso()) {
    errors.push(`checkInDate cannot be in the past (received: ${checkInDate})`);
  }

  if (!checkOutDate || !ISO_DATE.test(checkOutDate)) {
    return errors;
  }

  if (checkOutDate <= checkInDate) {
    errors.push('checkOutDate must be after checkInDate');
  }

  return errors;
};
