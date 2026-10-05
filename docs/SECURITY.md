# Security

## Exposed historical credential

During the October 2026 recovery, a real Congress/API key was found committed in the old public repository.

The live value was removed from the current tree.

Because it existed publicly in Git history, it must be considered compromised and should be revoked/rotated.

## Current rule

Never commit live credentials.

Use:

- environment variables
- GitHub Actions secrets
- deployment-platform secret storage
- ignored local config files

## Current repo

The cleaned `main` branch does not require a Congress.gov key for its scheduled attendance KPI pipeline.

The active KPI builder uses official public House/Senate roll-call feeds plus the public Congress Legislators identity dataset.

## Archive warning

Historical branches preserve old repository states for archaeology.

They may contain the previously exposed value in history.

Do not reuse credentials recovered from those branches.
