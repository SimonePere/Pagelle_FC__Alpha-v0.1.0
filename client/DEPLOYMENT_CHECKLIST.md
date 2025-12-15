# 🚀 FOOTBALL LEDGER - DEPLOYMENT CHECKLIST

## 📋 PRE-DEPLOYMENT TASKS

### ✅ Environment Setup
- [ ] `.env.example` created with all variables
- [ ] `.gitignore` updated for production
- [ ] Database config with PROD/TEST switch
- [ ] Health check endpoint implemented

### ✅ MongoDB Atlas
- [ ] **Pagelle-FC-prod** database ready
- [ ] **Pagelle-FC-test** database for development  
- [ ] Network access configured for Render
- [ ] Database users with proper permissions

### ✅ Repository Structure
```
football-ledger/
├── client/                 # Frontend (React + Vite)
├── server/                 # Backend (Express + MongoDB)
├── .env.example           # Environment template
├── .gitignore            # Git exclusions
├── vercel.json          # Vercel config
├── render.yaml          # Render config  
└── README.md           # Documentation
```

## 🔐 ENVIRONMENT VARIABLES

### For Render (Server)
```bash
NODE_ENV=production
APP_ENV=prod
PORT=10000
MONGODB_URI_PROD=mongodb+srv://...
JWT_SECRET=your-super-secret-production-key
CLIENT_URL_PROD=https://your-app.vercel.app
```

### For Vercel (Client)
```bash
VITE_API_URL=https://your-api.onrender.com
VITE_APP_ENV=prod
VITE_APP_VERSION=0.1.0
```

## 📱 DEPLOYMENT STEPS

### 1. 🔗 GitHub Setup
```bash
# Create new private repository
gh repo create football-ledger --private

# Structure folders
mkdir client server
mv src/ public/ index.html package.json client/
# Move backend files to server/
```

### 2. 🌐 Vercel Deploy (Client)
- Connect GitHub repository
- Set build command: `npm run build`
- Set output directory: `dist`
- Add environment variables
- Enable automatic deployments from `main` branch

### 3. ⚙️ Render Deploy (Server)  
- Connect GitHub repository  
- Set build command: `npm install`
- Set start command: `npm start`
- Add environment variables
- Configure health check: `/api/health`

## 🔍 POST-DEPLOYMENT VERIFICATION

### Health Checks
- [ ] `https://your-api.onrender.com/api/health` returns 200
- [ ] `https://your-api.onrender.com/api/ping` returns pong
- [ ] Database connection shows "Pagelle-FC-prod"

### Functionality Tests
- [ ] User login/registration works
- [ ] Match creation works  
- [ ] Voting system works
- [ ] Player cards work
- [ ] API calls from client to server work

### Performance
- [ ] Client loads under 3 seconds
- [ ] API responses under 2 seconds  
- [ ] No console errors
- [ ] Mobile responsive

## 🚨 ROLLBACK PLAN

### If deployment fails:
1. Check Render logs for server issues
2. Check Vercel logs for client issues  
3. Verify environment variables
4. Test health endpoint
5. Switch APP_ENV=test to use test database

## 📞 SUPPORT RESOURCES

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs  
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Health Check**: `/api/health`

---

**🎯 Ready for deployment when all checkboxes are ✅**