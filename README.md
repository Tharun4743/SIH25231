<!-- AURA Project Banner -->
<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=10,13&height=280&section=header&text=AURA&fontSize=65&fontColor=ffffff&desc=AI%20Unified%20Retrieval%20Assistant&descAlignY=62&descFontSize=22" width="100%" alt="AURA Banner" />
</p>

<!-- Subtitle / Intro -->
<p align="center">
  🚀 <b>100% Offline Multimodal Retrieval-Augmented Generation (RAG) System</b><br>
  <sub>SIH 25231 | Developed for NTRO Offline Resource-Constrained Environments</sub>
</p>

<!-- Developer Badges -->
<p align="center">
  <a href="https://linkedin.com/in/tharunkumark4743" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
  </a>
  <a href="https://leetcode.com/u/Tharun4743/" target="_blank">
    <img src="https://img.shields.io/badge/LeetCode-FFA116?style=for-the-badge&logo=leetcode&logoColor=black" alt="LeetCode">
  </a>
  <a href="https://github.com/Tharun4743" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://www.geeksforgeeks.org/user/tharunkumark42007/" target="_blank">
    <img src="https://img.shields.io/badge/GeeksforGeeks-2F8D46?style=for-the-badge&logo=geeksforgeeks&logoColor=white" alt="GeeksforGeeks">
  </a>
  <a href="https://tharunkumark4743.netlify.app" target="_blank">
    <img src="https://img.shields.io/badge/Portfolio-00C7B7?style=for-the-badge&logo=opsgenie&logoColor=white" alt="Portfolio">
  </a>
  <a href="mailto:tharunkumark42007@gmail.com">
    <img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail">
  </a>
</p>

---

## 👤 About the Developer

* 🎓 Pursuing **B.Tech in Information Technology** @ VSB Engineering College, Karur (2024-2028) — CGPA: **8.5/10**
* 💼 Currently a **Fullstack Development Intern** @ **Neura Global** — building production features with React, Node.js & TypeScript
* 🌟 Serving as **Campus Mantri** for **GeeksforGeeks** (Jan 2026 – Jul 2026)
* 💻 Passionate about building robust, scalable web applications using the **React + Node.js + PostgreSQL** stack
* 🏆 **National Winner at CODE THUGS 2K26** — 1st Place for Real-Time Collaborative Code Editor (₹5,000 prize)
* 🚀 **SIH 2025 Top 50** nationally out of 10,000+ submissions (Top 0.5%)
* 🛡️ **India Innovates 2026** — Advanced to finals track after two rigorous selection rounds

---

## 🌟 Project Features (Aura - AI unified retrival assistant)

Aura is a military-grade, fully air-gapped, sovereign **multimodal RAG workstation** designed to ingest, process, and query enterprise documents, visual assets, and vocal recordings with 100% on-premises privacy.

* **📄 Document Processing**: Local page-by-page text extraction from PDF and plaintext documents (via Apache PDFBox), managed sliding-window overlapping chunking, local vector indexation, and contextual citation rendering.
* **🖼️ Multimodal Vision**: Visual feature extraction and semantic indexing of local image materials using a local Hugging Face `CLIP` model sidecar, allowing users to query images conceptually inside the **CLIP Visual Explorer**.
* **🎙️ Voice Transcription**: Standard recording inputs transcribed locally via python speech-to-text translators (Whisper/Vosk) linked to Java execution handlers, providing direct speech-to-text queries.
* **🧠 Grounded Retrieval (RAG)**: Integrates with local Llama-3 running on **Ollama** for context-anchored chat generation and local Nomics embeddings. 
* **💾 Persistent Multi-Threaded Chat History**: Full database persistence supporting multiple distinct chat sessions, session title extraction, selective chat deletion, and automatic fresh workspace initialization on start.
* **🔒 System Logs & Auditing**: Live dashboard displaying indexed document density, DB storage size, active engine indicators, system event timelines, and system audit trails.
* **🎨 Glassmorphic Desktop Wrapper**: Sleek React + Vite interface compiled as an Electron wrapper shell, packaging the JRE, Python environment, Spring Boot jar, and configurations into a one-click executable setup installer.

---

## 📂 Project Structure

```text
Aura - AI unified retrival assistant/
├── backend/                  # Java Spring Boot Server Code
│   ├── src/main/java/com/aura/
│   │   ├── controller/      # REST Endpoint Handlers (Chat, Document, Settings, Logs, Stats)
│   │   ├── dto/             # Data Transfer Objects (ChatRequest, SourceCitation, UploadResponse)
│   │   ├── model/           # JPA SQLite Entities (Chat, Document, AuditLog, Setting)
│   │   ├── repository/      # JPA repositories (SQLite database interfaces)
│   │   ├── service/         # Core Services (Ollama, ChromaDB, Audio, Image, Settings, Chunking)
│   │   └── websocket/       # WebSocket Streams (ChatWebSocketHandler for token streaming)
│   ├── src/main/resources/  # application.yml Configurations
│   └── pom.xml              # Maven dependency manager
├── frontend/                 # React Vite TypeScript Interface
│   ├── src/
│   │   ├── components/      # Visual widgets (Sidebar, ChatWindow, LibraryView, HistoryView, SettingsView, FileUploader, AudioRecorder)
│   │   ├── hooks/           # WebSocket hooks
│   │   ├── services/        # api.ts XHR Client Fetchers
│   │   ├── App.tsx          # State coordinator and app workspace router
│   │   └── main.tsx         # DOM Mounting element
│   ├── index.html           # Viewport header template
│   └── vite.config.ts       # Local proxy routing configurations
├── desktop/                  # Electron Desktop Packaging Shell
│   ├── scripts/             # build.js full compilation packaging pipelines
│   ├── main.js              # Electron lifecycle, JRE/Spring backend startup, and database cache-dir settings
│   ├── loading.html         # Application boot splash screen
│   └── package.json         # electron-builder installers metadata config
└── docs/                     # Additional guides and instructions
```

---

## 🛠️ Stack & Technologies

* **Frontend Framework**: React 18, TypeScript, TailwindCSS, Lucide Icons, Vite
* **Backend Framework**: Spring Boot 3.3.0, Java 21, JPA/Hibernate
* **Database**: SQLite3 (persistent metadata and chat sessions)
* **Vector Database**: ChromaDB (local simulated high-fidelity semantic cosine cache mapping)
* **Local Inference API**: Ollama (Llama3 model and nomic-embed-text embedding engine)
* **AI Models**: Hugging Face CLIP (Visual Search), OpenAI Whisper/Vosk (Vocal Transcription)
* **Container Shell**: Electron 31, electron-builder (Windows packaging)

---

## 🚀 Setup & Launch (Development Run)

### Prerequisites
* **Java**: JDK 21+
* **Node.js**: v18+
* **Python**: v3.9+ (with `torch`, `transformers`, `faster-whisper`, `pillow` installed)
* **Ollama**: Download [Ollama](https://ollama.ai/download) and fetch models:
  ```bash
  ollama pull llama3
  ollama pull nomic-embed-text
  ```

### Step 1: Run the Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Compile and launch the Spring Boot application:
   ```bash
   mvnw spring-boot:run
   ```

### Step 2: Run the Frontend
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install client dependencies and run Vite development server:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173` to access the sovereign workstation interface.

---

## 📦 Creating Desktop Installer (.exe)

To build a clean one-click installer package for Windows incorporating the bundled JRE, Python sidecar modules, React frontend, and Spring Boot server, navigate to the project root and run:

```bash
node desktop/scripts/build.js
```

This compiles all modules, aggregates the assets in a temporary staging tree, and generates the output setup files inside the `desktop/dist/` directory.
