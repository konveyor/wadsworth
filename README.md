# wadsworth

Github <-> Jira integration webhook bot

**Features**:
* Creates a subtask on a Jira issue when a github issue is created that follows
the pattern: `[MIG-XXX] Issue title`
* When an issue is closed, either due to a PR "fixes" comment, or manually, bot
will close relevant subtask if present

## Deploy

`/deploy` dir contains `install.sh` and a role to install.

1) `cp my_var.yml.example my_var.yml` and fill in details
2) `cp inventory.example inventory` and fill in details (NOTE: replace user with non-root
remote user)
3) Run `deploy/install.sh`, passing private key for ansible ssh auth auth:

```sh
PRIVATE_KEY_FILE=~/.ssh/my-key.pem ./deploy/install.sh
```

Bot can act for single repo, or entire org. To hook up, navigate to org or
repo settings -> webhooks. The bot listens on http path: `/ghissuehook`.

Example webhook coordinate: `http://dog8code.com/ghissuehook`.

Webhook should also be configured to only send issue events.