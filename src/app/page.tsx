import Link from 'next/link';
import { getTodaySummary } from '@/lib/calendar';
import { TOTAL_MISHNAYOT, MISHNA_STRUCTURE, SEDARIM } from '@/lib/mishna-data';
import SubscribeForm from '@/components/SubscribeForm';
import HomeAnimations from '@/components/HomeAnimations';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const today = getTodaySummary();
  const totalTractates = MISHNA_STRUCTURE.length;
  const totalSedarim = SEDARIM.length;

  return (
    <div>
      <HomeAnimations
        today={today}
        totalMishnayot={TOTAL_MISHNAYOT}
        totalTractates={totalTractates}
        totalSedarim={totalSedarim}
        sedarim={SEDARIM}
      />
    </div>
  );
}
