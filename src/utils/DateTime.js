export function hours12(date) {
  const hours = date instanceof Date ? date.getHours() : new Date(date).getHours();
  return (hours + 24) % 12 || 12;
}

export function hours12tohours24(hour, isPm) {
  return (hour === 12 ? 0 : hour) + (isPm ? 12 : 0);
}

export function circularDistance(a, b, min, max, step) {
  const maxDistance = max - min;
  const distance = Math.abs(a - b);

  if (distance > maxDistance / 2) {
    if (a > b) {
      return max - a + (b - min + step);
    } else {
      return max - b + (a - min + step);
    }
  }
  return distance;
}

export function floorMinutesByStep(minutes, step) {
  return (Math.floor(minutes / step) * step) % 60;
}

export function ceilMinutesByStep(minutes, step) {
  return (Math.floor(minutes / step) * step) % 60;
}

export default {};
