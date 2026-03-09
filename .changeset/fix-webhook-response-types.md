---
"@proofkit/fmodata": minor
---

fix(fmodata): align webhook types with actual FM OData API response

BREAKING: `WebhookListResponse`, `WebhookInfo`, and `WebhookAddResponse` property names changed to match what the API actually returns:
- `Status` → `status`, `WebHook` → `webhooks`
- `webHookID` → `webhookID`, `url` → `webhook`
- `webHookResult` → `webhookResult`
