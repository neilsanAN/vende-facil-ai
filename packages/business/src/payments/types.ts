export type CheckoutInput = {
  planCode: string;
  planName: string;
  amountCents: number;
  sessionId: string;
  appUrl: string;
  payerEmail?: string;
};

export type CheckoutResult = {
  provider: string;
  externalId: string;
  url: string;
  methods: Array<"pix" | "credit_card" | "account_money">;
};

export type ConfirmedPayment = {
  provider: string;
  externalId: string;
  status: "approved" | "pending" | "rejected" | "other";
  amountCents: number;
  currency: string;
  method?: string | null;
  externalReference?: string | null;
  raw: unknown;
};

export interface PaymentProvider {
  readonly id: string;
  isConfigured(): boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  fetchPayment(externalId: string): Promise<ConfirmedPayment>;
}
