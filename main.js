const express = require('express');
const app = express();

const common = require('./common');

const { JiraClient, GetJiraIssueTag } = require('./jira-client');

const OPEN_ACTION = 'opened';

const wwport = process.env['WADSWORTH_PORT'] || 1337;
const wwhost = process.env['WADSWORTH_HOST'] || '0.0.0.0';

const jiraUser = process.env['JIRA_USER'];
const jiraPass = process.env['JIRA_PASS'];


if(!jiraUser || !jiraPass) {
  console.error(`ERROR: Must provide JIRA_USER and JIRA_PASS env vars`);
  return;
}

const jc = new JiraClient(jiraUser, jiraPass);

app.use(express.json());

app.post('/ghissuehook', async (req, res) => {
  const ghi = req.body;
  const issueTitle = ghi.issue.title;
  const action = ghi.action;

  console.log(ghi);

  // Only process newly opened issues
  // TODO: Handle edited title issues
  if(req.body.action != OPEN_ACTION) {
    console.log(`Skip processing. Issue action not relevant: ${action}`);
    res.sendStatus(200);
    return;
  }

  const trimmedIssueTitle = common.ParseGHITitle(ghi);
  if(!trimmedIssueTitle) {
    console.log(`Skip processing. Did not match title: ${issueTitle}`);
    res.sendStatus(200);
    return;
  }

  const jit = GetJiraIssueTag(ghi);
  const jiraId = trimmedIssueTitle.jiraId;
  const jiraIssue = await jc.FetchIssue(jiraId);

  const subtaskTitles = jiraIssue.fields.subtasks
    .map(t => t.fields.summary);

  console.log('Subtask titles:')
  console.log(subtaskTitles);

  const subtaskAlreadyExists = subtaskTitles.some(t => t.includes(jit));
  if(subtaskAlreadyExists) {
    console.log('Subtask already exists! Returning...');
    return;
  }

  const subtaskData = await jc.AddSubtaskForGithubIssue(jiraId, ghi);

  res.sendStatus(201);
});

app.listen(wwport, wwhost, () => {
  console.log(`Listening on ${wwhost}:${wwport}`);
});
