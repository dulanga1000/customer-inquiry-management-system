import { describe, expect, it } from "vitest";
import { createInquirySchema } from "@cims/shared";
import {
  getAllowedTransitions,
  isValidStatusTransition,
} from "../../src/modules/inquiries/statusTransitions.js";

describe("Inquiry Status Transitions & Shared Schema", () => {
  it("allows only SRS-defined transitions", () => {
    expect(isValidStatusTransition("new", "in_progress")).toBe(true);
    expect(isValidStatusTransition("in_progress", "resolved")).toBe(true);
    expect(isValidStatusTransition("resolved", "in_progress")).toBe(true);

    expect(isValidStatusTransition("new", "resolved")).toBe(false);
    expect(isValidStatusTransition("new", "new")).toBe(false);
    expect(isValidStatusTransition("in_progress", "new")).toBe(false);
    expect(isValidStatusTransition("in_progress", "in_progress")).toBe(false);
    expect(isValidStatusTransition("resolved", "new")).toBe(false);
    expect(isValidStatusTransition("resolved", "resolved")).toBe(false);
  });

  it("returns expected allowedTransitions per status", () => {
    expect(getAllowedTransitions("new")).toEqual(["in_progress"]);
    expect(getAllowedTransitions("in_progress")).toEqual(["resolved"]);
    expect(getAllowedTransitions("resolved")).toEqual(["in_progress"]);
  });

  it("validates inquiry contact as email or phone and trims inputs", () => {
    const validEmail = createInquirySchema.safeParse({
      customerName: "  Alice Perera  ",
      contact: "  alice@example.com  ",
      subject: "  Order delivery delay  ",
      description: "Customer reports order #1024 has not arrived yet.",
    });
    expect(validEmail.success).toBe(true);
    if (validEmail.success) {
      expect(validEmail.data.customerName).toBe("Alice Perera");
      expect(validEmail.data.contact).toBe("alice@example.com");
    }

    const validPhone = createInquirySchema.safeParse({
      customerName: "Bob Silva",
      contact: "+94 77 123 4567",
      subject: "Invoice question",
      description: "Needs a corrected VAT invoice for last month.",
    });
    expect(validPhone.success).toBe(true);

    const invalidContact = createInquirySchema.safeParse({
      customerName: "Bob Silva",
      contact: "123",
      subject: "Invoice question",
      description: "Needs a corrected VAT invoice for last month.",
    });
    expect(invalidContact.success).toBe(false);
  });
});
