import { createId } from "@/lib/ids";
import { type PlatformState } from "@/lib/platform-state";
import type {
  ReturnReasonCode,
  ReturnRequest,
} from "@/lib/commerce-types";
import { sendReturnRequestNotice } from "@/lib/email";
import {
  PlatformError,
  mutate,
  readPlatform,
} from "@/lib/platform";

export async function listReturnsForCustomer(customerId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  return readPlatform((state) =>
    [...(state.returns ?? [])]
      .filter(
        (item) =>
          item.customerId === customerId || item.customerEmail.toLowerCase() === normalized,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

function restockReturnItems(state: PlatformState, request: ReturnRequest, now: string) {
  for (const item of request.items) {
    state.stock[item.variantId] = (state.stock[item.variantId] ?? 0) + item.quantity;
    state.inventoryMovements.unshift({
      id: createId("mov"),
      variantId: item.variantId,
      change: item.quantity,
      type: "return",
      relatedOrderNumber: request.orderNumber,
      reason: `RMA ${request.id}`,
      createdAt: now,
    });
  }
}

export async function createReturnRequest(input: {
  orderNumber: string;
  reason: string;
  reasonCode?: ReturnReasonCode;
  type?: "return" | "exchange";
  items?: { variantId: string; quantity: number }[];
  customerId?: string;
  requireDelivered?: boolean;
  source?: "customer" | "admin";
}) {
  const request = await mutate((state) => {
    const order = state.orders.find(
      (item) => item.orderNumber === input.orderNumber || item.orderNumber === input.orderNumber.toUpperCase(),
    );
    if (!order) throw new PlatformError("Order not found.", 404);

    if (input.customerId || input.requireDelivered) {
      if (input.customerId && order.customerId && order.customerId !== input.customerId) {
        throw new PlatformError("You can only return your own orders.", 403);
      }
      if (order.status !== "delivered" && order.status !== "shipped") {
        throw new PlatformError("Returns are available after the order is shipped or delivered.");
      }
      const open = (state.returns ?? []).some(
        (item) =>
          item.orderNumber === order.orderNumber &&
          (item.status === "requested" || item.status === "approved"),
      );
      if (open) {
        throw new PlatformError("A return request is already open for this order.");
      }
    }

    state.returns = state.returns ?? [];
    const lines =
      input.items && input.items.length > 0
        ? input.items.map((item) => {
            const line = order.items.find((entry) => entry.variantId === item.variantId);
            if (!line) throw new PlatformError("Return item not on order.");
            if (item.quantity > line.quantity) {
              throw new PlatformError(`Quantity too high for ${line.productTitle}.`);
            }
            return {
              variantId: line.variantId,
              productTitle: line.productTitle,
              quantity: item.quantity,
            };
          })
        : order.items.map((line) => ({
            variantId: line.variantId,
            productTitle: line.productTitle,
            quantity: line.quantity,
          }));
    if (lines.length === 0) throw new PlatformError("Select at least one item to return.");

    const now = new Date().toISOString();
    const request: ReturnRequest = {
      id: createId("rma"),
      orderNumber: order.orderNumber,
      customerEmail: order.customer.email,
      customerName: order.customer.fullName,
      customerId: input.customerId ?? order.customerId,
      items: lines,
      reason: input.reason.trim(),
      reasonCode: input.reasonCode,
      type: input.type ?? (input.reasonCode === "exchange" ? "exchange" : "return"),
      status: "requested",
      createdAt: now,
      updatedAt: now,
      source: input.source ?? "admin",
    };
    state.returns.unshift(request);
    return request;
  });
  await sendReturnRequestNotice(request).catch((error) => console.error("[email]", error));
  return request;
}

export async function updateReturnRequest(
  id: string,
  action: "approve" | "reject" | "restock" | "refund",
  adminNote?: string,
) {
  return mutate((state) => {
    const request = (state.returns ?? []).find((item) => item.id === id);
    if (!request) throw new PlatformError("Return not found.", 404);
    const now = new Date().toISOString();
    if (adminNote) request.adminNote = adminNote;
    request.updatedAt = now;
    if (action === "approve") {
      // Approve + restock stub in one step for ops speed.
      restockReturnItems(state, request, now);
      request.status = "restocked";
      const order = state.orders.find((item) => item.orderNumber === request.orderNumber);
      if (order) {
        order.status = "returned";
        order.updatedAt = now;
      }
    } else if (action === "reject") {
      request.status = "rejected";
    } else if (action === "restock") {
      restockReturnItems(state, request, now);
      request.status = "restocked";
    } else if (action === "refund") {
      request.status = "refunded";
      const order = state.orders.find((item) => item.orderNumber === request.orderNumber);
      if (order) {
        order.paymentStatus = "refunded";
        order.updatedAt = now;
      }
    }
    return request;
  });
}
