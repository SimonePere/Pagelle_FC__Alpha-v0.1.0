@echo off
echo 🧹 Pulizia file temporanei di import...

del bulk-data.json 2>nul
del check-db.js 2>nul  
del check-participants.js 2>nul
del fix-participants.js 2>nul
del fix-voteresults.js 2>nul

echo ✅ File temporanei rimossi
echo 📚 Documentazione e script core mantenuti:
echo   - BULK_IMPORT_GUIDE.md
echo   - bulk-insert.js  
echo   - cleanup-bulk.js
pause