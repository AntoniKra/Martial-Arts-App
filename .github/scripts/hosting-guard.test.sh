#!/usr/bin/env bash
# Scenarios for preview identity, stale deploys, and the Firestore rules block.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
guard="$root/.github/scripts/hosting-guard.sh"
sha_a="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
sha_b="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
sha_c="cccccccccccccccccccccccccccccccccccccccc"
failures=0

expect_ok() {
  local name="$1"
  shift
  if "$@"; then
    printf 'ok  %s\n' "$name"
  else
    printf 'FAIL %s\n' "$name"
    failures=$((failures + 1))
  fi
}

expect_fail() {
  local name="$1"
  shift
  if "$@"; then
    printf 'FAIL %s (expected rejection)\n' "$name"
    failures=$((failures + 1))
  else
    printf 'ok  %s\n' "$name"
  fi
}

expect_eq() {
  local name="$1" want="$2" got="$3"
  if [ "$want" = "$got" ]; then
    printf 'ok  %s\n' "$name"
  else
    printf 'FAIL %s\n  want: %s\n  got:  %s\n' "$name" "$want" "$got"
    failures=$((failures + 1))
  fi
}

expect_fail "preview rejects a non-numeric artifact" \
  bash "$guard" preview-accept "12x" "12" "$sha_a" "$sha_a"
expect_fail "preview rejects an artifact number that is not in the run metadata" \
  bash "$guard" preview-accept "79" "80" "$sha_a" "$sha_a"
expect_fail "preview rejects empty run metadata" \
  bash "$guard" preview-accept "79" "" "$sha_a" "$sha_a"
expect_fail "preview rejects a build that is not the pull request HEAD" \
  bash "$guard" preview-accept "79" "79" "$sha_a" "$sha_b"
expect_ok "preview accepts a matching number and the current HEAD" \
  bash "$guard" preview-accept "79" $'80\n79' "$sha_a" "$sha_a"

expect_fail "old CI is not current main" \
  bash "$guard" assert-head-is-main "$sha_a" "$sha_b"
expect_ok "CI at the main tip may continue" \
  bash "$guard" assert-head-is-main "$sha_a" "$sha_a"

expect_eq "stored marker wins over older guesses" "$sha_a" \
  "$(bash "$guard" pick-baseline "$sha_a" "$sha_b" "$sha_c")"
expect_eq "without a marker, use the previous CI" "$sha_b" \
  "$(bash "$guard" pick-baseline "" "$sha_b" "$sha_c")"
expect_eq "without CI history, use the parent" "$sha_c" \
  "$(bash "$guard" pick-baseline "" "" "$sha_c")"

expect_eq "manual run deploys even when rules differ" "deploy" \
  "$(bash "$guard" live-plan workflow_dispatch "$sha_a" "$sha_b" "" "" "" yes)"
expect_eq "rerun of an old CI is stale" "stale" \
  "$(bash "$guard" live-plan workflow_run "$sha_a" "$sha_b" "$sha_c" "" "" no)"
expect_eq "a rules change records the previous good commit" "block $sha_b" \
  "$(bash "$guard" live-plan workflow_run "$sha_a" "$sha_a" "" "$sha_b" "$sha_c" yes)"
expect_eq "later commits stay blocked on the same marker" "block" \
  "$(bash "$guard" live-plan workflow_run "$sha_a" "$sha_a" "$sha_b" "" "" yes)"
expect_eq "unchanged rules deploy" "deploy" \
  "$(bash "$guard" live-plan workflow_run "$sha_a" "$sha_a" "$sha_b" "" "" no)"

repo="$(mktemp -d)"
git init -b main "$repo" >/dev/null
git -C "$repo" config user.email "test@example.com"
git -C "$repo" config user.name "Test"
mkdir -p "$repo/combat-training-app"
printf 'rules v1\n' > "$repo/combat-training-app/firestore.rules"
git -C "$repo" add .
git -C "$repo" commit -m M0 >/dev/null
m0="$(git -C "$repo" rev-parse HEAD)"
printf 'rules v2\n' > "$repo/combat-training-app/firestore.rules"
git -C "$repo" commit -am M1 >/dev/null
m1="$(git -C "$repo" rev-parse HEAD)"
printf 'app\n' > "$repo/combat-training-app/app.txt"
git -C "$repo" add .
git -C "$repo" commit -m M2 >/dev/null
m2="$(git -C "$repo" rev-parse HEAD)"
export GITHUB_WORKSPACE="$repo"
expect_eq "rules differ across a later commit that does not touch them" "yes" \
  "$(bash "$guard" rules-differ "$m0" "$m2")"
expect_eq "rules match when the file is unchanged" "no" \
  "$(bash "$guard" rules-differ "$m1" "$m2")"

marker=""
plan="$(bash "$guard" live-plan workflow_run "$m1" "$m1" "$marker" "$m0" "$m0" "$(bash "$guard" rules-differ "$m0" "$m1")")"
expect_eq "first rules change blocks and keeps the previous commit" "block $m0" "$plan"
marker="$m0"
plan="$(bash "$guard" live-plan workflow_run "$m2" "$m2" "$marker" "$m1" "$m1" "$(bash "$guard" rules-differ "$marker" "$m2")")"
expect_eq "the next commit stays blocked" "block" "$plan"
plan="$(bash "$guard" live-plan workflow_run "$m0" "$m2" "$marker" "" "" no)"
expect_eq "rerunning the old CI does not move the marker" "stale" "$plan"
plan="$(bash "$guard" live-plan workflow_dispatch "$m2" "$m2" "$marker" "" "" yes)"
expect_eq "manual confirmation clears the block" "deploy" "$plan"
marker="$m2"
plan="$(bash "$guard" live-plan workflow_run "$m2" "$m2" "$marker" "$m1" "$m1" "$(bash "$guard" rules-differ "$marker" "$m2")")"
expect_eq "after confirmation, the same rules can deploy" "deploy" "$plan"

tmpdir="$(mktemp -d)"
export GITHUB_REPOSITORY="example/app"
export GITHUB_ENV="$tmpdir/env"
export ARTIFACT_PR_FILE="$tmpdir/pr.txt"
export RUN_ID="100"
export BUILD_SHA="$sha_a"
export PATH="$tmpdir/bin:$PATH"
mkdir -p "$tmpdir/bin"
cat > "$tmpdir/bin/gh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
args="$*"
if [[ "$args" == *"/actions/runs/"* ]]; then
  printf '%s\n' "${FAKE_RUN_PRS:-}"
elif [[ "$args" == *"/commits/"*"/pulls"* ]]; then
  printf '%s\n' "${FAKE_COMMIT_PRS:-}"
elif [[ "$args" == *"/pulls/"* ]]; then
  printf '%s\n' "${FAKE_PR_HEAD:-}"
elif [[ "$args" == *"--method POST"* && "$args" == *"/deployments"* && "$args" != *"/statuses"* ]]; then
  cat > "${FAKE_DEPLOY_BODY:?}"
  printf '42\n'
elif [[ "$args" == *"--method POST"* && "$args" == *"/statuses"* ]]; then
  cat >/dev/null
  printf '{}\n'
elif [[ "$args" == *"/deployments?"* ]]; then
  printf '%s\n' "${FAKE_DEPLOYMENTS:-}"
elif [[ "$args" == *"/statuses"* ]]; then
  id="${args#*deployments/}"
  id="${id%%/*}"
  if [ "$id" = "1" ]; then
    printf 'inactive\n'
  else
    printf 'success\n'
  fi
elif [[ "$args" == *"/actions/workflows/ci.yml/runs"* ]]; then
  printf '%s\n' "${FAKE_CI_RUNS:-}"
else
  echo "unexpected gh: $args" >&2
  exit 1
fi
EOF
chmod +x "$tmpdir/bin/gh"

printf '79\n' > "$ARTIFACT_PR_FILE"
: > "$GITHUB_ENV"
export FAKE_RUN_PRS="80"
export FAKE_COMMIT_PRS=""
export FAKE_PR_HEAD="$sha_a"
expect_fail "guard stops when the artifact number is not the run's pull request" \
  bash "$guard" preview-guard
if grep -q '^PR_NUMBER=' "$GITHUB_ENV"; then
  printf 'FAIL mismatch still wrote PR_NUMBER\n'
  failures=$((failures + 1))
else
  printf 'ok  mismatch does not publish a pull request number\n'
fi

: > "$GITHUB_ENV"
export FAKE_RUN_PRS=""
export FAKE_COMMIT_PRS="79"
export FAKE_PR_HEAD="$sha_b"
expect_fail "guard stops when the commit's pull request HEAD moved on" \
  bash "$guard" preview-guard

: > "$GITHUB_ENV"
export FAKE_PR_HEAD="$sha_a"
expect_ok "guard accepts the commit association when the run list is empty" \
  bash "$guard" preview-guard
expect_eq "accepted guard publishes the trusted number" "PR_NUMBER=79" \
  "$(tr -d '\r' < "$GITHUB_ENV")"

export FAKE_DEPLOYMENTS=$'1 '"$sha_b"$'\n2 '"$sha_a"
expect_eq "baseline skips an inactive newer deployment" "$sha_a" \
  "$(bash "$guard" read-baseline)"

export FAKE_CI_RUNS=$'100 '"$sha_b"$'\n90 '"$sha_a"
expect_eq "previous CI skips the current run" "$sha_a" \
  "$(bash "$guard" previous-ci 100)"

export FAKE_DEPLOY_BODY="$tmpdir/deployment.json"
expect_ok "record baseline calls GitHub" \
  bash "$guard" record-baseline "$sha_a"
python - "$tmpdir/deployment.json" "$sha_a" << 'PY'
import json, sys
body = json.load(open(sys.argv[1], encoding="utf-8"))
assert body["ref"] == sys.argv[2]
assert body["required_contexts"] == []
assert body["environment"] == "firestore-rules-acknowledged"
assert body["auto_merge"] is False
PY
printf 'ok  baseline payload is an acknowledgement, not a rules deploy\n'

if grep -n "actions: write" "$root"/.github/workflows/firebase-hosting-*.yml; then
  printf 'FAIL preview or live workflow still grants actions: write\n'
  failures=$((failures + 1))
else
  printf 'ok  hosting workflows do not grant actions: write\n'
fi

if [ "$failures" -ne 0 ]; then
  printf '%s scenario(s) failed\n' "$failures"
  exit 1
fi
printf 'all hosting guard scenarios passed\n'
