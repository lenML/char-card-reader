export function toBase64(
  input: Blob | Buffer | ArrayBuffer | Uint8Array
): Promise<string> {
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
    // Node.js Buffer
    return Promise.resolve(input.toString("base64"));
  }

  if (typeof Blob !== "undefined" && input instanceof Blob) {
    // Browser Blob
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1]; // data:*/*;base64,...
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(input);
    });
  }

  // ArrayBuffer or Uint8Array
  let uint8: Uint8Array;
  if (input instanceof ArrayBuffer) {
    uint8 = new Uint8Array(input);
  } else if (input instanceof Uint8Array) {
    uint8 = input;
  } else {
    throw new TypeError("Unsupported input type");
  }

  if (typeof Buffer !== "undefined") {
    // Node.js environment
    return Promise.resolve(Buffer.from(uint8).toString("base64"));
  } else {
    // Browser: use btoa
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return Promise.resolve(btoa(binary));
  }
}

export function isValidImageUrl(url: any) {
  if (typeof url !== "string") {
    return false;
  }
  // http 或者 data:
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return true;
  }

  return false;
}

export const deepClone: <T>(x: T) => T = globalThis.structuredClone
  ? globalThis.structuredClone
  : <T>(x: T): T => JSON.parse(JSON.stringify(x));
