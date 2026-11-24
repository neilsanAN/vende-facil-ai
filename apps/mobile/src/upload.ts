import { ApiClientError } from "@vendefacil/api-client";
import Constants from "expo-constants";
import { api } from "./api";

const baseUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

/** Envia foto local (file:// ou content://) para a API e confirma o asset. */
export async function uploadLocalImage(uri: string, mimeType = "image/jpeg", originalName = "produto.jpg") {
  const blobResponse = await fetch(uri);
  if (!blobResponse.ok) throw new ApiClientError("Não foi possível ler a foto.", "UPLOAD_READ", 400);
  const blob = await blobResponse.blob();
  const sizeBytes = blob.size || Number(blobResponse.headers.get("content-length") || 0);
  if (!sizeBytes) throw new ApiClientError("A foto está vazia ou ilegível.", "UPLOAD_EMPTY", 400);
  if (sizeBytes > 10 * 1024 * 1024) throw new ApiClientError("A foto precisa ter no máximo 10 MB.", "FILE_TOO_LARGE", 413);

  const created = await api.createUpload({
    mimeType: mimeType || "image/jpeg",
    sizeBytes,
    kind: "IMAGE",
    originalName,
  });

  const absolute = created.url.startsWith("http") ? created.url : `${baseUrl}${created.url}`;
  const put = await fetch(absolute, {
    method: created.method,
    headers: created.headers,
    body: blob,
  });
  if (!put.ok) throw new ApiClientError("O envio da foto falhou.", "UPLOAD", put.status);

  return api.confirmUpload(created.assetId);
}
