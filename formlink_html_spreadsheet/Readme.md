# Google Apps Script File Upload System

A smart file upload system using Google Apps Script that handles both single and multiple file uploads to Google Drive, with automatic spreadsheet logging and intelligent folder management.

## 🌟 Features

- **Smart File Organization**: Single files are stored directly in the main folder, multiple files get their own timestamped subfolder
- **Comprehensive Logging**: All uploads are tracked in a Google Spreadsheet with detailed metadata
- **Multiple File Type Support**: Supports documents, images, audio, video, archives, and code files
- **Direct File Access**: Single file uploads provide direct file URLs for easy access
- **Error Handling**: Robust error handling with detailed logging
- **Automatic MIME Type Detection**: Determines file types based on extensions

## 📋 Prerequisites

- Google Account with access to Google Drive and Google Sheets
- Basic understanding of Google Apps Script
- A web application or form to send POST requests to the script

## 🚀 Setup Instructions

### Step 1: Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder for file uploads
3. Right-click the folder → **Share** → **Get link** 
4. Copy the folder ID from the URL (the long string after `/folders/`)
   ```
   Example URL: https://drive.google.com/drive/folders/1D7ZRa_TKdcuID2keYWvNwEDBgwNyz7wa
   Folder ID: 1D7ZRa_TKdcuID2keYWvNwEDBgwNyz7wa
   ```

### Step 2: Create Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it something like "File Upload Log"
4. Keep it open for the next step

### Step 3: Set Up Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Click **New Project**
3. Replace the default code with the provided script
4. Update the `uploadFolderID` variable with your folder ID:
   ```javascript
   var uploadFolderID = 'YOUR_FOLDER_ID_HERE';
   ```

### Step 4: Configure Script Properties

1. In the Apps Script editor, click **Run** → **setup**
2. Grant necessary permissions when prompted
3. The script will automatically link to your active spreadsheet

### Step 5: Create Spreadsheet Headers

1. In the Apps Script editor, click **Run** → **createHeaders**
2. This will create the following columns in your spreadsheet:

| Column Name | Description | Example Value |
|-------------|-------------|---------------|
| `timestamp` | When the upload occurred | 2024-12-15 14:30:25 |
| `name` | Uploader's name | John Doe |
| `uploadMode` | Type of upload | form, api, manual |
| `folderName` | Folder where files are stored | John Doe_2024-12-15_14-30-25 |
| `folderUrl` | Link to the folder | https://drive.google.com/drive/folders/... |
| `fileCount` | Number of files uploaded | 3 |
| `files` | List of file names | document.pdf, image.jpg, data.xlsx |
| `fileUrls` | List of file URLs | https://drive.google.com/file/d/.../view, ... |
| `singleUrl` | Direct URL for single file uploads | https://drive.google.com/file/d/.../view |
| `totalSize` | Total size of uploaded files | 2.45 MB |

### Step 6: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Choose **Type**: Web App
3. Set **Execute as**: Me
4. Set **Who has access**: Anyone (or as per your requirements)
5. Click **Deploy**
6. Copy the Web App URL - this is your endpoint

## 📤 Usage

### Making POST Requests

Send POST requests to your Web App URL with the following parameters:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `name` | String | Yes | Uploader's name | "John Doe" |
| `uploadMode` | String | Yes | Type of upload | "form", "api", "manual" |
| `filesData` | JSON String | Yes | Array of file objects | See File Data Format below |

#### File Data Format:

Each file object in the `filesData` array should contain:

| Property | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `name` | String | Yes | Original filename | "document.pdf" |
| `data` | String | Yes | Base64 encoded file content | "JVBERi0xLjQKJcfs..." |
| `type` | String | Optional | MIME type | "application/pdf" |
| `size` | Number | Optional | File size in bytes | 1024000 |

### Example JavaScript Upload Function:

```javascript
async function uploadFiles(files, userName, uploadMode) {
  const filesData = [];
  
  for (let file of files) {
    const base64Data = await fileToBase64(file);
    filesData.push({
      name: file.name,
      data: base64Data,
      type: file.type,
      size: file.size
    });
  }
  
  const formData = new FormData();
  formData.append('name', userName);
  formData.append('uploadMode', uploadMode);
  formData.append('filesData', JSON.stringify(filesData));
  
  const response = await fetch('YOUR_WEB_APP_URL', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}
```

## 🗂️ File Organization

| Upload Type | Storage Location | Folder Structure | `singleUrl` Column | `folderUrl` Column |
|-------------|------------------|------------------|-------------------|-------------------|
| **Single File** | Main upload folder | No subfolder created | Direct file URL | Main folder URL |
| **Multiple Files** | Timestamped subfolder | `{name}_{YYYY-MM-DD_HH-mm-ss}` | Empty | Subfolder URL |

### Examples:

| Scenario | Files Uploaded | Folder Created | `singleUrl` Value |
|----------|----------------|----------------|------------------|
| 1 PDF file | `report.pdf` | None (main folder) | `https://drive.google.com/file/d/abc123/view` |
| 3 images | `photo1.jpg`, `photo2.jpg`, `photo3.jpg` | `John_2024-12-15_14-30-25` | Empty |

## 📊 Response Format

### Success Response:
```json
{
  "result": "success",
  "row": 5,
  "folderUrl": "https://drive.google.com/drive/folders/...",
  "folderId": "folder_id_here",
  "uploadedFiles": 2,
  "files": [
    {
      "name": "document.pdf",
      "url": "https://drive.google.com/file/d/.../view",
      "id": "file_id_here",
      "size": 1024000,
      "type": "application/pdf"
    }
  ],
  "isSingleFile": false,
  "singleFileUrl": null
}
```

### Error Response:
```json
{
  "result": "error",
  "error": "Error message here",
  "logs": "Detailed error logs"
}
```

## 🔧 Supported File Types

| Category | Extensions | MIME Type Examples |
|----------|------------|-------------------|
| **Documents** | PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, RTF | `application/pdf`, `application/msword` |
| **Images** | JPG, JPEG, PNG, GIF, BMP, WEBP, SVG, TIFF, ICO | `image/jpeg`, `image/png`, `image/gif` |
| **Audio** | MP3, WAV, OGG, AAC, FLAC, M4A | `audio/mpeg`, `audio/wav`, `audio/ogg` |
| **Video** | MP4, AVI, MOV, WMV, FLV, WEBM, MKV | `video/mp4`, `video/x-msvideo` |
| **Archives** | ZIP, RAR, 7Z, TAR, GZ | `application/zip`, `application/vnd.rar` |
| **Code Files** | HTML, CSS, JS, JSON, XML, CSV, PY, JAVA, CPP, C, PHP | `text/html`, `application/javascript` |
| **Mobile Apps** | APK, IPA | `application/vnd.android.package-archive` |
| **Executables** | EXE, DMG, DEB, RPM, MSI | `application/vnd.microsoft.portable-executable` |

## 🛠️ Customization

### Adding Custom Headers
Modify the `createHeaders()` function to add your own columns:

```javascript
var headers = [
  'timestamp',
  'name', 
  'uploadMode',
  'customField1',  // Add your custom fields
  'customField2',
  // ... existing headers
];
```

### Adding Custom Parameters
In the `doPost()` function, add cases for your custom parameters:

```javascript
case 'customfield1':
  return e.parameter.customField1 || '';
case 'customfield2':
  return e.parameter.customField2 || '';
```

## 🔒 Security Considerations

| Security Aspect | Recommendation | Impact |
|------------------|----------------|---------|
| **Access Control** | Set appropriate access levels for your Web App | Controls who can upload files |
| **File Size Limits** | Monitor Google Apps Script execution time limits | Prevents timeouts and failures |
| **Folder Permissions** | Ensure upload folder has correct sharing settings | Controls file access after upload |
| **Input Validation** | Add validation for file types and sizes | Prevents malicious uploads |
| **Rate Limiting** | Implement request throttling if needed | Prevents abuse and quota exhaustion |
| **Authentication** | Consider adding API keys or tokens | Adds layer of access control |

### Google Apps Script Limits:

| Limit Type | Free Account | Workspace Account |
|------------|--------------|-------------------|
| **Execution Time** | 6 minutes | 30 minutes |
| **Triggers per Day** | 20 | 20 |
| **Script Runtime** | 6 minutes | 30 minutes |
| **URL Fetch Size** | 50 MB | 50 MB |

## 🐛 Troubleshooting

### Common Issues:

| Issue | Cause | Solution |
|-------|--------|----------|
| **Permission Errors** | Script not authorized | Re-run the `setup()` function and grant permissions |
| **Folder Not Found** | Incorrect folder ID | Verify the `uploadFolderID` is correct in script |
| **Timeout Errors** | Large files or slow processing | Split large uploads or optimize file sizes |
| **MIME Type Issues** | Unknown file extension | Script falls back to `application/octet-stream` |
| **JSON Parse Error** | Malformed `filesData` parameter | Check JSON format and encoding |
| **Empty Response** | Script execution failed | Check Apps Script execution logs |

### Debug Information Sources:

| Debug Source | How to Access | What It Shows |
|--------------|---------------|---------------|
| **Execution Transcript** | Apps Script Editor → View → Execution transcript | Script execution details and errors |
| **Response Logs** | `logs` field in error responses | Runtime errors and Logger output |
| **Browser Console** | F12 → Console tab | Client-side JavaScript errors |
| **Network Tab** | F12 → Network tab | HTTP request/response details |

## 📝 License

This project is open source. Feel free to modify and distribute as needed.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review Google Apps Script documentation
3. Check Google Drive API limits and quotas
