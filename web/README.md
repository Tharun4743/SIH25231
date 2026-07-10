# AURA - Web Version

This directory contains the files needed to run **AURA (AI Unified Retrieval Assistant)** as a standard web application inside a browser, completely outside of the Electron desktop shell.

It uses a Vite dev server proxy configurations to bypass CORS limitations on the backend by mapping all frontend and backend traffic to a single host.

## Prerequisites

To run the web version of AURA, ensure the following are installed and running on your system:
1. **Node.js** (v18+)
2. **Java Development Kit (JDK)** (v17 or higher)
3. **Maven** (configured and available on the system `PATH`)
4. **Ollama** running locally with the following models pulled:
   - `llama3`
   - `nomic-embed-text`

## Ports Used

- **Frontend (Browser Access):** `http://localhost:5173`
- **Backend Service (Proxied):** `http://localhost:8080`

*Note: The browser only communicates with port `5173` directly. All API calls (`/api/*`) and WebSocket requests (`/ws/chat`) are automatically proxied to the backend at port `8080` through Vite.*

## How to Run

1. Open a terminal and navigate to this `web/` directory.
2. Install the necessary runner dependencies:
   ```bash
   npm install
   ```
3. Run the development server (starts both backend and frontend concurrently):
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

## Troubleshooting

- **Port in Use Conflict:** If port `5173` or `8080` is already in use by another application or an orphaned process, the startup command will **fail fast** with an error. It will not retry indefinitely or enter a looping state. Free the conflicting port and rerun the script.
- **WebSocket Connection Failure:** If the streaming chat fails to respond, verify that Vite is successfully running the WebSocket upgrade proxy on `/ws/chat`.
