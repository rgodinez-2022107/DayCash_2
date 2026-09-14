import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guardián de rutas: protege las vistas privadas de la aplicación
 * financiera. Si no existe un JWT válido, redirige al login guardando
 * la URL intentada para volver a ella después de iniciar sesión.
 */
export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};