import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

const enabled = process.env.RUN_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("isolamento entre lojas", () => {
  it("não lê produto de outra organização", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();
    const suffix = randomUUID().slice(0, 8);
    const orgA = await db.organization.create({ data: { name: `A ${suffix}`, slug: `a-${suffix}` } });
    const orgB = await db.organization.create({ data: { name: `B ${suffix}`, slug: `b-${suffix}` } });
    const storeA = await db.store.create({ data: { organizationId: orgA.id, name: "A", slug: `loja-a-${suffix}` } });
    await db.store.create({ data: { organizationId: orgB.id, name: "B", slug: `loja-b-${suffix}` } });
    const product = await db.product.create({
      data: { organizationId: orgA.id, storeId: storeA.id, name: "Fone", slug: "fone", priceCents: 1000 },
    });
    const leaked = await db.product.findFirst({ where: { id: product.id, organizationId: orgB.id } });
    const visible = await db.product.findFirst({ where: { id: product.id, organizationId: orgA.id } });
    expect(leaked).toBeNull();
    expect(visible?.name).toBe("Fone");
    await db.organization.delete({ where: { id: orgA.id } });
    await db.organization.delete({ where: { id: orgB.id } });
    await db.$disconnect();
  });
});
