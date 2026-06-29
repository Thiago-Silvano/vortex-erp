import { cn } from '@/lib/utils';

// Vermelho dos erros (#e53e3e) com !important para sobrepor border-input
export const ERR_CLASS = 'border-2 !border-[#e53e3e]';

export function errClass(error?: string, base?: string) {
  return cn(base, error && ERR_CLASS);
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p data-ds160-error className="text-[12px] text-[#e53e3e] mt-1">
      {msg}
    </p>
  );
}
