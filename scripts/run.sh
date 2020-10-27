#!/bin/bash
_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source ~/.secrets/jira-creds
export GH_ISSUE_FILE="$_dir/../sample-gh-issue.txt"
JIRA_USER="${JIRA_USER}" JIRA_PASS="${JIRA_PASS}" node main.js