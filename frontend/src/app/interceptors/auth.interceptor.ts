import { HttpInterceptorFn } from '@angular/common/http';

function getXsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;)\s*XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let cloned = req.clone({ withCredentials: true });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const token = getXsrfToken();
    if (token) {
      cloned = cloned.clone({ headers: cloned.headers.set('X-XSRF-TOKEN', token) });
    }
  }

  return next(cloned);
};
