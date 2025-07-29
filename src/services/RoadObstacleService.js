// This file has been moved and renamed from TrafficCameraService.js
// Browser-compatible alias for TrafficCameraService

// Create an alias for browser compatibility
if (typeof window !== 'undefined' && window.TrafficCameraService) {
    window.RoadObstacleService = window.TrafficCameraService;
    console.log('✅ RoadObstacleService aliased to TrafficCameraService');
} else {
    console.warn('⚠️ TrafficCameraService not available for RoadObstacleService alias');
}
