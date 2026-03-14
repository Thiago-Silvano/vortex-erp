// Simple OFX parser for bank statement files
export interface OFXTransaction {
  type: 'credit' | 'debit';
  datePosted: string;
  amount: number;
  fitId: string;
  name: string;
  memo?: string;
  refNum?: string;
}

export interface OFXData {
  bankId: string;
  accountId: string;
  accountType: string;
  startDate: string;
  endDate: string;
  balanceStart?: number;
  balanceEnd?: number;
  transactions: OFXTransaction[];
}

function getTagValue(content: string, tag: string): string {
  // Handle both <TAG>value and <TAG>value</TAG>
  const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function parseOFXDate(dateStr: string): string {
  // OFX dates: YYYYMMDDHHMMSS or YYYYMMDD
  if (!dateStr) return '';
  const clean = dateStr.replace(/\[.*\]/, '').trim();
  const y = clean.substring(0, 4);
  const m = clean.substring(4, 6);
  const d = clean.substring(6, 8);
  if (!y || !m || !d) return '';
  return `${y}-${m}-${d}`;
}

export function parseOFX(content: string): OFXData {
  const result: OFXData = {
    bankId: '',
    accountId: '',
    accountType: '',
    startDate: '',
    endDate: '',
    transactions: [],
  };

  // Bank info
  result.bankId = getTagValue(content, 'BANKID');
  result.accountId = getTagValue(content, 'ACCTID');
  const acctType = getTagValue(content, 'ACCTTYPE');
  result.accountType = acctType.toLowerCase().includes('saving') ? 'poupanca' : 'corrente';

  // Date range
  const dtStart = getTagValue(content, 'DTSTART');
  const dtEnd = getTagValue(content, 'DTEND');
  result.startDate = parseOFXDate(dtStart);
  result.endDate = parseOFXDate(dtEnd);

  // Balance
  const balAmtMatch = content.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\n]+)/i);
  if (balAmtMatch) {
    result.balanceEnd = parseFloat(balAmtMatch[1].trim().replace(',', '.'));
  }

  // Transactions
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1];
    const trnType = getTagValue(block, 'TRNTYPE').toUpperCase();
    const amount = parseFloat(getTagValue(block, 'TRNAMT').replace(',', '.') || '0');
    const dtPosted = getTagValue(block, 'DTPOSTED');
    const fitId = getTagValue(block, 'FITID');
    const name = getTagValue(block, 'NAME') || getTagValue(block, 'MEMO');
    const memo = getTagValue(block, 'MEMO');
    const refNum = getTagValue(block, 'REFNUM') || getTagValue(block, 'CHECKNUM');

    result.transactions.push({
      type: amount >= 0 ? 'credit' : 'debit',
      datePosted: parseOFXDate(dtPosted),
      amount,
      fitId,
      name: name || memo || 'Sem descrição',
      memo: memo !== name ? memo : undefined,
      refNum,
    });
  }

  // If no STMTTRN closing tags, try SGML style
  if (result.transactions.length === 0) {
    const sgmlBlocks = content.split(/<STMTTRN>/i).slice(1);
    for (const block of sgmlBlocks) {
      const endIdx = block.search(/<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>/i);
      const segment = endIdx > 0 ? block.substring(0, endIdx) : block;
      
      const amount = parseFloat(getTagValue(segment, 'TRNAMT').replace(',', '.') || '0');
      const dtPosted = getTagValue(segment, 'DTPOSTED');
      const fitId = getTagValue(segment, 'FITID');
      const name = getTagValue(segment, 'NAME') || getTagValue(segment, 'MEMO');
      const memo = getTagValue(segment, 'MEMO');
      const refNum = getTagValue(segment, 'REFNUM') || getTagValue(segment, 'CHECKNUM');

      if (dtPosted || amount) {
        result.transactions.push({
          type: amount >= 0 ? 'credit' : 'debit',
          datePosted: parseOFXDate(dtPosted),
          amount,
          fitId,
          name: name || memo || 'Sem descrição',
          memo: memo !== name ? memo : undefined,
          refNum,
        });
      }
    }
  }

  return result;
}

export function generateTransactionHash(accountId: string, fitId: string, date: string, amount: number): string {
  const raw = `${accountId}|${fitId}|${date}|${amount}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + '_' + fitId;
}
