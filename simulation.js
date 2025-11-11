class AirPurifierSimulation {
    constructor() {
        this.isRunning = false;
        this.speed = 2;
        this.particles = [];
        this.filteredCounts = {
            pre: 0,
            hepa: 0,
            carbon: 0,
            uv: 0
        };
        this.totalParticles = 0;
        this.cleanParticles = 0;
        this.processedParticles = 0; // Track particles that completed the process
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.speed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = this.speed + 'x';
        });
        // Set default speed display
        document.getElementById('speedSlider').value = this.speed;
        document.getElementById('speedValue').textContent = this.speed + 'x';
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        document.getElementById('startBtn').textContent = 'Running...';
        document.getElementById('startBtn').disabled = true;
        
        // Activate UV light
        document.getElementById('uvLight').classList.add('active');
        
        this.generateParticles();
        this.animate();
    }

    reset() {
        this.isRunning = false;
        this.particles = [];
        this.filteredCounts = { pre: 0, hepa: 0, carbon: 0, uv: 0 };
        this.totalParticles = 0;
        this.cleanParticles = 0;
        this.processedParticles = 0;
        
        // Clear all particle containers
        ['inputParticles', 'preFilterParticles', 'hepaFilterParticles', 
         'carbonFilterParticles', 'uvFilterParticles', 'outputParticles'].forEach(id => {
            document.getElementById(id).innerHTML = '';
        });
        
        // Clear filtered particles
        ['preFiltered', 'hepaFiltered', 'carbonFiltered', 'uvFiltered'].forEach(id => {
            document.getElementById(id).innerHTML = '';
        });
        
        // Reset counters
        document.getElementById('preCaptured').textContent = '0';
        document.getElementById('hepaCaptured').textContent = '0';
        document.getElementById('carbonCaptured').textContent = '0';
        document.getElementById('uvCaptured').textContent = '0';
        document.getElementById('qualityValue').textContent = '0%';
        document.getElementById('qualityFill').style.width = '0%';
        
        // Deactivate UV light
        document.getElementById('uvLight').classList.remove('active');
        
        document.getElementById('startBtn').textContent = 'Start Simulation';
        document.getElementById('startBtn').disabled = false;
    }

    generateParticles() {
        const particleTypes = [
            { type: 'dust', class: 'dust', probability: 0.3 },
            { type: 'pm25', class: 'pm25', probability: 0.25 },
            { type: 'bacteria', class: 'bacteria', probability: 0.25 },
            { type: 'voc', class: 'voc', probability: 0.2 }
        ];

        // Generate particles continuously - faster generation
        setInterval(() => {
            if (!this.isRunning) return;
            
            const rand = Math.random();
            let cumulative = 0;
            let selectedType = null;
            
            for (const pType of particleTypes) {
                cumulative += pType.probability;
                if (rand <= cumulative) {
                    selectedType = pType;
                    break;
                }
            }
            
            if (selectedType) {
                this.createParticle(selectedType.type, selectedType.class);
            }
        }, 100 / this.speed); // Faster particle generation
    }

    createParticle(type, className) {
        const inputContainer = document.getElementById('inputParticles');
        const containerRect = inputContainer.getBoundingClientRect();
        
        const particle = {
            type: type,
            className: className,
            element: document.createElement('div'),
            x: containerRect.width / 2,
            y: Math.random() * containerRect.height,
            vx: 2 + Math.random() * 3, // Faster horizontal movement
            vy: (Math.random() - 0.5) * 2,
            stage: 'input',
            filtered: false,
            id: Date.now() + Math.random(),
            uvExposure: 0 // Track UV exposure time
        };
        
        particle.element.className = `particle ${className}`;
        particle.element.style.left = particle.x + 'px';
        particle.element.style.top = particle.y + 'px';
        
        inputContainer.appendChild(particle.element);
        this.particles.push(particle);
        this.totalParticles++;
    }

    animate() {
        if (!this.isRunning) return;
        
        const containers = {
            input: document.getElementById('inputParticles'),
            pre: document.getElementById('preFilterParticles'),
            hepa: document.getElementById('hepaFilterParticles'),
            carbon: document.getElementById('carbonFilterParticles'),
            uv: document.getElementById('uvFilterParticles'),
            output: document.getElementById('outputParticles')
        };
        
        this.particles.forEach((particle, index) => {
            if (particle.filtered) return;
            
            // Move particle
            particle.x += particle.vx * this.speed;
            particle.y += particle.vy * this.speed;
            
            // Get current container
            const currentContainer = containers[particle.stage];
            const containerRect = currentContainer.getBoundingClientRect();
            
            // Check boundaries and move to next stage
            if (particle.stage === 'input') {
                if (particle.x > containerRect.width) {
                    this.moveToStage(particle, 'pre', containers);
                }
            } else if (particle.stage === 'pre') {
                // Pre-filter catches large particles (dust) - less aggressive
                if (particle.type === 'dust' && Math.random() < 0.7) {
                    this.filterParticle(particle, 'pre', containers);
                    return;
                }
                if (particle.x > containerRect.width) {
                    this.moveToStage(particle, 'hepa', containers);
                }
            } else if (particle.stage === 'hepa') {
                // HEPA catches PM2.5 and some bacteria - less aggressive to let more reach UV
                if ((particle.type === 'pm25' && Math.random() < 0.75) || 
                    (particle.type === 'bacteria' && Math.random() < 0.1)) {
                    this.filterParticle(particle, 'hepa', containers);
                    return;
                }
                if (particle.x > containerRect.width) {
                    this.moveToStage(particle, 'carbon', containers);
                }
            } else if (particle.stage === 'carbon') {
                // Carbon catches VOCs and odors - less aggressive
                if (particle.type === 'voc' && Math.random() < 0.7) {
                    this.filterParticle(particle, 'carbon', containers);
                    return;
                }
                if (particle.x > containerRect.width) {
                    this.moveToStage(particle, 'uv', containers);
                }
            } else if (particle.stage === 'uv') {
                // Track UV exposure time
                if (particle.uvExposure === undefined) {
                    particle.uvExposure = 0;
                }
                particle.uvExposure++;
                
                // Slow down particles in UV stage to ensure exposure
                particle.vx = Math.max(1, particle.vx * 0.9);
                
                // UV neutralizes bacteria and microorganisms - VERY aggressive
                // Check EVERY frame - UV is extremely effective against bacteria
                if (particle.type === 'bacteria') {
                    // Bacteria are very susceptible to UV - catch almost immediately
                    // First frame: 95% chance, subsequent frames: 99% chance
                    // This ensures almost all bacteria are caught
                    const catchChance = particle.uvExposure === 1 ? 0.95 : 0.99;
                    if (Math.random() < catchChance) {
                        this.filterParticle(particle, 'uv', containers);
                        return;
                    }
                }
                // UV also neutralizes other particles that made it through
                // Check other particle types with good probability
                if (particle.type === 'pm25' || particle.type === 'voc' || particle.type === 'dust') {
                    // Higher base chance that increases with exposure time
                    // Start at 30%, increase to 70% after several frames
                    const baseChance = 0.3;
                    const exposureBonus = Math.min(0.4, particle.uvExposure * 0.08);
                    const catchChance = Math.min(0.7, baseChance + exposureBonus);
                    if (Math.random() < catchChance) {
                        this.filterParticle(particle, 'uv', containers);
                        return;
                    }
                }
                if (particle.x > containerRect.width) {
                    this.moveToStage(particle, 'output', containers);
                    // Convert to clean air particle
                    particle.element.className = 'particle clean';
                    particle.type = 'clean';
                    this.cleanParticles++;
                    this.updateAirQuality();
                }
            } else if (particle.stage === 'output') {
                // Clean particles flow out
                if (particle.x > containerRect.width + 50) {
                    particle.element.remove();
                    this.particles.splice(index, 1);
                    // cleanParticles already incremented when entering output
                    this.updateAirQuality();
                    return;
                }
            }
            
            // Update position
            particle.element.style.left = particle.x + 'px';
            particle.element.style.top = particle.y + 'px';
            
            // Keep particles within vertical bounds
            if (particle.y < 0 || particle.y > containerRect.height) {
                particle.vy *= -1;
            }
        });
        
        requestAnimationFrame(() => this.animate());
    }

    moveToStage(particle, newStage, containers) {
        const oldContainer = containers[particle.stage];
        const newContainer = containers[newStage];
        
        oldContainer.removeChild(particle.element);
        newContainer.appendChild(particle.element);
        
        particle.stage = newStage;
        particle.x = 0;
        particle.y = Math.random() * newContainer.getBoundingClientRect().height;
        // Slower movement in UV stage to ensure exposure
        if (newStage === 'uv') {
            particle.vx = 1 + Math.random() * 1.5; // Slower in UV
            particle.uvExposure = 0;
        } else {
            particle.vx = 2 + Math.random() * 3; // Faster movement through other filters
        }
    }

    filterParticle(particle, filterType, containers) {
        particle.filtered = true;
        this.filteredCounts[filterType]++;
        
        // Remove from current container
        const currentContainer = containers[particle.stage];
        currentContainer.removeChild(particle.element);
        
        // Add to filtered particles display
        const filteredContainer = document.getElementById(filterType + 'Filtered');
        const filteredParticle = particle.element.cloneNode(true);
        filteredParticle.style.position = 'relative';
        filteredParticle.style.left = 'auto';
        filteredParticle.style.top = 'auto';
        filteredContainer.appendChild(filteredParticle);
        
        // Limit displayed filtered particles
        const filteredParticles = filteredContainer.children;
        if (filteredParticles.length > 20) {
            filteredContainer.removeChild(filteredParticles[0]);
        }
        
        // Update counter
        const counterMap = {
            pre: 'preCaptured',
            hepa: 'hepaCaptured',
            carbon: 'carbonCaptured',
            uv: 'uvCaptured'
        };
        document.getElementById(counterMap[filterType]).textContent = this.filteredCounts[filterType];
        
        // Remove from particles array
        const index = this.particles.indexOf(particle);
        if (index > -1) {
            this.particles.splice(index, 1);
        }
        
        // Update air quality when particles are filtered
        this.updateAirQuality();
    }

    updateAirQuality() {
        // Air quality represents how clean the output air is
        // Quality = (clean particles / (clean particles + filtered particles)) * 100
        // Higher quality means more particles are being filtered out
        
        const totalProcessed = this.cleanParticles + 
            this.filteredCounts.pre + 
            this.filteredCounts.hepa + 
            this.filteredCounts.carbon + 
            this.filteredCounts.uv;
        
        if (totalProcessed === 0) {
            // If no particles processed yet, show 0%
            document.getElementById('qualityValue').textContent = '0%';
            document.getElementById('qualityFill').style.width = '0%';
            return;
        }
        
        // Calculate quality: percentage of particles that were successfully filtered
        // This means: (filtered / total) * 100
        // Higher filtered count = better air quality
        const filteredTotal = this.filteredCounts.pre + 
            this.filteredCounts.hepa + 
            this.filteredCounts.carbon + 
            this.filteredCounts.uv;
        
        const quality = Math.min(100, Math.round((filteredTotal / totalProcessed) * 100));
        document.getElementById('qualityValue').textContent = quality + '%';
        document.getElementById('qualityFill').style.width = quality + '%';
    }
}

// Initialize simulation when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AirPurifierSimulation();
});

