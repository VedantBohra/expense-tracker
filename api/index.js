import app from '../server/index.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function withApiPrefix(url = '/') {
  const [pathAndQuery, ...rest] = url.split('?');
  const query = rest.length ? `?${rest.join('?')}` : '';
  const path = pathAndQuery || '/';
  if (path === '/api' || path.startsWith('/api/')) return url;
  if (path === '/') return `/api${query}`;
  return `/api${path}${query}`;
}

export default function handler(req, res) {
  req.url = withApiPrefix(req.url);
  if (typeof req.originalUrl === 'string') {
    req.originalUrl = withApiPrefix(req.originalUrl);
  }
  return app(req, res);
}
