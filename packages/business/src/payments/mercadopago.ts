import { AppError } from "../errors";
import type { CheckoutInput, CheckoutResult, ConfirmedPayment, PaymentProvider } from "./types";

export class MercadoPagoProvider implements PaymentProvider {
  readonly id = "mercadopago";

  isConfigured() {
    return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new AppError("PROVIDER_NOT_CONFIGURED", "A cobrança online ainda não está configurada.", 503);
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ title: `MeuVende+ ${input.planName}`, quantity: 1, currency_id: "BRL", unit_price: input.amountCents / 100 }],
        external_reference: input.sessionId,
        notification_url: `${input.appUrl}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${input.appUrl}/pagamento/retorno?pagamento=ok`,
          failure: `${input.appUrl}/pagamento/retorno?pagamento=falha`,
          pending: `${input.appUrl}/pagamento/retorno?pagamento=pendente`,
        },
        auto_return: "approved",
        payment_methods: {
          excluded_payment_types: [],
          installments: 12,
        },
      }),
    });
    const payload = (await response.json()) as { id?: string; init_point?: string; message?: string };
    if (!response.ok || !payload.init_point || !payload.id) {
      throw new AppError("BILLING_FAILED", payload.message || "O Mercado Pago não abriu o checkout.", 502);
    }
    return {
      provider: this.id,
      externalId: payload.id,
      url: payload.init_point,
      methods: ["pix", "credit_card", "account_money"],
    };
  }

  async fetchPayment(externalId: string): Promise<ConfirmedPayment> {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new AppError("PROVIDER_NOT_CONFIGURED", "Cobrança não configurada.", 503);
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${externalId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const payment = (await paymentResponse.json()) as {
      status?: string;
      transaction_amount?: number;
      external_reference?: string;
      id?: number;
      currency_id?: string;
      payment_method_id?: string;
      payment_type_id?: string;
    };
    if (!paymentResponse.ok) throw new AppError("BILLING_FAILED", "Não foi possível confirmar o pagamento.", 502);
    const status =
      payment.status === "approved" ? "approved" : payment.status === "pending" || payment.status === "in_process" ? "pending" : payment.status === "rejected" ? "rejected" : "other";
    return {
      provider: this.id,
      externalId: String(payment.id || externalId),
      status,
      amountCents: Math.round((payment.transaction_amount || 0) * 100),
      currency: payment.currency_id || "BRL",
      method: payment.payment_type_id || payment.payment_method_id || null,
      externalReference: payment.external_reference || null,
      raw: payment,
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new MercadoPagoProvider();
}
