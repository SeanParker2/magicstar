import React, { useState, useRef, useEffect } from 'react';
import { Image } from '@tarojs/components';
import { createIntersectionObserver } from '@tarojs/taro';
import './index.css';

interface LazyImageProps {
  src: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  mode?:
    | 'scaleToFill'
    | 'aspectFit'
    | 'aspectFill'
    | 'widthFix'
    | 'heightFix'
    | 'top'
    | 'bottom'
    | 'center'
    | 'left'
    | 'right'
    | 'top left'
    | 'top right'
    | 'bottom left'
    | 'bottom right';
  lazyLoad?: boolean;
  fadeIn?: boolean;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  className = '',
  style,
  mode = 'aspectFit',
  lazyLoad = true,
  fadeIn = true,
  threshold = 0.1,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazyLoad);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<any>(null);

  useEffect(() => {
    if (!lazyLoad) return;

    // 创建交叉观察器
    observerRef.current = createIntersectionObserver(imageRef.current as any, {
      thresholds: [threshold],
      observeAll: true,
    });

    observerRef.current.observe('.lazy-image-container', res => {
      if (res.intersectionRatio > threshold) {
        setIsInView(true);
        observerRef.current?.disconnect();
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazyLoad, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
  };

  const imageClasses = [
    'lazy-image',
    className,
    isLoaded && fadeIn ? 'lazy-image--loaded' : '',
    hasError ? 'lazy-image--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={imageRef} className="lazy-image-container" style={style}>
      {isInView && (
        <Image
          src={hasError ? placeholder : isLoaded ? src : placeholder}
          className={imageClasses}
          mode={mode}
          onLoad={handleLoad}
          onError={handleError}
          lazyLoad={false} // 我们自己控制懒加载
        />
      )}

      {/* 预加载真实图片 */}
      {isInView && !isLoaded && !hasError && (
        <Image
          src={src}
          className="lazy-image-preload"
          onLoad={handleLoad}
          onError={handleError}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

export default LazyImage;
