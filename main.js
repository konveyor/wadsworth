const express = require('express');
const app = express();
const fs = require('fs');

const common = require('./common');

const { JiraClient, GetJiraIssueTag } = require('./jira-client');

const OPEN_ACTION = 'opened';

// const exGithubIssueFile = process.env['GH_ISSUE_FILE'];
// console.log(`exGithubIssueFile: ${exGithubIssueFile}`);

// let exGithubIssue;
// if(exGithubIssueFile) {
//   exGithubIssue = JSON.parse(fs.readFileSync(exGithubIssueFile));
// }

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

app.post('/ghissuehook', aysnc (req, res) => {
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

  const trimmedIssueTitle = common.ExtractTrimmedGHITitle(ghi);
  if(!trimmedIssueTitle) {
    console.log(`Skip processing. Did not match title: ${issueTitle}`);
    res.sendStatus(200);
    return;
  }

////////////////////////////////////////////////////////////////////////////////
// TODO:
// 1) Fetch JIRA issue and determine if a subtask already exists for the gh event
// 2) Create subtask for gh event if it doesn't already exist
////////////////////////////////////////////////////////////////////////////////

  const jit = GetJiraIssueTag(ghIssue);
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

// (async () => {
//   console.log('GH issue trigged');

  // const jiraId = 'MIG-357';
  // const jiraIssue = await jc.FetchIssue(jiraId);

  // // const subtaskAlreadyExists = jiraIssue.fields.subtasks
  // //   .map(t => t.fields.summary)
  // //   .some(name => name.includes(jiraIssueTag(ghIssue)));

  // const subtaskTitles = jiraIssue.fields.subtasks
  //   .map(t => t.fields.summary);

  // console.log('Found subtask titles:');
  // console.log(subtaskTitles);

  // console.log('Checking if the subtask already exists on this issue...');
  // const jit = GetJiraIssueTag(exGithubIssue);
  // console.log(`JIT: ${jit}`);

  // const subtaskAlreadyExists = subtaskTitles.some(t => t.includes(jit));
  // if(subtaskAlreadyExists) {
  //   console.log('Subtask already exists! Returning...');
  //   return;
  // }

  // const subtaskData = await jc.AddSubtaskForGithubIssue(jiraId, exGithubIssue);
  // console.log(jiraIssue);
  // jiraIssue.fields.subtasks.forEach(t => {
  //   console.log(t);
  // });
// })();

app.listen(wwport, wwhost, () => {
  console.log(`Listening on ${wwhost}:${wwport}`);
});
