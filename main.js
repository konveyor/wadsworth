const express = require('express');
const app = express();
const wwport = process.env['WADSWORTH_PORT'] || 1337;
const wwhost = process.env['WADSWORTH_HOST'] || '0.0.0.0';

const OPEN_ACTION = 'opened';
const GH_ISSUE_TITLE_REGEX = /^\[(MIG-\d*)\](.*)$/;
const TRIMMED_TITLE_INDEX = 2;
const EXPECTED_MATCH_LENGTH = 3;

app.use(express.json());

//app.get('/hello', (req, res) => {
  //res.send('world');
//});

//app.post('/ping', (req, res) => {
  //res.status(201).json({message: 'pong'});
//});

app.post('/github-webhook-in', (req, res) => {
  const issueTitle = req.body.issue.title;
  const issueN = req.body.issue.number;
  const repoName = req.body.repository.name;
  const action = req.body.action;

  console.log(`Issue trigger: ${repoName}#${issueN}:${action}`);

  // Only process newly opened issues
  // TODO: Handle edited title issues
  if(req.body.action != OPEN_ACTION) {
    console.log(`Skip processing. Issue action not relevant: ${action}`);
    res.sendStatus(200);
    return;
  }

  const issueTitleMatch = issueTitle.match(GH_ISSUE_TITLE_REGEX);
  if(!issueTitleMatch) {
    console.log(`Skip processing. Did not match title: ${issueTitle}`);
    res.sendStatus(200);
    return;
  }

  if(issueTitleMatch.length != EXPECTED_MATCH_LENGTH) {
    console.log('ERROR: Matched on title, but did not have expected count of matches');
    console.log(`-> Title: ${issueTitle}`);
    console.log(`-> Match length: ${issueTitleMatch.length}`);
    res.sendStatus(500);
    return;
  }

  const trimmedIssueTitle = issueTitleMatch[TRIMMED_TITLE_INDEX];
  res.sendStatus(201);
});

//app.listen(wwport, wwhost, () => {
  //console.log(`Listening on ${wwhost}:${wwport}`);
//});
console.log(match);
console.log(`str len: ${match.length}`);

//const CronJob = require('cron').CronJob;
//const Wadsworth= new require('./wadsworth');

//const w = new Wadsworth({
  //ghToken: process.env['GITHUB_TOKEN'],
  //org: 'nsk-org-sandbox',
//});

//const job = new CronJob({
  //cronTime: '* * * * *',
  //onTick: () => w.Reconcile(),
  //start: false,
  //timeZone: 'America/New_York'
//});

//job.start();

//w.Reconcile();
