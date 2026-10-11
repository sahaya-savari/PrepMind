# Security Policy

## Supported Versions

Only the latest release and active branches are supported for security updates.

| Version / Branch | Supported |
| :--- | :--- |
| `main` | :white_check_mark: Yes |
| `ui-terminal-dark` | :white_check_mark: Yes |
| Older releases | :x: No |

---

## Reporting a Vulnerability

The PrepMind AI maintainers take security and data privacy seriously. If you discover a security vulnerability, please report it responsibly so that it can be remediated before public disclosure.

### Responsible Disclosure Process

1. **Do NOT open a public issue** for unpatched security vulnerabilities or secret leaks.
2. Report the vulnerability privately using one of the following channels:
   - **GitHub Security Advisories**: Use the "Report a vulnerability" tab under the repository's [Security page](https://github.com/sahaya-savari/PrepMind/security).
   - **Maintainer Contact**: Contact the repository owner directly via [GitHub Profile](https://github.com/sahaya-savari).
3. Please include:
   - A clear description of the potential vulnerability.
   - Steps to reproduce or a minimal proof of concept (PoC).
   - Affected components, routes, or files.
   - Any potential remediation ideas or proposed patches.

### What to Expect

- **Acknowledgment**: You will receive an acknowledgment within 48 to 72 hours.
- **Investigation**: The issue will be validated and assessed for impact.
- **Fix & Release**: A fix will be prepared, verified, and released.
- **Credit**: If desired, you will be credited in the release notes and CHANGELOG.

---

## Security Architecture Principles

PrepMind AI is built with defensive defaults:

1. **Zero Client Secret Exposure**:
   - Upstream LLM provider keys (`GROQ_API_KEY`, `NVIDIA_API_KEY`, `GEMINI_API_KEY`) and database service keys are stored exclusively in backend or Vercel serverless environment variables.
   - The React frontend makes relative calls to `/api/ai` without holding raw API tokens.
2. **Order-of-Operations Input Validation**:
   - All serverless endpoints validate request structure, action type, and payload payloads *before* performing any provider lookups or database operations, preventing unintended resource consumption.
3. **Graceful Degraded & Offline Fallbacks**:
   - The platform never requires sensitive access when external credentials fail. Deterministic offline banks safely isolate user sessions without exposing internal network details.
4. **Row-Level Security (RLS)**:
   - Supabase PostgreSQL schemas enforce strict Row-Level Security policies to ensure authenticated users access only their own interview drills and records.
