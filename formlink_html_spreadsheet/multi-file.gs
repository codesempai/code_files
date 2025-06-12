var sheetName = 'Sheet1';
var uploadFolderID = '';
var scriptProp = PropertiesService.getScriptProperties();

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    // Log incoming parameters for debugging
    Logger.log('Received parameters:');
    Logger.log('name: ' + e.parameter.name);
    Logger.log('uploadMode: ' + e.parameter.uploadMode);
    
    var doc = SpreadsheetApp.openById(scriptProp.getProperty("key"));
    var sheet = doc.getSheetByName(sheetName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;
    
    // Parse files data
    var filesData = [];
    var folderUrl = '';
    var uploadedFiles = [];
    var userFolder = null;
    var folderName = '';
    var isSingleFile = false;
    
    if (e.parameter.filesData) {
      try {
        filesData = JSON.parse(e.parameter.filesData);
        Logger.log('Number of files to process: ' + filesData.length);
        
        // Check if it's a single file
        isSingleFile = filesData.length === 1;
        
        var parentFolder = DriveApp.getFolderById(uploadFolderID);
        
        if (isSingleFile) {
          // For single file, use the main upload folder
          userFolder = parentFolder;
          folderUrl = parentFolder.getUrl();
          folderName = 'Main Upload Folder';
          Logger.log('Single file upload - using main folder');
        } else {
          // For multiple files, create a subfolder
          var userName = e.parameter.name || 'Unknown';
          var timestamp = new Date();
          folderName = userName + '_' + Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
          
          userFolder = parentFolder.createFolder(folderName);
          folderUrl = userFolder.getUrl();
          
          Logger.log('Multiple files upload - created folder: ' + folderName);
          Logger.log('Folder ID: ' + userFolder.getId());
        }
        
        // Process each file
        for (var i = 0; i < filesData.length; i++) {
          var fileData = filesData[i];
          
          try {
            // Determine mime type
            var mimeType = fileData.type || getMimeTypeFromExtension(fileData.name) || 'application/octet-stream';
            
            // Create blob
            var mediaBlob = Utilities.newBlob(
              Utilities.base64Decode(fileData.data),
              mimeType,
              fileData.name
            );
            
            // Save file to folder (main folder for single file, subfolder for multiple)
            var file = userFolder.createFile(mediaBlob);
            file.setName(fileData.name);
            
            var fileInfo = {
              name: fileData.name,
              url: file.getUrl(),
              id: file.getId(),
              size: fileData.size,
              type: mimeType
            };
            
            uploadedFiles.push(fileInfo);
            
            Logger.log('Uploaded file: ' + fileData.name + ' (ID: ' + file.getId() + ')');
            
          } catch (fileError) {
            Logger.log('Error processing file ' + fileData.name + ': ' + fileError.message);
            throw new Error('Failed to process file: ' + fileData.name);
          }
        }
        
      } catch (parseError) {
        Logger.log('Error parsing files data: ' + parseError.message);
        throw new Error('Invalid files data format');
      }
    }
    
    // Prepare row data
    var newRow = headers.map(function(header) {
      switch(header.toLowerCase()) {
        case 'timestamp':
          return new Date();
        case 'name':
          return e.parameter.name;
        case 'uploadmode':
          return e.parameter.uploadMode;
        case 'foldername':
          return folderName;
        case 'folderurl':
          return folderUrl;
        case 'filecount':
          return uploadedFiles.length;
        case 'files':
          return uploadedFiles.map(function(f) { return f.name; }).join(', ');
        case 'fileurls':
          return uploadedFiles.map(function(f) { return f.url; }).join(', ');
        case 'singleurl':
          // For single file, return the direct file URL; for multiple files, return empty or folder URL
          return isSingleFile && uploadedFiles.length > 0 ? uploadedFiles[0].url : '';
        case 'totalsize':
          var totalBytes = uploadedFiles.reduce(function(sum, f) { return sum + f.size; }, 0);
          return (totalBytes / (1024 * 1024)).toFixed(2) + ' MB';
        default:
          return e.parameter[header] || '';
      }
    });
    
    // Write the new row
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    
    // Prepare response
    var response = {
      result: "success",
      row: nextRow,
      folderUrl: folderUrl,
      folderId: userFolder ? userFolder.getId() : null,
      uploadedFiles: uploadedFiles.length,
      files: uploadedFiles,
      isSingleFile: isSingleFile,
      singleFileUrl: isSingleFile && uploadedFiles.length > 0 ? uploadedFiles[0].url : null,
      debug: {
        name: e.parameter.name,
        uploadMode: e.parameter.uploadMode,
        filesProcessed: filesData.length,
        folderName: folderName,
        isSingleFile: isSingleFile,
        logs: Logger.getLog()
      }
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Main error: ' + error.message);
    Logger.log('Stack trace: ' + error.stack);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        result: "error",
        error: error.message,
        logs: Logger.getLog()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } finally {
    lock.releaseLock();
  }
}

// Helper function to determine mime type from file extension
function getMimeTypeFromExtension(filename) {
  if (!filename) return null;
  
  var extension = filename.toLowerCase().split('.').pop();
  var mimeTypes = {
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    'odt': 'application/vnd.oasis.opendocument.text',
    'ods': 'application/vnd.oasis.opendocument.spreadsheet',
    'odp': 'application/vnd.oasis.opendocument.presentation',
    
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'tiff': 'image/tiff',
    'ico': 'image/x-icon',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'm4a': 'audio/mp4',
    
    // Video
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // Code files
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',
    'py': 'text/x-python',
    'java': 'text/x-java-source',
    'cpp': 'text/x-c++src',
    'c': 'text/x-csrc',
    'php': 'application/x-httpd-php',
    'rb': 'application/x-ruby',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'swift': 'text/x-swift',
    'kt': 'text/x-kotlin',
    'ts': 'application/typescript',
    'sql': 'application/sql',
    'sh': 'application/x-sh',
    'bat': 'application/x-msdos-program',
    'ps1': 'application/x-powershell',
    
    // Other common formats
    'apk': 'application/vnd.android.package-archive',
    'exe': 'application/vnd.microsoft.portable-executable',
    'dmg': 'application/x-apple-diskimage',
    'deb': 'application/vnd.debian.binary-package',
    'rpm': 'application/x-rpm',
    'msi': 'application/x-msi',
    'iso': 'application/x-iso9660-image',
    'torrent': 'application/x-bittorrent',
    'psd': 'image/vnd.adobe.photoshop',
    'ai': 'application/postscript',
    'sketch': 'application/x-sketch',
    'fig': 'application/x-figma'
  };
  
  return mimeTypes[extension] || null;
}

// Setup function to initialize the spreadsheet (run this once)
function setup() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  scriptProp.setProperties({
    'key': doc.getId()
  });
}

// Function to create sample headers for multi-file upload (updated to include singleurl)
function createHeaders() {
  var doc = SpreadsheetApp.openById(scriptProp.getProperty("key"));
  var sheet = doc.getSheetByName(sheetName);
  
  // Set headers for multi-file upload tracking
  var headers = [
    'timestamp',
    'name', 
    'uploadMode',
    'folderName',
    'folderUrl',
    'fileCount',
    'files',
    'fileUrls',
    'singleUrl',
    'totalSize'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  Logger.log('Headers created: ' + headers.join(', '));
}
