const axios = require('axios');

GITHUB_API_ROOT="https://api.github.com"

const CardTypes = {
    ISSUE: "Issue",
    PULL: "PullRequest",
}

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

    NewCard(contentId, contentType, note='') {
        
        return {
            content_id: contentId || null,
            content_type: contentType || null,
            note: note || null,
        }
    }

    GetCardType(contentUrl) {
        if(this.isIssueUrl(contentUrl)) return CardTypes.ISSUE
        if(this.isPullRequestUrl(contentUrl)) return CardTypes.PULL
        return null
    }

    // Determines whether a URL points to an issue
    isIssueUrl(url) {
        return /.*issues.*/.test(url)
    }

    // Determines whether a URL points to a pull request
    isPullRequestUrl(url) {
        return /.*issues.*/.test(url)
    }

    async fetch(url) {
        const res = await this.requester.get(url)
        return res.data
    }

    async post(url, data) {
        const res = await this.requester.post(url, data)
        return res.data
    }

    async delete(url) {
        const res = await this.requester.delete(url)
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

    async CreateNewProject(projectName) {
        return this.post(this.projectsAPIEndpoint(), {
            name: projectName,
        })
    }

    async DeleteProject(projectId) {
        return this.delete(`projects/${projectId}`)
    }

    async AddCardToColumn(columnId, card) {
        return this.post(this.cardsAPIEndpoint(columnId), card)
    }

    async AddColumnToProject(projectId, columnName) {
        return this.post(this.columnsAPIEndpoint(projectId), {
            name: columnName,
            private: false,
        })
    }

    async GetCardContent(url) {
        return this.fetch(url)
    }

}

module.exports = { GithubClient };