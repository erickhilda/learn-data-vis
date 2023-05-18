import ScatterTaskEstimation from '@/components/chart/scatter-task-estimation';
import ScatterVoronoi from '@/components/chart/scatter-voronoi';
import TaskEstimationChart from '@/components/chart/task-estimation-chart';

export default function Home() {
  return (
    <main className="flex flex-col items-center p-24 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-4">
        <TaskEstimationChart />

        <ScatterTaskEstimation />
      </div>
      <div>
        <ScatterVoronoi />
      </div>
    </main>
  );
}
