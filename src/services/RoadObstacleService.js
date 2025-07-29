// This file has been moved and renamed from TrafficCameraService.js
// Browser-compatible alias for TrafficCameraService

// Multiple attempts to create alias with increasing delays
let attempts = 0;
const maxAttempts = 10;

function createAlias() {
    attempts++;

    if (typeof window !== 'undefined' && window.TrafficCameraService) {
        window.RoadObstacleService = window.TrafficCameraService;
        console.log('✅ RoadObstacleService aliased to TrafficCameraService (attempt ' + attempts + ')');
        return true;
    } else if (attempts < maxAttempts) {
        console.log('⏳ Waiting for TrafficCameraService... (attempt ' + attempts + ')');
        setTimeout(createAlias, 100 * attempts); // Increasing delay
        return false;
    } else {
        console.warn('⚠️ TrafficCameraService not available for RoadObstacleService alias after ' + maxAttempts + ' attempts');
        return false;
    }
}

// Start immediately
createAlias();
