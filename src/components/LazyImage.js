import React, { useState, useEffect, useRef } from 'react';

const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {},
  placeholder = '/assets/img/placeholder.png',
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    let observer;
    const currentImg = imgRef.current;
    
    if (currentImg && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = new Image();
              img.src = src;
              img.onload = () => {
                setImageSrc(src);
                setImageLoaded(true);
              };
              img.onerror = () => {
                setImageLoaded(true);
              };
              if (observer && currentImg) {
                observer.unobserve(currentImg);
              }
            }
          });
        },
        {
          rootMargin: '50px',
        }
      );

      observer.observe(currentImg);
    } else {
      setImageSrc(src);
      setImageLoaded(true);
    }

    return () => {
      if (observer && currentImg) {
        observer.unobserve(currentImg);
      }
    };
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${imageLoaded ? 'loaded' : 'loading'}`}
      style={{
        ...style,
        opacity: imageLoaded ? 1 : 0,
        transition: 'opacity 0.6s ease-in-out',
      }}
      {...props}
    />
  );
};

export default LazyImage;
