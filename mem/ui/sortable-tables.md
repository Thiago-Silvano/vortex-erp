---
name: Sortable table headers pattern
description: Padrão obrigatório de ordenação por clique nos cabeçalhos de TODAS as tabelas listas
type: design
---
Todas as listas/tabelas do sistema devem suportar ordenação clicando no cabeçalho da coluna.

Infraestrutura:
- `SortableTableHead` em `src/components/ui/table.tsx` (props: sortKey, sortState, onSort)
- `useTableSort(data, accessors, options)` em `src/hooks/useTableSort.ts` retorna `{ sortedData, sortState, requestSort }`

Uso:
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { useTableSort } from '@/hooks/useTableSort';

const { sortedData, sortState, requestSort } = useTableSort(filtered, {
  name: (r) => r.name,
  date: (r) => r.date,
}, { initialKey: 'name', initialDirection: 'asc' });

<SortableTableHead sortKey="name" sortState={sortState} onSort={requestSort}>Nome</SortableTableHead>
```

Manter `TableHead` para colunas não ordenáveis (ex: "Ações").
