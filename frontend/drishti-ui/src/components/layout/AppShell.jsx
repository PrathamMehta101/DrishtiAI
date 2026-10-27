import Sidebar from './Sidebar';
import TopNav from './TopNav';
import BackgroundTaskBanner from './BackgroundTaskBanner';
import { Outlet } from 'react-router-dom';

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7F9]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto bg-[#F5F7F9]">
          <Outlet />
        </main>
      </div>
      <BackgroundTaskBanner />
    </div>
  );
}
