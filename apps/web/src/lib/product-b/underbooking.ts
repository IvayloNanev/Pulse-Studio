export type UtilizationBand = "Underbooked" | "Moderate" | "Healthy" | "Nearly full";

export type UnderbookingState = {
  utilization: number;
  band: UtilizationBand;
  warning: boolean;
};

export function getUnderbookingState(
  confirmedReservations: number,
  capacity: number,
  isCancelled = false,
): UnderbookingState {
  const safeCapacity = Number.isFinite(capacity) && capacity > 0 ? capacity : 0;
  const safeConfirmed = Number.isFinite(confirmedReservations)
    ? Math.max(0, confirmedReservations)
    : 0;
  const utilization = safeCapacity === 0
    ? 0
    : Math.min(100, Math.round((safeConfirmed / safeCapacity) * 100));

  const band: UtilizationBand = utilization < 40
    ? "Underbooked"
    : utilization < 70
      ? "Moderate"
      : utilization < 90
        ? "Healthy"
        : "Nearly full";

  return {
    utilization,
    band,
    warning: !isCancelled && safeCapacity > 0 && safeConfirmed / safeCapacity < 0.5,
  };
}
