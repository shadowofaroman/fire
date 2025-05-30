// Import necessary THREE.js components
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js"
        // Global campfire object for controls
        let campfire;

        class CampfireSystem {
            constructor(scene) {
                this.scene = scene;
                this.fireParticles = [];
                this.smokeParticles = [];
                this.isActive = true;
                this.intensity = 1.0;
                this.time = 0;
                
                this.init();
            }

            init() {
                this.createLogs();
                this.createFireParticles();
                this.createSmokeParticles();
                this.createLighting();
                this.createGround();
            }

            createLogs() {
                this.logGroup = new THREE.Group();
                
                // Create wood texture using procedural approach
                const woodTexture = this.createWoodTexture();
                const logMaterial = new THREE.MeshLambertMaterial({ 
                    map: woodTexture,
                    color: 0x8B4513
                });

                // Create several logs arranged in a realistic pattern
                const logs = [
                    { length: 2, radius: 0.15, position: [0, 0.1, 0], rotation: [0, 0, 0] },
                    { length: 1.8, radius: 0.12, position: [0.3, 0.12, 0.2], rotation: [0, Math.PI/4, 0.1] },
                    { length: 1.9, radius: 0.14, position: [-0.2, 0.1, -0.3], rotation: [0, -Math.PI/6, -0.05] },
                    { length: 1.6, radius: 0.11, position: [0.1, 0.25, 0.1], rotation: [0, Math.PI/3, 0.2] },
                ];

                logs.forEach(logData => {
                    const geometry = new THREE.CylinderGeometry(
                        logData.radius, logData.radius, logData.length, 12, 1
                    );
                    
                    const log = new THREE.Mesh(geometry, logMaterial);
                    log.position.set(...logData.position);
                    log.rotation.set(...logData.rotation);
                    log.castShadow = true;
                    log.receiveShadow = true;
                    
                    this.logGroup.add(log);
                });

                this.scene.add(this.logGroup);
            }

            createWoodTexture() {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                
                // Create wood grain pattern
                const gradient = ctx.createLinearGradient(0, 0, 0, 256);
                gradient.addColorStop(0, '#D2B48C');
                gradient.addColorStop(0.3, '#8B4513');
                gradient.addColorStop(0.7, '#A0522D');
                gradient.addColorStop(1, '#654321');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 256, 256);
                
                // Add wood grain lines
                ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 20; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, i * 12 + Math.sin(i) * 5);
                    ctx.lineTo(256, i * 12 + Math.sin(i + 1) * 5);
                    ctx.stroke();
                }
                
                return new THREE.CanvasTexture(canvas);
            }

            createFireParticles() {
                this.fireGroup = new THREE.Group();
                
                // Create fire particle geometry
                const particleCount = 150;
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(particleCount * 3);
                const colors = new Float32Array(particleCount * 3);
                const sizes = new Float32Array(particleCount);
                const velocities = new Float32Array(particleCount * 3);
                const lifetimes = new Float32Array(particleCount);
                
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    
                    // Initial positions in a circle around the fire base
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * 0.3;
                    positions[i3] = Math.cos(angle) * radius;
                    positions[i3 + 1] = Math.random() * 0.2;
                    positions[i3 + 2] = Math.sin(angle) * radius;
                    
                    // Velocities - upward with some randomness
                    velocities[i3] = (Math.random() - 0.5) * 0.5;
                    velocities[i3 + 1] = 1 + Math.random() * 0.5;
                    velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
                    
                    // Colors - fire gradient
                    const fireColor = this.getFireColor();
                    colors[i3] = fireColor.r;
                    colors[i3 + 1] = fireColor.g;
                    colors[i3 + 2] = fireColor.b;
                    
                    sizes[i] = Math.random() * 0.1 + 0.05;
                    lifetimes[i] = Math.random() * 2 + 1;
                }
                
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
                
                // Custom fire shader material
                const material = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 },
                        intensity: { value: 1.0 }
                    },
                    vertexShader: `
                        attribute float size;
                        attribute vec3 aColor; // Changed attribute name here
                        varying vec3 vColor;
                        uniform float time;
                        uniform float intensity;
                        
                        void main() {
                            vColor = aColor; // Use the new attribute name here
                            vec3 pos = position;
                            
                            // Add flickering motion
                            pos.x += sin(time * 3.0 + position.y * 5.0) * 0.1 * intensity;
                            pos.z += cos(time * 2.5 + position.y * 4.0) * 0.1 * intensity;
                            
                            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                            gl_Position = projectionMatrix * mvPosition;
                            gl_PointSize = size * (300.0 / -mvPosition.z) * intensity;
                        }
                    `,
                    fragmentShader: `
                        varying vec3 vColor;
                        uniform float intensity;
                        
                        void main() {
                            vec2 center = gl_PointCoord - 0.5;
                            float dist = length(center);
                            
                            if (dist > 0.5) discard;
                            
                            float alpha = (1.0 - dist * 2.0) * intensity;
                            gl_FragColor = vec4(vColor, alpha);
                        }
                    `,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    transparent: true,
                    vertexColors: true
                });
                
                this.fireParticleSystem = new THREE.Points(geometry, material);
                this.fireGroup.add(this.fireParticleSystem);
                
                // Store particle data for animation
                this.fireParticleData = {
                    positions,
                    velocities,
                    lifetimes,
                    colors,
                    originalLifetimes: lifetimes.slice()
                };
                
                this.scene.add(this.fireGroup);
            }

            createSmokeParticles() {
                const particleCount = 100;
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(particleCount * 3);
                const colors = new Float32Array(particleCount * 3);
                const sizes = new Float32Array(particleCount);
                const velocities = new Float32Array(particleCount * 3);
                
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    
                    positions[i3] = (Math.random() - 0.5) * 0.2;
                    positions[i3 + 1] = Math.random() * 3 + 1;
                    positions[i3 + 2] = (Math.random() - 0.5) * 0.2;
                    
                    velocities[i3] = (Math.random() - 0.5) * 0.3;
                    velocities[i3 + 1] = 0.5 + Math.random() * 0.3;
                    velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;
                    
                    const gray = 0.3 + Math.random() * 0.3;
                    colors[i3] = gray;
                    colors[i3 + 1] = gray;
                    colors[i3 + 2] = gray;
                    
                    sizes[i] = Math.random() * 0.3 + 0.1;
                }
                
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
                
                const smokeMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 }
                    },
                    vertexShader: `
                        attribute float size;
                        varying float vSize;
                        uniform float time;
                        
                        void main() {
                            vSize = size;
                            vec3 pos = position;
                            
                            // Add swirling motion to smoke
                            pos.x += sin(time * 0.5 + position.y * 0.5) * 0.3;
                            pos.z += cos(time * 0.7 + position.y * 0.3) * 0.3;
                            
                            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                            gl_Position = projectionMatrix * mvPosition;
                            gl_PointSize = size * (200.0 / -mvPosition.z);
                        }
                    `,
                    fragmentShader: `
                        varying float vSize;
                        
                        void main() {
                            vec2 center = gl_PointCoord - 0.5;
                            float dist = length(center);
                            
                            if (dist > 0.5) discard;
                            
                            float alpha = (1.0 - dist * 2.0) * 0.1;
                            gl_FragColor = vec4(0.5, 0.5, 0.5, alpha);
                        }
                    `,
                    blending: THREE.NormalBlending,
                    depthWrite: false,
                    transparent: true
                });
                
                this.smokeParticleSystem = new THREE.Points(geometry, smokeMaterial);
                this.smokeParticleData = {
                    positions,
                    velocities
                };
                
                this.scene.add(this.smokeParticleSystem);
            }

            createLighting() {
                // Main fire light
                this.fireLight = new THREE.PointLight(0xff4500, 2, 10);
                this.fireLight.position.set(0, 1, 0);
                this.fireLight.castShadow = true;
                this.fireLight.shadow.mapSize.width = 1024;
                this.fireLight.shadow.mapSize.height = 1024;
                this.scene.add(this.fireLight);
                
                // Ambient light for overall scene
                const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
                this.scene.add(ambientLight);
                
                // Moonlight
                const moonLight = new THREE.DirectionalLight(0x9999ff, 0.5);
                moonLight.position.set(5, 10, 5);
                moonLight.castShadow = true;
                this.scene.add(moonLight);
            }

            createGround() {
                const groundGeometry = new THREE.PlaneGeometry(20, 20);
                const groundMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0x333333,
                    transparent: true,
                    opacity: 0.8
                });
                
                const ground = new THREE.Mesh(groundGeometry, groundMaterial);
                ground.rotation.x = -Math.PI / 2;
                ground.receiveShadow = true;
                this.scene.add(ground);
            }

            getFireColor() {
                const colors = [
                    { r: 1.0, g: 0.2, b: 0.0 },  // Red
                    { r: 1.0, g: 0.5, b: 0.0 },  // Orange
                    { r: 1.0, g: 0.8, b: 0.0 },  // Yellow
                    { r: 1.0, g: 1.0, b: 0.2 }   // Bright yellow
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }

            update(deltaTime) {
                this.time += deltaTime;
                
                if (!this.isActive) return;
                
                this.updateFireParticles(deltaTime);
                this.updateSmokeParticles(deltaTime);
                this.updateLighting();
                this.updateShaderUniforms();
            }

            updateFireParticles(deltaTime) {
                const { positions, velocities, lifetimes, colors, originalLifetimes } = this.fireParticleData;
                
                for (let i = 0; i < positions.length / 3; i++) {
                    const i3 = i * 3;
                    
                    // Update lifetime
                    lifetimes[i] -= deltaTime;
                    
                    if (lifetimes[i] <= 0) {
                        // Reset particle
                        const angle = Math.random() * Math.PI * 2;
                        const radius = Math.random() * 0.3;
                        positions[i3] = Math.cos(angle) * radius;
                        positions[i3 + 1] = 0.1;
                        positions[i3 + 2] = Math.sin(angle) * radius;
                        
                        velocities[i3] = (Math.random() - 0.5) * 0.5;
                        velocities[i3 + 1] = 1 + Math.random() * 0.5;
                        velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
                        
                        lifetimes[i] = originalLifetimes[i];
                        
                        const fireColor = this.getFireColor();
                        colors[i3] = fireColor.r;
                        colors[i3 + 1] = fireColor.g;
                        colors[i3 + 2] = fireColor.b;
                    } else {
                        // Update position
                        positions[i3] += velocities[i3] * deltaTime * this.intensity;
                        positions[i3 + 1] += velocities[i3 + 1] * deltaTime * this.intensity;
                        positions[i3 + 2] += velocities[i3 + 2] * deltaTime * this.intensity;
                        
                        // Add turbulence
                        positions[i3] += Math.sin(this.time * 3 + i) * 0.01;
                        positions[i3 + 2] += Math.cos(this.time * 2.5 + i) * 0.01;
                        
                        // Fade color as particle ages
                        const ageRatio = 1 - (lifetimes[i] / originalLifetimes[i]);
                        colors[i3 + 1] *= (1 - ageRatio * 0.3); // Reduce green
                        colors[i3 + 2] *= (1 - ageRatio * 0.8); // Reduce blue
                    }
                }
                
                this.fireParticleSystem.geometry.attributes.position.needsUpdate = true;
                this.fireParticleSystem.geometry.attributes.color.needsUpdate = true;
            }

            updateSmokeParticles(deltaTime) {
                const { positions, velocities } = this.smokeParticleData;
                
                for (let i = 0; i < positions.length / 3; i++) {
                    const i3 = i * 3;
                    
                    positions[i3] += velocities[i3] * deltaTime;
                    positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
                    positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
                    
                    // Reset if too high
                    if (positions[i3 + 1] > 6) {
                        positions[i3] = (Math.random() - 0.5) * 0.2;
                        positions[i3 + 1] = 1;
                        positions[i3 + 2] = (Math.random() - 0.5) * 0.2;
                    }
                }
                
                this.smokeParticleSystem.geometry.attributes.position.needsUpdate = true;
            }

            updateLighting() {
                // Flickering fire light
                const flicker = 0.8 + Math.sin(this.time * 8) * 0.1 + Math.sin(this.time * 13) * 0.05;
                this.fireLight.intensity = 2 * flicker * this.intensity;
                
                // Slight position variation
                this.fireLight.position.y = 1 + Math.sin(this.time * 5) * 0.1;
            }

            updateShaderUniforms() {
                if (this.fireParticleSystem.material.uniforms) {
                    this.fireParticleSystem.material.uniforms.time.value = this.time;
                    this.fireParticleSystem.material.uniforms.intensity.value = this.intensity;
                }
                
                if (this.smokeParticleSystem.material.uniforms) {
                    this.smokeParticleSystem.material.uniforms.time.value = this.time;
                }
            }

            toggleFire() {
                this.isActive = !this.isActive;
                this.fireGroup.visible = this.isActive;
                this.smokeParticleSystem.visible = this.isActive;
                this.fireLight.visible = this.isActive;
            }

            adjustIntensity() {
                this.intensity = this.intensity === 1.0 ? 0.3 : 1.0;
            }
        }

        // Scene setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x000000, 5, 15);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(3, 2, 3);
        camera.lookAt(0, 1, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x000011);
        document.body.appendChild(renderer.domElement);

        // Simple orbit controls
        let mouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        let targetRotationX = 0;
        let targetRotationY = 0;
        let cameraDistance = 5;

        renderer.domElement.addEventListener('mousedown', (e) => {
            mouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        renderer.domElement.addEventListener('mousemove', (e) => {
            if (!mouseDown) return;
            
            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;
            
            targetRotationY += deltaX * 0.01;
            targetRotationX += deltaY * 0.01;
            targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, targetRotationX));
            
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        renderer.domElement.addEventListener('mouseup', () => {
            mouseDown = false;
        });

        renderer.domElement.addEventListener('wheel', (e) => {
            cameraDistance += e.deltaY * 0.01;
            cameraDistance = Math.max(2, Math.min(10, cameraDistance));
        });

        // Initialize campfire
        campfire = new CampfireSystem(scene);

        // Animation loop
        const clock = new THREE.Clock();
        
        function animate() {
            requestAnimationFrame(animate);
            
            const deltaTime = clock.getDelta();
            
            // Update camera position
            camera.position.x = Math.sin(targetRotationY) * Math.cos(targetRotationX) * cameraDistance;
            camera.position.y = Math.sin(targetRotationX) * cameraDistance + 1;
            camera.position.z = Math.cos(targetRotationY) * Math.cos(targetRotationX) * cameraDistance;
            camera.lookAt(0, 1, 0);
            
            // Update campfire
            campfire.update(deltaTime);
            
            renderer.render(scene, camera);
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();
 