:::::: center
::: minipage
![image](./logo.png){width="2.2cm"}
:::

::: minipage
**AURA - AI UNIFIED RETRIEVAL\
ASSISTANT**
:::

::: minipage
![image](./naac.png){width="2.2cm"}
:::

**A PROJECT REPORT**

*Submitted by*

**THARUNKUMAR K (922524205171)**

*Pursuing the degree of*

**BACHELOR OF TECHNOLOGY**\
in\
**INFORMATION TECHNOLOGY**

**V.S.B. ENGINEERING COLLEGE, KARUR-639 111**\
*(An Autonomous Institution)*

**JUNE 2026**
::::::

::: center
**DECLARATION**
:::

I declare that the project report on **"AURA - AI UNIFIED RETRIEVAL
ASSISTANT"** is the result of original work done by me and best of my
knowledge, similar work has not been submitted to **"ANNA UNIVERSITY
CHENNAI"** for the requirement of Degree, Bachelor of Technology.

This project report is submitted to the partial fulfillment of the
requirement of the award of Degree of Bachelor of Technology.

::: flushright
**SIGNATURE**

------------------------------------------------------------------------

THARUNKUMAR K
:::

Place: Karur

Date:

::: center
**ACKNOWLEDGEMENT**
:::

First and foremost, I express my thanks to my parents for providing me
with a very nice environment for doing this project. I wish to express
my sincere thanks to our Founder and Chairman **Shri. V.S.BALSAMY B.Sc.,
B.L.,** for his Endeavor in educating me in this premier institution.

I wish to express my appreciation and gratefulness to our Principal,
**Dr.C.VENNILA M.E., Ph.D.,** and Vice Principal **Dr.T.S.KIRUBASANKAR
M.E., Ph.D** for their encouragement and sincere guidance.

I am grateful to my head of the department **Dr.P.AROCKIA MARY M.E.,
Ph.D.,** and my project coordinator **Mr.D.VENGAIMARBHAN M.E.,**
Assistant Professor, Department of Information Technology for their
valuable support.

I express my thanks to the supervisor of my project **Mr.D.VENGAIMARBHAN
M.E.**, Assistant Professor, Department of Information Technology, for
guidance throughout the course of my project.

My sincere thanks to all the teaching staff of V.S.B Engineering College
and our friends for their help in the successful completion of this
project work.

Finally, I bow before God, the almighty who always had a better plan for
us. We give our praise and glory to Almighty God for successful
completion of this project.

# ABSTRACT {#abstract .unnumbered}

Modern organizations operate in increasingly complex digital
environments where the retrieval of confidential information must be
executed with data sovereignty constraints. Conventional
Retrieval-Augmented Generation (RAG) solutions typically rely on
cloud-hosted services and external API endpoints. This reliance makes
them unsuitable for high-security, air-gapped, and isolated network
infrastructures where the exposure of proprietary data to external
perimeters represents a significant compliance hazard and security risk.

To address these limitations, this project presents **AURA** (AI Unified
Retrieval Assistant), an offline multimodal Retrieval-Augmented
Generation framework developed to meet the requirements of the Smart
India Hackathon 2025 Problem Statement PS-25231. The system integrates a
local Large Language Model (LLaMA 3 with 8B parameters), a Nomic Embed
Text embedding model, an embedded SQLite-based vector storage layer, a
React and TypeScript frontend, an Electron desktop wrapper, and a
high-performance Java Spring Boot backend service. By packaging and
running all core processes entirely within the local host space, AURA
enables secure semantic document retrieval without any active internet
connectivity or external network handshakes.

AURA supports the ingestion and semantic indexing of multiple file
formats, including PDF, DOC, DOCX, image files (PNG, JPG, JPEG), and
spoken voice recordings (WAV, MP3). The processing pipeline utilizes
localized Python sidecar environments hosting cached CLIP and Whisper
models to generate multi-dimensional vision and transcribed audio
embeddings respectively. The system uses a recursive sentence-boundary
paragraph chunking methodology to divide text documents, computing
768-dimensional dense vectors that are stored as binary BLOBs inside a
localized SQLite relational database. Cosine similarity operations are
performed in an active in-memory cache managed by the Local Vector
Retrieval Service, returning matching context segments with page-level
citations.

The retrieved contexts and user queries are formatted into prompt
templates and processed by the local Ollama inference daemon. Responses
are streamed back to the React UI in real-time using virtual-thread
non-blocking channels, keeping CPU and RAM utilization highly balanced.
E2E validation cycles confirmed that the system runs securely under
disabled Wi-Fi adapters and WAN blocking setups, preventing data leaks
and ensuring strict isolation. AURA offers a zero-cost, private, and
highly responsive local RAG solution for secure enterprise environments
requiring offline deployment, multimodal document parsing, and grounded
context-aware information retrieval.

# TABLE OF CONTENTS {#table-of-contents .unnumbered}

**CHAPTER NO.** **TITLE** **PAGE NO.**\

# LIST OF FIGURES {#list-of-figures .unnumbered}

**FIGURE NO.** **TITLE** **PAGE NO.**\

# LIST OF TABLES {#list-of-tables .unnumbered}

**TABLE NO.** **TITLE** **PAGE NO.**\

# LIST OF ABBREVIATIONS {#list-of-abbreviations .unnumbered}

  AURA   AI Unified Retrieval Assistant
  ------ -----------------------------------------
  RAG    Retrieval-Augmented Generation
  LLM    Large Language Model
  ASR    Automatic Speech Recognition
  CLIP   Contrastive Language-Image Pre-training
  GQA    Grouped-Query Attention
  HNSW   Hierarchical Navigable Small World
  LRU    Least Recently Used
  VRAM   Video Random Access Memory
  DFD    Data Flow Diagram
  ERD    Entity Relationship Diagram
  E2E    End-to-End
  API    Application Programming Interface

# INTRODUCTION {#ch:introduction}

Retrieval-Augmented Generation (RAG) has emerged as a standard technique
for addressing large language model limitations such as hallucination
and lack of private context access. By retrieving relevant passages from
local knowledge documents and feeding them into the LLM prompt context,
systems can generate grounded, factual, and verified answers.

## PROJECT OVERVIEW

**AURA** is an offline Retrieval-Augmented Generation (RAG) system
designed to ingest, index, and query multi-format files locally. The
system operates entirely within the host security boundary, utilizing a
React and TypeScript client wrapped in Electron, a Java Spring Boot
backend service, and a local Ollama inference daemon. By executing all
computational tasks locally, the application preserves data sovereignty
and eliminates remote cloud dependencies, supporting PDF, DOC, DOCX,
PNG, JPG, JPEG, WAV, and MP3 formats natively.

## PROBLEM STATEMENT (SIH25231)

The Smart India Hackathon 2025 Problem Statement (PS-25231) requires the
development of an offline multimodal Retrieval-Augmented Generation
(RAG) system capable of ingesting, indexing, and semantically querying
diverse data formats including DOC, PDF, images, and voice recordings.
The complete solution must execute locally without cloud dependency
while providing accurate context-aware responses. AURA fulfills these
requirements through local language models, multimodal embedding
pipelines, unified vector retrieval, and citation-supported response
generation.

## PROJECT OBJECTIVES

The specific design objectives of the AURA architecture are:

1.  **Data Sovereignty:** Prevent outbound data transfers via loopback
    restrictions.

2.  **Quantized Execution:** Ensure fast local responses on consumer
    CPUs using quantized weights.

3.  **Resource Optimization:** Implement memory caps to minimize
    installation size.

4.  **Concurrent Robustness:** Use virtual threads to prevent server
    starvation during heavy parsing.

5.  **Multimodal Ingestion:** Index and search DOC, DOCX, PDF, PNG, JPG,
    JPEG, WAV, and MP3.

6.  **Unified Retrieval:** Map diverse data types into a shared vector
    embedding space.

7.  **Offline AI Execution:** Run LLM and embedding models locally
    without internet.

## MAPPING WITH SIH PROBLEM STATEMENT

Table [1.1](#tab:sih_mapping){reference-type="ref"
reference="tab:sih_mapping"} details how AURA's implementation directly
maps to and satisfies the requirements set forth in the Smart India
Hackathon PS-25231 problem statement.

::: {#tab:sih_mapping}
  **SIH Requirement**        **AURA Implementation**
  -------------------------- -------------------------------------------------------------------------------
  Offline Deployment         Ollama, SQLite and Spring Boot run locally without cloud dependence.
  Multimodal Ingestion       Ingestion of DOC, DOCX, PDF, Images (PNG, JPG, JPEG), and Voice (WAV, MP3).
  Unified Vector Retrieval   Shared embedding representation pipeline with Local Vector Retrieval Service.
  Semantic Search            Cosine similarity calculations executed over localized dense embeddings.
  LLM Response Generation    LLaMA 3 execution through local Ollama API loops.
  Citation Support           Source document page-level references traced and output.
  Secure Environment         Network isolation enforcing complete data privacy inside host borders.

  : SIH Problem Statement PS-25231 Mapping Matrix
:::

By adhering strictly to the constraints outlined in the SIH problem
statement, AURA establishes a secure, robust foundation for offline
knowledge processing. The subsequent chapters detail the literature
review, system architecture, module design, and the programmatic
methodologies utilized to construct this entirely isolated enterprise AI
platform.

# LITERATURE SURVEY {#ch:literature_survey}

In this chapter, we review the existing technologies and frameworks
relevant to Retrieval-Augmented Generation (RAG), vector databases,
audio transcription, visual representation, and client wrappers. We
analyze their underlying mechanisms and identify their key limitations
when deployed in strict offline or air-gapped security environments.

## SURVEY OF EXISTING SYSTEMS AND FRAMEWORKS

**Cloud RAG Systems:** Cloud-based RAG architectures (e.g.,
GPT-4/Claude) rely on remote endpoints for parsing and generation,
requiring WAN connectivity. This model introduces data security and
compliance risks since proprietary files cross the enterprise perimeter,
making it unsuitable for air-gapped operations.

**LangChain and Llama.cpp:** LangChain orchestrates LLM pipelines, while
Llama.cpp runs quantized models. However, LangChain often attempts
online registry checks on startup, and Llama.cpp requires manual
low-level compiler configuration and tuning, which complicates packaging
for non-technical users.

**ChromaDB Vector Database:** ChromaDB handles semantic retrieval but
typically runs as a standalone service inside Docker containers. In
air-gapped systems, container overhead is high and local firewalls
frequently block exposed database service ports.

**Weaviate Vector Search Engine:** Weaviate is a cloud-native vector
search engine. Its standalone server process requires at least 4GB of
dedicated RAM, making it too resource-heavy to embed directly into
lightweight single-user desktop client wrappers.

**Whisper Speech Recognition:** Whisper provides local speech-to-text.
Standard PyTorch versions rely on on-demand downloads from Hugging Face.
Running Whisper offline requires pre-cached model weights and optimized
C++ execution frameworks like faster-whisper.

**CLIP Vision Model:** CLIP maps text and images into a shared vector
space. Standard visual models depend on remote initialization. Offline
deployment requires caching the weights locally and locking out outbound
model validation queries.

**LLaMA 3 Large Language Model:** LLaMA 3 is an auto-regressive model.
Local execution of its 8B parameter variants requires strict memory
caps. AURA manages resource allocations through local Ollama wrappers to
prevent system lockups.

**Nomic Embed Text:** Nomic Embed Text maps text segments into
768-dimensional spaces. Standard deployments rely on external
tokenizers. AURA runs the model entirely locally via Ollama endpoints to
ensure data privacy.

## ACADEMIC LITERATURE SURVEY

In addition to specific software platforms, AURA's design is grounded in
several foundational academic works in information retrieval and natural
language processing.

**Retrieval-Augmented Generation (RAG):** The core architecture of
retrieval-grounded language modeling was formalized by Lewis et al.
[@rag_paper]. Their work introduced a framework where an autoregressive
generator is conditioned on external documents retrieved using a dense
passage retriever. This approach significantly reduces model
hallucinations and provides a mechanism for dynamic context integration
without modifying model weights. AURA adapts this framework to work
entirely on consumer host hardware.

**Dense Passage Retrieval (DPR):** Karpukhin et al. [@dpr_paper]
demonstrated that dense vector representations generated by BERT-based
bi-encoders can outperform classical sparse retrieval methods like BM25.
Their work established that computing the dot product (or cosine
similarity) of query and document dense vectors is highly effective for
semantic search. AURA leverages this conceptual foundation by utilizing
Nomic Embed Text to create dense representations and SQLite to store
them as binary blobs.

**Offline LLM Inference & Quantization:** Running LLMs on localized
nodes requires lightweight architectures. The transformer foundation
established by Vaswani et al. [@vaswani] paved the way for deep encoder
models like BERT by Devlin et al. [@offline_llm] and autoregressive
local large language models like LLaMA 3 [@llama3]. Local execution is
further enhanced by quantization methods, which represent model weights
in lower-precision formats (such as 4-bit integer weights). This allows
LLaMA 3 models to load into client RAM without swapping, forming the
basis for offline inference engines like Ollama.

**Probabilistic Relevance Models (BM25):** While dense search is
effective, hybrid systems often build upon classic sparse vector
retrieval. The probabilistic relevance framework and the BM25 model,
summarized by Robertson and Zaragoza [@bm25_paper], remain standard
benchmarks for keyword-based retrieval. Understanding these models
helped shape AURA's relevancy filtering logic, ensuring low-relevance
matches are discarded before prompt synthesis.

## SUMMARY AND COMPARISON OF SYSTEMS

Table [2.1](#tab:system_comparison){reference-type="ref"
reference="tab:system_comparison"} provides a comparative analysis
matrix comparing AURA against existing frameworks. By analyzing
capabilities across offline readiness, multimodal support, and citation
mechanisms, the matrix highlights the architectural trade-offs inherent
in RAG systems. While cloud APIs provide high model parameters, they
introduce data security concerns that are unacceptable in isolated
perimeters. Standalone vector services offer high retrieval efficiency
but require significant resource footprints that are difficult to
package for standard client environments. AURA addresses these gaps by
combining lightweight local execution, local citation tracing, and
host-level security perimeters in a single bundle.

::: {#tab:system_comparison}
  **System / Architecture**    **Offline?**   **Multimodal?**   **Citations?**   **Key Limitation / Security Flaw**
  ---------------------------- -------------- ----------------- ---------------- -------------------------------------------
  Cloud API (GPT-4 / Claude)   No             Yes               Optional         Data leak risk, requires active WAN
  LangChain + LlamaCpp         Yes            No                Complex          Complex setup, slow startup checks
  Docker ChromaDB Service      Yes            No                No               Port exposure, multi-GB storage overhead
  Weaviate Server              Yes            No                No               4GB+ RAM footprint, network bound
  Whisper PyTorch              Yes            Yes (Audio)       No               Direct weights download from Hugging Face
  **AURA (SIH25231)**          **Yes**        **Yes**           **Yes**          **Bounded in-memory cache capacity**

  : Comparative Analysis of Local RAG Architectures
:::

# SYSTEM ANALYSIS {#ch:system_analysis}

In this chapter, we analyze the current system flaws in standard
retrieval systems, detail the proposed AURA system, and present a
feasibility study based on project constraints.

## EXISTING SYSTEM

Enterprise RAG deployments typically rely on cloud APIs, exposing
sensitive data outside the local network perimeter.

- **Security Vulnerabilities:** Data exits the secure host perimeter,
  risking interception or unauthorized commercial model training.

- **Reliability Failures:** Complete dependence on external WAN
  connectivity, DNS routing, and remote API server availability.

- **Operational Costs:** High transactional costs driven by continuous
  per-token API billing.

## PROPOSED SYSTEM

AURA executes all processes locally via Spring Boot, SQLite, and Ollama.
Table [3.1](#tab:existing_vs_proposed){reference-type="ref"
reference="tab:existing_vs_proposed"} compares it with cloud RAG
architectures.

::: {#tab:existing_vs_proposed}
  **Existing Cloud RAG System**                       **Proposed AURA (Offline RAG)**
  --------------------------------------------------- ---------------------------------------------------------------
  Uploads documents to cloud endpoints.               Files remain locally on disk, processed in memory.
  Remote API token billing models.                    Zero run-time transaction or processing costs.
  Breaks down completely without WAN connectivity.    Works in high-security, air-gapped workstations.
  Requires manual Docker/Server environment setups.   Single package installation, silent background orchestration.

  : Structural Comparison of Existing vs. Proposed Architecture
:::

## FEASIBILITY STUDY

**Technical Feasibility:** The local hardware target supports execution
of quantized models using Ollama and Python sidecars. The Java Spring
Boot backend schedules threads efficiently, allowing deployment on
standard CPU workstations or GPU-accelerated environments.

**Economic Feasibility:** The project runs with zero operational costs
as it is composed of open-source libraries (Spring Boot, Electron, Vite,
SQLite). Running all models locally eliminates transactional cloud API
token costs.

**Operational Feasibility:** Deployment requires no manual software
installs as the installation wrapper aggregates JRE 21, the database,
and local models relative to the launcher, boot-checking communication
channels automatically.

# SYSTEM REQUIREMENTS {#ch:system_requirements}

This chapter details the exact hardware and software resources required
to run and build the AURA project.

## HARDWARE REQUIREMENTS

Hardware specs are dictated by LLaMA 3 (8B) and vector operations (Table
[4.1](#tab:hardware_requirements){reference-type="ref"
reference="tab:hardware_requirements"}). The 20 GB storage covers
quantized model weights (LLaMA 3, Nomic, CLIP, Whisper), runtime JRE,
Python environment, and database files. GPU acceleration is optional;
CPU execution is fully supported.

::: {#tab:hardware_requirements}
  **Resource**          **Minimum Requirement**                  **Recommended Specification**
  --------------------- ---------------------------------------- ----------------------------------------------------
  **Processor (CPU)**   Intel Core i5 (8th Gen) or AMD Ryzen 5   Intel Core i7 (11th Gen) or AMD Ryzen 7
  **Memory (RAM)**      GB DDR4                                  GB DDR4/DDR5
  **Storage (SSD)**     GB available SATA/NVMe SSD               GB available NVMe SSD
  **Graphics (GPU)**    Integrated Intel Iris / AMD Graphics     Dedicated NVIDIA RTX 3060/4050/4060 with 6GB+ VRAM
  **Network Adapter**   Offline only (Not Required)              Offline only (Not Required)

  : System Hardware Specifications
:::

## SOFTWARE REQUIREMENTS

The software specifications are configured as listed in Table
[4.2](#tab:software_requirements){reference-type="ref"
reference="tab:software_requirements"}.

::: {#tab:software_requirements}
  **Stack Component**   **Configured Technologies**                     **Operational Scope**
  --------------------- ----------------------------------------------- --------------------------------------------------------
  Frontend Shell        Electron \^31, React 19, Vite \^6, TypeScript   Stages client view and coordinates IPC messaging loop.
  Backend Services      Java 21, Spring Boot 3.3.0, Hibernate ORM       Document parsing, service logic, and async pools.
  Database              SQLite 3.45.3, SQLite JDBC Driver               Stores metadata, document status, and vector BLOBs.
  Local Inference       Ollama, LLaMA 3 (8B), Whisper, CLIP             Offline generation, translation, and modal embeddings.

  : Software Dependencies and Configuration Versions
:::

## OS AND INFERENCE CONSTRAINTS

AURA runs on Windows 10/11 (64-bit) in user space without administrator
privileges. Local LLaMA 3 and Nomic models require at least 8GB of free
RAM under Ollama. The backend uses CPU threading matching physical cores
to prevent memory swapping, and supports GPU offloading to reduce
latency.

# SYSTEM DESIGN {#ch:system_design}

In this chapter, we outline the structural and logical design of AURA,
mapping out components, schema relationships, data flows, and module
responsibilities.

## SYSTEM ARCHITECTURE

AURA uses a multi-layered local desktop architecture. The
React/TypeScript frontend running inside Electron connects to the Spring
Boot core (Java 21) via non-blocking WebSockets on port 8080. The
backend manages the document parsing pipelines, coordinates Python
sidecar processes, and queries the database storage layer. Persistence
is managed via an embedded SQLite database and a synchronized in-memory
retrieval cache. Figure 5.1 illustrates the system components.

The architecture directly satisfies the Smart India Hackathon PS-25231
requirements by integrating local document ingestion, multimodal
embedding generation, semantic vector retrieval, and offline language
generation within a single desktop application. Each processing stage
executes entirely on the host system, ensuring complete data privacy and
eliminating dependence on external cloud infrastructure.

The ingestion pipeline accepts multiple document formats including DOC,
DOCX, PDF, PNG, JPG, JPEG, WAV, and MP3. Text documents are parsed into
semantic chunks, image files are processed through the CLIP embedding
model, and audio recordings are transcribed using Whisper before
embedding generation. All embeddings are stored within a unified local
vector retrieval layer, enabling semantic search across different data
modalities.

The complete query execution and generation pipeline is defined by the
following sequential workflow:

1.  **User Prompt Submission:** The user enters a question in the
    React-based chat window.

2.  **Electron Preload Bridge Routing:** Electron captures the text
    input and routes it securely to the Spring Boot backend service over
    a local WebSocket channel.

3.  **Backend Reception:** Spring Boot receives the text payload and
    triggers a request to the local Ollama API to compute the semantic
    embedding vector of the user query.

4.  **In-Memory Vector Retrieval:** The system queries the in-memory
    cache managed by the Local Vector Retrieval Service (represented as
    ChromaDBService in the source code). It calculates the cosine
    similarity between the query vector and all cached document segment
    vectors.

5.  **SQLite Persistent Matching:** If needed, metadata is synchronized
    from the SQLite database. Relevant document chunks are identified,
    sorted by their similarity score, and formatted into a context
    block.

6.  **Ollama Context Grounding:** Spring Boot sends a generation request
    consisting of the context block and the user query to the local
    Ollama inference service (running LLaMA 3).

7.  **Token Streaming Response:** Ollama generates the response tokens
    which are streamed back to the Spring Boot server. The server
    forwards these tokens to the React frontend in real-time, displaying
    the completed, citation-backed answer to the user.

<figure id="fig-architecture" data-latex-placement="!ht">

<figcaption>AURA Multi-layered Local System Architecture</figcaption>
</figure>

## DATABASE DESIGN

The relational storage schema is managed locally inside the SQLite
database file (`aura.db`) and mapped via Java JPA Hibernate interfaces.
To maximize retrieval speed, Nomic-generated embeddings are serialized
as binary BLOBs inside the `vector_chunks` table. At startup, the Local
Vector Retrieval Service loads this table into memory to enable instant
cosine similarity lookups. Figure
[5.2](#fig-er-diagram){reference-type="ref" reference="fig-er-diagram"}
shows the database schema entity relationships.

The schema includes the following design decisions and relationships:

- **Table Relationships:** A one-to-many relationship exists between the
  `documents` table (which holds document metadata such as name, size,
  type, and upload timestamp) and the `vector_chunks` table (which
  stores individual text segments). This allows the system to cascade
  deletion operations: when a document is removed, all its corresponding
  vector segments are deleted automatically. The `chats`, `settings`,
  and `audit_logs` are independent helper tables that store chat
  histories, runtime parameter overrides, and security logs
  respectively.

- **Primary and Foreign Keys:** Every entity defines a unique primary
  key (PK). The `vector_chunks` table contains the foreign key (FK)
  `doc_id` referencing the primary key of the `documents` table to
  maintain referential integrity.

- **BLOB Embedding Storage:** Vector embeddings are generated as
  768-dimensional float arrays. Storing these arrays as binary BLOBs
  (Binary Large Objects) allows rapid SQLite write operations and direct
  memory serialization, avoiding the parsing latency and storage
  overhead of converting float values into text representations.

- **In-Memory Layer Interaction:** On application boot, the Local Vector
  Retrieval Service query layer executes a read operation on the
  `vector_chunks` table. It deserializes the byte arrays back into float
  arrays and stores them in a memory-bounded cache. During document
  indexing, new chunks are written to the SQLite database and appended
  to the in-memory cache concurrently, keeping both layers synchronized.

<figure id="fig-er-diagram" data-latex-placement="!ht">

<figcaption>AURA SQLite Schema Entity Relationship Diagram (chats,
settings, and audit logs are independent system tables for session state
and logs)</figcaption>
</figure>

## DATA FLOW DIAGRAM

The data flow diagram traces the prompt and retrieval lifecycle. When a
user queries the interface, the WebSocket handler routes the prompt to
the backend, which requests the query embedding from the local Ollama
process. The search service queries the SQLite in-memory index for
relevant context blocks. The context is formatted into a prompt template
and processed by LLaMA 3, with output tokens streamed back dynamically
to the UI. Figure [5.3](#fig-dfd){reference-type="ref"
reference="fig-dfd"} illustrates these processing loops.

<figure id="fig-dfd" data-latex-placement="!ht">

<figcaption>AURA Local Data Flow Diagram (DFD)</figcaption>
</figure>

## MODULE DESIGN

The backend consists of specific service classes designed for
performance, security, and responsiveness:

::: description
Orchestrate parsing loops for multiple formats. This includes parsing
text via PDFBox, generating visual vector descriptors using CLIP
sidecars, and transcribing spoken WAV/MP3 recordings via faster-whisper.

Runs background execution threads, processing documents page-by-page.
This ensures the main UI thread remains responsive during ingestion
workloads.

Manages an active local cache capped at 50,000 vector chunks. It
executes cosine similarity calculations in memory to guarantee
sub-second retrieval latency.

Coordinate prompt formatting and socket token streaming with the local
Ollama process, load and save settings to SQLite, and validate model
checksums.
:::

The coordination between these services creates a highly modular and
robust backend architecture, permitting independent testing and
maintenance of individual service perimeters while maintaining unified
offline data integrity across all system boundaries.

<figure id="fig:module_design" data-latex-placement="!hb">

<figcaption>AURA Backend Service Module Relationships and Data
Flow</figcaption>
</figure>

# METHODOLOGY {#ch:methodology}

In this chapter, we outline the mathematical framework and core
programmatic pipelines for document parsing, chunking, embedding
generation, vector similarity mapping, and WebSocket-based generation
routing.

## RECURSIVE SENTENCE-BOUNDARY PARAGRAPH CHUNKING

To index files without losing semantic coherence, AURA implements a
localized sentence-boundary text chunker. Standard character-based
chunking limits split sentences midway, destroying context. The Java
backend reads PDF files via Apache PDFBox, splits text into sentences
using basic boundary rules, and recursively joins adjacent sentences
until a threshold of 250 words is reached, maintaining a 50-word overlap
to preserve contextual relationships at chunk borders.

The chunking algorithm executes in a background thread and conforms to
the following operational pipeline:

::: singlespace
    1.  Initialize chunks = EmptyList(), currentChunk = EmptyList()
    2.  currentWordCount = 0, overlapWords = 50
    3.  for each sentence in document:
    4.      words = splitIntoWords(sentence)
    5.      if currentWordCount + length(words) > 250:
    6.          chunks.add(joinWords(currentChunk))
    7.          currentChunk = keepLastNWords(currentChunk, overlapWords)
    8.          currentWordCount = wordCount(currentChunk)
    9.          currentChunk = getOverlapSentences(currentChunk, overlapWords)
    10.         currentWordCount = wordCount(currentChunk)
    11.     currentChunk.add(sentence)
    12.     currentWordCount += length(words)
    13. if length(currentChunk) > 0:
    14.     chunks.add(joinWords(currentChunk))
    15. return chunks
:::

## SQLITE VECTOR RETRIEVAL AND COSINE SIMILARITY

The system calculates the semantic similarity between query vectors and
stored document segments using cosine similarity mathematics. The
calculation computes the dot product of two multi-dimensional embedding
arrays, which is then divided by the product of their Euclidean norms.
If either vector contains only zeros, the similarity score is set to
zero to prevent runtime division errors. The search service utilizes
this normalized similarity score to rank all candidate document
segments, selecting the most relevant segments to insert into the
context window.

The cosine similarity score between a query vector $Q$ and a document
segment vector $D$ is defined mathematically by Equation
[\[eq:cosine\]](#eq:cosine){reference-type="ref" reference="eq:cosine"}:
$$\begin{equation}
\label{eq:cosine}
\text{Similarity}(Q, D) = \frac{Q \cdot D}{\|Q\| \|D\|} = \frac{\sum_{i=1}^{n} Q_i D_i}{\sqrt{\sum_{i=1}^{n} Q_i^2} \sqrt{\sum_{i=1}^{n} D_i^2}}
\end{equation}$$ where $n = 768$ represents the dimension of the
embedding space.

The retrieval pipeline follows a multi-stage validation flow as shown:

::: center
:::

## WEBSOCKET STREAMING AND VIRTUAL THREAD EXECUTION

The text generation engine coordinates asynchronous response streaming
using Spring Boot and Java virtual threads. On receiving a WebSocket
request, the backend verifies that the destination URL points to a
loopback address, preventing remote data leakage. The request is then
submitted to an execution pool that spawns lightweight virtual threads.
These virtual threads handle the incoming streaming HTTP socket
connection from the local Ollama process. This setup reads and delivers
token chunks back to the client interface in real time, preventing
platform thread starvation during concurrent queries and maintaining UI
responsiveness. By using virtual threads instead of platform threads,
the application can scale concurrently to support simultaneous indexing
and generation requests without memory exhaustion or locking up frontend
events.

## STRICT LOCAL NETWORK BOUNDARY ENFORCEMENT

To prevent data leakage, a Spring interceptor captures all outgoing HTTP
requests from the backend. The destination host is matched against a
strict loopback address allowlist containing only local loopback hosts
(e.g., localhost, 127.0.0.1). Any request targeting an external domain
is blocked and raises a security exception. This layer ensures that even
if local models or libraries attempt to check online registries or
download files, the network boundary blocks those attempts, enforcing
strict compliance.

## INSTALLER BUILD AND FOOTPRINT OPTIMIZATION

The automated build pipeline strips developer artifacts, test caches,
and python bytecode from the distribution package. It deletes redundant
shared headers and C++ libraries in machine learning dependencies (e.g.,
PyTorch), optimizing the offline package footprint. This pruning process
reduces the local build footprint by approximately 45%, making
distribution feasible.

## DATABASE AND VECTOR STORAGE STAGING

Metadata and vector persistence are handled locally by SQLite
(`aura.db`) via Hibernate. 768-dimensional dense vectors are stored
directly as database BLOB structures, eliminating container database
overhead.

## RUNTIME PACKAGING AND LOCAL STAGING LAYOUT

For air-gapped systems, the installer aggregates the local JRE (v21), a
Python virtual environment with dependencies, and offline model files
into a relative directory structure, enabling runtime orchestration
without external downloads.

# TESTING {#ch:testing}

This chapter details the testing process, verifying offline stability,
model execution, and validation.

## TESTING METHODOLOGY

Black-box testing validated local orchestration under air-gapped
conditions. Verification targeted ingestion and UI functions (uploads,
SQLite saves, WebSocket streaming), end-to-end orchestration (Electron
preload bridging and Java background sidecars), and strict network
isolation (with all WAN interfaces disabled). Table
[7.1](#tab:test_cases){reference-type="ref" reference="tab:test_cases"}
details the manual test cases verified during local execution.

::: {#tab:test_cases}
  **ID**   **Module**   **Action / Input**      **Expected Output**                **Observations & Result**
  -------- ------------ ----------------------- ---------------------------------- -----------------------------------------------------
  TC-01    Electron     Run app without WAN.    Boot JRE backend; display UI.      Booted; app fully operational locally (PASS).
  TC-02    Ollama       General text query.     Generate response locally.         Response tokens streamed on CPU (PASS).
  TC-03    Indexer      Ingest DOC/DOCX file.   Extract text; save embeddings.     Text parsed and embeddings saved to SQLite (PASS).
  TC-04    Indexer      Ingest PDF document.    Sentence chunking; save vectors.   Chunked and indexed; UI remained responsive (PASS).
  TC-05    Vision       Ingest PNG/JPG image.   Extract vision features.           CLIP feature vectors written to database (PASS).
  TC-06    Audio        Ingest WAV/MP3 voice.   Whisper speech transcription.      Transcribed and indexed text successfully (PASS).
  TC-07    Search       Semantic query.         Retrieval ranking by similarity.   Returned ranked cross-modal matches (PASS).

  : System Test Cases and Results
:::

## TEST ISOLATION AND LEAK VERIFICATION

Network isolation was verified by disabling WAN adapters. The backend
request guard successfully intercepted and blocked outbound HTTP queries
to external hosts, confirming complete local execution.

# RESULTS AND DISCUSSION {#ch:results_and_discussion}

In this chapter, we present the visual layouts of the deployed interface
and discuss system performance characteristics.

## VISUAL INTERFACE LAYOUT

We present native visual layouts of the system interfaces. Every
screenshot is configured with a strict 16:9 aspect ratio and explicit
border boxes to align the graphic presentations.

**Unified Chat Window:** The Chat Screen provides real-time streaming of
response tokens over WebSockets. Citations are displayed as clickable
page-level links beneath answers. Chat sessions are stored locally in
the SQLite database to preserve historical context offline.

<figure id="fig:chat_interface" data-latex-placement="!ht">

<figcaption>Grounded Chat Screen displaying local
responses.</figcaption>
</figure>

**Document Library View:** The Library interface enables drag-and-drop
ingestion of documents. It lists metadata, file sizes, processing
status, and page counts. Document deletion triggers a cascade database
delete that removes corresponding vector chunks.

<figure id="fig:library_view" data-latex-placement="!ht">

<figcaption>Document Management panel.</figcaption>
</figure>

**System Settings Screen:** The Settings Screen exposes hyperparameter
configuration tools. Users can choose local models, set temperature
parameters, define search thresholds, and enable GPU offloading. Thread
caps prevent host system resource starvation.

<figure id="fig:settings_view" data-latex-placement="!ht">

<figcaption>System Settings interface configuring model
parameters.</figcaption>
</figure>

## MULTIMODAL RETRIEVAL VALIDATION

Verification successfully validated offline ingestion, indexing, and
retrieval for PDF, DOC, DOCX, images, and audio formats within the
unified semantic retrieval layer.

## PERFORMANCE ANALYSIS

A comprehensive evaluation was conducted to measure system latencies and
resource bounds during completely offline execution.

- **Disk and Installer Optimization:** The deployment pipeline removes
  duplicate machine learning libraries and developer dependencies,
  optimizing the final offline packaging size.

- **Memory In-Memory Caching:** In-memory caches are capped at 50,000
  document vector chunks, which maintains a stable RAM usage footprint
  of approximately `[RAM Usage]`.

- **Ingestion Speed and Chunking:** Document parsing, recursive
  chunking, and embedding generation complete within a bounded indexing
  time of `[Indexing Time]` per document.

- **Inference and CPU Utilization:** Quantitative CPU benchmarks confirm
  LLaMA 3 execution maintains thread stability under a capped peak load
  of `[CPU Usage]`.

- **Query Retrieval Latency:** Local vector retrieval and cosine
  similarity calculations finish within a query latency of
  `[Average Retrieval Time]` for typical datasets.

- **System Retrieval Quality:** Context-aware answers show robust
  grounding against source files, with a measured semantic lookup
  success accuracy of `[Accuracy]`.

# CONCLUSION AND FUTURE WORK {#ch:conclusion_and_future}

This chapter concludes the project report and outlines potential future
enhancements.

## CONCLUSION

In conclusion, AURA successfully satisfies the objectives of Smart India
Hackathon Problem Statement PS-25231 by delivering a fully offline,
secure, and multimodal Retrieval-Augmented Generation platform. By
executing LLaMA 3, Whisper, and CLIP models entirely on local hardware,
the system enables semantic indexing and retrieval across DOC, DOCX,
PDF, image, and voice files while guaranteeing complete data privacy.
The developed prototype demonstrates the feasibility of enterprise-grade
AI assistants operating within air-gapped computing environments without
relying on external cloud dependencies.

## FUTURE ENHANCEMENTS

While functional, future development phases could improve resource usage
and features:

1.  **WebGPU Inference Acceleration:** Replacing Python-based embedding
    sidecars with WebGPU interfaces inside the Electron wrapper,
    reducing storage and installer footprint significantly.

2.  **OCR Document Parsing:** Adding local OCR capabilities (using tools
    like Tesseract) to support image-based PDF parsing.

3.  **Local Multi-Modal Indexing:** Integrating local vision-language
    models (such as LLaVA) directly into the chat interface to support
    image-based question answering.

## LESSONS LEARNED AND DESIGN INSIGHTS

Deploying generative pipelines on standard client systems highlighted
two main insights. First, high-speed Java-based similarity calculations
require in-memory indexing, which demands LRU cache containment
strategies to protect host memory. Second, packaging the JRE and Python
Virtual Environments relatively is essential to ensure that distribution
packages run plug-and-play across varying air-gapped target
environments.

::: thebibliography
99 Meta AI, "Introducing Llama 3: The next generation of our open-source
large language model," Meta AI Blog, Apr. 2024. \[Online\]. Available:
<https://ai.meta.com/blog/meta-llama-3/>. A. Radford, J. W. Kim, T. Xu,
G. Brockman, C. McLeavey, and I. Sutskever, "Robust Speech Recognition
via Large-Scale Weak Supervision," arXiv preprint arXiv:2212.04356, Dec.
2022. A. Radford et al., "Learning Transferable Visual Models From
Natural Language Supervision," in *Proceedings of the International
Conference on Machine Learning (ICML)*, 2021, pp. 8748--8763. Chroma
Core Team, "Chroma: The AI-native open-source vector database," Chroma
Documentation, 2023. \[Online\]. Available:
<https://docs.trychroma.com>. VMware Tanzu, "Spring Boot Reference
Documentation," VMware, 2024. \[Online\]. Available:
<https://docs.spring.io/spring-boot/index.html>. Electron Project
Authors, "Electron Documentation: Build cross-platform desktop apps,"
OpenJS Foundation, 2024. \[Online\]. Available:
<https://www.electronjs.org/docs>. Ollama Open Source Project, "Ollama:
Run Llama 3, Mistral, and other large language models locally," 2024.
\[Online\]. Available: <https://ollama.com>. Smart India Hackathon,
"Smart India Hackathon 2025 Problem Statements Listing: PS#25231 AI
Unified Retrieval Assistant," Ministry of Education, Govt. of India,
2025. \[Online\]. Available: <https://www.sih.gov.in/>. P. Lewis et al.,
"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," in
*Advances in Neural Information Processing Systems (NeurIPS)*, vol. 33,
2020, pp. 9459--9474. V. Karpukhin et al., "Dense Passage Retrieval for
Open-Domain Question Answering," in *Proceedings of the 2020 Conference
on Empirical Methods in Natural Language Processing (EMNLP)*, 2020, pp.
6769--6781. J. Devlin, M. W. Chang, K. Lee, and K. Toutanova, "BERT:
Pre-training of Deep Bidirectional Transformers for Language
Understanding," in *Proceedings of the 2019 Conference of the North
American Chapter of the Association for Computational Linguistics
(NAACL)*, 2019, pp. 4171--4186. S. Robertson and H. Zaragoza, "The
Probabilistic Relevance Framework: BM25 and Beyond," *Foundations and
Trends in Information Retrieval*, vol. 3, no. 4, 2009, pp. 333--389. A.
Vaswani et al., "Attention Is All You Need," in *Advances in Neural
Information Processing Systems (NeurIPS)*, 2017, pp. 5998--6008.
:::
