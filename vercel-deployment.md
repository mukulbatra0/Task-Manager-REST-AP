# Vercel Deployment

This project is deployed to Vercel at https://task-manager-rest-api.vercel.app/

## Deployment

The deployment was set up using:

1. Added a `vercel.json` configuration file
2. Updated `package.json` with a `deploy` script
3. Committed and pushed to GitHub
4. Connected the GitHub repository to Vercel

## Vercel Configuration

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/tasks(?:/.*)?$",
      "dest": "server.js"
    },
    {
      "src": "/(.*)",
      "dest": "public/$1"
    }
  ]
}
```

## Usage

1. **API Endpoints**: All tasks API endpoints are served by `server.js`
   - `GET /tasks` - Get all tasks
   - `GET /tasks/:id` - Get task by ID
   - `POST /tasks` - Create new task
   - `PUT /tasks/:id` - Update task
   - `DELETE /tasks/:id` - Delete task

2. **Frontend**: All static files (`index.html`, `style.css`, `app.js`) are served from the `public` directory
   - Access the app at `https://task-manager-rest-api.vercel.app/`

## Environment Variables

Set the `PORT` environment variable in your Vercel dashboard to use a custom port.

## Deployment Script

```bash
npm run deploy
```

This deploys the current project to Vercel with the `--prod` flag, ensuring production-ready deployment.

## Notes

- The in-memory storage means data is reset on each deployment/redeployment
- For persistent data, consider using a database or external storage solution
- The frontend communicates with the API via relative paths, ensuring no CORS issues

## Issues

Since deployment to Vercel has already been completed, this README section documents the setup process. The deployed application is already accessible and should be tested.

See the [main README.md](README.md) for more detailed information about the Task Manager REST API.