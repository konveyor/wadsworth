const axios = require('axios');

GITHUB_API_ROOT="https://api.github.com"

class GithubClient {
    constructor(ghToken, org) {
        this.requester = axios.create({
            baseURL: GITHUB_API_ROOT,
            headers: {
              'Authorization': `token ${ghToken}`,
              'Content-Type': 'application/json',
              // GH Projects API is in developer preview
              // following header is needed to activate it
              'Accept': 'application/vnd.github.inertia-preview+json',
            },
            transformResponse: undefined,
            responseType: 'json',
          })
        this.org = org
    }

    projectsAPIEndpoint() {
        return `/orgs/${this.org}/projects`
    }
    
    columnsAPIEndpoint(projectId) {
        return `/projects/${projectId}/columns`
    }
    
    cardsAPIEndpoint(columnId) {
        return `/projects/columns/${columnId}/cards`
    }

    async fetch(url) {
        const res = await this.requester.get(url)
        return res.data
    }

    async FetchAllProjects() {
        return this.fetch(this.projectsAPIEndpoint())
    }

    async FetchAllColumnsInProject(projectId) {
        return this.fetch(this.columnsAPIEndpoint(projectId))
    }

    async FetchAllCardsInColumn(columnId) {
        return this.fetch(this.cardsAPIEndpoint(columnId))
    }
}

module.exports = { GithubClient };