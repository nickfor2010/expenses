import { useEffect, useRef } from 'react';

const BackgroundAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();

    const isSmallScreen = window.innerWidth < 600;
    const numDots = isSmallScreen ? 25 : 50;
    const dotRadius = 5;
    const colors = ['#6B8E23', '#66CDAA', '#20B2AA', '#4682B4', '#5F9EA0'];
    const connectionThreshold = isSmallScreen ? 75 : 100;

    const dots: any[] = [];

    const createDots = () => {
      for (let i = 0; i < numDots; i++) {
        const randomSize = dotRadius * (1 + (Math.random() * 0.6 - 0.3));
        dots.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          dx: (Math.random() - 0.5) * (isSmallScreen ? 2 : 4),
          dy: (Math.random() - 0.5) * (isSmallScreen ? 2 : 4),
          radius: randomSize,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const drawDots = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${dot.color}BF`;
        ctx.fill();
        ctx.closePath();
      }
      drawConnections();
    };

    const drawConnections = () => {
      if (!ctx) return;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dot1 = dots[i];
          const dot2 = dots[j];
          const distance = Math.hypot(dot1.x - dot2.x, dot1.y - dot2.y);
          if (distance < connectionThreshold) {
            ctx.beginPath();
            ctx.moveTo(dot1.x, dot1.y);
            ctx.lineTo(dot2.x, dot2.y);
            ctx.strokeStyle = `${dot1.color}BF`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
          }
        }
      }
    };

    const updateDots = () => {
      for (const dot of dots) {
        dot.x += dot.dx;
        dot.y += dot.dy;

        if (dot.x + dot.radius > canvas.width || dot.x - dot.radius < 0) {
          dot.dx = -dot.dx;
        }
        if (dot.y + dot.radius > canvas.height || dot.y - dot.radius < 0) {
          dot.dy = -dot.dy;
        }
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      requestAnimationFrame(animate);
      drawDots();
      updateDots();
    };

    createDots();
    animate();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} id="animationCanvas"></canvas>;
};

export default BackgroundAnimation;
