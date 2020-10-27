const axios = require('axios');
const common = require('./common');

const JIRA_API_ROOT = 'https://issues.redhat.com'
const PROJECT_KEY = 'MIG';
const SUBTASK_TYPE_ID = '5';
const ISSUE_PATH = '/rest/api/2/issue';

const issuePathForId = (issueId) => `${ISSUE_PATH}/${issueId}`;

class JiraClient {
  constructor(jiraUser, jiraPass) {
    const token = Buffer.from(`${jiraUser}:${jiraPass}`).toString('base64');

    this.requester = axios.create({
      baseURL: JIRA_API_ROOT,
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json',
      },
      transformResponse: undefined,
      responseType: 'json',
    })
  }

  async FetchIssue(jiraIssueId) {
    console.log(`JiraClient::Issue(${jiraIssueId})`);
    const res = await this.requester.get(issuePathForId(jiraIssueId));
    return res.data;
  }

  async AddSubtaskForGithubIssue(jiraIssueId, githubIssue) {
    const jit = GetJiraIssueTag(githubIssue);
    console.log(`JiraClient::AddSubtaskForGithubIssue - ${jiraIssueId} - ${jit}`);

    const parsedTitle = common.ParseGHITitle(githubIssue);
    const subtaskTitle = `${jit}: ${parsedTitle.trimmedTitle}`;

    console.log('Creating subtask with title:')
    console.log(subtaskTitle);

    const subtaskReqBody = createSubtaskReqBody(
      subtaskTitle, githubIssue.issue.html_url, jiraIssueId);
    const res = await this.requester.post(ISSUE_PATH, subtaskReqBody);

    console.log('Got result:');
    console.log(res);

    return res.data;
  }
}

function createSubtaskReqBody(summary, description, parentId) {
  return {
    fields: {
      project: {
        key: PROJECT_KEY,
      },
      parent: {
        key: parentId,
      },
      summary,
      description,
      issuetype: { id: SUBTASK_TYPE_ID },
    }
  }
}

function GetJiraIssueTag(ghIssue){
  return `[${ghIssue.repository.name}#${ghIssue.issue.number}]`;
}

module.exports = { JiraClient, GetJiraIssueTag };