const axios = require('axios');

const JIRA_API_ROOT = 'https://issues.redhat.com'

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

  async FetchSubtasks(jiraIssueId) {
    console.log(`JiraClient::FetchSubtasks(${jiraIssueId})`);
    const res = await this.requester.get(`/rest/api/2/issue/${jiraIssueId}`);
    return res.data;
  }

  async AddSubtask(jiraIssueId, githubIssue) {
    console.log('JiraClient::AttachSubtask');
  }
}

module.exports = JiraClient;