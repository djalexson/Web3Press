import assert from "node:assert/strict";
import test from "node:test";

import worker, { getObjectKey, hasExpectedExtension } from "../src/index.js";

const token = "test-upload-token";

function createEnv() {
  const objects = new Map();
  return {
    env: {
      IMAGES: {
        head: async (key) => objects.get(key) || null,
        put: async (key, body, options) => {
          const bytes = new Uint8Array(await new Response(body).arrayBuffer());
          const object = { key, size: bytes.byteLength, httpEtag: '"test-etag"', options };
          objects.set(key, object);
          return object;
        },
      },
      MAX_UPLOAD_BYTES: "1024",
      PUBLIC_BASE_URL: "https://img.likelyin.ru",
      UPLOAD_TOKEN: token,
    },
    objects,
  };
}

function uploadRequest(path, options = {}) {
  const body = options.body || new Uint8Array([1, 2, 3]);
  return new Request(`https://upload.likelyin.ru${path}`, {
    method: "PUT",
    body,
    headers: {
      authorization: `Bearer ${options.token || token}`,
      "content-length": String(body.byteLength),
      "content-type": options.contentType || "image/webp",
      ...(options.headers || {}),
    },
  });
}

test("validates object keys and extensions", () => {
  assert.equal(getObjectKey("/v1/upload/2026/08/cover.webp"), "2026/08/cover.webp");
  assert.equal(getObjectKey("/v1/upload/../secret.webp"), null);
  assert.equal(hasExpectedExtension("cover.webp", "image/webp"), true);
  assert.equal(hasExpectedExtension("cover.png", "image/webp"), false);
});

test("rejects an invalid token", async () => {
  const { env } = createEnv();
  const response = await worker.fetch(uploadRequest("/v1/upload/cover.webp", { token: "wrong" }), env);
  assert.equal(response.status, 401);
});

test("uploads a binary image and returns its public URL", async () => {
  const { env, objects } = createEnv();
  const response = await worker.fetch(uploadRequest("/v1/upload/2026/08/cover.webp"), env);
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.url, "https://img.likelyin.ru/2026/08/cover.webp");
  assert.equal(objects.has("2026/08/cover.webp"), true);
});

test("does not overwrite an existing object unless explicitly requested", async () => {
  const { env } = createEnv();
  await worker.fetch(uploadRequest("/v1/upload/cover.webp"), env);

  const conflict = await worker.fetch(uploadRequest("/v1/upload/cover.webp"), env);
  assert.equal(conflict.status, 409);

  const overwrite = await worker.fetch(
    uploadRequest("/v1/upload/cover.webp", { headers: { "x-asg-overwrite": "true" } }),
    env,
  );
  assert.equal(overwrite.status, 201);
});
