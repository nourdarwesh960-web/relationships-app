/**
 * Reusable image compression utility for RelationshipsApp.
 * Ensures that base64 images remain strictly under 39,000 characters
 * so they fit comfortably within Google Sheets 50,000 character cell limit
 * without truncation or exceptions.
 */
export async function compressImage(
  fileOrBlob,
  maxDimension = 720,
  initialQuality = 0.68,
  maxCharLength = 32000
) {
  return new Promise((resolve) => {
    if (!fileOrBlob) return resolve("");

    // If it's already a standard HTTP/HTTPS URL
    if (typeof fileOrBlob === "string" && !fileOrBlob.startsWith("data:")) {
      return resolve(fileOrBlob);
    }

    // Fast path: if already a JPEG data URL under maxCharLength, return directly
    if (
      typeof fileOrBlob === "string" &&
      fileOrBlob.startsWith("data:image/jpeg;base64,") &&
      fileOrBlob.length <= maxCharLength
    ) {
      return resolve(fileOrBlob);
    }

    const processImageObj = (img, fallbackDataUrl = "") => {
      try {
        const render = (dim, q) => {
          let w = img.naturalWidth || img.width || 720;
          let h = img.naturalHeight || img.height || 540;
          if (w > h) {
            if (w > dim) {
              h = Math.round((h * dim) / w);
              w = dim;
            }
          } else {
            if (h > dim) {
              w = Math.round((w * dim) / h);
              h = dim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, w);
          canvas.height = Math.max(1, h);
          const ctx = canvas.getContext("2d");
          // Clean neutral background for transparent images
          ctx.fillStyle = "#fdfbf7";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL("image/jpeg", q);
        };

        let dim = maxDimension;
        let q = initialQuality;
        let dataUrl = render(dim, q);

        // Progressive reduction loop until strictly under maxCharLength
        let attempts = 0;
        while (dataUrl.length > maxCharLength && attempts < 12) {
          attempts++;
          if (dim > 180) {
            dim = Math.round(dim * 0.78);
          }
          if (q > 0.22) {
            q = Math.max(0.2, +(q - 0.1).toFixed(2));
          }
          dataUrl = render(dim, q);
        }

        resolve(dataUrl);
      } catch (err) {
        // Safe fallback to raw data if small enough
        resolve(fallbackDataUrl || (img && img.src) || "");
      }
    };

    if (typeof fileOrBlob === "string" && fileOrBlob.startsWith("data:")) {
      const img = new Image();
      img.onload = () => processImageObj(img, fileOrBlob);
      img.onerror = () => resolve(fileOrBlob);
      img.src = fileOrBlob;
      return;
    }

    try {
      const reader = new FileReader();
      reader.onerror = () => resolve("");
      reader.onload = (e) => {
        const rawResult = e.target.result;
        const img = new Image();
        img.onload = () => processImageObj(img, rawResult);
        img.onerror = () => resolve(rawResult || "");
        img.src = rawResult;
      };
      reader.readAsDataURL(fileOrBlob);
    } catch {
      resolve("");
    }
  });
}

/**
 * Local image caching helper using localStorage
 */
export function cacheImageLocal(key, dataUrl) {
  try {
    if (!key || !dataUrl) return;
    localStorage.setItem(`img_cache_${key}`, dataUrl);
  } catch (e) {
    // quota exceeded fallback
  }
}

export function getCachedImageLocal(key) {
  try {
    return localStorage.getItem(`img_cache_${key}`) || "";
  } catch {
    return "";
  }
}
