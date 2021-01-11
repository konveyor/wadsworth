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
var xlsx = require('xlsx');
const emailer = require('./emailer')

const inProgressColumnRegex =  /.*(I|i)n *(P|p)rogress.*/
const toDoColumnRegex =  /.*(T|t)o *(D|d)o.*/
const doneColumnRegex =  /.*(D|d)one.*/

const csvColumns = ["To Do", "In Progress", "Done"]

class MTCSprintGuru {
    constructor(mtcOrg, ghToken, driveFolderId, smtpAddr, smtpUser, smtpPassword) {
        this.ghClient = new githubClient.GithubClient(ghToken, mtcOrg)
        this.gDriveClient = new googleDriveClient.GoogleDriveClient(driveFolderId, './credentials.json')
        this.emailer = new emailer.Emailer(smtpAddr, smtpUser, smtpPassword)
        this.gDriveRootFolder = driveFolderId
    }

    // returns latest sprint based on number
    getLatestProject(projects, offset=0) {
        return projects.filter(function(project) {
            return /MTC Sprint \d+/.test(project.name) 
        }).sort(function(a, b) {
            return b.name.localeCompare(a.name)
        })[offset]
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
    diffSummaryReport(diff, rootFolder, sprintName) {
        return `
There were ${diff.length} new issue(s) added to <b>${sprintName}</b>.<br>
<br>
Here's the list of new issues added:<br>
- ${diff.join("<br>\n-")} <br>
<br>
Find both the snapshots of issues under <b>${sprintName}</b> folder here: <a href='https://drive.google.com/drive/u/0/folders/${rootFolder}'>https://drive.google.com/drive/u/0/folders/${rootFolder}</a>; 

`
    }

    newSprintSummaryReport(newSprintName, boardLink, toDoIssues, inProgressIssues) {
        return `
New sprint board <a href='${boardLink}'><b>${newSprintName}</b></a> is created.<br>
<br>
<b>${toDoIssues.length}</b> To-Do issues and <b>${inProgressIssues.length}</b> In-Progress issues were copied to the new board.<br>
`
    }

    parseXslx(filePath) {
        var obj = xlsx.readFile(filePath, {
            type: 'base64'
        });
        var sheetNames = obj.SheetNames
        return xlsx.utils.sheet_to_json(obj.Sheets[sheetNames[0]])
    }

    isThisUTCDateOneDayOld(thatDate) {
        return (new Date() - new Date(thatDate)) / (1000 * 60 * 60 * 24) >= 1
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
                    return that.gDriveClient.createFolder(that.gDriveRootFolder, folderName)
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
    runDiffRecipe(sender, receivers) {
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
                return new Promise(function(resolve, reject) {
                    setTimeout(resolve(res), 5000)
                })
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
                return that.emailer.sendEmail(
                    sender, receivers, 
                    `${sprintName} Report`, that.diffSummaryReport(diff, that.gDriveRootFolder, sprintName))
            })
            .then(function(res) {
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
            .catch(function(res) {
                console.log(res)
            })
    }

    runNewSprintRecipe(sender, receivers) {
        const that = this
        var inProgressCards, toDoCards, doneCards
        var toDoColumn, inProgressColumn, doneColumn
        var latestSprintName, newSprintName
        var newProject
        that.ghClient.FetchAllProjects()
            // Find out the right sprint board
            .then(function(res) {
                var latestSprint = that.getLatestProject(res)
                if (!that.isThisUTCDateOneDayOld(latestSprint.created_at)) {
                    const newSprint = that.getLatestProject(res)
                    latestSprint = that.getLatestProject(res, 1)
                    latestSprintName = latestSprint.name
                    return that.ghClient.DeleteProject(newSprint.id)
                        .then(function(res){
                            return that.ghClient.FetchAllColumnsInProject(latestSprint.id)
                        })
                        .catch(function(res) {
                            return that.ghClient.FetchAllColumnsInProject(latestSprint.id)
                        })
                } else {
                    latestSprintName = latestSprint.name
                    return that.ghClient.FetchAllColumnsInProject(latestSprint.id)
                }
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
                const nextSprintNumber = parseInt(latestSprintName.match(/.*?(\d+).*/)[1]) + 1
                newSprintName = `MTC Sprint ${nextSprintNumber}`
                return that.ghClient.CreateNewProject(newSprintName)
            })
            .then(function(res) {
                newProject = res
                return that.ghClient.PatchProject(res.id, {
                    private: false,
                    trackProgress: true,
                })
            })
            .then(function(res) {
                // we need the columns in a particular order
                return that.ghClient.AddColumnToProject(newProject.id, 'To Do')
                    .then(function(res) {
                        toDoColumn = res
                        return that.ghClient.AddColumnToProject(newProject.id, 'In Progress')
                    })
                    .then(function(res) {
                        inProgressColumn = res
                        return that.ghClient.AddColumnToProject(newProject.id, 'Done')
                    })
                    .then(function (res) {
                        doneColumn = res
                        return [toDoColumn, inProgressColumn, doneColumn]
                    })
            })
            .then(function(res) {
                return Promise.all(
                    toDoCards.map(function(card) {
                        return that.ghClient.GetCardContent(card.content_url)
                    })
                )
            })
            .then(function(res) {
                return Promise.all(
                    res.map(function(card) {
                        return that.ghClient.AddCardToColumn(
                            toDoColumn.id, 
                            that.ghClient.NewCard(card.id, that.ghClient.GetCardType(card.url))
                        )
                    })
                )
            })
            .then(function(res) {
                return Promise.all(
                    inProgressCards.map(function(card) {
                        return that.ghClient.GetCardContent(card.content_url)
                    })
                )
            })
            .then(function(res) {
                return Promise.all (
                    res.map(function(card) {
                        return that.ghClient.AddCardToColumn(
                            inProgressColumn.id, 
                            that.ghClient.NewCard(card.id, that.ghClient.GetCardType(card.url))
                        )
                    })
                )
            })
            .then(function(res) {
                const report = that.newSprintSummaryReport(newSprintName, newProject.html_url, toDoCards, inProgressCards)
                return that.emailer.sendEmail(
                    sender, receivers,
                    `${newSprintName} Report`, report)
            })
            .catch(function(res) {
                console.log(res)
            })
    }
}

const MTC_ORG = process.env.MTC_ORG
const GH_TOKEN = process.env.GH_TOKEN
const GDRIVE_FOLDER = process.env.GDRIVE_FOLDER
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_ADDR = process.env.SMTP_ADDR
const SMTP_RECEIVERS = process.env.SMTP_RECEIVERS
const SMTP_SENDER = process.env.SMTP_SENDER
const ARCHIVE_NAME = process.env.ARCHIVE_NAME
const args = process.argv.slice(2);

const guru = new MTCSprintGuru(MTC_ORG, GH_TOKEN, GDRIVE_FOLDER, SMTP_ADDR, SMTP_USER, SMTP_PASS)

switch(args[0]) {
    case "archive":
        guru.runArchiveRecipe(ARCHIVE_NAME)
        break
    case "diff":
        guru.runDiffRecipe(SMTP_SENDER,SMTP_RECEIVERS)
        break
    case "new":
        guru.runNewSprintRecipe(SMTP_SENDER,SMTP_RECEIVERS)
        break
    default:
        console.log("No recipe selected")
}