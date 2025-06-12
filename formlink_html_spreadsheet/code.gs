var sheetName = 'Sheet1';
var uploadFolderID = '1D7ZRa_TKdcuID2keYWvNwEDBgwNyz7wa';
var scriptProp = PropertiesService.getScriptProperties();

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    // Log incoming parameters for debugging
    Logger.log('Received parameters:');
    Logger.log('fileName: ' + e.parameter.fileName);
    Logger.log('mimeType: ' + e.parameter.mimeType);
    Logger.log('fileSize: ' + e.parameter.fileSize);
    
    var doc = SpreadsheetApp.openById(scriptProp.getProperty("key"));
    var sheet = doc.getSheetByName(sheetName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;
    
    var newRow = headers.map(function(header) {
      return header === "timestamp" ? new Date() : e.parameter[header];
    });
    
    if (e.parameter.media && e.parameter.fileName) {
      try {
        // Determine mime type - use detected type or default to binary
        var mimeType = e.parameter.mimeType || 'application/octet-stream';
        
        // Handle empty mime type
        if (!mimeType || mimeType === '') {
          mimeType = getMimeTypeFromExtension(e.parameter.fileName) || 'application/octet-stream';
        }
        
        // Create blob with explicit mime type and filename
        var mediaBlob = Utilities.newBlob(
          Utilities.base64Decode(e.parameter.media),
          mimeType,
          e.parameter.fileName
        );
        
        // Log blob details
        Logger.log('Created blob:');
        Logger.log('Name: ' + mediaBlob.getName());
        Logger.log('Type: ' + mediaBlob.getContentType());
        Logger.log('Size: ' + mediaBlob.getBytes().length + ' bytes');
        
        // Save file to Drive
        var folder = DriveApp.getFolderById(uploadFolderID);
        var file = folder.createFile(mediaBlob);
        
        // Set the correct name (in case it got changed)
        file.setName(e.parameter.fileName);
        
        // Log created file details
        Logger.log('Created file:');
        Logger.log('ID: ' + file.getId());
        Logger.log('Name: ' + file.getName());
        Logger.log('Type: ' + file.getMimeType());
        Logger.log('Size: ' + file.getSize() + ' bytes');
        
        var fileUrl = file.getUrl();
        
        // Update the media column with file URL
        var mediaColumnIndex = headers.indexOf("media");
        if (mediaColumnIndex > -1) {
          newRow[mediaColumnIndex] = fileUrl;
        } else {
          newRow.push(fileUrl);
        }
        
        // Add file metadata to additional columns if they exist
        var fileNameColumnIndex = headers.indexOf("filename");
        if (fileNameColumnIndex > -1) {
          newRow[fileNameColumnIndex] = e.parameter.fileName;
        }
        
        var fileSizeColumnIndex = headers.indexOf("filesize");
        if (fileSizeColumnIndex > -1) {
          newRow[fileSizeColumnIndex] = e.parameter.fileSize;
        }
        
        var mimeTypeColumnIndex = headers.indexOf("mimetype");
        if (mimeTypeColumnIndex > -1) {
          newRow[mimeTypeColumnIndex] = mimeType;
        }
        
      } catch (fileError) {
        Logger.log('File processing error: ' + fileError.message);
        throw new Error('File processing failed: ' + fileError.message);
      }
    }
    
    // Write the new row
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        result: "success",
        row: nextRow,
        fileUrl: e.parameter.media ? fileUrl : null,
        debug: {
          fileName: e.parameter.fileName,
          mimeType: mimeType,
          fileSize: e.parameter.fileSize,
          logs: Logger.getLog()
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Main error: ' + error.message);
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
