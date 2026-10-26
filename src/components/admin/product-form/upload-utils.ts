import type { UploadFolderContext } from "./types";

/**
 * Upload one image with real byte-level progress via XMLHttpRequest.
 */
export function uploadImageWithProgress(
  file: File,
  onProgress: (pct: number) => void,
  onProcessing: () => void,
  folderContext?: UploadFolderContext
): Promise<{ url: string; id: number | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("image", file);

    if (folderContext?.category) {
      form.append("category", folderContext.category);
    }
    if (folderContext?.subcategory) {
      form.append("subcategory", folderContext.subcategory);
    }
    if (folderContext?.product) {
      form.append("product", folderContext.product);
    }
    if (folderContext?.sku) {
      form.append("sku", folderContext.sku);
    }
    if (folderContext?.folder) {
      form.append("folder", folderContext.folder);
    }

    xhr.open("POST", "/api/admin/upload");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      // Cap at 95 until the server finishes Cloudinary / media processing
      const pct = Math.min(95, Math.round((e.loaded / e.total) * 95));
      onProgress(pct);
    };

    xhr.upload.onload = () => {
      onProgress(95);
      onProcessing();
    };

    xhr.onload = () => {
      let data: { url?: string; id?: number | null; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        /* ignore */
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        onProgress(100);
        resolve({ url: data.url, id: typeof data.id === "number" ? data.id : null });
        return;
      }

      reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(form);
  });
}
