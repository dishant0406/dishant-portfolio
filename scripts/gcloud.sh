#!/bin/sh
# Repo-local gcloud wrapper.
#
# Pins CLOUDSDK_CONFIG to .gcloud-config/ inside this repo, so every gcloud
# command run through here uses THIS project's credentials and config instead
# of the global ~/.config/gcloud account. The directory is git-ignored and
# docker-ignored (see .gitignore / .dockerignore / .gcloudignore).
#
# Usage:
#   ./scripts/gcloud.sh auth login
#   ./scripts/gcloud.sh auth list
#   ./scripts/gcloud.sh config set project <PROJECT_ID>
#   ./scripts/gcloud.sh run services list --region <REGION>
#
# All arguments are passed straight through to gcloud.
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

# Isolated SDK config + credential store, scoped to this repo only.
export CLOUDSDK_CONFIG="$repo_root/.gcloud-config"

# Optional non-secret defaults (project, region, service). Never put secrets,
# tokens, or API keys in this file.
if [ -f "$repo_root/.gcloud-local.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$repo_root/.gcloud-local.env"
  set +a
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found on PATH. Install the Google Cloud SDK first." >&2
  exit 127
fi

exec gcloud "$@"
