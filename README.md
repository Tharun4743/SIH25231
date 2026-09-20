# 🧠 Aura — 100% Offline Multimodal Retrieval-Augmented Generation (RAG) Workstation
### *Air-Gapped Desktop Intelligence Platform: LLaMA 3, Nomic Embeddings, Whisper Voice & CLIP Image Retrieval with Zero Cloud Dependency*

<p align="center">
  <a href="https://github.com/Tharun4743/SIH25231"><b>📦 GitHub Repository</b></a>
  
</p>

---

## 1. 📌 Problem Statement
High-security defense, legal, healthcare, and enterprise environments are barred by strict data sovereignty laws from uploading sensitive documents, intellectual property, or confidential records to public cloud AI services. Furthermore, remote operational zones often operate completely air-gapped without internet access.

---

## 2. 🔍 Existing Solutions & Critical Gaps
Cloud enterprise search solutions (Azure OpenAI, AWS Bedrock) require persistent internet and risk data exfiltration. Basic open-source local scripts are text-only, fail to index audio or visual assets, lack network isolation guards, and require complex manual developer setup.

---

## 3. 💡 Proposed Solution
Aura is an air-gapped, 100% offline multimodal Retrieval-Augmented Generation (RAG) workstation developed as the technical solution for Smart India Hackathon 2025 (PS-25231). It integrates LLaMA 3, Nomic Embed Text, OpenAI Whisper, and CLIP ViT-B/32 to perform unified document search (PDF/TXT/MD), semantic image retrieval, and offline voice transcription with zero cloud dependency.

---

## 4. ⚙️ Technical Approach & System Architecture
* **Desktop Shell:** Electron 30+ container with context isolation, strict sandboxing, and narrow IPC contextBridge.
* **Backend Core:** Java 21, Spring Boot 3.3 REST and WebSocket server (/ws/chat) with Apache PDFBox text extraction.
* **Vector & Metadata Store:** Embedded SQLite (aura.db) and ChromaDB managing local 768-dim embeddings.
* **Local Inference & Sidecars:** Ollama (LLaMA 3, Nomic Embed Text); Python sidecars for faster-whisper and CLIP.
* **Air-Gapped Security:** NetworkGuardService enforcing loopback-only URLs (127.0.0.1) and TRANSFORMERS_OFFLINE=1.
* **Packaging:** Automated build pipeline creating native standalone Windows installers (NSIS EXE & MSIX).

---

## 5. 📈 Impact & Measurable Benefits
* **Official SIH 2025 Submission (PS-25231):** High-fidelity architectural solution for national data sovereignty.
* **100% Zero-Cloud Air-Gapped Privacy:** Zero bytes ever leave the host machine.
* **Unified Multimodal Intelligence:** Seamless natural-language search across text documents, audio notes, and photographs.
* **Turnkey Setup:** Single-click installer bundling JRE 21, Spring JAR, Python virtualenv, and React UI.

---

## 6. 🚀 Feasibility & Viability Analysis
* **Technical:** Optimized with int8 quantization to execute smoothly on consumer laptops with 16GB RAM.
* **Economic:** Zero recurring API bills or cloud hosting expenses; operates perpetually on existing hardware.
* **Viability:** Extremely high commercial viability in defense, aerospace, financial audit, and medical clinical settings.

---

## 7. 👨‍💻 Author & Intellectual Property License

### Lead Architect & Author
**Tharunkumar K** ([@Tharun4743](https://github.com/Tharun4743))
* B.Tech Information Technology • V.S.B. Engineering College, Karur
* [GitHub Profile](https://github.com/Tharun4743) • [LinkedIn](https://linkedin.com/in/tharunkumark4743) • [Portfolio](https://tharunkumark4743.netlify.app)

### 🔒 Proprietary License Notice (All Rights Reserved)
> [!CAUTION]
> **PROPRIETARY & CONFIDENTIAL INTELLECTUAL PROPERTY**
> 
> All rights reserved. This repository, its architecture, source code, workflows, firmware, and associated documentation are the exclusive intellectual property of **Tharunkumar K**.
> 
> **No entity, organization, or individual is permitted to copy, modify, distribute, publish, commercially exploit, reverse engineer, or deploy any portion of this project without express, prior written permission from the author.**
> 
> **Copyright © 2026 Tharunkumar K. All Rights Reserved.**
