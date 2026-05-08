# Security Policy

## Supported versions

Only the latest release on `main` receives security fixes.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately via [GitHub's private vulnerability reporting](https://github.com/jonathanwxh-cell/stock-simulator/security/advisories/new) (Security → Report a vulnerability).

Include:
- A description of the issue and its impact
- Steps to reproduce or a proof-of-concept
- Any suggested fix if you have one

You can expect an acknowledgement within 3 business days and a fix or mitigation within 14 days for confirmed issues.

## Known design constraints

- **Leaderboard scores are client-computed.** The server accepts scores submitted by the client without server-side recomputation. A motivated attacker can submit arbitrary scores. This is a known trade-off for this project's scale; mitigation is planned via server-side validation.
- **Anonymous Supabase sessions** are stored in `localStorage`. Any XSS would allow an attacker to read/write that user's cloud saves. Mitigate by avoiding third-party scripts and keeping the Content-Security-Policy header tight in your deployment.
