import { Decimal } from 'decimal.js';

export class CommissionService {
  private static readonly COMMISSION_RATE = new Decimal('0.10');

  /**
   * Calculates the commission for a deal.
   * If the deal status is 'WON', it applies a 10% rate to the deal amount.
   */
  public static calculateCommission(amount: Decimal | string | number, status: string): Decimal {
    if (status !== 'WON') {
      return new Decimal(0);
    }

    const dealAmount = new Decimal(amount);
    return dealAmount.mul(this.COMMISSION_RATE);
  }
}
