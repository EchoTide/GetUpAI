# GetUpAI Repository Docs

This `docs/` directory is the repository knowledge base for coding agents and humans.

Read these files before making non-trivial changes:

- `docs/ARCHITECTURE.md`: package boundaries, app structure, and file ownership
- `docs/PRODUCT.md`: the core user loop and product behavior that code should preserve
- `docs/FRONTEND.md`: UI priorities, especially for the desktop dashboard
- `docs/TESTING.md`: what to run when different areas change

Principles for this knowledge base:

- Keep high-signal, low-bloat docs
- Put repository-truth here, not in chat-only explanations
- Prefer stable rules and concrete file pointers
- Update docs when behavior or ownership changes

If an agent enters this repo cold, it should be able to answer:

- What is the main product surface?
- Which files own that surface?
- What constraints matter?
- Where should shared logic live?
- How should changes be verified?
