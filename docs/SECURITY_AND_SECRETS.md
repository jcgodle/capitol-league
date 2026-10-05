# Security and Secrets

## 2026-10-04 cleanup

During the revival audit, a real Congress/API credential was found committed directly in the public repository.

The current working tree has been sanitized:

- the raw key file was removed
- root config files now contain empty placeholders
- the recovered disk snapshot contains sanitized config copies
- `node_modules` and Python cache files are not being added to the recovered snapshot

## Required follow-up

**Rotate/revoke the previously committed API credential.**

Removing a credential from the latest commit does not make a credential that was previously public safe to continue using.

The old Git history may retain the value until history is explicitly rewritten and garbage-collected.

## Future rule

Never commit live credentials.

Use one of:

- environment variables
- GitHub Actions encrypted secrets
- ignored local config files
- deployment-platform secret storage

For Congress.gov tooling, prefer an environment variable such as:

```text
CAPITOL_CONGRESS_KEY
```

## Repository hygiene

The root `.gitignore` blocks common local secret/cache paths, but ignore rules are not a substitute for secret scanning and review.
