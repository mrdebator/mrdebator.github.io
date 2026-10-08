import type { Metadata } from 'next';
import { MapleTreeVisualizer } from '@/components/labs/maple-tree-visualizer/maple-tree-visualizer';

export const metadata: Metadata = {
  title: 'Maple Tree Visualizer | Ansh Chandnani',
  description: 'Interactive Linux Kernel Maple Tree data structure and virtual memory visualizer',
};

export default function MapleTreePage() {
  return (
    <div className="w-full h-screen pt-16 md:pt-20 flex flex-col bg-transparent overflow-hidden">
      <MapleTreeVisualizer />
    </div>
  );
}
