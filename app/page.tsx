import { Sidebar } from "@/components/sidebar";
import { ImageGenerator } from "@/components/image-generator";

export default function Home() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full">
        {/* Desktop: Add left padding for sidebar */}
        {/* Mobile: Add bottom padding for nav bar */}
        <div className="flex-1 relative w-full h-full pl-0 md:pl-28 pb-20 md:pb-0">
          <ImageGenerator />
        </div>
      </main>
    </div>
  );
}
