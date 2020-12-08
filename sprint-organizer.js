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
const csvParser = require("csv-parse")
var xlsx = require('xlsx');


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

    // generates a human-readable summary when diff is given
    diffSummaryReport(diff) {
        return `
There were ${diff.length} new issue(s) added to the sprint.

Here's the list of new issues added:
- ${diff.join("\n-")}
        `
    }

    parseXslx(filePath) {
        var obj = xlsx.readFile(filePath, {
            type: 'binary'
        });
        var sheetNames = obj.SheetNames
        return xlsx.utils.sheet_to_json(obj.Sheets[sheetNames[0]])
    }
    
    // creates a new folder, if not exists already
    ensureFolder(folderName) {
        const that = this
        return that.gDriveClient.getAllFolders()
            .then(function(res) {
                const existingFolder = res.folders.find(function(folder) {
                    return folder.name == folderName
                })
                if (existingFolder) {
                    return existingFolder
                } else {
                    return that.gDriveClient.createFolder(that.gDriveRootFolder, sprintName)
                }
            })
    }

    // downloads a file from given Google Drive folder
    downloadFileFromFolder(folderName, fileName, destination) {
        const that = this
        return that.gDriveClient.getAllFolders()
            .then(function(res) {
                const folder = res.folders.find(function(folder) {
                    return folder.name == folderName
                })
                return that.gDriveClient.getAllFiles(folder.id)
            })
            .then(function(res) {
                const file = res.files.find(function(file) {
                    return file.name == fileName
                })
                if (file) {
                    return that.gDriveClient.downloadFile(file, destination)
                } else {
                    return fileName
                }
            })
    }

    // deletes existing file in a folder
    deleteFile(folderId, fileName) {
        const that = this
        return that.gDriveClient.getAllFiles(folderId)
            .then(function(res) {
                const existingFile = res.files.find(function(file) {
                    return file.name == fileName
                })
                if (existingFile) {
                    return that.gDriveClient.deleteFile(existingFile.id)
                } else {
                    return fileName
                }
            })
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
            // Make sure a folder exists for this sprint
            .then(function(res) {
                return that.ensureFolder(sprintName)
            })
            // Make sure an existing archive doesn't exist
            .then(function(res) {
                sprintFolder = res
                return that.deleteFile(res.id, archiveName)
            })
            // Dump arhive in a CSV
            .then(function(res) {
                return new Promise(function(resolve, reject) {
                    fs.writeFile('/tmp/temp.csv', csv.map(e => e.join(",")).join("\n"), function(err) {
                       if (err) reject(err);
                       else resolve('Success');
                    })
                })
            })
            // Upload archive to Google Drive
            .then(function(res) {
                return that.gDriveClient.createSpreadsheet('/tmp/temp.csv', archiveName, sprintFolder.id)
            })
            .catch(function(res) {
                console.log(res)
            })
    }

    // runs Diff recipe to find out delta between previous sprint
    runDiffRecipe() {
        const that = this
        var sprintName
        that.ghClient.FetchAllProjects()
            // Find out the right sprint board
            .then(function(res) {
                sprintName = that.getLatestProject(res).name
                return that.gDriveClient.authenticate()
            })
            .then(function(res) {
                return Promise.all(
                    [
                        that.downloadFileFromFolder(sprintName, 'initialArchive.csv', '/tmp'),
                        that.downloadFileFromFolder(sprintName, 'finalArchive.csv', '/tmp')
                    ]
                )
            })
            .then(function(res) {
                const parsed = res.map(function(file) {
                    return that.parseXslx(file)
                })
                const oldIssues = [], newIssues = []
                parsed[0].forEach(function(element) {
                    csvColumns.forEach(function(col) {
                        if (element[col]) oldIssues.push(element[col])
                    })
                });
                parsed[1].forEach(function(element) {
                    csvColumns.forEach(function(col) {
                        if (element[col]) newIssues.push(element[col])
                    })
                });
                const diff = newIssues.filter(function(x) {
                    return !oldIssues.includes(x)
                });
                return Promise.all(
                    [
                        new Promise(function(resolve, reject) {
                            fs.unlink('/tmp/initialArchive.csv.xlsx', function(err){
                                if (err) reject(err)
                                else resolve('success')
                            })
                        }),
                        new Promise(function(resolve, reject) {
                            fs.unlink('/tmp/finalArchive.csv.xlsx', function(err){
                                if (err) reject(err)
                                else resolve('success')
                            })
                        })
                    ]
                )
            })
            .then(function(res) {

            })
            .catch(function(res) {
                console.log(res)
            })
    }

    runNewSprintRecipe() {

    }
}

const GH_TOKEN = process.env.GH_TOKEN
const GDRIVE_FOLDER = process.env.GDRIVE_FOLDER
const args = process.argv.slice(2);

const guru = new MTCSprintGuru(GH_TOKEN, GDRIVE_FOLDER)

switch(args[0]) {
    case "archive":
        guru.runArchiveRecipe('initialArchive.csv')
        break
    case "diff":
        guru.runDiffRecipe()
        break
    default:
        console.log("No recipe selected")
}
