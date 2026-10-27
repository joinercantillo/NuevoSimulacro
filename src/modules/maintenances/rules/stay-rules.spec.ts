import { getStayErrors, todayIso } from './stay-rules.js';

/** Builds an ISO date in the local time zone, same as todayIso(). */
const isoDaysFromToday = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

describe('stay date rules (RN-01 and RN-05)', () => {
  it('builds today in ISO 8601 format', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayIso()).toBe(isoDaysFromToday(0));
  });

  it('accepts a stay that starts in the future', () => {
    expect(
      getStayErrors({ checkInDate: isoDaysFromToday(10), checkOutDate: isoDaysFromToday(14) }),
    ).toEqual([]);
  });

  it('accepts a stay that starts today', () => {
    expect(
      getStayErrors({ checkInDate: isoDaysFromToday(0), checkOutDate: isoDaysFromToday(3) }),
    ).toEqual([]);
  });

  it('rejects a check-in date in the past', () => {
    const errors = getStayErrors({
      checkInDate: isoDaysFromToday(-1),
      checkOutDate: isoDaysFromToday(3),
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('checkInDate cannot be in the past');
  });

  it('rejects a check-out equal to the check-in', () => {
    const errors = getStayErrors({
      checkInDate: isoDaysFromToday(5),
      checkOutDate: isoDaysFromToday(5),
    });

    expect(errors).toEqual(['checkOutDate must be after checkInDate']);
  });

  it('rejects a check-out before the check-in', () => {
    const errors = getStayErrors({
      checkInDate: isoDaysFromToday(5),
      checkOutDate: isoDaysFromToday(2),
    });

    expect(errors).toEqual(['checkOutDate must be after checkInDate']);
  });

  it('returns both problems when the dates fail on both rules', () => {
    const errors = getStayErrors({
      checkInDate: isoDaysFromToday(-1),
      checkOutDate: isoDaysFromToday(-3),
    });

    expect(errors).toHaveLength(2);
  });

  it('does not crash with malformed or missing values', () => {
    expect(getStayErrors({ checkInDate: 'not-a-date' })).toEqual([]);
    expect(getStayErrors({ checkInDate: isoDaysFromToday(2), checkOutDate: '13/13/2027' })).toEqual(
      [],
    );
    expect(getStayErrors({})).toEqual([]);
  });
});
