const GH_ISSUE_TITLE_REGEX = /^\[(MIG-\d*)\](.*)$/;
const JIRA_ID_IDX = 1;
const TRIMMED_TITLE_IDX = 2;
const EXPECTED_MATCH_LENGTH = 3;

function ParseGHITitle(githubIssue) {
  const issueTitle = githubIssue.issue.title;

  const issueTitleMatch = issueTitle.match(GH_ISSUE_TITLE_REGEX);
  if(issueTitleMatch.length != EXPECTED_MATCH_LENGTH) {
    return null;
  }

  return {
    jiraId: issueTitleMatch[JIRA_ID_IDX].trim(),
    trimmedTitle: issueTitleMatch[TRIMMED_TITLE_IDX].trim(),
  };
}

module.exports = {
  ParseGHITitle,
};