# Aura - AI unified retrival assistant - Offline Workspace

Aura - AI unified retrival assistant is a high-performance, fully offline **Local Retrieval-Augmented Generation (RAG) system** engineered with a unified architecture:

- **Frontend**: React 18 + TypeScript + Vite workstation (fully compiled & optimized)
- **Backend**: Spring Boot 3.3 (Java 21) REST & WebSocket Server
- **Database**: SQLite (local metadata storage)
- **Vector Store**: ChromaDB (local semantic embedding indexer)
- **Local Inference**: Ollama (llama3 + nomic-embed-text) & Python Sidecars (CLIP, Whisper)

---

## 🏗️ Architecture Design

```text
                  +----------------------------------------+
                  |         React 18 Workstation           |
                  |  (Vite Dev Server Proxying to 8080)   |
                  +-------------------+--------------------+
                                      |
                     REST & WebSockets (Port 8080)
                                      |
                                      v
                  +----------------------------------------+
                  |         Spring Boot 8080 Server        |
                  | (Serves UI static assets in prod mode) |
                  +-------+--------------------+-----------+
                          |                    |
               Apache PDFBox (Parsing)    Python Sidecars
                          |            (Whisper / CLIP Vector)
                          v                    v
                  +---------------+    +---------------+
                  | SQLite Engine |    |   ChromaDB    |
                  | (data/aura.db)|    | (Vector Store)|
                  +---------------+    +---------------+
```

---

## ⚡ Quick Start

### Prerequisites
- **Java**: JDK 21+
- **Node.js**: v18+
- **Python**: v3.9+ (with dependencies for faster-whisper and CLIP)

### Step 1: Model & Service Setup
1. **Ollama Installation**: Install [Ollama](https://ollama.ai/download) and pull models:
   ```bash
   ollama pull llama3
   ollama pull nomic-embed-text
   ```
2. **Sidecar Models**: Install python packages and execute download script:
   ```bash
   pip install torch transformers faster-whisper pillow
   python backend/scripts/download_models.py
   ```
3. **ChromaDB**: Run ChromaDB locally (e.g., via Docker):
   ```bash
   docker run -d -p 8001:8000 --name aura-chroma chromadb/chroma
   ```

### Step 2: Running Development Environment
1. **Backend (Spring Boot)**:
   ```bash
   cd backend
   mvnw spring-boot:run
   ```
2. **Frontend (Vite Dev Server)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` to access the workspace. All requests to `/api/*` and `/ws/*` will proxy to port 8080 automatically.

### Step 3: Production Build (Single Server)
Compile the React bundle directly into the Spring Boot assets:
```bash
cd frontend
npm run build
```
Then, running the Spring Boot backend will serve the UI directly on `http://localhost:8080`.
