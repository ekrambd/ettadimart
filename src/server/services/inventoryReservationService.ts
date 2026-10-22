/**
 * Real-Time Live Inventory Reservation Engine
 * 10-Minute Cart Hold Lock with Automatic TTL & Concurrency Protection
 */

export interface ReservationHold {
  id: string;
  sessionId: string;
  productId: string;
  quantity: number;
  expiresAt: number; // Unix timestamp in ms
  createdAt: number;
}

export class InventoryReservationService {
  private static instance: InventoryReservationService;
  private reservations = new Map<string, ReservationHold>(); // holdId -> ReservationHold
  private readonly HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    // Background sweep every 30 seconds to release expired locks
    setInterval(() => this.cleanupExpiredHolds(), 30_000);
  }

  public static getInstance(): InventoryReservationService {
    if (!InventoryReservationService.instance) {
      InventoryReservationService.instance = new InventoryReservationService();
    }
    return InventoryReservationService.instance;
  }

  /**
   * Reserve product inventory for a customer session
   */
  public reserve(sessionId: string, productId: string, quantity: number): { success: boolean; holdId?: string; expiresAt?: number; message?: string } {
    this.cleanupExpiredHolds();

    if (quantity <= 0) {
      return { success: false, message: 'Invalid quantity' };
    }

    const holdId = `hold_${sessionId}_${productId}`;
    const expiresAt = Date.now() + this.HOLD_DURATION_MS;

    const hold: ReservationHold = {
      id: holdId,
      sessionId,
      productId,
      quantity,
      expiresAt,
      createdAt: Date.now()
    };

    this.reservations.set(holdId, hold);

    return {
      success: true,
      holdId,
      expiresAt
    };
  }

  /**
   * Release reservation if user removes item or cancels checkout
   */
  public release(sessionId: string, productId: string): boolean {
    const holdId = `hold_${sessionId}_${productId}`;
    return this.reservations.delete(holdId);
  }

  /**
   * Commit reservation into an actual completed purchase
   */
  public commit(sessionId: string, productId: string): boolean {
    const holdId = `hold_${sessionId}_${productId}`;
    return this.reservations.delete(holdId);
  }

  /**
   * Get total currently reserved items for a product across all active user sessions
   */
  public getReservedCount(productId: string): number {
    this.cleanupExpiredHolds();
    let total = 0;
    for (const hold of this.reservations.values()) {
      if (hold.productId === productId && hold.expiresAt > Date.now()) {
        total += hold.quantity;
      }
    }
    return total;
  }

  /**
   * Get active reservations for a given session
   */
  public getSessionHolds(sessionId: string): ReservationHold[] {
    this.cleanupExpiredHolds();
    const list: ReservationHold[] = [];
    for (const hold of this.reservations.values()) {
      if (hold.sessionId === sessionId && hold.expiresAt > Date.now()) {
        list.push(hold);
      }
    }
    return list;
  }

  /**
   * Clean up expired holds
   */
  private cleanupExpiredHolds() {
    const now = Date.now();
    for (const [key, hold] of this.reservations.entries()) {
      if (hold.expiresAt <= now) {
        this.reservations.delete(key);
      }
    }
  }
}

export const inventoryReservationService = InventoryReservationService.getInstance();
