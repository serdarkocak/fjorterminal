import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/binance': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        rewrite: (path) => {
          // Handle exchangeInfo endpoint
          if (path.includes('/exchangeInfo')) {
            return path.replace(/^\/api\/binance/, '/api/v3');
          }
          // Handle other endpoints (ticker, etc.)
          return path.replace(/^\/api\/binance/, '/api/v3');
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Binance API proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Binance API Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Binance API Response:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/api/rss/coindesk': {
        target: 'https://www.coindesk.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rss\/coindesk/, '/arc/outboundfeeds/rss'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('CoinDesk RSS proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('CoinDesk RSS Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('CoinDesk RSS Response:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/api/rss/coinkolik': {
        target: 'https://www.coinkolik.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rss\/coinkolik/, '/feed/'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('CoinKolik RSS proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('CoinKolik RSS Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('CoinKolik RSS Response:', proxyRes.statusCode, req.url);
          });
        },
      },
              '/api/rss/uzmancoin': {
                target: 'https://uzmancoin.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/rss\/uzmancoin/, '/feed/'),
                configure: (proxy, _options) => {
                  proxy.on('error', (err, _req, _res) => {
                    console.log('UzmanCoin RSS proxy error', err);
                  });
                  proxy.on('proxyReq', (proxyReq, req, _res) => {
                    console.log('UzmanCoin RSS Request:', req.method, req.url);
                  });
                  proxy.on('proxyRes', (proxyRes, req, _res) => {
                    console.log('UzmanCoin RSS Response:', proxyRes.statusCode, req.url);
                  });
                },
              },
              '/api/rss/cointelegraph': {
                target: 'https://cointelegraph.com/rss',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/rss\/cointelegraph/, '/rss'),
                configure: (proxy, _options) => {
                  proxy.on('error', (err, _req, _res) => {
                    console.log('Cointelegraph RSS proxy error', err);
                  });
                  proxy.on('proxyReq', (proxyReq, req, _res) => {
                    console.log('Cointelegraph RSS Request:', req.method, req.url);
                  });
                  proxy.on('proxyRes', (proxyRes, req, _res) => {
                    console.log('Cointelegraph RSS Response:', proxyRes.statusCode, req.url);
                  });
                },
              },
              '/api/coingecko': {
                target: 'https://api.coingecko.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/coingecko/, '/api/v3'),
                configure: (proxy, _options) => {
                  proxy.on('error', (err, _req, _res) => {
                    console.log('CoinGecko API proxy error', err);
                  });
                  proxy.on('proxyReq', (proxyReq, req, _res) => {
                    console.log('CoinGecko API Request:', req.method, req.url);
                  });
                  proxy.on('proxyRes', (proxyRes, req, _res) => {
                    console.log('CoinGecko API Response:', proxyRes.statusCode, req.url);
                  });
                },
              },
              '/api/binance/account': {
                target: 'https://api.binance.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/binance\/account/, '/api/v3/account'),
                configure: (proxy, _options) => {
                  proxy.on('error', (err, _req, _res) => {
                    console.log('Binance Account API proxy error', err);
                  });
                  proxy.on('proxyReq', (proxyReq, req, _res) => {
                    console.log('Binance Account API Request:', req.method, req.url);
                  });
                  proxy.on('proxyRes', (proxyRes, req, _res) => {
                    console.log('Binance Account API Response:', proxyRes.statusCode, req.url);
                  });
                },
              },
              '/api/binance/wallet': {
                target: 'https://api.binance.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/binance\/wallet/, '/api/v3/account'),
                configure: (proxy, _options) => {
                  proxy.on('error', (err, _req, _res) => {
                    console.log('Binance Wallet API proxy error', err);
                  });
                  proxy.on('proxyReq', (proxyReq, req, _res) => {
                    console.log('Binance Wallet API Request:', req.method, req.url);
                  });
                  proxy.on('proxyRes', (proxyRes, req, _res) => {
                    console.log('Binance Wallet API Response:', proxyRes.statusCode, req.url);
                  });
                },
              },
              '/api/deepl': {
                target: 'https://api-free.deepl.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/deepl/, '/v2'),
                configure: (proxy, _options) => {
                  proxy.on('error', (err, _req, _res) => {
                    console.log('DeepL API proxy error', err);
                  });
                  proxy.on('proxyReq', (proxyReq, req, _res) => {
                    console.log('DeepL API Request:', req.method, req.url);
                  });
                  proxy.on('proxyRes', (proxyRes, req, _res) => {
                    console.log('DeepL API Response:', proxyRes.statusCode, req.url);
                  });
                },
              },
    }
  }
})
