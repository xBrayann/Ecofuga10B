# TODO: Clean Git History and Secure Firebase Credentials

- [x] Install git filter-repo tool
- [x] Run git filter-repo to remove BackEnd/firebase-credentials.json from history
- [x] Re-add origin remote (removed by filter-repo)
- [x] Create .gitignore file in root to ignore sensitive files and build directories
- [x] Commit the .gitignore file
- [x] Force push the cleaned history to origin main (blocked by GitHub secret scanning, user needs to unblock via provided URL)
- [x] Advise user to regenerate Firebase service account credentials
