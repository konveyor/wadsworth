const NodeGoogleDrive = require('node-google-drive')

class GoogleDriveClient {
    constructor(rootFolder, credentialsPath) {
        this.rootFolder = rootFolder
        this.gDrive = new NodeGoogleDrive({
            ROOT_FOLDER: rootFolder
        })
        this.credentialsPath = credentialsPath
    }

    async authenticate() {
        const path = require(this.credentialsPath)
        return await this.gDrive.useServiceAccountAuth(
            path
        )
    }

    async getAllFiles(folderId=this.rootFolder) {
        return await this.gDrive.listFiles(
            folderId,
            null,
            false
        )
    }

    async getAllFolders(folderId=this.rootFolder) {
        return await this.gDrive.listFolders(
            folderId,
            null,
            false
        )
    }

    async createFolder(folderId=this.rootFolder, name) {
        console.log("Creating folder "+name)
        return await this.gDrive.createFolder(
            folderId,
            name
        )
    }

    async createSpreadsheet(sourceCSV, name, folderId=this.rootFolder) {
        return await this.gDrive.writeFile(
            sourceCSV,
            folderId,
            name,
            'application/vnd.google-apps.spreadsheet'
        );
    }

    async deleteFile(fileId) {
        return await this.gDrive.removeFile(
            fileId
        )
    }
}

module.exports = { GoogleDriveClient }