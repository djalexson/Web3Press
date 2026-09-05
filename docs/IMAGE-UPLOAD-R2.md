# A.S Groups image transport: exact bytes -> R2 -> WordPress

Главный source of truth для публикации A.S Groups:

`djalexson/asgroups-main/skills/asgroups-content-publishing/SKILL.md`

Постоянный транспорт изображений:

`.github/workflows/drive-to-r2-asgroups.yml`

## Основной путь

Для обычной публикации использовать одну и ту же финальную картинку на всём пути:

`ChatGPT/ImageGen -> final WebP -> Google Drive staging -> permanent GitHub Actions workflow -> binary PUT -> R2 -> publish-content.yml -> WordPress`

Проверка обязательна:

`SHA256(source) == SHA256(R2) == SHA256(WordPress featured media)`

### Открытый Drive-файл

Workflow сначала пробует стандартный `drive.usercontent.google.com` transport.

### Закрытый Drive-файл

Если публичный transport возвращает HTML/ошибку доступа, постоянный workflow умеет скачать тот же Drive-файл авторизованно через GitHub Secret:

`GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`

Для этого staging-папка Google Drive должна быть один раз расшарена на `client_email` service account с правом Reader. После этого новые файлы в этой папке можно переносить по `drive_file_id` без ручного открытия доступа для каждого файла.

Если service account не настроен, workflow оставляет `gdown` только как последний Drive fallback.

## Аварийный direct source transport

`workflow_dispatch` поддерживает:

- `source_mode=source_url`;
- `source_url` — временный HTTPS URL на exact bytes;
- `r2_key`;
- `content_type`;
- `expected_sha256`;
- `expected_size`;
- `min_bytes`.

Временный `source_url` разрешён только при ручном `workflow_dispatch` и маскируется в логах.

Никогда не сохранять signed/source URL в `.github/asgroups-r2-jobs/*.json`, commit history, `content-queue` или статью. Push-triggered job JSON с `source_url` workflow намеренно отклоняет.

## R2 upload

Постоянный workflow делает обычный binary PUT через защищённый Worker:

```bash
curl --fail-with-body \
  -X PUT \
  "https://upload.likelyin.ru/v1/upload/<object-key>" \
  -H "Authorization: Bearer ${R2_UPLOAD_API_TOKEN}" \
  -H "Content-Type: image/webp" \
  -H "X-ASG-Overwrite: true" \
  --data-binary "@/tmp/source-image"
```

Токен берётся только из GitHub Secrets.

После PUT workflow скачивает объект с:

`https://img.likelyin.ru/<object-key>`

и проверяет:

- MIME;
- размер;
- SHA-256;
- `cmp` исходника и R2-файла.

## После R2

Для новой статьи сначала должен успешно завершиться transport в R2, и только затем коммитится JSON в `content-queue/` и запускается штатный `publish-content.yml`.

Для существующей статьи сохраняются прежние `idempotency_key` и post, используется `update_existing=true`, дубликат не создаётся.

WordPress media считается подтверждённой только после повторного скачивания и сравнения SHA-256 с R2.

## Запрещено

- заменять нужную генерацию другой картинкой ради успешного workflow;
- использовать base64 как транспорт изображения;
- хранить бинарные изображения в GitHub;
- хранить signed/source URLs в репозитории;
- менять формат/качество после фиксации финального SHA без явной причины;
- считать загрузку успешной без byte-for-byte проверки;
- создавать новый WordPress post при обновлении существующей статьи.

## R2 endpoints

Upload API:

`https://upload.likelyin.ru/v1/upload/<path>`

Public CDN:

`https://img.likelyin.ru/<path>`
