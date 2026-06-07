/**
 * Escapa caracteres especiais do PostgreSQL LIKE/ILIKE
 * para evitar manipulação de wildcards pelo usuário.
 */
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
