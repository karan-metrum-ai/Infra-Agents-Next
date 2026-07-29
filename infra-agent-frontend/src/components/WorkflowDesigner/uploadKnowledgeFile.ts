import { getIdentity } from "@/lib/authTokenProvider";

export interface UploadKnowledgeFileCallbacks {
  /** Fires repeatedly during the upload (0-50, network transfer only — XHR
   * is used instead of `fetch` specifically because `fetch` has no upload
   * progress event). */
  onUploadProgress?: (progress: number) => void;
  /** Fires once the upload completes and server-side ingestion begins. */
  onIngestionStart?: () => void;
}

/**
 * Uploads a single knowledge-bank file for an agent via
 * `POST /api/knowledge/{teamId}/upload`. Ported from the Vite app's
 * `uploadFileToAPI` inline helper; dev-mode identity headers use the same
 * `x-forwarded-*` convention as `features/api/baseQuery.ts`'s cookie-session
 * BFF model (`getIdentity()` already exists in this app for that exact
 * purpose).
 */
export function uploadKnowledgeFile(
  file: File,
  teamId: string,
  agentName: string,
  callbacks: UploadKnowledgeFileCallbacks = {},
): Promise<void> {
  const formData = new FormData();
  formData.append("agent_name", agentName);
  formData.append("files", file);

  const identity = getIdentity();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        callbacks.onUploadProgress?.(Math.round((event.loaded / event.total) * 50));
      }
    });

    xhr.upload.addEventListener("load", () => {
      callbacks.onIngestionStart?.();
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      try {
        const errorData = JSON.parse(xhr.responseText) as { message?: string };
        reject(new Error(errorData.message || `Upload failed with status ${xhr.status}`));
      } catch {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload was cancelled")));

    xhr.open("POST", `/api/knowledge/${teamId}/upload`);
    xhr.withCredentials = true;

    if (process.env.NODE_ENV === "development" && identity) {
      xhr.setRequestHeader("x-forwarded-user", identity.userId);
      xhr.setRequestHeader("x-forwarded-roles", identity.role);
      xhr.setRequestHeader("x-forwarded-tenant", identity.tenantId);
    }

    xhr.send(formData);
  });
}

/** Maps a selected agent's label/type to the backend `agent_name` the
 * knowledge upload endpoint expects. Ported as-is from the Vite source. */
export function mapAgentNameForUpload(label: string, type?: string): string {
  const l = (label || "").toLowerCase();
  const t = (type || "").toLowerCase();
  if (t === "hardware-operations" || l.includes("hardware")) return "hardware_operations";
  if (t === "operating-system-management" || l.includes("operating"))
    return "operating_system_management";
  if (t === "level1-support" || l.includes("noc") || l.includes("support")) return "level1_support";
  if (t === "operations-manager" || l.includes("operations")) return "operations_manager";
  return (label || "").toLowerCase().replace(/\s+/g, "_");
}
