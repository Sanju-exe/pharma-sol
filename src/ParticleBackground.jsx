import { useEffect, useRef } from "react";

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener("resize", handleResize);

    // Realistic Dust Particle with Depth Parallax & Fluid Wave Motion
    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        
        // Depth Layer: 0.3 (deep background) to 1.2 (foreground)
        this.depth = Math.random() * 0.9 + 0.3;
        this.mass = this.depth * 1.5;

        // Micro drift velocities proportional to depth
        this.baseVx = (Math.random() - 0.5) * 0.25 * this.depth;
        this.baseVy = (Math.random() - 0.5) * 0.25 * this.depth;
        this.vx = this.baseVx;
        this.vy = this.baseVy;

        // Wave phase for fluid Brownian float motion
        this.wavePhase = Math.random() * Math.PI * 2;
        this.waveSpeed = 0.01 + Math.random() * 0.015;
        this.waveAmp = 0.3 * this.depth;

        this.radius = (Math.random() * 1.8 + 0.8) * this.depth; // 0.8px to 3px
        this.baseAlpha = (Math.random() * 0.3 + 0.1) * this.depth;
        this.alpha = this.baseAlpha;
        
        // Premium Theme Colors (Violet, Cyan, Soft Pink)
        const randColor = Math.random();
        if (randColor > 0.5) {
          this.rgb = '167, 139, 250'; // Violet
        } else if (randColor > 0.2) {
          this.rgb = '56, 189, 248';  // Cyan
        } else {
          this.rgb = '244, 114, 182'; // Soft Pink
        }
      }

      update() {
        // Fluid sine-wave micro-oscillation (Brownian floating dust physics)
        this.wavePhase += this.waveSpeed;
        const waveX = Math.cos(this.wavePhase) * this.waveAmp;
        const waveY = Math.sin(this.wavePhase) * this.waveAmp;

        // Relax opacity back to calm baseline
        this.alpha += (this.baseAlpha - this.alpha) * 0.05;

        // Fluid friction & smooth return to natural base drift
        this.vx += (this.baseVx - this.vx) * 0.035;
        this.vy += (this.baseVy - this.vy) * 0.035;

        // Position update
        this.x += this.vx + waveX * 0.2;
        this.y += this.vy + waveY * 0.2;

        // Boundary wrap-around for endless seamless float
        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        if (this.y > height + 20) this.y = -20;
      }

      draw() {
        // Soft glowing radial mote render for realistic lighting
        ctx.beginPath();
        const glowRadius = this.radius * 2.2;
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, glowRadius
        );
        gradient.addColorStop(0, `rgba(${this.rgb}, ${this.alpha})`);
        gradient.addColorStop(0.5, `rgba(${this.rgb}, ${this.alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(${this.rgb}, 0)`);

        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let particles = [];
    const initParticles = () => {
      // Density-based responsive count
      const particleCount = Math.min(Math.floor((width * height) / 12000), 85);
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
      // Sort by depth so background particles render behind foreground ones
      particles.sort((a, b) => a.depth - b.depth);
    };

    initParticles();

    // Render loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Render Particles and faint ambient connection webs
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Connect nearby particles in the same depth plane for realistic spatial network
        for (let j = i + 1; j < particles.length; j++) {
          const depthDiff = Math.abs(particles[i].depth - particles[j].depth);
          if (depthDiff > 0.35) continue; // Only connect particles near the same Z-depth layer

          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            const lineAlpha = (1 - dist / 90) * 0.12 * particles[i].depth;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${particles[i].rgb}, ${lineAlpha})`;
            ctx.lineWidth = 0.6 * particles[i].depth;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  );
}
