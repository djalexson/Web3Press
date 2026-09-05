# Repository instructions for agents

For ANY task involving A.S Groups / `asgroups.dev` article covers, Google Drive media staging, Cloudflare R2, `img.likelyin.ru`, WordPress featured media, or article-publication image transport, first read and follow the authoritative skill in:

`djalexson/asgroups-main/skills/asgroups-content-publishing/SKILL.md`

The permanent generic Google Drive -> R2 workflow in this repository is:

`.github/workflows/drive-to-r2-asgroups.yml`

Do not create a new one-off upload method unless the permanent route cannot carry the exact source bytes.

Never substitute another image merely to make a workflow pass. Preserve the exact approved/generated source image and verify byte-for-byte / SHA-256 through R2 and WordPress as required by the skill.

Temporary diagnostic workflows must be removed after the reusable fix is captured in the permanent workflow or skill.
