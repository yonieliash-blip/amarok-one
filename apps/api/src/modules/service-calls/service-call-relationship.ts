import { badRequest } from "../../lib/errors.js";

export interface EquipmentCustomerLink {
  customerId: string | null;
}

export function assertEquipmentMatchesCustomer(
  equipment: EquipmentCustomerLink,
  customerId: string,
): void {
  if (equipment.customerId && equipment.customerId !== customerId) {
    throw badRequest("Equipment is assigned to a different customer", {
      equipmentCustomerId: equipment.customerId,
      requestedCustomerId: customerId,
    });
  }
}
