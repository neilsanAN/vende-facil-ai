import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../business/src/ledger";
import { VOICE_CATALOG } from "../../business/src/plans";
import { syncPlanCatalog } from "../../business/src/plan-sync";

const db = new PrismaClient();

async function main() {
  await syncPlanCatalog(db);
  for (const voice of VOICE_CATALOG) {
    await db.voiceProfile.upsert({
      where: { provider_providerVoiceId_style: { provider: voice.provider, providerVoiceId: voice.providerVoiceId, style: voice.style } },
      create: { ...voice, language: "pt-BR", isSystem: true, active: true },
      update: { name: voice.name, gender: voice.gender, active: true },
    });
  }
  await db.platformSetting.upsert({
    where: { key: "registrationEnabled" },
    create: { key: "registrationEnabled", value: true },
    update: {},
  });
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await db.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: "Administração",
        passwordHash: await hashPassword(adminPassword),
        platformRole: "PLATFORM_ADMIN",
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
      },
      update: { platformRole: "PLATFORM_ADMIN", emailVerifiedAt: new Date(), passwordHash: await hashPassword(adminPassword) },
    });
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
