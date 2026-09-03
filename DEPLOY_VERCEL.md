# 🚀 Deploy to Vercel

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Matros777/quantumterminal)

## Manual Deploy

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
cd quantumterminal
vercel

# 4. For production
vercel --prod
```

## Environment Variables

### Required
| Variable | Description | Get it at |
|----------|-------------|-----------|
| `MONGODB_URI` | MongoDB connection string | [MongoDB Atlas](https://mongodb.com/atlas) |
| `MONGODB_DB` | Database name | Create in Atlas |

### Optional (for full features)
| Variable | Description | Get it at |
|----------|-------------|-----------|
| `COINGECKO_API_KEY` | Market data | [CoinGecko API](https://www.coingecko.com/api) |
| `GROQ_API_KEY` | AI features | [Groq Console](https://console.groq.com) |
| `SESSION_SECRET` | Auth sessions | Generate: `openssl rand -base64 32` |

### Set in Vercel Dashboard
1. Go to **Project Settings** → **Environment Variables**
2. Add each variable
3. Redeploy

## Project Structure

```
quantumterminal/
├── app/
│   ├── api/              # API routes (serverless)
│   │   ├── coin-prices/  # Market data
│   │   ├── auth/         # Authentication
│   │   ├── layer1/       # L1 terminal API
│   │   └── ...
│   ├── components/       # React components
│   └── page.tsx          # Main page
├── lib/                  # Utilities
├── public/               # Static assets
└── vercel.json           # Vercel config
```

## API Routes

All API routes are serverless functions optimized for Vercel Edge:

| Route | Description | Cache |
|-------|-------------|-------|
| `/api/coin-prices` | Real-time prices | 30s |
| `/api/global-market` | Market overview | 60s |
| `/api/news` | Latest news | 5min |
| `/api/fear-greed` | Sentiment index | 1h |
| `/api/bitcoin-stats` | BTC data | 60s |

## Performance

- ⚡ Edge Runtime ready
- 🖼️ Image optimization via Vercel
- 📦 Serverless functions
- 🌐 Global CDN
- 🔄 Auto-scaling

## Troubleshooting

### Build fails
```bash
npm install
npm run build
```

### MongoDB connection error
- Check `MONGODB_URI` format
- Whitelist Vercel IPs in Atlas (or use 0.0.0.0/0)

### API rate limits
- CoinGecko: Free tier has limits
- Consider upgrading to paid plan

## Support

Open an issue at: https://github.com/Matros777/quantumterminal/issues
