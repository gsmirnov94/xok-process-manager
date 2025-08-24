# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-12-19

### Added
- Dynamic scripts directory support via Docker volumes
- New `/scripts` API endpoint to list available scripts
- `getAvailableScripts()` method in ProcessManager
- `getScriptsDirectory()` method in ProcessManager
- Support for multiple script types (.js, .ts, .py, .sh)
- `SCRIPTS_DIRECTORY` environment variable support
- Volume mount for scripts directory in docker-compose.yml

### Changed
- Dockerfile now creates scripts directory instead of copying fixed script
- ProcessManager constructor accepts `scriptsDirectory` option
- Updated documentation and helper scripts

### Removed
- Hardcoded script copying from Dockerfile

## [1.2.0] - Previous Release

### Added
- Process results management
- ZIP archive creation for results
- File operations API endpoints
- Statistics and monitoring capabilities

## [1.0.0] - Initial Release

### Added
- Basic process management with PM2
- TypeScript support
- REST API server
- Process lifecycle management
- Callback system for process events
