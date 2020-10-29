#!/bin/bash
_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [[ "$PRIVATE_KEY_FILE" == "" ]]; then
  echo "ERROR: Must provide PRIVATE_KEY_FILE env var containing path to ssh key"
  echo "Example: PRIVATE_KEY_FILE=/home/ernelson/key.pem install.sh"
  exit 1
fi

ansible-playbook --private-key=$PRIVATE_KEY_FILE -i $_dir/inventory \
  -e@$_dir/my_vars.yml \
  $_dir/install.yml

# TODO: Commit encrypted jira bot creds?
# --vault-password-file $_dir/../vault-pass.txt \
# -e@$_dir/become_pass.vault \
