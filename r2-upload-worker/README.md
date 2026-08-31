# A.S Groups R2 Upload Worker

Protected binary upload API for the `asgroups-images` R2 bucket.

## Endpoint

```text
PUT https://upload.likelyin.ru/v1/upload/<object-key>
Authorization: Bearer <UPLOAD_TOKEN>
Content-Type: image/webp
Content-Length: <bytes>
```

The API accepts AVIF, GIF, JPEG, PNG and WebP files up to 15 MB. Existing objects are protected from accidental replacement. Send `X-ASG-Overwrite: true` when replacement is intentional.

Example:

```bash
curl --fail-with-body \
  -X PUT \
  "https://upload.likelyin.ru/v1/upload/articles/cover.webp" \
  -H "Authorization: Bearer $R2_UPLOAD_API_TOKEN" \
  -H "Content-Type: image/webp" \
  -H "X-ASG-Overwrite: true" \
  --data-binary "@cover.webp"
```

The response contains the public image URL under `url`.

## Cloudflare configuration

- Worker: `asgroups-r2-upload`
- Custom domain: `upload.likelyin.ru`
- R2 binding: `IMAGES` -> `asgroups-images`
- Worker secret: `UPLOAD_TOKEN`
- Public image domain: `https://img.likelyin.ru`

Deploy from this directory with `npm install`, `npx wrangler secret put UPLOAD_TOKEN`, and `npm run deploy`.
