'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Stripe can send the customer here a moment before its webhook has told us the money arrived. While
 * the trip still reads unpaid, ask the server for a fresh copy every 3 seconds (up to 2 minutes) so
 * the receipt simply appears. No payment data is handled here.
 */
export function RefreshWhilePending() {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= 40) return;
    const t = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, 3000);
    return () => clearTimeout(t);
  }, [tries, router]);

  return tries >= 40 ? (
    <p style={{ margin: '14px 0 0', fontSize: 14, color: '#6B6455', lineHeight: 1.55 }}>
      This is taking longer than usual. Your receipt will also arrive by email. Questions? Call (704) 941-8508.
    </p>
  ) : null;
}

export function SaveReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print"
      style={{
        background: '#C8A253',
        color: '#1B1A17',
        border: 0,
        borderRadius: 10,
        padding: '12px 20px',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      Save or print this receipt
    </button>
  );
}
