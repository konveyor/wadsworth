const GithubClient = require('../ghclient');

class Wadsworth {
  constructor(opt) {
    this.ghToken= opt.ghToken;
    this.org = opt.org;
    this.ghClient = new GithubClient(opt);
  }

  async Reconcile() {
    console.log('Wadsworth::Reconcile');
    this.ReconcileSprintToProjects();
  }

  async ReconcileSprintToProjects() {
    console.log('Wadsworth::ReconcileSprintToProjects');
    const projectsRes = await this.ghClient.GetProjects({
      org:this.org
    });
    const projectNames = projectsRes.data.map(p => p.name);
    console.log(projectNames);
  }
}

module.exports =  Wadsworth;
