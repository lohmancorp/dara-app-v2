import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import notFoundImage from "@/assets/404-dara-robot.png";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] w-full gap-6">
      <h1 className="text-2xl font-semibold text-center px-4">
        Oops! We cannot find what you are looking for.
      </h1>
      <img 
        src={notFoundImage} 
        alt="404 - Page not found" 
        className="max-w-[1024px] max-h-full object-contain w-full"
      />
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Go Back
      </Button>
    </div>
  );
};

export default NotFound;
