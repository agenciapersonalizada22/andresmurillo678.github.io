#!/usr/bin/env bash
# Descarga la rama `datos` (si existe) en ./datos-salida para conservar los ultimos datos buenos.
set -u
DIR="${1:-datos-salida}"
rm -rf "$DIR"
AUTH="AUTHORIZATION: basic $(printf 'x-access-token:%s' "${GITHUB_TOKEN:-}" | base64 -w0)"
if git -c "http.extraheader=$AUTH" clone --quiet --depth 1 --single-branch --branch datos \
  "https://github.com/${GITHUB_REPOSITORY}.git" "$DIR" 2>/dev/null; then
  rm -rf "$DIR/.git"
  echo "Rama datos descargada: $(find "$DIR" -name '*.json' | wc -l) archivos JSON."
else
  mkdir -p "$DIR"
  echo "La rama datos aun no existe: se creara en esta ejecucion."
fi
