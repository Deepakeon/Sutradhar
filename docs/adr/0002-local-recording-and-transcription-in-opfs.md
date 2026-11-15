# Local Tab Recording and In-Browser Transcription via OPFS

Interview media and transcripts are recorded and stored entirely on the client machine using the browser Origin Private File System (OPFS) rather than uploading audio/video to the backend or cloud storage. 

When entering the Room, users can grant tab-capture (`getDisplayMedia`) with local microphone mixing to capture the full visual interface ("Bandicam-style") and both participant audio tracks. Chunks stream continuously to OPFS every few seconds with EBML duration patching on call completion and crash recovery to prevent file corruption. Transcription is performed locally and on demand in a Web Worker using `whisper-base` (cached via Cache API), saving the resulting transcript directly in OPFS with optional user export. This guarantees zero server storage/API costs, ensures participant privacy, and eliminates video bandwidth overhead.
