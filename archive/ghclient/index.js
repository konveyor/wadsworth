const axios = require('axios');

class GithubClient {
  constructor(opt) {
    this.token = opt.ghToken;
    this.org = opt.org;
    this.client= axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.inertia-preview+json'
      },
    });
  }

  async GetProjects() {
    return this.client.get(`/orgs/${this.org}/projects`);
  }
}

module.exports = GithubClient;
