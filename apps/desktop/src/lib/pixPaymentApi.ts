export type PixCreateResponse = {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  expires_at: string;
};

export type PixStatusResponse = {
  status: "pending" | "approved" | "rejected" | "cancelled";
  license_key?: string;
};

function buildHeaders(appKey: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (appKey) h["X-AX-App-Key"] = appKey;
  return h;
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}

export async function apiCreatePixPayment(
  baseUrl: string,
  path: string,
  installationUuid: string,
  amount: number,
  description: string,
  appKey: string
): Promise<PixCreateResponse> {
  const bodyPayload = { installation_uuid: installationUuid, amount, description };
  console.debug("[AX] create-pix request body:", JSON.stringify(bodyPayload));
  const res = await fetch(joinUrl(baseUrl, path), {
    method: "POST",
    headers: buildHeaders(appKey),
    body: JSON.stringify(bodyPayload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[AX] create-pix error body:", errText);
    throw Object.assign(new Error(`HTTP ${res.status}`), { httpStatus: res.status });
  }
  const text = await res.text();
  console.debug("[AX] create-pix raw response:", text);
  return JSON.parse(text) as PixCreateResponse;
}

export async function apiCheckPixStatus(
  baseUrl: string,
  path: string,
  paymentId: string,
  installationUuid: string,
  appKey: string
): Promise<PixStatusResponse> {
  const url =
    joinUrl(baseUrl, path) +
    `?payment_id=${encodeURIComponent(paymentId)}&installation_uuid=${encodeURIComponent(installationUuid)}`;
  const res = await fetch(url, { headers: buildHeaders(appKey) });
  if (res.status === 400 || res.status === 404) {
    throw Object.assign(new Error(`HTTP ${res.status}`), { httpStatus: res.status, isInvalid: true });
  }
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { httpStatus: res.status });
  return res.json() as Promise<PixStatusResponse>;
}
