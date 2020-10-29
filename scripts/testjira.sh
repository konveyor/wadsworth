#!/bin/bash
_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source ~/.secrets/jira-creds
jirahost='issues.redhat.com'
jiraid="MIG-357"
#jiraid="MIG-365"
token=$(echo "$JIRA_USER:$JIRA_PASS" | base64)

curl \
  -X GET \
  -H "Authorization: Basic $token" \
  -H "Content-Type: application/json" \
  "https://$jirahost/rest/api/2/issue/$jiraid"

#curl -X GET \
  #-H "Authorization: Basic $token" \
  #-H "Content-Type: application/json" \
  #"https://$jirahost/rest/api/2/issue/$jiraid/transitions"

#curl -X POST \
  #--data @$_dir/test.json \
  #-H "Authorization: Basic $token" \
  #-H "Content-Type: application/json" \
  #"https://$jirahost/rest/api/2/issue/$jiraid/transitions"
