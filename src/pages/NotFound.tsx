import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import notFoundVideo from "@/assets/404-dara-robot.mp4";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)] w-full">
      <video 
        src={notFoundVideo} 
        className="max-w-[640px] max-h-full object-contain w-full"
        autoPlay
        muted
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default NotFound;
