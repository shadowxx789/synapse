import { supabaseAuthService } from '@/services/supabaseAuthService';

export type { AuthError, AuthUser } from '@/services/supabaseAuthService';

export const authService = supabaseAuthService;
export default authService;
