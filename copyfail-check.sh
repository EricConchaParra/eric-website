#!/bin/bash

# CopyFail / CVE-2026-31431 Debian mitigation helper
# Conservative interactive script for Debian 6+
# Run as root for mitigation actions.

set -u

CVE="CVE-2026-31431"
CONF_FILE="/etc/modprobe.d/blacklist-algif-aead.conf"
MODULE="algif_aead"

say() {
  echo "$@"
}

section() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

ask_yes_no() {
  QUESTION="$1"
  DEFAULT="${2:-n}"

  if [ "$DEFAULT" = "y" ]; then
    PROMPT="[Y/n]"
  else
    PROMPT="[y/N]"
  fi

  while true; do
    printf "%s %s " "$QUESTION" "$PROMPT"
    read -r ANSWER

    if [ -z "$ANSWER" ]; then
      ANSWER="$DEFAULT"
    fi

    case "$ANSWER" in
      y|Y|yes|YES) return 0 ;;
      n|N|no|NO) return 1 ;;
      *) echo "Please answer yes or no." ;;
    esac
  done
}

is_root() {
  [ "$(id -u)" -eq 0 ]
}

get_debian_version() {
  if [ -f /etc/debian_version ]; then
    cat /etc/debian_version
  else
    echo "unknown"
  fi
}

get_pretty_name() {
  if [ -f /etc/os-release ]; then
    grep '^PRETTY_NAME=' /etc/os-release | cut -d= -f2- | tr -d '"'
  else
    echo "Debian version file only"
  fi
}

kernel_major() {
  uname -r | cut -d. -f1
}

kernel_minor() {
  uname -r | cut -d. -f2
}

kernel_sort_key() {
  MAJOR="$(kernel_major)"
  MINOR="$(kernel_minor)"

  case "$MAJOR" in
    ''|*[!0-9]*) MAJOR=0 ;;
  esac

  case "$MINOR" in
    ''|*[!0-9]*) MINOR=0 ;;
  esac

  echo "$((MAJOR * 1000 + MINOR))"
}

get_crypto_aead_config() {
  CONFIG_FILE="/boot/config-$(uname -r)"

  if [ -f "$CONFIG_FILE" ]; then
    grep '^CONFIG_CRYPTO_USER_API_AEAD=' "$CONFIG_FILE" 2>/dev/null || true
    return
  fi

  if [ -f /proc/config.gz ]; then
    zgrep '^CONFIG_CRYPTO_USER_API_AEAD=' /proc/config.gz 2>/dev/null || true
    return
  fi

  echo "CONFIG_NOT_AVAILABLE"
}

module_loaded() {
  lsmod 2>/dev/null | awk '{print $1}' | grep -qx "$MODULE"
}

module_available() {
  modinfo "$MODULE" >/dev/null 2>&1
}

mitigation_exists() {
  if [ -f "$CONF_FILE" ]; then
    grep -q "install $MODULE /bin/false" "$CONF_FILE" 2>/dev/null && return 0
    grep -q "blacklist $MODULE" "$CONF_FILE" 2>/dev/null && return 0
  fi

  return 1
}

apply_mitigation() {
  section "Applying mitigation"

  if ! is_root; then
    echo "ERROR: You must run this script as root to apply mitigation."
    echo "Run:"
    echo "  sudo bash $0"
    exit 1
  fi

  if [ -f "$CONF_FILE" ]; then
    BACKUP="${CONF_FILE}.bak.$(date +%Y%m%d%H%M%S)"
    cp "$CONF_FILE" "$BACKUP"
    echo "Existing config backed up to:"
    echo "  $BACKUP"
  fi

  cat > "$CONF_FILE" <<EOF
# Mitigation for $CVE / CopyFail
# Blocks loading of algif_aead, the AF_ALG AEAD userspace crypto module.
blacklist algif_aead
install algif_aead /bin/false
EOF

  echo "Created:"
  echo "  $CONF_FILE"

  if module_loaded; then
    echo
    echo "$MODULE is currently loaded."
    if ask_yes_no "Do you want to unload it now with rmmod?" "y"; then
      if rmmod "$MODULE" 2>/tmp/copyfail-rmmod-error.txt; then
        echo "OK: $MODULE unloaded."
      else
        echo "WARNING: Could not unload $MODULE."
        echo "Reason:"
        cat /tmp/copyfail-rmmod-error.txt
        echo
        echo "A reboot may be required."
      fi
      rm -f /tmp/copyfail-rmmod-error.txt
    fi
  else
    echo "OK: $MODULE is not currently loaded."
  fi

  if command -v update-initramfs >/dev/null 2>&1; then
    echo
    if ask_yes_no "Do you want to run update-initramfs -u?" "y"; then
      update-initramfs -u || echo "WARNING: update-initramfs failed."
    fi
  else
    echo "update-initramfs command not found. Skipping."
  fi

  echo
  echo "Mitigation applied."
}

test_module_block() {
  section "Testing module block"

  if ! is_root; then
    echo "Skipping active modprobe test because script is not running as root."
    echo "To test manually:"
    echo "  sudo modprobe $MODULE"
    return
  fi

  if modprobe "$MODULE" >/tmp/copyfail-modprobe-out.txt 2>/tmp/copyfail-modprobe-err.txt; then
    echo "WARNING: $MODULE loaded successfully. Mitigation is NOT effective."
    rmmod "$MODULE" 2>/dev/null || true
  else
    echo "OK: $MODULE could not be loaded."
  fi

  rm -f /tmp/copyfail-modprobe-out.txt /tmp/copyfail-modprobe-err.txt
}

section "CopyFail / $CVE Debian check"

HOST="$(hostname 2>/dev/null || echo unknown)"
DEBIAN_VERSION="$(get_debian_version)"
PRETTY_NAME="$(get_pretty_name)"
KERNEL="$(uname -r)"
KERNEL_KEY="$(kernel_sort_key)"
CONFIG_STATUS="$(get_crypto_aead_config)"

echo "Host:              $HOST"
echo "OS:                $PRETTY_NAME"
echo "Debian version:    $DEBIAN_VERSION"
echo "Kernel:            $KERNEL"
echo "Kernel sort key:   $KERNEL_KEY"
echo "AEAD config:       $CONFIG_STATUS"

if module_loaded; then
  LOADED_STATUS="yes"
else
  LOADED_STATUS="no"
fi

if module_available; then
  AVAILABLE_STATUS="yes"
else
  AVAILABLE_STATUS="no"
fi

if mitigation_exists; then
  MITIGATION_STATUS="present"
else
  MITIGATION_STATUS="not present"
fi

echo "algif_aead loaded: $LOADED_STATUS"
echo "algif_aead module: $AVAILABLE_STATUS"
echo "Mitigation file:   $MITIGATION_STATUS"

section "Assessment"

ACTION="none"
RISK="unknown"

case "$CONFIG_STATUS" in
  "CONFIG_CRYPTO_USER_API_AEAD=m")
    RISK="potentially affected if kernel contains vulnerable code"
    ACTION="blacklist_module"
    echo "Finding:"
    echo "  CONFIG_CRYPTO_USER_API_AEAD=m"
    echo
    echo "Meaning:"
    echo "  The AEAD userspace crypto API is available as a loadable module."
    echo
    echo "Recommended action:"
    echo "  Block algif_aead using modprobe.d and unload it if currently loaded."
    ;;
  "CONFIG_CRYPTO_USER_API_AEAD=y")
    RISK="potentially affected and cannot be mitigated by module blacklist alone"
    ACTION="built_in"
    echo "Finding:"
    echo "  CONFIG_CRYPTO_USER_API_AEAD=y"
    echo
    echo "Meaning:"
    echo "  The feature is built into the kernel, not loaded as a separate module."
    echo
    echo "Recommended action:"
    echo "  A modprobe blacklist is not enough."
    echo "  You should use a patched kernel, restrict local users/containers, or isolate the host."
    ;;
  "CONFIG_CRYPTO_USER_API_AEAD is not set")
    RISK="low for this specific CVE"
    ACTION="none"
    echo "Finding:"
    echo "  CONFIG_CRYPTO_USER_API_AEAD is not set"
    echo
    echo "Meaning:"
    echo "  This kernel likely does not expose the affected AEAD userspace API."
    echo
    echo "Recommended action:"
    echo "  No CopyFail-specific mitigation appears necessary."
    ;;
  "CONFIG_NOT_AVAILABLE")
    echo "Finding:"
    echo "  Kernel config is not available."
    echo
    echo "Meaning:"
    echo "  The script cannot determine whether the feature is built-in or modular."
    echo
    if module_available; then
      RISK="unknown but module exists"
      ACTION="blacklist_module"
      echo "However:"
      echo "  modinfo found algif_aead as a module."
      echo
      echo "Recommended action:"
      echo "  Apply module blacklist as a conservative mitigation."
    else
      RISK="unknown"
      ACTION="manual_review"
      echo "Recommended action:"
      echo "  Manual review needed. Check kernel source/config or vendor kernel package."
    fi
    ;;
  *)
    RISK="unknown"
    ACTION="manual_review"
    echo "Finding:"
    echo "  Unexpected config result:"
    echo "  $CONFIG_STATUS"
    echo
    echo "Recommended action:"
    echo "  Manual review needed."
    ;;
esac

echo
echo "Risk classification:"
echo "  $RISK"

section "Debian lifecycle note"

echo "Debian 6, 7, 8, 9 and 10 are old/EOL or effectively outside normal security support."
echo "For these systems, do not treat this CVE as the only risk."
echo
echo "Recommended long-term handling:"
echo "  Debian 6-8: likely older kernels, but high OS lifecycle risk. Isolate or migrate."
echo "  Debian 9-10: validate carefully, mitigate if needed, plan migration."
echo "  Debian 11+: prefer official kernel/security updates where available."

section "Decision"

case "$ACTION" in
  "blacklist_module")
    if mitigation_exists; then
      echo "A mitigation file already appears to exist:"
      echo "  $CONF_FILE"
      echo
      if ask_yes_no "Do you want to re-apply/overwrite the mitigation?" "n"; then
        apply_mitigation
      else
        echo "No changes made."
      fi
    else
      if ask_yes_no "Apply algif_aead blacklist mitigation now?" "y"; then
        apply_mitigation
      else
        echo "No changes made."
      fi
    fi

    test_module_block

    echo
    echo "Final recommendation:"
    echo "  Reboot during a maintenance window and run this script again."
    ;;
  "built_in")
    echo "No automatic mitigation applied."
    echo
    echo "Recommended next steps:"
    echo "  1. Schedule a patched kernel installation."
    echo "  2. Reduce local shell access."
    echo "  3. Avoid privileged containers."
    echo "  4. Put the host behind VPN/bastion if possible."
    echo "  5. Plan OS migration if this is Debian 6-10."
    ;;
  "manual_review")
    echo "No automatic mitigation applied."
    echo
    echo "Recommended next steps:"
    echo "  1. Locate the kernel config."
    echo "  2. Confirm whether CONFIG_CRYPTO_USER_API_AEAD is enabled."
    echo "  3. If algif_aead exists as a module, apply the blacklist."
    echo "  4. If built-in, use patched kernel or isolation controls."
    ;;
  "none")
    echo "No automatic mitigation needed for this specific CVE based on detected config."
    echo
    echo "Still recommended:"
    echo "  Keep this host in your migration/hardening plan if it is EOL."
    ;;
esac

section "Summary"

echo "Host:              $HOST"
echo "Debian version:    $DEBIAN_VERSION"
echo "Kernel:            $KERNEL"
echo "AEAD config:       $CONFIG_STATUS"
echo "algif_aead loaded: $LOADED_STATUS"
echo "algif_aead module: $AVAILABLE_STATUS"
echo "Mitigation file:   $(if mitigation_exists; then echo present; else echo not_present; fi)"
echo
echo "Done."