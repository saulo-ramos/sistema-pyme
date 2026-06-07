import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function PaginationControls({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  if (totalItems === 0) return null;

  const from = Math.min((page - 1) * pageSize + 1, totalItems);
  const to   = Math.min(page * pageSize, totalItems);

  // Páginas visíveis: no máximo 7, centradas na página atual
  const visiblePages = (() => {
    const maxVisible = 7;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, page - half);
    const end   = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm text-gray-text">
      {/* Seletor de itens por página */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-text/70 whitespace-nowrap">Ítems por página:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger className="w-16 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info + navegación */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="text-xs">
          {from}–{to} de {totalItems}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-1 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Ant
            </Button>
            {visiblePages.map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                className={`text-xs h-7 min-w-[30px] px-2 ${p === page ? 'bg-navy text-white hover:bg-navy/90' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Sig
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook para gerenciar pageSize com persistência em localStorage.
 * Uso: const { pageSize, setPageSize } = usePageSize('clientes', 10);
 */
export function usePageSize(key: string, defaultSize = 10) {
  const storageKey = `pymes_pageSize_${key}`;
  const stored = typeof window !== 'undefined'
    ? Number(localStorage.getItem(storageKey) ?? defaultSize)
    : defaultSize;

  return {
    initialPageSize: PAGE_SIZE_OPTIONS.includes(stored) ? stored : defaultSize,
    persist: (size: number) => localStorage.setItem(storageKey, String(size)),
  };
}
