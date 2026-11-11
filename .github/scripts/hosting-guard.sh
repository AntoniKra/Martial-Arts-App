#!/usr/bin/env bash
# Decisions for preview upload and live hosting. The workflow calls the subcommands.

preview_accept() {
  local artifact_pr="$1" trusted="$2" commit_sha="$3" pr_head="$4"
  artifact_pr="$(printf '%s' "$artifact_pr" | tr -d '[:space:]')"
  commit_sha="$(printf '%s' "$commit_sha" | tr -d '[:space:]')"
  pr_head="$(printf '%s' "$pr_head" | tr -d '[:space:]')"
  if ! [[ "$artifact_pr" =~ ^[0-9]+$ ]]; then
    echo "::error::Numer PR w artefakcie nie jest liczbą."
    return 1
  fi
  if [ -z "$trusted" ]; then
    echo "::error::Brak numeru PR w metadanych przebiegu."
    return 1
  fi
  local found=0 normalized n
  normalized="${trusted//[[:space:]]/$'\n'}"
  while IFS= read -r n; do
    n="$(printf '%s' "$n" | tr -d '[:space:]')"
    if [ -n "$n" ] && [ "$n" = "$artifact_pr" ]; then
      found=1
    fi
  done <<< "$normalized"
  if [ "$found" -ne 1 ]; then
    echo "::error::Numer PR z artefaktu nie zgadza się z metadanymi przebiegu."
    return 1
  fi
  if ! [[ "$commit_sha" =~ ^[0-9a-f]{40}$ ]] || [ "$pr_head" != "$commit_sha" ]; then
    echo "::error::Ten build nie jest aktualnym HEAD pull requesta. Nie wgrywam podglądu."
    return 1
  fi
  printf '%s\n' "$artifact_pr"
}

assert_head_is_main() {
  local build="$1" main="$2"
  build="$(printf '%s' "$build" | tr -d '[:space:]')"
  main="$(printf '%s' "$main" | tr -d '[:space:]')"
  if [ "$build" != "$main" ]; then
    echo "::error::To przebieg starego CI ($build), a aktualny main to $main. Nie cofam hostingu."
    return 1
  fi
}

# Prints deploy, stale, block, or unmarked.
# unmarked means there is no owner confirmation yet; nothing is guessed from CI.
live_plan() {
  local event="$1" build="$2" main="$3" stored="$4" differ="$5"
  if [ "$event" = "workflow_dispatch" ]; then
    printf 'deploy\n'
    return 0
  fi
  if [ "$build" != "$main" ]; then
    printf 'stale\n'
    return 0
  fi
  if [ -z "$stored" ]; then
    printf 'unmarked\n'
    return 0
  fi
  if [ "$differ" = "yes" ]; then
    printf 'block\n'
    return 0
  fi
  printf 'deploy\n'
}

rules_differ() {
  local baseline="$1" head="$2"
  local changed root
  root="${GITHUB_WORKSPACE:-.}"
  changed="$(git -C "$root" diff --name-only "$baseline" "$head" -- combat-training-app/firestore.rules)"
  if [ -n "$changed" ]; then
    printf 'yes\n'
  else
    printf 'no\n'
  fi
}

read_baseline() {
  local id sha state list
  list="$(gh api "repos/${GITHUB_REPOSITORY}/deployments?environment=firestore-rules-acknowledged&per_page=20" --jq '.[] | "\(.id) \(.sha)"')"
  while read -r id sha; do
    [ -n "$id" ] || continue
    state="$(gh api "repos/${GITHUB_REPOSITORY}/deployments/${id}/statuses" --jq '.[0].state // "none"')"
    if [ "$state" = "success" ]; then
      printf '%s\n' "$sha"
      return 0
    fi
  done <<< "$list"
  return 0
}

record_baseline() {
  local sha="$1" payload id
  sha="$(printf '%s' "$sha" | tr -d '[:space:]')"
  if ! [[ "$sha" =~ ^[0-9a-f]{40}$ ]]; then
    echo "::error::Nieprawidłowy SHA znacznika reguł."
    return 1
  fi
  payload="$(printf '{"ref":"%s","environment":"firestore-rules-acknowledged","auto_merge":false,"required_contexts":[],"description":"Firestore rules at this commit are treated as deployed to production","transient_environment":false,"production_environment":false}' "$sha")"
  id="$(printf '%s' "$payload" | gh api --method POST "repos/${GITHUB_REPOSITORY}/deployments" --input - --jq .id)"
  if ! [[ "$id" =~ ^[0-9]+$ ]]; then
    echo "::error::Nie udało się zapisać znacznika reguł."
    return 1
  fi
  printf '%s' '{"state":"success","description":"Acknowledged","environment":"firestore-rules-acknowledged"}' \
    | gh api --method POST "repos/${GITHUB_REPOSITORY}/deployments/${id}/statuses" --input - >/dev/null
}

preview_guard() {
  local artifact_pr trusted pr_head accepted
  if [ ! -f "${ARTIFACT_PR_FILE:?}" ]; then
    echo "::error::Brak pliku z numerem PR."
    return 1
  fi
  artifact_pr="$(tr -d '[:space:]' < "$ARTIFACT_PR_FILE")"
  trusted="$(gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${RUN_ID}" --jq '.pull_requests[].number')"
  if [ -z "$trusted" ]; then
    trusted="$(gh api -H "Accept: application/vnd.github+json" "repos/${GITHUB_REPOSITORY}/commits/${BUILD_SHA}/pulls" --jq '.[].number')"
  fi
  local found=0 normalized n
  normalized="${trusted//[[:space:]]/$'\n'}"
  while IFS= read -r n; do
    n="$(printf '%s' "$n" | tr -d '[:space:]')"
    if [ -n "$n" ] && [ "$n" = "$artifact_pr" ]; then
      found=1
    fi
  done <<< "$normalized"
  if [ "$found" -ne 1 ]; then
    preview_accept "$artifact_pr" "$trusted" "$BUILD_SHA" "0000000000000000000000000000000000000000" || return 1
    return 1
  fi
  pr_head="$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${artifact_pr}" --jq .head.sha)"
  accepted="$(preview_accept "$artifact_pr" "$trusted" "$BUILD_SHA" "$pr_head")" || return 1
  if [ -z "${GITHUB_ENV:-}" ]; then
    echo "::error::Brak GITHUB_ENV."
    return 1
  fi
  printf 'PR_NUMBER=%s\n' "$accepted" >> "$GITHUB_ENV"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  set -euo pipefail
  cmd="${1:-}"
  shift || true
  case "$cmd" in
    preview-accept) preview_accept "$@" >/dev/null ;;
    preview-guard) preview_guard ;;
    assert-head-is-main) assert_head_is_main "$@" ;;
    live-plan) live_plan "$@" ;;
    rules-differ) rules_differ "$@" ;;
    read-baseline) read_baseline ;;
    record-baseline) record_baseline "$@" ;;
    *)
      echo "::error::Nieznane polecenie hosting-guard: $cmd"
      exit 1
      ;;
  esac
fi
