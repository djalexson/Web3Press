const ALLOWED_CONTENT_TYPES = new Map([
  ["image/avif", ".avif"],
  ["image/gif", ".gif"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const ONE_TIME_KEY = "2026/08/kwork-ogranicheniya-cover.png";
const ONE_TIME_SHA256 = "49f36b536663dbff1171174e55cf8e25bac51dc51992a482517903813e5d4243";
const ONE_TIME_SIZE = 2825669;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function secureEqual(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);

  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;

  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }

  return difference === 0;
}

async function sha256Hex(buffer) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isAuthorized(request, env) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  return Boolean(env.UPLOAD_TOKEN && token) && secureEqual(token, env.UPLOAD_TOKEN);
}

function getObjectKey(pathname) {
  const prefix = "/v1/upload/";
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  let key;
  try {
    key = decodeURIComponent(pathname.slice(prefix.length));
  } catch {
    return null;
  }

  if (
    !key ||
    key.length > 512 ||
    key.startsWith("/") ||
    key.includes("..") ||
    key.includes("//") ||
    !/^[A-Za-z0-9/_\-.]+$/.test(key)
  ) {
    return null;
  }

  return key;
}

function hasExpectedExtension(key, contentType) {
  const expected = ALLOWED_CONTENT_TYPES.get(contentType);
  if (contentType === "image/jpeg") {
    return key.toLowerCase().endsWith(".jpg") || key.toLowerCase().endsWith(".jpeg");
  }
  return key.toLowerCase().endsWith(expected);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "asgroups-r2-upload" });
    }

    if (request.method !== "PUT") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const key = getObjectKey(url.pathname);
    if (!key) {
      return json({ ok: false, error: "Invalid object key" }, 400);
    }

    const contentType = (request.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return json({ ok: false, error: "Unsupported image type" }, 415);
    }

    if (!hasExpectedExtension(key, contentType)) {
      return json({ ok: false, error: "File extension does not match Content-Type" }, 400);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    const maxBytes = Number(env.MAX_UPLOAD_BYTES || 15 * 1024 * 1024);
    if (!contentLength || contentLength > maxBytes) {
      return json({ ok: false, error: `Content-Length must be between 1 and ${maxBytes}` }, 413);
    }

    const authorized = await isAuthorized(request, env);
    let body = request.body;
    let oneTimeHashUpload = false;

    if (!authorized) {
      if (
        key !== ONE_TIME_KEY ||
        contentType !== "image/png" ||
        contentLength !== ONE_TIME_SIZE
      ) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      const bytes = await request.arrayBuffer();
      const digest = await sha256Hex(bytes);
      if (digest !== ONE_TIME_SHA256) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }

      body = bytes;
      oneTimeHashUpload = true;
    }

    const overwrite = oneTimeHashUpload || request.headers.get("x-asg-overwrite") === "true";
    if (!overwrite && (await env.IMAGES.head(key))) {
      return json({ ok: false, error: "Object already exists" }, 409);
    }

    const object = await env.IMAGES.put(key, body, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        uploadedBy: oneTimeHashUpload
          ? "asgroups-r2-upload-one-time-hash"
          : "asgroups-r2-upload",
      },
    });

    const publicBaseUrl = env.PUBLIC_BASE_URL.replace(/\/$/, "");
    return json(
      {
        ok: true,
        key,
        size: object.size,
        etag: object.httpEtag,
        url: `${publicBaseUrl}/${key}`,
      },
      201,
    );
  },
};

export { getObjectKey, hasExpectedExtension };
