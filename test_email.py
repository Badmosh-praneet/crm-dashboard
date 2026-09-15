import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL_USER = os.getenv('EMAIL_SYNC_USER')
EMAIL_PASS = os.getenv('EMAIL_SYNC_PASS')

msg = EmailMessage()
msg['Subject'] = 'Test DSR Upload'
msg['From'] = EMAIL_USER
msg['To'] = EMAIL_USER
msg.set_content('Here is the sample DSR for testing the email sync.')

with open('Sample DSR.xlsx', 'rb') as f:
    file_data = f.read()

msg.add_attachment(file_data, maintype='application', subtype='vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename='Sample DSR.xlsx')

with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
    smtp.login(EMAIL_USER, EMAIL_PASS)
    smtp.send_message(msg)

print("Test email sent successfully!")
