/**
 * #region Particles 首页背景
 */

const DEFAULT_OPTIONS = {
    particleCount: 180,
    particleSpread: 0.9,
    speed: 0.16,
    particleColors: ['#ffffff', '#fbcfe8', '#93c5fd'],
    moveParticlesOnHover: true,
    particleHoverFactor: 18,
    alphaParticles: true,
    particleBaseSize: 2.4,
    sizeRandomness: 2.2,
    cameraDistance: 260,
    disableRotation: false
};

/**
 * 将十六进制颜色转为 RGB 数组。
 * @param {string} hex 十六进制颜色。
 * @returns {[number, number, number]} RGB 颜色。
 */
function hexToRgb(hex) {
    const normalizedHex = String(hex || '').replace(/^#/, '');
    const safeHex = normalizedHex.length === 3
        ? normalizedHex.split('').map(char => char + char).join('')
        : normalizedHex;
    const value = Number.parseInt(safeHex || 'ffffff', 16);

    return [
        (value >> 16) & 255,
        (value >> 8) & 255,
        value & 255
    ];
}

/**
 * 限制数值区间。
 * @param {number} value 当前值。
 * @param {number} min 最小值。
 * @param {number} max 最大值。
 * @returns {number} 裁剪后的值。
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * 粒子背景场景。
 */
class ParticlesScene {
    /**
     * @param {HTMLElement} container 背景容器。
     * @param {HTMLElement | null} interactionTarget 交互目标。
     * @param {object} overrides 自定义参数。
     */
    constructor(container, interactionTarget, overrides) {
        this.container = container;
        this.interactionTarget = interactionTarget || container;
        this.options = {
            ...DEFAULT_OPTIONS,
            ...(overrides || {})
        };

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'home-particles-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.context = this.canvas.getContext('2d');

        this.pointer = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            active: false
        };

        this.rotation = {
            x: 0,
            y: 0,
            z: 0
        };

        this.disposed = false;
        this.animationFrameId = 0;
        this.resizeObserver = null;
        this.lastTimestamp = 0;
        this.particles = [];

        this.handleResize = this.handleResize.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerLeave = this.handlePointerLeave.bind(this);
        this.animate = this.animate.bind(this);
    }

    /**
     * 初始化画布和粒子。
     */
    init() {
        this.container.appendChild(this.canvas);
        this.buildParticles();
        this.bindEvents();
        this.animate(performance.now());
    }

    /**
     * 绑定事件。
     */
    bindEvents() {
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(this.handleResize);
            this.resizeObserver.observe(this.container);
        } else {
            window.addEventListener('resize', this.handleResize);
        }

        if (this.options.moveParticlesOnHover) {
            this.interactionTarget.addEventListener('pointermove', this.handlePointerMove, { passive: true });
            this.interactionTarget.addEventListener('pointerleave', this.handlePointerLeave, { passive: true });
        }
    }

    /**
     * 构建粒子数据。
     */
    buildParticles() {
        const rect = this.container.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const palette = this.options.particleColors.map(hexToRgb);

        this.canvas.width = width * devicePixelRatio;
        this.canvas.height = height * devicePixelRatio;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

        this.particles = [];

        for (let index = 0; index < this.options.particleCount; index += 1) {
            const angleA = Math.random() * Math.PI * 2;
            const angleB = Math.random() * Math.PI * 2;
            const radius = Math.pow(Math.random(), 0.72) * this.options.particleSpread;
            const color = palette[Math.floor(Math.random() * palette.length)];

            this.particles.push({
                x: Math.cos(angleA) * Math.sin(angleB) * radius,
                y: Math.sin(angleA) * Math.sin(angleB) * radius,
                z: Math.cos(angleB) * radius,
                seed: Math.random() * Math.PI * 2,
                drift: 0.4 + Math.random() * 1.4,
                size: this.options.particleBaseSize + Math.random() * this.options.sizeRandomness,
                color
            });
        }
    }

    /**
     * 处理指针移动。
     * @param {PointerEvent} event 指针事件。
     */
    handlePointerMove(event) {
        const rect = this.container.getBoundingClientRect();
        const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const normalizedY = -((((event.clientY - rect.top) / rect.height) * 2) - 1);

        this.pointer.active = true;
        this.pointer.targetX = normalizedX;
        this.pointer.targetY = normalizedY;
    }

    /**
     * 指针离开后缓慢回中。
     */
    handlePointerLeave() {
        this.pointer.active = false;
        this.pointer.targetX = 0;
        this.pointer.targetY = 0;
    }

    /**
     * 尺寸变化时重建粒子布局。
     */
    handleResize() {
        this.buildParticles();
    }

    /**
     * 绘制一帧粒子。
     * @param {number} timestamp 当前时间戳。
     */
    animate(timestamp) {
        if (this.disposed) {
            return;
        }

        const rect = this.container.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const centerX = width / 2;
        const centerY = height / 2;
        const delta = this.lastTimestamp ? timestamp - this.lastTimestamp : 16;
        const time = timestamp * 0.001 * this.options.speed;

        this.lastTimestamp = timestamp;
        this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.06;
        this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.06;

        if (!this.options.disableRotation) {
            this.rotation.x += 0.00006 * delta;
            this.rotation.y += 0.00009 * delta;
            this.rotation.z += 0.00004 * delta;
        }

        this.context.clearRect(0, 0, width, height);

        const depthSortedParticles = this.particles.map(particle => {
            const waveX = particle.x + Math.sin(time * particle.drift + particle.seed) * 0.08;
            const waveY = particle.y + Math.cos(time * (particle.drift * 1.2) + particle.seed) * 0.08;
            const waveZ = particle.z + Math.sin(time * (particle.drift * 0.8) + particle.seed) * 0.12;

            let rotatedX = waveX;
            let rotatedY = waveY;
            let rotatedZ = waveZ;

            const cosY = Math.cos(this.rotation.y);
            const sinY = Math.sin(this.rotation.y);
            const nextX = rotatedX * cosY - rotatedZ * sinY;
            const nextZ = rotatedX * sinY + rotatedZ * cosY;
            rotatedX = nextX;
            rotatedZ = nextZ;

            const cosX = Math.cos(this.rotation.x);
            const sinX = Math.sin(this.rotation.x);
            const nextY = rotatedY * cosX - rotatedZ * sinX;
            const rotatedDepth = rotatedY * sinX + rotatedZ * cosX;
            rotatedY = nextY;
            rotatedZ = rotatedDepth;

            const cosZ = Math.cos(this.rotation.z);
            const sinZ = Math.sin(this.rotation.z);
            const finalX = rotatedX * cosZ - rotatedY * sinZ;
            const finalY = rotatedX * sinZ + rotatedY * cosZ;

            return {
                particle,
                x: finalX,
                y: finalY,
                z: rotatedZ
            };
        }).sort((left, right) => left.z - right.z);

        for (let index = 0; index < depthSortedParticles.length; index += 1) {
            const item = depthSortedParticles[index];
            const perspective = this.options.cameraDistance / (this.options.cameraDistance - item.z * 120);
            const hoverOffsetX = this.pointer.x * this.options.particleHoverFactor;
            const hoverOffsetY = -this.pointer.y * this.options.particleHoverFactor;
            const drawX = centerX + item.x * width * 0.34 * perspective + hoverOffsetX;
            const drawY = centerY + item.y * height * 0.34 * perspective + hoverOffsetY;
            const radius = item.particle.size * perspective;
            const alphaBase = this.options.alphaParticles ? clamp(0.18 + perspective * 0.28, 0.12, 0.75) : 1;
            const color = item.particle.color;

            const gradient = this.context.createRadialGradient(drawX, drawY, 0, drawX, drawY, radius * 4.2);
            gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alphaBase})`);
            gradient.addColorStop(0.35, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alphaBase * 0.46})`);
            gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

            this.context.beginPath();
            this.context.fillStyle = gradient;
            this.context.arc(drawX, drawY, radius * 4.2, 0, Math.PI * 2);
            this.context.fill();

            this.context.beginPath();
            this.context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.min(alphaBase + 0.18, 1)})`;
            this.context.arc(drawX, drawY, Math.max(0.8, radius), 0, Math.PI * 2);
            this.context.fill();
        }

        this.animationFrameId = window.requestAnimationFrame(this.animate);
    }

    /**
     * 销毁粒子背景。
     */
    dispose() {
        this.disposed = true;
        window.cancelAnimationFrame(this.animationFrameId);

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        } else {
            window.removeEventListener('resize', this.handleResize);
        }

        if (this.options.moveParticlesOnHover) {
            this.interactionTarget.removeEventListener('pointermove', this.handlePointerMove);
            this.interactionTarget.removeEventListener('pointerleave', this.handlePointerLeave);
        }

        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

/**
 * 创建首页粒子背景。
 * @param {HTMLElement} container 背景容器。
 * @param {HTMLElement | null} interactionTarget 交互目标。
 * @param {object} overrides 覆盖参数。
 * @returns {ParticlesScene | null} 场景实例。
 */
export function createParticlesBackground(container, interactionTarget, overrides = {}) {
    if (!container) {
        return null;
    }

    const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (reducedMotionMedia.matches) {
        return null;
    }

    try {
        const scene = new ParticlesScene(container, interactionTarget, overrides);
        scene.init();
        return scene;
    } catch (error) {
        console.error('Particles 背景初始化失败：', error);
        return null;
    }
}

/**
 * #endregion
 */
