#!/bin/sh
# Builds a throwaway timeline repository that looks like one GitHub has been
# merging chirp pull requests into, so the site can be previewed locally:
#
#   sh script/demo-timeline.sh /tmp/demo-timeline
#   tey site --timeline /tmp/demo-timeline --offline
#
# Every chirp is an empty commit on its own branch, merged with the message
# GitHub's merge button writes. One pull request changes a file, as a
# maintainer's would, and must not show up as a chirp.
set -eu

DIR=${1:?usage: demo-timeline.sh <directory>}
rm -rf "$DIR"
mkdir -p "$DIR"
cd "$DIR"
git init -q -b main

NUMBER=0
DAY=0

as() {
  export GIT_AUTHOR_NAME="$1" GIT_COMMITTER_NAME="$1"
  export GIT_AUTHOR_EMAIL="$2@users.noreply.github.com" GIT_COMMITTER_EMAIL="$2@users.noreply.github.com"
  export GIT_AUTHOR_DATE="$3" GIT_COMMITTER_DATE="$3"
}

# stamp: moves the clock on and leaves the new time in $STAMP.
stamp() {
  DAY=$((DAY + 1))
  STAMP=$(printf '2026-10-%02dT%02d:%02d:00+02:00' $((DAY / 3 + 1)) $((9 + DAY % 12)) $((DAY * 7 % 60)))
}

# merge LOGIN BRANCH: what the publish bot does once a pull request passes.
merge() {
  stamp
  as "GitHub" "noreply" "$STAMP"
  export GIT_COMMITTER_EMAIL="noreply@github.com"
  git merge -q --no-ff --no-edit -m "Merge pull request #$NUMBER from $1/$2" "$2"
  git branch -q -D "$2"
}

# chirp LOGIN NAME TEXT [IN-REPLY-TO]: leaves the chirp's SHA in $LAST.
chirp() {
  NUMBER=$((NUMBER + 1))
  branch="chirp-$NUMBER"
  git checkout -q -b "$branch" main
  stamp
  as "$2" "$1" "$STAMP"
  if [ $# -ge 4 ]; then
    git commit -q --allow-empty -m "$3" -m "In-Reply-To: $4"
  else
    git commit -q --allow-empty -m "$3"
  fi
  LAST=$(git rev-parse HEAD)
  git checkout -q main
  merge "$1" "$branch"
}

as "Ákos Kovács" "akoskovacs" "2026-10-01T08:00:00+02:00"
echo "# gitchirip-posts" > README.md
git add README.md
git commit -q -m "Start the timeline"

chirp akoskovacs "Ákos Kovács" "just setting up my chirp"
first=$LAST
chirp octocat "The Octocat" "Is this thing on? Pushing my first tweet as an empty commit 🐙"
chirp hubot "Hubot" "Every chirp here is a commit, and publishing is a merge. #gitchirip"
chirp octocat "The Octocat" "welcome aboard @akoskovacs!" "$first"
chirp akoskovacs "Ákos Kovács" "thanks @octocat — likes are just reactions on the pull request" "$first"

NUMBER=$((NUMBER + 1))
git checkout -q -b docs main
stamp
as "Ákos Kovács" "akoskovacs" "$STAMP"
echo "Chirps are empty commits." >> README.md
git commit -q -am "Explain chirps in the README"
git checkout -q main
merge akoskovacs docs

chirp hubot "Hubot" "Rewriting history won't unsay it: everyone who fetched still has it."
chirp octocat "The Octocat" "Markup stays text: <script>alert(1)</script> & links work: https://github.com/GitChirip?tab=repositories&q=chirp"
chirp akoskovacs "Ákos Kovács" "Profiles come from GitHub, so there is nothing to set up. Your bio there is your bio here."

echo "demo timeline with $NUMBER pull requests in $DIR"
