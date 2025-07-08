import "../styles/carousel.css";
import { useRef } from "react";

const Carousel = ({ items = [], renderCard }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    const distance = 600;
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  return (
    <div className="carousel-wrapper">
      <button className="carousel-arrow" onClick={() => scroll("left")}>
        ←
      </button>

      <div className="carousel-track" ref={scrollRef}>
        {items.map((item, idx) => (
          <div className="carousel-item" key={idx}>
            {renderCard(item, idx)}
          </div>
        ))}
      </div>

      <button className="carousel-arrow" onClick={() => scroll("right")}>
        →
      </button>
    </div>
  );
};

export default Carousel;
