# Changelog

## Unreleased - 2026-06-23

### Added

- Added opt-in `instruction_context` metadata for Pony Trail snapshots. Snapshot entries can now record hashed instruction files, skill metadata, git branch/commit/dirty state, and warnings without storing prompt text, transcript text, or instruction file contents.
- Added `ponytrail skills update <skill>` to refresh installed skills through the same local-history flow as skill installation.
- Added `--instruction-context` and `PONYTRAIL_INSTRUCTION_CONTEXT=1` support to the bundled `pony-trail` shell and Python snapshot helpers.
- Added CLI history detail output for captured `instruction_context` blocks.

### Changed

- `ponytrail onboard` now refreshes stale existing bundled `pony-trail` skill installs instead of leaving old skill files in place.
- Skill updates now compare installed targets against the bundled source and report `already_present` when the target already matches.
- Skill install/update history now uses operation-specific local snapshot ids such as `skill-install` and `skill-update`.
- Agent guidance now calls for Zod schemas to replace `any` types with validated `unknown` inputs and inferred TypeScript types.

### Fixed

- Fixed stale installed skills staying unchanged after `onboard` when the bundled `pony-trail` skill has newer instructions or helper scripts.
- Removed the generated Python bytecode artifact from the bundled skill source.

### Tested

- Added coverage for instruction-context capture, warning handling, git metadata, shell helper opt-in behavior, Python fallback behavior, CLI history rendering, `skills update`, and onboard skill refresh.
- Verified with `rtk bun run check`.
