#!/usr/bin/env bash
# Publica ./datos-salida como UN solo commit huerfano en la rama `datos` (force-push solo de esa rama).
set -euo pipefail
DIR="${1:-datos-salida}"
cd "$DIR"
rm -rf .git
git init --quiet -b datos
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A
git commit --quiet -m "datos $(date -u +%Y-%m-%dT%H:%M:%SZ)"
AUTH="AUTHORIZATION: basic $(printf 'x-access-token:%s' "${GITHUB_TOKEN}" | base64 -w0)"
for intento in 1 2 3; do
  if git -c "http.extraheader=$AUTH" push --quiet --force "https://github.com/${GITHUB_REPOSITORY}.git" datos:datos; then
    echo "Rama datos publicada."; exit 0
  fi
  echo "Fallo el push (intento $intento); reintentando..."; sleep $((intento * 5))
done
echo "::error::No se pudo publicar la rama datos"; exit 1
