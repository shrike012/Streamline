import { useEffect, useState } from "react";

function useLoadingDots(baseText = "Loading", interval = 500) {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setDots((prev) => (prev >= 3 ? 1 : prev + 1));
    }, interval);
    return () => clearInterval(id);
  }, [interval]);

  return `${baseText}${".".repeat(dots)}`;
}

export default useLoadingDots;
