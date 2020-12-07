#!/bin/bash

gh_host='api.github.com'
gh_org='konveyor'

curl \
  -X GET \
  -H "Authorization: token $GH_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/vnd.github.inertia-preview+json" \
  "https://$gh_host/orgs/$gh_org/projects"