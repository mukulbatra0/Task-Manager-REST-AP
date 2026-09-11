# Task Manager REST API

A simple REST API for creating and managing tasks. Data is stored in memory, so it is reset whenever the server restarts.

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
