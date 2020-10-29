const express = require('express');
const app = express();

const common = require('./common');

const { JiraClient, GetJiraIssueTag } = require('./jira-client');

const OPENED_ACTION = 'opened';
const EDITED_ACTION = 'edited';
const CLOSED_ACTION = 'closed';

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

  if(ghi.action != OPENED_ACTION &&
     ghi.action != EDITED_ACTION &&
     ghi.action != CLOSED_ACTION
    ) {
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

  let returnStatus = 200;

  switch(ghi.action) {
  case OPENED_ACTION:
  case EDITED_ACTION:
    if(subtaskAlreadyExists) {
      console.log('Subtask already exists! Skipping.');
    } else {
      await jc.AddSubtaskForGithubIssue(jiraId, ghi);
      returnStatus = 201;
    }
    break;
  case CLOSED_ACTION:
    if(!subtaskAlreadyExists) {
      // Subtask has to exist on a jira ticket to close it
      console.error('Closed issue, but subtask doesnt exist.');
      returnStatus = 500;
    } else {
      console.log(`Transitioning task ${jiraId} to done.`)
      await jc.TransitionTaskDone(jiraId);
      returnStatus = 201;
    }
    break;
  default:
    console.error(`Unhandled action: ${ghi.action}`)
    returnStatus = 500;
  }

  res.sendStatus(returnStatus);
});

app.listen(wwport, wwhost, () => {
  console.log(`Listening on ${wwhost}:${wwport}`);
});
