# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bgl Glyphs is a Solana blockchain program with auto-generated JavaScript and Rust client SDKs. The program is deployed at `GLYPHQ8TkcUZYrdbMLkfWUzfdKPyCc9JLf987iNY5MAs`.

## Commands

All commands run from repository root using pnpm.

### Program Development
```sh
pnpm programs:build    # Build Solana program
pnpm programs:test     # Run program tests (logs suppressed)
pnpm programs:debug    # Run program tests with logs
pnpm programs:clean    # Clean build artifacts
```

### Client Development
```sh
pnpm clients:js:test   # Run JavaScript client tests
pnpm clients:rust:test # Run Rust client tests
```

### Code Generation
```sh
pnpm generate          # Regenerate IDLs and clients from program
pnpm generate:idls     # Generate IDLs only (via Shank)
pnpm generate:clients  # Generate clients only (via Kinobi)
```

### Local Validator
```sh
pnpm validator         # Start local Solana validator (Amman)
pnpm validator:stop    # Stop validator
pnpm validator:logs    # View validator logs
```

### JavaScript Client (in clients/js/)
```sh
pnpm build            # Build TypeScript
pnpm test             # Run AVA tests
pnpm lint             # ESLint check
pnpm lint:fix         # ESLint autofix
pnpm format           # Prettier check
pnpm format:fix       # Prettier autofix
```

### Program Direct (in programs/bgl-glyphs/)
```sh
cargo build-bpf       # Build BPF binary
cargo test-bpf        # Run Rust program tests
```

## Architecture

### Program (programs/bgl-glyphs/)
Native Solana program using standard layout:
- `lib.rs` - Program ID declaration and module exports
- `entrypoint.rs` - Program entrypoint
- `processor.rs` - Instruction processing logic
- `instruction.rs` - Instruction definitions
- `state.rs` - Account state structures
- `error.rs` - Custom error types

### Client Generation Pipeline
1. Program annotated with Shank macros generates IDL to `idls/`
2. Kinobi (`configs/kinobi.cjs`) reads IDL and generates typed clients
3. Generated code lands in `clients/*/src/generated/`

Both clients follow same structure:
- `accounts/` - Account deserializers
- `instructions/` - Instruction builders
- `types/` - Enum and struct types
- `errors/` - Error definitions
- `programs/` - Program address constants

### JavaScript Client (clients/js/)
Umi-compatible SDK. Uses AVA for testing, TypeScript compilation outputs to `dist/`.

### Rust Client (clients/rust/)
Standard Rust crate with Borsh serialization.

## Key Files
- `configs/kinobi.cjs` - Client generation configuration
- `configs/shank.cjs` - IDL generation configuration
- `configs/validator.cjs` - Local validator configuration

## Notes
- Requires Rust 1.68.0 for BPF compilation
- Run `pnpm generate` after any program changes to update clients
- JavaScript client requires Umi framework as peer dependency
