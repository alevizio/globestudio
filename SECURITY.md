# Security Policy

## Supported versions

Worlddots is shipped continuously from `main`. The latest release on
[github.com/alevizio/worlddots/releases](https://github.com/alevizio/worlddots/releases)
is the only supported version.

## Reporting a vulnerability

**Please do not open a public issue for security problems.** Use one of:

1. **GitHub Security Advisories** — [Report a vulnerability privately](https://github.com/alevizio/worlddots/security/advisories/new).
   This is the preferred route. It opens a private collaboration thread between
   you and the maintainers.
2. **Email** — `viziomas@gmail.com` with subject `[Worlddots Security]`.

Please include:

- A description of the issue and the impact
- Steps to reproduce, or a proof-of-concept
- The browser, OS, and version where you observed it
- Any suggested mitigation if you have one

## What to expect

- **Acknowledgement** within 72 hours
- **Initial assessment** within 7 days
- **Fix or mitigation timeline** communicated after assessment
- **Credit** in the release notes once a fix ships, unless you ask not to be
  named

## Scope

In scope:

- XSS in any rendered surface (including SVG paste / export)
- Code injection via any user-supplied input (look IDs in the URL, pasted SVG,
  imported configuration JSON)
- Issues that allow an attacker to make a deployed instance leak data about
  other users or the host

Out of scope:

- Performance issues, browser quirks, missing features — use a
  [regular issue](https://github.com/alevizio/worlddots/issues/new/choose)
- Issues that require user-controlled clipboard contents to be malicious (we
  already sanitize, but it's the user's clipboard)
- Vulnerabilities in dependencies that have not been published as advisories
  in their own ecosystems

## Hall of fame

Researchers credited for valid disclosures will be listed in
[CHANGELOG.md](CHANGELOG.md) and the release notes.
