import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js"

class fire{
    constructor() {
     this.renderer = new THREE.WebGLRenderer({ 
          canvas: document.getElementById('webgl'), 
          antialias: true,
          logarithmicDepthBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 8000);
        this.camera.position.set(0, 5, 5)
        this.camera.lookAt(0, 0, 0);

        this.scene = new FireScene(this);

        this.animate();
    }

    animate() {
       requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene.scene, this.camera);
        this.scene.update();
    }
}

class FireScene {
    constructor(fireInstance) {
        console.log("FireScene constructor called");

        this.camera = fireInstance.camera;
        this.renderer = fireInstance.renderer;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
        this.controls.target.set(0, 0, 0);
        this.controls.minPolarAngle = 0; // up (zenith)
        this.controls.maxPolarAngle = Math.PI / 2.5;

        this.scene = new THREE.Scene();

        this.createLights();
        this.createGround();
        this.createLogs();
        this.createFireparticles();
        this.createFireTexture();

        const listener = new THREE.AudioListener();
        this.camera.add(listener);

        const sound = new THREE.Audio(listener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('sounds/fire_crack.mp3', (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(0.5);
             setTimeout(() => {
            const resumeAudio = () => {
        if (listener.context.state === 'suspended') {
            listener.context.resume();
        }
        sound.play();
        window.removeEventListener('click', resumeAudio);
    };
    window.addEventListener('click', resumeAudio);
            }, 3000); // 3000 ms = 3 seconds delay
        });
        this.scene.add(sound);
    }

    createLights() {
        this.fireLight = new THREE.PointLight(0xff4500, 2, 10);
        this.fireLight.position.set(0, 1, 0);
        this.fireLight.castShadow = true;
        this.fireLight.shadow.mapSize.width = 1024;
        this.fireLight.shadow.mapSize.height = 1024;
        this.scene.add(this.fireLight);
                
        // Ambient light for overall scene
        const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
        this.scene.add(ambientLight);
                
        // Moonlight
        const moonLight = new THREE.DirectionalLight(0x9999ff, 0.5);
        moonLight.position.set(5, 10, 5);
        moonLight.castShadow = true;
        this.scene.add(moonLight);

        this.helicopterLight = new THREE.SpotLight(0xffffff, 3, 50, Math.PI / 8, 0.3, 2);
        this.helicopterLight.position.set(0, 5, 0); // High up, angled down
        this.helicopterLight.target.position.set(0, 0, 0); // Pointing at fire
        this.helicopterLight.castShadow = true;
        this.helicopterLight.shadow.mapSize.width = 2048;
        this.helicopterLight.shadow.mapSize.height = 2048;
        this.helicopterLight.intensity = 10;

        this.scene.add(this.helicopterLight);
        this.scene.add(this.helicopterLight.target);
    }

    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(40, 40);
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

    createLogs() {
        console.log("Creating logs");
         this.logGroup = new THREE.Group();
                
                // Create wood texture using procedural approach
                const woodTexture = this.createWoodTexture();
                const logMaterial = new THREE.MeshLambertMaterial({ 
                    map: woodTexture,
                    color: 0x8B4513
                });

                // Create several logs arranged in a realistic pattern

                    const logs = [
                        // Log 1: Larger, lying flat
                        { length: 0.6, radius: 0.07, position: [0, 0.07, 0], rotation: [Math.PI / 2, 0, Math.PI / 8] },
                    
                        // Log 2: Smaller, angled across the first
                        //{ length: 0.4, radius: 0.05, position: [0.1, 0.15, 0.1], rotation: [Math.PI / 2, Math.PI / 4, -Math.PI / 8] },
                    
                        // Log 3: Another smaller log, opposite angle
                        { length: 0.5, radius: 0.06, position: [-0.1, 0.1, -0.1], rotation: [Math.PI / 2, -Math.PI / 6, Math.PI / 12] },
                    
                        // Log 4: Supporting log at the back
                        { length: 0.3, radius: 0.04, position: [-0.2, 0.05, 0.1], rotation: [Math.PI / 2, Math.PI / 3, 0] },
                    
                        // Log 5: Smaller log in the middle
                       // { length: 0.25, radius: 0.03, position: [0.15, 0.2, -0.05], rotation: [Math.PI / 2, -Math.PI / 4, Math.PI / 60] }
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
        console.log("Creating wood texture");
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

    createFireparticles() {
                               // Create fire particle system
                const fireCount = 300;
                const fireGeometry = new THREE.BufferGeometry();
                const firePositions = new Float32Array(fireCount * 3);
                const fireColors = new Float32Array(fireCount * 3);
                const fireSizes = new Float32Array(fireCount);
                const fireVelocities = [];
                const fireLifetimes = [];
                
                for (let i = 0; i < fireCount; i++) {
                    // Initial positions near the base of the fire
                    firePositions[i * 3] = (Math.random() - 0.5) * 0.5;
                    firePositions[i * 3 + 1] = 0.02;
                    firePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
                    
                    // Fire colors (orange to yellow to red)
                    const colorChoice = Math.random();
                    if (colorChoice < 0.4) {
                        // Orange
                        fireColors[i * 3] = 1.0;     // r
                        fireColors[i * 3 + 1] = 0.4; // g
                        fireColors[i * 3 + 2] = 0.0; // b
                    } else if (colorChoice < 0.7) {
                        // Yellow-orange
                        fireColors[i * 3] = 1.0;     // r
                        fireColors[i * 3 + 1] = 0.7; // g
                        fireColors[i * 3 + 2] = 0.0; // b
                    } else {
                        // Red
                        fireColors[i * 3] = 1.0;     // r
                        fireColors[i * 3 + 1] = 0.2; // g
                        fireColors[i * 3 + 2] = 0.0; // b
                    }
                    
                    fireSizes[i] = Math.random() * 0.1 + 0.5;
                    
                    // Velocity (upward with some randomness)
                    fireVelocities.push({
                        x: (Math.random() - 0.5) * 0.02,
                        y: Math.random() * 0.08 + 0.04, 
                       z: (Math.random() - 0.5) * 0.02
                    });
                    
                    fireLifetimes.push(Math.random() * 200 + 200);
                }
                
                fireGeometry.setAttribute('position', new THREE.BufferAttribute(firePositions, 3));
                fireGeometry.setAttribute('color', new THREE.BufferAttribute(fireColors, 3));
                fireGeometry.setAttribute('size', new THREE.BufferAttribute(fireSizes, 1));
                
                // Create fire particle material
                const fireTexture = this.createFireTexture();
                const fireMaterial = new THREE.PointsMaterial({
                    map: fireTexture,
                    size: 0.3,
                    sizeAttenuation: true,
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                
                this.fireParticleSystem = new THREE.Points(fireGeometry, fireMaterial);
                this.scene.add(this.fireParticleSystem);
                
                this.fireVelocities = fireVelocities;
                this.fireLifetimes = fireLifetimes;
                this.fireMaxLifetimes = [...fireLifetimes];
    }

    createFireTexture() {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                
                const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.2, 'rgba(255, 200, 50, 1)');
                gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)');
                gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 64, 64);
                
                return new THREE.CanvasTexture(canvas);
            }


    update() {
        this.controls.update();

         if (this.fireParticleSystem) {
        const positions = this.fireParticleSystem.geometry.attributes.position.array;
        for (let i = 0; i < this.fireVelocities.length; i++) {
            // Move particle
            positions[i * 3]     += this.fireVelocities[i].x * 0.05;
            positions[i * 3 + 1] += this.fireVelocities[i].y * 0.05;
            positions[i * 3 + 2] += this.fireVelocities[i].z * 0.05;

            // Reduce lifetime
            this.fireLifetimes[i]--;

            // If particle is too high or lifetime expired, respawn at base
            if (positions[i * 3 + 1] > 2.5 || this.fireLifetimes[i] <= 0) {
                positions[i * 3]     = (Math.random() - 0.5) * 0.5;
                positions[i * 3 + 1] = 0.02;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

                this.fireVelocities[i].x = (Math.random() - 0.5) * 0.02;
                this.fireVelocities[i].y = Math.random() * 0.08 + 0.04;
                this.fireVelocities[i].z = (Math.random() - 0.5) * 0.02;

                this.fireLifetimes[i] = Math.random() * 200 + 200;
            }
        }
        this.fireParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    if (this.fireSound && this.fireSound.isPlaying) {
    this.fireSound.setVolume(0.6 + Math.random() * 0.4); // Flicker volume a bit
    }

    if (this.helicopterLight) {
    const time = Date.now() * 0.001; // Current time in seconds
    
    // Subtle circular motion
    const radius = 2;
    this.helicopterLight.position.x = 8 + Math.sin(time * 0.3) * radius;
    this.helicopterLight.position.z = 8 + Math.cos(time * 0.3) * radius;
    
    // Slight up/down bobbing
    this.helicopterLight.position.y = 15 + Math.sin(time * 0.7) * 0.5;
    
    // Optional: slight intensity flickering for realism
    this.helicopterLight.intensity = 3 + Math.sin(time * 2) * 0.2;
}



    }


}
const fireInstance = new fire();

