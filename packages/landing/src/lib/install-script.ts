export const DEVOS_MIN_BUN_VERSION = "1.3.0";

export function getDevosInstallScript(): string {
	return INSTALL_SCRIPT_TEMPLATE.replaceAll(
		"__DEVOS_MIN_BUN_VERSION__",
		DEVOS_MIN_BUN_VERSION,
	);
}

const INSTALL_SCRIPT_TEMPLATE = String.raw`#!/usr/bin/env sh
# Usage: curl -fsSL https://devos.ing/cli | sh
set -e

info() {
	printf '\033[0;90m%s\033[0m\n' "$*"
}

warn() {
	printf '\033[1;33m%s\033[0m\n' "$*"
}

error() {
	printf '\033[1;31m%s\033[0m\n' "$*" >&2
	exit 1
}

version_part() {
	printf '%s\n' "$1" | awk -F. -v part="$2" '{ print $part + 0 }'
}

version_at_least() {
	current_major="$(version_part "$1" 1)"
	current_minor="$(version_part "$1" 2)"
	current_patch="$(version_part "$1" 3)"
	minimum_major="$(version_part "$2" 1)"
	minimum_minor="$(version_part "$2" 2)"
	minimum_patch="$(version_part "$2" 3)"

	if [ "$current_major" -gt "$minimum_major" ]; then
		return 0
	fi
	if [ "$current_major" -lt "$minimum_major" ]; then
		return 1
	fi
	if [ "$current_minor" -gt "$minimum_minor" ]; then
		return 0
	fi
	if [ "$current_minor" -lt "$minimum_minor" ]; then
		return 1
	fi
	[ "$current_patch" -ge "$minimum_patch" ]
}

if ! command -v curl >/dev/null 2>&1; then
	error "curl is required but not installed."
fi

case "$(uname -s)" in
	Darwin)
		platform="darwin"
		;;
	Linux)
		platform="linux"
		;;
	*)
		error "Unsupported operating system: $(uname -s). devos supports macOS and Linux."
		;;
esac

case "$(uname -m)" in
	x86_64|amd64)
		architecture="x64"
		;;
	arm64|aarch64)
		architecture="arm64"
		;;
	*)
		error "Unsupported architecture: $(uname -m). devos supports x64 and arm64."
		;;
esac

if ! command -v bun >/dev/null 2>&1; then
	error "Bun is required to install devos. Install it with: curl -fsSL https://bun.sh/install | bash"
fi

bun_version="$(bun --version 2>/dev/null || true)"
if [ -z "$bun_version" ]; then
	error "Unable to determine Bun version."
fi
if ! version_at_least "$bun_version" "__DEVOS_MIN_BUN_VERSION__"; then
	error "Bun >= __DEVOS_MIN_BUN_VERSION__ is required; found $bun_version. Upgrade Bun with: bun upgrade"
fi

PACKAGE="devos"
VERSION="latest"
if [ -n "$DEVOS_PACKAGE" ]; then
	PACKAGE="$DEVOS_PACKAGE"
fi
if [ -n "$DEVOS_VERSION" ]; then
	VERSION="$DEVOS_VERSION"
fi
if [ "$VERSION" = "latest" ]; then
	TARGET="$PACKAGE"
else
	TARGET="$PACKAGE@$VERSION"
fi

info "Installing devos CLI ($TARGET) for $platform-$architecture"
bun add --global "$TARGET" || error "Failed to install devos CLI."

if command -v devos >/dev/null 2>&1; then
	info "devos installed successfully to $(command -v devos)"
	warn "Run 'devos onboard' to get started!"
	exit 0
fi

BUN_BIN="$HOME/.bun/bin"
if [ -n "$BUN_INSTALL" ]; then
	BUN_BIN="$BUN_INSTALL/bin"
fi

shell_name="$(basename "$SHELL" 2>/dev/null || printf 'sh')"
case "$shell_name" in
	zsh)
		SHELL_RC="$HOME/.zshrc"
		;;
	bash)
		SHELL_RC="$HOME/.bashrc"
		;;
	*)
		SHELL_RC="$HOME/.profile"
		;;
esac

info "devos installed, but it is not on your PATH yet."
warn "Add Bun's global bin directory to your PATH:"
printf '  echo '\''export PATH="%s:$PATH"'\'' >> %s\n' "$BUN_BIN" "$SHELL_RC"
printf '  source %s\n' "$SHELL_RC"
warn "Then run 'devos onboard' to get started!"
`;
