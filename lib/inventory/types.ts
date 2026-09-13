export type AvailabilityState = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unmapped' | 'unavailable';

export type InventoryAvailability = {
  slug: string;
  state: AvailabilityState;
  available: number | null;
  updatedAt: string | null;
};

export type InventoryReservation = {
  reservationId: string;
  status: 'active' | 'committed' | 'released' | 'expired';
  expiresAt: string | null;
  orderReference: string;
};

export class InventoryUnavailableError extends Error {
  constructor() { super("We're confirming tyre availability. Please try again shortly."); this.name = 'InventoryUnavailableError'; }
}

export class InventoryConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'InventoryConflictError'; }
}
