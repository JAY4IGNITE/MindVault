# MindVault AI — Non-Negotiable Security Constitution

## Principle 1: Browser is Zero-Trust Terrain
- The browser/client is an untrusted boundary. Any client-supplied claims, identifiers, or credentials are considered untrusted until cryptographically verified.
- **Zero API Keys in Client**: Under no circumstances shall private keys, service account tokens, or Gemini API keys be baked into frontend bundles or stored in browser storage (`localStorage`, `sessionStorage`, `IndexedDB`).
- **Short-Lived Identity**: Authentication relies strictly on short-lived Firebase ID tokens refreshed via SDK memory.

## Principle 2: Strict Tenant Cryptographic Isolation
- All user data lives exclusively in subtrees strictly keyed by the authenticated user's UID: `/users/{uid}/*`.
- Neither the backend API nor Firestore security rules permit cross-UID reads, writes, mutations, or deletions.
- Any request lacking a valid Firebase Bearer token is immediately rejected with HTTP 401 Unauthorized before reaching any controller or database layer.

## Principle 3: Least-Privilege Backend Access
- The backend Node.js service runs on Cloud Run / Cloud Functions with an isolated IAM service account granted only:
  - Firestore document access restricted to application collections.
  - `roles/secretmanager.secretAccessor` scoped strictly to required secret names.
- Secrets are retrieved at runtime via Google Cloud Secret Manager and cached strictly in memory for the life of the instance. Secrets are never logged or echoed.

## Principle 4: Prompt Injection Immunity & Input Boundaries
- Every piece of user-provided content (prompts, journal texts, search queries) sent to LLMs must be strictly enclosed in structural delimiter tags (e.g. `<user_provided_content>...</user_provided_content>`).
- Model system prompts must contain explicit defense directives commanding the LLM to treat delimited content purely as data, never as executable instructions or persona overrides.

## Principle 5: Defense-in-Depth XSS Sanitization
- All user-generated content displayed within rich text or markdown contexts must pass through client-side DOMPurify sanitization.
- Dangerous script execution vectors (`<script>`, `onerror`, `javascript:`, iframe inclusions) are stripped. External links are forced to `rel="noopener noreferrer"`.

## Principle 6: Privacy Logging Hygiene
- Application loggers must serialize and automatically redact sensitive headers (`Authorization`), bearer tokens, and user body content before emitting logs to stdout or Google Cloud Logging.
