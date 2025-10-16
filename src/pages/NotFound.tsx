import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import notFoundImage from "@/assets/404-dara-robot.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)] w-full">
      <img 
        src={notFoundImage} 
        alt="404 - Page not found" 
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
};

export default NotFound;
