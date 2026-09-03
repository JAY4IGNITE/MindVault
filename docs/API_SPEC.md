# MindVault AI — REST API Specification

All protected endpoints require the header:
```
Authorization: Bearer <Firebase_ID_Token>
```

---

## 1. System Health
### `GET /health`
- **Auth**: Public
- **Response**: `{ "status": "ok" }`

---

## 2. Conversational Assistant
### `POST /api/v1/chat/message`
- **Rate Limit**: 20 requests / min per UID
- **Body**:
  ```json
  {
    "message": "string (1 - 4000 characters)",
    "conversationId": "string (optional)"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "conversationId": "string",
    "messageId": "string",
    "content": "string"
  }
  ```

---

## 3. Retrieval-Augmented Generation (Ask My Memory)
### `POST /api/v1/ask`
- **Rate Limit**: 10 requests / min per UID
- **Body**:
  ```json
  {
    "question": "string (5 - 500 characters)"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "answer": "string",
    "sources": [
      {
        "id": "string",
        "type": "memory | goal | decision | journal_summary",
        "content": "string",
        "createdAt": "string (ISO)"
      }
    ],
    "isPartial": false
  }
  ```

---

## 4. Intelligence Pipeline
### `POST /api/v1/intelligence/process`
- **Rate Limit**: 5 requests / min per UID
- **Body**:
  ```json
  {
    "conversationId": "string"
  }
  ```
- **Response (202 Accepted)**:
  ```json
  {
    "status": "accepted",
    "message": "Conversation processing started."
  }
  ```

### `POST /api/v1/intelligence/generate-insights`
- **Rate Limit**: 5 requests / min per UID
- **Response (202 Accepted)**:
  ```json
  {
    "status": "accepted",
    "message": "Insight generation started."
  }
  ```

---

## 5. Memory Graph
### `GET /api/v1/graph?days=30`
- **Query Params**: `days` (optional, default `30`)
- **Response (200 OK)**:
  ```json
  {
    "nodes": [
      {
        "id": "string",
        "label": "string",
        "type": "memory | idea | goal | decision",
        "group": 1,
        "val": 5,
        "data": {}
      }
    ],
    "edges": [
      {
        "source": "string (id)",
        "target": "string (id)",
        "type": "supports | related_to | contradicts"
      }
    ]
  }
  ```

---

## 6. Decision Tracker
### `POST /api/v1/decisions`
- **Body**:
  ```json
  {
    "decision": "string",
    "reasoning": "string",
    "date": "string (ISO)",
    "expectedOutcome": "string (optional)",
    "reviewDate": "string (ISO optional)"
  }
  ```
- **Response (201 Created)**: Decision document

### `PATCH /api/v1/decisions/:id`
- **Body**: Partial update fields (`status`, `actualOutcome`, `reviewDate`, `lessonsLearned`)
- **Response (200 OK)**: `{ "status": "updated" }`

### `POST /api/v1/decisions/:id/review`
- Triggers AI retrospective analyzing reasoning vs outcome.
- **Response (200 OK)**:
  ```json
  {
    "retrospectiveSummary": "string",
    "keyTakeaways": ["string"]
  }
  ```
