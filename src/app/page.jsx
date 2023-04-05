import Axis from '@/components/axis';
import SmileFace from '@/components/smile-face';

export default function Home() {
  return (
    <main className="flex flex-col items-center p-24 min-h-screen">
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <Axis height={300} width={300} />
      <SmileFace />
    </main>
  );
}
