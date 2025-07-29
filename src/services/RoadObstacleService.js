// This file has been moved and renamed from TrafficCameraService.js
// Browser-compatible alias for TrafficCameraService

// Wait for TrafficCameraService to be available, then create alias
setTimeout(() => {
    if (typeof window !== 'undefined' && window.TrafficCameraService) {
        window.RoadObstacleService = window.TrafficCameraService;
        console.log('✅ RoadObstacleService aliased to TrafficCameraService');
    } else {
        console.warn('⚠️ TrafficCameraService not available for RoadObstacleService alias');
    }
}, 100); // Small delay to ensure TrafficCameraService loads first
