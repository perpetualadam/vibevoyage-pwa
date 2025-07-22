package com.vibevoyage;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.ImageView;
import android.widget.LinearLayout;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class OverlayModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "OverlayModule";
    private static final int OVERLAY_PERMISSION_REQUEST_CODE = 1001;
    
    private ReactApplicationContext reactContext;
    private WindowManager windowManager;
    private View overlayView;
    private boolean isOverlayShown = false;
    private WindowManager.LayoutParams overlayParams;
    
    // Overlay UI components
    private TextView speedText;
    private TextView speedLimitText;
    private TextView instructionText;
    private TextView etaText;
    private ImageView turnIcon;
    private LinearLayout alertContainer;
    private TextView alertText;

    public OverlayModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.windowManager = (WindowManager) reactContext.getSystemService(Context.WINDOW_SERVICE);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void checkOverlayPermission(Promise promise) {
        try {
            boolean hasPermission = false;
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                hasPermission = Settings.canDrawOverlays(reactContext);
            } else {
                // Pre-Marshmallow devices don't need this permission
                hasPermission = true;
            }
            
            promise.resolve(hasPermission);
        } catch (Exception e) {
            promise.reject("OVERLAY_PERMISSION_CHECK_ERROR", "Failed to check overlay permission", e);
        }
    }

    @ReactMethod
    public void requestOverlayPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(reactContext)) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    
                    Activity currentActivity = getCurrentActivity();
                    if (currentActivity != null) {
                        currentActivity.startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE);
                        
                        // Check permission after a delay (user interaction required)
                        new android.os.Handler().postDelayed(() -> {
                            boolean granted = Settings.canDrawOverlays(reactContext);
                            promise.resolve(granted);
                        }, 2000);
                    } else {
                        promise.reject("NO_ACTIVITY", "No current activity available");
                    }
                } else {
                    promise.resolve(true);
                }
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("OVERLAY_PERMISSION_REQUEST_ERROR", "Failed to request overlay permission", e);
        }
    }

    @ReactMethod
    public void openOverlaySettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
            intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("OVERLAY_SETTINGS_ERROR", "Failed to open overlay settings", e);
        }
    }

    @ReactMethod
    public void showOverlay(ReadableMap config, Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                promise.reject("NO_PERMISSION", "Overlay permission not granted");
                return;
            }

            if (isOverlayShown) {
                hideOverlay(null);
            }

            createOverlayView(config);
            setupOverlayParams(config);
            
            windowManager.addView(overlayView, overlayParams);
            isOverlayShown = true;
            
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("OVERLAY_SHOW_ERROR", "Failed to show overlay", e);
        }
    }

    @ReactMethod
    public void hideOverlay(Promise promise) {
        try {
            if (isOverlayShown && overlayView != null) {
                windowManager.removeView(overlayView);
                isOverlayShown = false;
                overlayView = null;
            }
            
            if (promise != null) {
                promise.resolve(true);
            }
        } catch (Exception e) {
            if (promise != null) {
                promise.reject("OVERLAY_HIDE_ERROR", "Failed to hide overlay", e);
            }
        }
    }

    @ReactMethod
    public void updateOverlayData(ReadableMap data, Promise promise) {
        try {
            if (!isOverlayShown || overlayView == null) {
                if (promise != null) {
                    promise.reject("NO_OVERLAY", "Overlay not shown");
                }
                return;
            }

            updateOverlayContent(data);
            
            if (promise != null) {
                promise.resolve(true);
            }
        } catch (Exception e) {
            if (promise != null) {
                promise.reject("OVERLAY_UPDATE_ERROR", "Failed to update overlay", e);
            }
        }
    }

    private void createOverlayView(ReadableMap config) {
        LayoutInflater inflater = LayoutInflater.from(reactContext);
        overlayView = inflater.inflate(R.layout.navigation_overlay, null);
        
        // Initialize UI components
        speedText = overlayView.findViewById(R.id.speed_text);
        speedLimitText = overlayView.findViewById(R.id.speed_limit_text);
        instructionText = overlayView.findViewById(R.id.instruction_text);
        etaText = overlayView.findViewById(R.id.eta_text);
        turnIcon = overlayView.findViewById(R.id.turn_icon);
        alertContainer = overlayView.findViewById(R.id.alert_container);
        alertText = overlayView.findViewById(R.id.alert_text);
        
        // Set up click listeners
        overlayView.setOnClickListener(v -> {
            WritableMap eventData = Arguments.createMap();
            eventData.putString("action", "overlay_clicked");
            sendEvent("overlayClicked", eventData);
        });
        
        // Set up touch handling for dragging
        setupDragHandling();
        
        // Update initial content
        if (config.hasKey("data")) {
            updateOverlayContent(config.getMap("data"));
        }
    }

    private void setupOverlayParams(ReadableMap config) {
        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        overlayParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        );

        // Set position based on config
        String position = config.hasKey("overlayPosition") ? config.getString("overlayPosition") : "top-right";
        switch (position) {
            case "top-left":
                overlayParams.gravity = Gravity.TOP | Gravity.LEFT;
                break;
            case "top-right":
                overlayParams.gravity = Gravity.TOP | Gravity.RIGHT;
                break;
            case "bottom-left":
                overlayParams.gravity = Gravity.BOTTOM | Gravity.LEFT;
                break;
            case "bottom-right":
                overlayParams.gravity = Gravity.BOTTOM | Gravity.RIGHT;
                break;
            default:
                overlayParams.gravity = Gravity.TOP | Gravity.RIGHT;
        }

        overlayParams.x = 20;
        overlayParams.y = 100;
    }

    private void setupDragHandling() {
        overlayView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = overlayParams.x;
                        initialY = overlayParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                        
                    case MotionEvent.ACTION_MOVE:
                        overlayParams.x = initialX + (int) (event.getRawX() - initialTouchX);
                        overlayParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(overlayView, overlayParams);
                        return true;
                        
                    case MotionEvent.ACTION_UP:
                        return true;
                }
                return false;
            }
        });
    }

    private void updateOverlayContent(ReadableMap data) {
        if (data == null) return;

        // Update speed
        if (data.hasKey("currentSpeed") && speedText != null) {
            int speed = data.getInt("currentSpeed");
            speedText.setText(String.valueOf(speed));
        }

        // Update speed limit
        if (data.hasKey("speedLimit") && speedLimitText != null) {
            if (data.isNull("speedLimit")) {
                speedLimitText.setVisibility(View.GONE);
            } else {
                int speedLimit = data.getInt("speedLimit");
                speedLimitText.setText(String.valueOf(speedLimit));
                speedLimitText.setVisibility(View.VISIBLE);
            }
        }

        // Update instruction
        if (data.hasKey("currentInstruction") && instructionText != null) {
            if (data.isNull("currentInstruction")) {
                instructionText.setVisibility(View.GONE);
            } else {
                String instruction = data.getString("currentInstruction");
                instructionText.setText(instruction);
                instructionText.setVisibility(View.VISIBLE);
            }
        }

        // Update ETA
        if (data.hasKey("eta") && etaText != null) {
            if (data.isNull("eta")) {
                etaText.setVisibility(View.GONE);
            } else {
                String eta = data.getString("eta");
                etaText.setText(eta);
                etaText.setVisibility(View.VISIBLE);
            }
        }

        // Update obstacle alert
        if (data.hasKey("obstacleAlert") && alertContainer != null) {
            if (data.isNull("obstacleAlert")) {
                alertContainer.setVisibility(View.GONE);
            } else {
                ReadableMap alert = data.getMap("obstacleAlert");
                String alertType = alert.getString("type");
                int distance = alert.getInt("distance");
                
                alertText.setText(alertType + " " + distance + "m ahead");
                alertContainer.setVisibility(View.VISIBLE);
                
                // Auto-hide alert after 10 seconds
                new android.os.Handler().postDelayed(() -> {
                    if (alertContainer != null) {
                        alertContainer.setVisibility(View.GONE);
                    }
                }, 10000);
            }
        }
    }

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (isOverlayShown) {
            hideOverlay(null);
        }
    }
}
