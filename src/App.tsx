import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Outlet } from "react-router-dom";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col overflow-x-hidden w-full relative">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default App;
