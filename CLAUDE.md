# Video editing tooling

Preinstalled by the `postiq` environment setup script:
- FFmpeg (system), yt-dlp and Whisper (`whisper` CLI, pip)
- Remotion and HyperFrames in `video/` (run `npm install` there if `node_modules` is missing)

Notes:
- For Hebrew transcription use `whisper --model medium --language he` (model downloads on first use).
- Keep video work and outputs inside `video/`; `node_modules/` is gitignored.
- If a download (YouTube, Whisper model) is blocked, the environment's network allowlist needs the host added.
