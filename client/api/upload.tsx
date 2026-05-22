

import { DOMAIN } from "@/้host";

export type UploadedImage = {
  image_id: string;
  url: string;
};

export async function uploadImage(
  uri: string,
  token: string,
  imageType: "NORMAL" | "VTON" = "NORMAL",
  retries = 3,
): Promise<UploadedImage> {
  const fileName = uri.split("/").pop() || "image.jpg";
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📤 [uploadImage] Attempt ${attempt}/${retries}`, { imageType, fileName });

      const formData = new FormData();
      formData.append("file", { uri, name: fileName, type: mimeType } as any);
      formData.append("image_type", imageType);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${DOMAIN}/images/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.detail || error.message || "Upload failed");
        } catch {
          throw new Error(`Upload failed: ${response.status}`);
        }
      }

      const json = await response.json();
      console.log(`✅ [uploadImage] Success on attempt ${attempt}`);
      return json.data as UploadedImage;

    } catch (error: any) {
      const isLastAttempt = attempt === retries;
      const isNetworkError =
        error?.name === "AbortError" ||
        error?.message?.includes("Network request failed");

      console.error(`❌ [uploadImage] Attempt ${attempt} failed:`, error?.message);

      if (isLastAttempt || !isNetworkError) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      console.log(`🔄 [uploadImage] Retrying...`);
    }
  }

  throw new Error("Upload failed after all retries");
}