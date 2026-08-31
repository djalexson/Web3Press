# Image upload workflow: ChatGPT → R2 → WordPress

Это обязательный сценарий для обложек статей.

## Эталонный успешный кейс

Kwork cover, post 709:

- R2 URL: `https://img.likelyin.ru/2026/08/kwork-ogranicheniya-cover.png`
- WordPress imported file: `https://asgroups.dev/wp-content/uploads/2026/08/kwork-ogranicheniya-cover.png`
- post 709 был обновлён, новый пост не создавался
- размер и SHA-256 были сверены с исходником
- временные workflow были удалены после успешной проверки
- Worker после операции остался защищён Bearer Token

Рабочий upload workflow был подтверждён commit `6c695995ba3697df672dd334e6957bdcf29f5cde`.

## Единственная рабочая схема

1. Взять исходный файл ChatGPT без перекодирования.
2. Получить временный signed URL на исходные байты файла.
3. GitHub Actions скачивает файл по signed URL.
4. До загрузки проверить:
   - MIME;
   - размер файла;
   - SHA-256.
5. Выполнить обычный binary PUT в Worker:

```bash
curl --fail-with-body \
  -X PUT \
  "https://upload.likelyin.ru/v1/upload/<object-key>" \
  -H "Authorization: Bearer ${R2_UPLOAD_API_TOKEN}" \
  -H "Content-Type: image/png" \
  -H "X-ASG-Overwrite: true" \
  --data-binary "@/tmp/cover.png"
```

6. Проверить публичный R2-объект по `https://img.likelyin.ru/<object-key>`:
   - HTTP 200;
   - тот же размер;
   - тот же SHA-256;
   - при необходимости `cmp` исходника и скачанного файла.
7. В JSON существующей статьи изменить только `featured_media_url`.
8. Для существующей статьи обязательно сохранять прежний `idempotency_key` и `update_existing: true`.
9. Вызвать WordPress webhook / публикационный workflow.
10. Проверить, что WordPress обновил именно существующий post, а не создал дубль.
11. Проверить WordPress featured media:
   - MIME;
   - размеры;
   - SHA-256 скачанного файла;
   - наличие новой картинки в HTML статьи.
12. Telegram должен получить уведомление об успехе или ошибке.
13. После успеха удалить временный upload/verify workflow.

## Что запрещено использовать как основной путь

- base64 для передачи изображения в R2;
- хранение бинарной картинки в GitHub;
- Google Drive как промежуточное хранилище;
- повторная генерация картинки, если пользователь дал точный исходник;
- изменение формата или качества без явного запроса;
- создание нового WordPress post при обновлении существующей статьи.

## R2 endpoints

Upload API:

`https://upload.likelyin.ru/v1/upload/<path>`

Public image CDN:

`https://img.likelyin.ru/<path>`

Worker должен оставаться в обычном режиме Bearer Token после завершения операции.
