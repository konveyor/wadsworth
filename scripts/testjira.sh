#!/bin/bash
_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source ~/.secrets/jira-creds
jirahost='issues.redhat.com'
token=$(echo "$JUSER:$JPASS" | base64)

curl \
  -X GET \
  -H "Authorization: Basic $token" \
  -H "Content-Type: application/json" \
  "https://$jirahost/rest/api/2/issue/MIG-357"
