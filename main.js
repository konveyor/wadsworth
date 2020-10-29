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

  let returnStatus = 200;

  try {
    const jiraIssue = await jc.FetchIssue(jiraId);

    const subtaskTitles = jiraIssue.fields.subtasks
      .map(t => t.fields.summary);

    console.log(`${jiraId} subtask titles:`);
    console.log(subtaskTitles);

    const subtaskAlreadyExists = subtaskTitles.some(t => t.includes(jit));

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
        const subtaskToClose = jiraIssue.fields.subtasks.find(t => {
          return t.fields.summary.includes(jit);
        });
        console.log(`Found subtask to close with jiraId: ${subtaskToClose.key}`);
        console.log(`Transitioning task ${subtaskToClose.key} to done.`);
        await jc.TransitionTaskDone(subtaskToClose.key);
        returnStatus = 201;
      }
      break;
    default:
      console.error(`Unhandled action: ${ghi.action}`)
      returnStatus = 500;
    }
  } catch(err) {
    // Make sure to catch any unhandled errors so the server doesn't bomb out
    // TODO: Should probably get a little more sophisticated than this...
    console.error("Unhandled exception while processing hook:");
    console.error(err);
    returnStatus = 500;
  }

  res.sendStatus(returnStatus);
});

app.listen(wwport, wwhost, () => {
  console.log(`Listening on ${wwhost}:${wwport}`);
});
