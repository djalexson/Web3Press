# Repository instructions for agents

For ANY task involving A.S Groups / `asgroups.dev` article covers, Google Drive media staging, Cloudflare R2, `img.likelyin.ru`, WordPress featured media, or article-publication image transport, first read and follow the authoritative skill in:

`djalexson/asgroups-main/skills/asgroups-content-publishing/SKILL.md`

The permanent generic image -> R2 workflow in this repository is:

`.github/workflows/drive-to-r2-asgroups.yml`

Use that workflow first. Do not invent a new upload workflow for each article.

Normal automated route:

`final image -> Google Drive staging -> drive-to-r2-asgroups.yml -> binary PUT -> R2 -> publish-content.yml -> WordPress`

For private Drive files the permanent workflow supports authenticated download through `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` when the staging folder has been shared to that service account.

For emergency exact-byte transport, the same permanent workflow supports `source_mode=source_url` only through manual `workflow_dispatch`. Never commit signed/source URLs into `.github/asgroups-r2-jobs/*.json` or repository history.

Never substitute another image merely to make a workflow pass. Preserve the exact approved/generated source image and verify byte-for-byte / SHA-256 through R2 and WordPress as required by the skill.

Temporary diagnostic workflows are allowed only if the permanent route is genuinely broken, and must be removed after the reusable fix is captured in the permanent workflow or skill.
