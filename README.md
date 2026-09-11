# Task Manager REST API

A simple REST API for creating and managing tasks. Data is stored in a JSON file locally, or in Upstash Redis when configured (recommended for Vercel deployments).

## Storage backends

| Mode | When used | Persists restarts? |
| --- | --- | --- |
| `redis` | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set | ✅ Yes |
| `file` | Locally (writes `tasks.json`, override with `DATA_FILE`) | ✅ Yes |
| `memory` | Read-only filesystem (e.g. Vercel) without Redis | ❌ No |

The app shows a warning banner in the browser when storage is non-persistent. `GET /storage` reports the active backend.

### Persistent storage on Vercel (Upstash Redis)

1. Create a free database at [upstash.com](https://upstash.com) (REST API enabled by default).
2. Add the environment variables in your Vercel project settings:

```bash
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

Data then survives across serverless invocations and cold starts.

## Requirements

- Node.js 18 or later

## Installation

```bash
npm install
```

## Run the server

```bash
node server.js
```

The API is available at `http://localhost:3000`. Set the `PORT` environment variable to use a different port.

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/tasks` | Return all tasks |
| `GET` | `/tasks/:id` | Return one task |
| `POST` | `/tasks` | Create a task |
| `PUT` | `/tasks/:id` | Update a task |
| `DELETE` | `/tasks/:id` | Delete a task |
| `GET` | `/storage` | Report active storage backend |

### Task fields

```json
{
	"id": 1,
	"title": "Write documentation",
	"description": "Document the available API endpoints",
	"completed": false
}
```

When creating a task, `title` is required. `description` defaults to an empty string and `completed` defaults to `false`.

## Frontend

A minimal HTML/CSS/JS frontend is provided in the `public` directory. When the server runs, it serves static files from this directory.

To use the frontend:

1. Start the server with `node server.js`
2. Open a web browser and navigate to `http://localhost:3000`
3. You can now create, view, update, and delete tasks through the UI.

The frontend communicates with the API via fetch requests to the same origin, so no CORS configuration is needed.

## Examples

Create a task:

```bash
curl -X POST http://localhost:3000/tasks ^
	-H "Content-Type: application/json" ^
	-d "{\"title\":\"Write documentation\",\"description\":\"Document the API\"}"
```

List all tasks:

```bash
curl http://localhost:3000/tasks
```

Update a task:

```bash
curl -X PUT http://localhost:3000/tasks/1 ^
	-H "Content-Type: application/json" ^
	-d "{\"completed\":true}"
```

Delete a task:

```bash
curl -X DELETE http://localhost:3000/tasks/1
```

The API returns `400` when a new task has no title and `404` when the requested task does not exist.
