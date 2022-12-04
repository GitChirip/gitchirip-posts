#!/bin/bash

if [ -x "$(command -v gh)" ] && [ -x "$(command -v jq)" ]; then
  GH_USERNAME=$(gh api 'https://api.github.com/user' | jq .login)
  GH_USERNAME=${GH_USERNAME//\"/}
else
  echo "Github CLI and/or jq is not installed :("
  read -p "Github user name: " GH_USERNAME
fi

echo "Using Github user name: $GH_USERNAME"
POST_DIR="posts/$GH_USERNAME"
if ! [ -e $POST_DIR ]; then
  echo "Creating directory '$POST_DIR'..."
  mkdir -p $POST_DIR
fi

DATE=$(date +%Y-%m-%d)
ORDER=$(ls $POST_DIR | wc -l | tr -d '[:space:] ')
PNAME="$POST_DIR/${DATE}_${ORDER}.md"

echo "Creating post '$PNAME'..."

cp "post-template.md" $PNAME
