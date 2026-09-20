<div align="center">

# 🧠 Aura — 100% Offline Multimodal Retrieval-Augmented Generation (RAG) Workstation
### *Air-Gapped Desktop Intelligence Platform: LLaMA 3, Nomic Embeddings, Whisper Voice & CLIP Image Retrieval with Zero Cloud Dependency*

[![Hackathon](https://img.shields.io/badge/Hackathon-SIH%202025%20PS-25231-f59e0b?style=for-the-badge&logo=gitbook&logoColor=white)](#) [![Java](https://img.shields.io/badge/Java-21%20LTS-orange?style=for-the-badge&logo=openjdk&logoColor=white)](#) [![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%203.3.x-6db33f?style=for-the-badge&logo=springboot&logoColor=white)](#) [![Desktop](https://img.shields.io/badge/Desktop-Electron%2030%2B-47848F?style=for-the-badge&logo=electron&logoColor=white)](#) [![Inference](https://img.shields.io/badge/Inference-100%25%20Offline%20Local-10b981?style=for-the-badge&logo=ollama&logoColor=white)](#) [![License](https://img.shields.io/badge/License-Strict%20Proprietary-dc2626?style=for-the-badge&logo=lock&logoColor=white)](#)

<p align="center">
  <a href="https://github.com/Tharun4743/SIH25231">📦 <b>Official GitHub Repository</b></a>
  
</p>

</div>

---

## 1. 📌 Problem Statement & Context
### 🚨 The Data Sovereignty Barrier in Modern Generative AI

Critical defense organizations, intelligence agencies, healthcare providers, and high-tech research labs are strictly barred from leveraging cloud-hosted Large Language Models (LLMs):

* 🔒 **Regulatory Data Sovereignty Mandates:** National security protocols, HIPAA regulations, and intellectual property defense policies strictly prohibit uploading classified documents to third-party public cloud APIs.
* 🌐 **Air-Gapped Operational Environments:** Field defense outposts, naval vessels, research bunkers, and disaster zones operate in completely disconnected environments with zero internet access.
* 🗂️ **Multimodal Intelligence Fragmentation:** Critical institutional knowledge is scattered across incompatible media: technical PDFs, handwritten voice debriefs, and photographic evidence.
* 🛠️ **Complex Local Setup Hurdles:** Existing open-source AI projects require manual compiler setups, Python virtualenvs, CUDA driver configurations, and terminal commands that non-technical professionals cannot execute.

---

## 2. 🔍 Existing Solutions & Critical Gaps
### 🔍 Analysis of Existing Information Retrieval Systems

| Capability / Metric | Cloud RAG (Azure / AWS Bedrock) | Terminal Scripts (CLI Ollama) | 🧠 Aura Multimodal RAG |
| :--- | :---: | :---: | :---: |
| **Internet Dependency** | ❌ Mandatory Internet Connection | ⚠️ Required for Setup | ✅ 100% Air-Gapped Operation |
| **Multimodal Coverage** | ⚠️ Text Only (Standard) | ❌ Text Only | ✅ Text (PDF), Audio (Whisper), Image (CLIP) |
| **Data Exfiltration Risk** | ❌ High Cloud Leak Risk | ⚠️ Unsanitized Python Libraries | ✅ Loopback-Only NetworkGuard Isolation |
| **Deployment Model** | 💸 Heavy Monthly Cloud Bills | ⚠️ Complex CLI Setup | ✅ Single-Click Windows Installer (.exe) |
| **Bundled Runtimes** | ❌ N/A | ❌ User Must Install Python/Java | ✅ Automated JRE 21 & Virtualenv Bundling |

---

## 3. 💡 Proposed Solution & Architectural Innovation
### 💡 The Aura Air-Gapped Multimodal Workstation

**Aura** is an air-gapped, 100% offline multimodal Retrieval-Augmented Generation (RAG) desktop workstation engineered as the technical solution for **Smart India Hackathon 2025 (Problem Statement 25231)**:

* 🛡️ **100% Zero-Cloud Air-Gapped Operation:** Operates entirely on the local host with TRANSFORMERS_OFFLINE=1 and HF_DATASETS_OFFLINE=1, guaranteeing zero bytes ever exit the machine.
* 📚 **Multimodal Document Retrieval:** Sliding-window text chunking (500 tokens, 100 overlap) and 768-dim semantic search via Nomic Embed Text over PDFs, Markdown, and TXT files via Apache PDFBox.
* 🎙️ **Offline Voice-to-Text Transcription:** Isolated Python sidecar running faster-whisper (OpenAI Whisper weights) providing instantaneous on-device audio transcription.
* 🖼️ **Natural-Language Semantic Image Search:** Contrastive vision-language search powered by OpenAI CLIP ViT-B/32, enabling users to find visual assets using natural descriptive queries.
* 🔒 **Hardened NetworkGuard Isolation:** Spring Boot NetworkGuardService strictly enforcing loopback-only URLs (127.0.0.1), rejecting external telemetry, and enforcing Electron IPC context isolation.
* 📦 **Turnkey Windows Installer:** Automated build pipeline bundling Java 21 JRE, Spring Boot JAR, Python virtualenv, and React bundle into a standalone Windows installer (NSIS & MSIX).

---

## 4. ⚙️ Technical Approach & System Architecture
### ⚙️ Deep Technical Architecture

| Subsystem | Technology | Architectural Role |
| :--- | :--- | :--- |
| **Desktop Container** | Electron 30+, React 18, TypeScript | Secure desktop container with context isolation and narrow IPC bridge |
| **Backend Core** | Java 21, Spring Boot 3.3 | WebSocket token streaming, Apache PDFBox text extraction, NetworkGuard validation |
| **Vector Database** | SQLite (aura.db), ChromaDB | Embedded local storage for 768-dimensional embeddings and document metadata |
| **Local LLM Engine** | Ollama (LLaMA 3 8B, Nomic Embed Text) | Local model orchestration with CPU int8 quantization and optional NVIDIA CUDA |
| **Sidecar Processes** | Python 3.10+, faster-whisper, CLIP | Isolated background workers for speech recognition and image embedding |

---

## 5. 📈 Quantifiable Impact & Measurable Benefits
### 📈 Verified Outcomes & National Hackathon Impact

* 🏆 **Official SIH 2025 Submission (PS-25231):** High-fidelity architectural solution delivering complete national data sovereignty.
* 🔒 **100% Data Confidentiality Guarantee:** Zero data exfiltration vulnerability, perfectly conforming to military and medical compliance laws.
* 🔍 **Unified Multimodal Intelligence:** Eliminates media silos by allowing users to search text archives, audio logs, and photos through a single chat interface.
* 💰 **Zero Recurring SaaS Costs:** Completely eliminates enterprise cloud token bills and recurring database fees.

---

## 6. 🚀 Feasibility, Operational Viability & Scalability
### 🚀 Feasibility, Hardware Compatibility & Commercial Viability

* 🔬 **Technical Feasibility:** Optimized with int8 model quantization to execute comfortably on standard consumer laptops with 16GB RAM without dedicated server GPUs.
* 💼 **Operational Viability:** Single-click Windows installer with automated model verification requires zero technical or command-line knowledge from end-users.
* 📈 **Commercial Viability:** High commercial demand across defense agencies, aerospace manufacturers, legal audit firms, and medical centers where cloud AI is prohibited.

---

## 7. 👨‍💻 Author & Intellectual Property License

### Lead Architect & Author
**Tharunkumar K** ([@Tharun4743](https://github.com/Tharun4743))
* 🎓 B.Tech Information Technology • V.S.B. Engineering College, Karur
* 🌐 [GitHub Profile](https://github.com/Tharun4743) • [LinkedIn](https://linkedin.com/in/tharunkumark4743) • [Personal Portfolio](https://tharunkumark4743.netlify.app)

### 🔒 Proprietary License Notice (All Rights Reserved)
> [!CAUTION]
> **PROPRIETARY & CONFIDENTIAL INTELLECTUAL PROPERTY**
> 
> All rights reserved. This repository, its architecture, source code, workflows, firmware, and associated documentation are the exclusive intellectual property of **Tharunkumar K**.
> 
> **No entity, organization, or individual is permitted to copy, modify, distribute, publish, commercially exploit, reverse engineer, or deploy any portion of this project without express, prior written permission from the author.**
> 
> **Copyright © 2026 Tharunkumar K. All Rights Reserved.**
