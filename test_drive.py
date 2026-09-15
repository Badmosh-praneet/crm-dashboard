from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import os

SERVICE_ACCOUNT_FILE = 'nodal-operand-434003-p2-3769c8bfc8a7.json'
FOLDER_ID = '1SiOAdoLzju9thY_JEVZO1_rgzDB72K6W'
SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']

creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)
service = build('drive', 'v3', credentials=creds)

file_metadata = {
    'name': 'DSR August 2026.xlsx',
    'parents': [FOLDER_ID]
}
media = MediaFileUpload('DSR August 2026.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
print(f"Test file uploaded to Drive successfully! File ID: {file.get('id')}")
