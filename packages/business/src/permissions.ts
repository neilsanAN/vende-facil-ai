import type { MemberRole } from "@prisma/client";
import { AppError } from "./errors";

const RANK: Record<MemberRole, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };

export function assertMinRole(role: MemberRole, minimum: MemberRole) {
  if (RANK[role] < RANK[minimum]) {
    throw new AppError("FORBIDDEN", "Você não tem permissão para esta ação.", 403);
  }
}

export const ROLE_PERMISSIONS = {
  VIEWER: ["conteúdo:ler", "pedidos:ler", "estatísticas:ler"],
  EDITOR: ["conteúdo:escrever", "pedidos:atualizar", "publicações:criar"],
  ADMIN: ["equipe:gerir", "loja:configurar", "assinatura:ver"],
  OWNER: ["assinatura:alterar", "organização:encerrar"],
} as const;
