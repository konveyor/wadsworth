/*
    This is a recipe to organize MTC Sprints

    - discover existing sprint
    - take an end-of-sprint snapshot
    - create new sprint
    - move all in-progress / to-do issues from the previous sprint to the new sprint
    - take a new-born sprint snapshot
    - wait for folks to add new issues
    - take a beginning-of-sprint snapshot
    - repeat
*/
const githubClient = require('./gh-client')
const googleDriveClient = require('./drive-client')
const fs = require('fs')

MTC_ORG='konveyor'

const inProgressColumnRegex =  /.*(I|i)n *(P|p)rogress.*/
const toDoColumnRegex =  /.*(T|t)o *(D|d)o.*/
const doneColumnRegex =  /.*(D|d)one.*/

const startOfSprintArchiveName = 'Start'
const endOfSprintArchiveName   = 'End'

const csvColumns = ["To Do", "In Progress", "Done"]

class MTCSprintGuru {
    constructor(ghToken, driveFolderId) {
        this.ghClient = new githubClient.GithubClient(ghToken, MTC_ORG)
        this.gDriveClient = new googleDriveClient.GoogleDriveClient(driveFolderId, './credentials.json')
        this.gDriveRootFolder = driveFolderId
    }

    // returns latest sprint based on number
    getLatestProject(projects) {
        return projects.filter(function(project) {
            return /MTC Sprint \d+/.test(project.name) 
        }).sort(function(a, b) {
            return b.name.localeCompare(a.name)
        })[0]
    }

    filterColumn(columns, regex) {
        return columns.find(function(column) {
            return regex.test(column.name)
        })
    }

    htmlFormatIssueLink(url) {
        url = url.replace("api.github.com", "github.com")
        url = url.replace("repos/", "")
        return `=HYPERLINK("${url}")`
    }

    summarize(toDoCards, inProgressCards, doneCards) {
        return `
            Total ToDo       : ${toDoCards.length}
            Total InProgress : ${inProgressCards.length}
            Total Done       : ${doneCards.length}
        `
    }

    // archive recipe 
    // snapshots the latest sprint
    // finds all issues on the board and seggregates based on columns
    runArchiveRecipe(archiveName) {
        const that = this
        var inProgressCards, toDoCards, doneCards
        var csv = [
            csvColumns,
        ]
        var sprintName
        var sprintFolder
        that.ghClient.FetchAllProjects()
            // Find out the right sprint board
            .then(function(res) {
                sprintName = that.getLatestProject(res).name
                return that.ghClient.FetchAllColumnsInProject(that.getLatestProject(res).id)
            })
            // Find out all issues
            .then(function(res) {
                return Promise.all(
                    [
                        that.ghClient.FetchAllCardsInColumn(that.filterColumn(res, toDoColumnRegex).id),
                        that.ghClient.FetchAllCardsInColumn(that.filterColumn(res, inProgressColumnRegex).id),
                        that.ghClient.FetchAllCardsInColumn(that.filterColumn(res, doneColumnRegex).id)
                    ]
                )
            })
            // Prepare sheet data
            .then(function(res) {
                toDoCards = res[0], inProgressCards = res[1], doneCards = res[2]
                for (var i=0; i < Math.max(doneCards.length, toDoCards.length, inProgressCards.length); i++) {
                    var currentRow = []
                    currentRow = [...currentRow, (i < toDoCards.length ? that.htmlFormatIssueLink(toDoCards[i].content_url) : "")]
                    currentRow = [...currentRow, (i < inProgressCards.length ? that.htmlFormatIssueLink(inProgressCards[i].content_url) : "")]
                    currentRow = [...currentRow, (i < doneCards.length ? that.htmlFormatIssueLink(doneCards[i].content_url) : "")]
                    csv = [...csv, currentRow]
                }
                return that.gDriveClient.authenticate()
            })
            // Find the folder for current sprint
            .then(function(res) {
                return that.gDriveClient.getAllFolders()
            })
            // Create one if does not exist
            .then(function(res) {
                sprintFolder = res.folders.find(function(folder) {
                    return folder.name == sprintName
                })
                if (sprintFolder) {
                    return sprintFolder
                } else {
                    return that.gDriveClient.createFolder(that.gDriveRootFolder, sprintName)
                }
            })
            // Get files in the folder
            .then(function(res) {
                return that.gDriveClient.getAllFiles(res.id)
            })
            // delete existing file if exists
            .then(function(res) {
                const existingFile = res.files.find(function(file) {
                    return file.name == archiveName
                })
                if (existingFile) {
                    return that.gDriveClient.deleteFile(existingFile.id)
                } else {
                    return archiveName
                }
            })
            // create new spreadsheet
            .then(function(res) {
                return new Promise(function(resolve, reject) {
                    fs.writeFile('/tmp/temp.csv', csv.map(e => e.join(",")).join("\n"), function(err) {
                       if (err) reject(err);
                       else resolve('Success');
                    })
                })
            })
            .then(function(res) {
                return that.gDriveClient.createSpreadsheet('/tmp/temp.csv', archiveName, sprintFolder.id)
            })
            .catch(function(res) {
                console.log(res)
            })
    }

    // runs Diff recipe to find out delta between previous sprint
    runDiffRecipe() {

    }

    runNewSprintRecipe() {

    }
}

