const faceapi = require('face-api.js');
const { Canvas, Image, ImageData } = require('canvas');
const { query, queryOne } = require('../../../config/database');
const path = require('path');

// Configure face-api to use canvas node bindings
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class FaceRecognitionService {
    constructor() {
        this.modelsLoaded = false;
        this.modelsPath = path.join(__dirname, '../../../../models'); // Adjust path as needed
        this.threshold = 0.6; // Euclidean distance threshold
    }

    async loadModels() {
        if (this.modelsLoaded) return;
        console.log('[Face API] Loading models...');
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelsPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsPath);
        this.modelsLoaded = true;
        console.log('[Face API] Models loaded successfully.');
    }

    // Register a new staff member's face
    async registerFace(staffId, imageBuffer) {
        await this.loadModels();
        
        const img = new Image();
        img.src = imageBuffer;
        
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        if (!detection) {
            throw new Error('No face detected in the image');
        }

        const descriptor = Array.from(detection.descriptor);
        
        // Mock save to DB (Assume a table or field for staff face descriptors exists)
        // In reality we would store `JSON.stringify(descriptor)` in the staff profile
        return { success: true, descriptor };
    }

    // Compare live face with stored descriptor
    async verifyStaffEntry(liveImageBuffer, storedDescriptorJson) {
        await this.loadModels();

        const img = new Image();
        img.src = liveImageBuffer;

        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        if (!detection) {
            return { matched: false, score: null, error: 'No face detected' };
        }

        const liveDescriptor = detection.descriptor;
        const storedDescriptor = new Float32Array(JSON.parse(storedDescriptorJson));

        // Calculate Euclidean distance
        const distance = faceapi.euclideanDistance(liveDescriptor, storedDescriptor);
        const isMatch = distance < this.threshold;
        
        // Convert distance to a pseudo-confidence score (1.0 = perfect match, 0.0 = opposite)
        const score = Math.max(0, 1 - distance);

        return { matched: isMatch, score, distance };
    }
}

module.exports = new FaceRecognitionService();
