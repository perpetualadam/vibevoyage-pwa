package com.vibevoyage;

import android.content.Intent;
import android.net.Uri;
import androidx.annotation.NonNull;
import androidx.car.app.CarAppService;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.Session;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.NavigationTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.SearchTemplate;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.NavigationManager;
import androidx.car.app.navigation.NavigationManagerCallback;
import androidx.car.app.navigation.model.Destination;
import androidx.car.app.navigation.model.Step;
import androidx.car.app.navigation.model.TravelEstimate;
import androidx.core.graphics.drawable.IconCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.List;

public class AndroidAutoModule extends ReactContextBaseJavaModule {
    
    private static final String MODULE_NAME = "AndroidAutoModule";
    private ReactApplicationContext reactContext;
    private VibeVoyageCarAppService carAppService;
    private boolean isConnected = false;
    
    public AndroidAutoModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }
    
    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }
    
    @ReactMethod
    public void initialize(ReadableMap config, Promise promise) {
        try {
            // Initialize Android Auto service
            carAppService = new VibeVoyageCarAppService(this);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ANDROID_AUTO_INIT_ERROR", "Failed to initialize Android Auto", e);
        }
    }
    
    @ReactMethod
    public void setMainScreen(ReadableMap screenConfig, Promise promise) {
        try {
            if (carAppService != null) {
                carAppService.setMainScreenConfig(screenConfig);
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ANDROID_AUTO_SCREEN_ERROR", "Failed to set main screen", e);
        }
    }
    
    @ReactMethod
    public void updateNavigationInfo(ReadableMap navigationData, Promise promise) {
        try {
            if (carAppService != null) {
                carAppService.updateNavigationInfo(navigationData);
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ANDROID_AUTO_NAV_ERROR", "Failed to update navigation info", e);
        }
    }
    
    @ReactMethod
    public void updateSearchResults(ReadableArray results, Promise promise) {
        try {
            if (carAppService != null) {
                carAppService.updateSearchResults(results);
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ANDROID_AUTO_SEARCH_ERROR", "Failed to update search results", e);
        }
    }
    
    public void sendEvent(String eventName, WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        }
    }
    
    public void onCarAppConnected() {
        isConnected = true;
        WritableMap params = Arguments.createMap();
        params.putBoolean("connected", true);
        sendEvent("AndroidAuto.connected", params);
    }
    
    public void onCarAppDisconnected() {
        isConnected = false;
        WritableMap params = Arguments.createMap();
        params.putBoolean("connected", false);
        sendEvent("AndroidAuto.disconnected", params);
    }
    
    public void onActionPressed(String actionId, String screenId) {
        WritableMap params = Arguments.createMap();
        params.putString("actionId", actionId);
        params.putString("screenId", screenId);
        sendEvent("AndroidAuto.actionPressed", params);
    }
    
    public void onSearchUpdated(String searchText) {
        WritableMap params = Arguments.createMap();
        params.putString("searchText", searchText);
        sendEvent("AndroidAuto.searchUpdated", params);
    }
    
    // Android Auto Car App Service
    public static class VibeVoyageCarAppService extends CarAppService {
        
        private AndroidAutoModule module;
        private ReadableMap mainScreenConfig;
        private ReadableMap currentNavigationData;
        private ReadableArray currentSearchResults;
        
        public VibeVoyageCarAppService(AndroidAutoModule module) {
            this.module = module;
        }
        
        @NonNull
        @Override
        public Session onCreateSession() {
            return new VibeVoyageSession();
        }
        
        public void setMainScreenConfig(ReadableMap config) {
            this.mainScreenConfig = config;
        }
        
        public void updateNavigationInfo(ReadableMap navigationData) {
            this.currentNavigationData = navigationData;
        }
        
        public void updateSearchResults(ReadableArray results) {
            this.currentSearchResults = results;
        }
        
        // Car App Session
        public class VibeVoyageSession extends Session {
            
            @NonNull
            @Override
            public Screen onCreateScreen(@NonNull Intent intent) {
                if (module != null) {
                    module.onCarAppConnected();
                }
                return new MainNavigationScreen(getCarContext());
            }
            
            @Override
            public void onDestroy() {
                super.onDestroy();
                if (module != null) {
                    module.onCarAppDisconnected();
                }
            }
        }
        
        // Main Navigation Screen
        public class MainNavigationScreen extends Screen {
            
            public MainNavigationScreen(@NonNull CarContext carContext) {
                super(carContext);
            }
            
            @NonNull
            @Override
            public Template onGetTemplate() {
                // Create navigation template
                NavigationTemplate.Builder builder = new NavigationTemplate.Builder();
                
                // Add action strip
                ActionStrip.Builder actionStripBuilder = new ActionStrip.Builder();
                
                actionStripBuilder.addAction(
                    new Action.Builder()
                        .setTitle("Search")
                        .setIcon(CarIcon.of(IconCompat.createWithResource(getCarContext(), R.drawable.ic_search)))
                        .setOnClickListener(() -> {
                            if (module != null) {
                                module.onActionPressed("search", "navigation");
                            }
                            getScreenManager().push(new SearchScreen(getCarContext()));
                        })
                        .build()
                );
                
                actionStripBuilder.addAction(
                    new Action.Builder()
                        .setTitle("Settings")
                        .setIcon(CarIcon.of(IconCompat.createWithResource(getCarContext(), R.drawable.ic_settings)))
                        .setOnClickListener(() -> {
                            if (module != null) {
                                module.onActionPressed("settings", "navigation");
                            }
                            getScreenManager().push(new SettingsScreen(getCarContext()));
                        })
                        .build()
                );
                
                builder.setActionStrip(actionStripBuilder.build());
                
                // Add map action strip
                ActionStrip.Builder mapActionStripBuilder = new ActionStrip.Builder();
                
                mapActionStripBuilder.addAction(
                    new Action.Builder()
                        .setTitle("Center")
                        .setIcon(CarIcon.of(IconCompat.createWithResource(getCarContext(), R.drawable.ic_my_location)))
                        .setOnClickListener(() -> {
                            if (module != null) {
                                module.onActionPressed("center", "navigation");
                            }
                        })
                        .build()
                );
                
                mapActionStripBuilder.addAction(
                    new Action.Builder()
                        .setTitle("Report")
                        .setIcon(CarIcon.of(IconCompat.createWithResource(getCarContext(), R.drawable.ic_report)))
                        .setOnClickListener(() -> {
                            if (module != null) {
                                module.onActionPressed("report", "navigation");
                            }
                        })
                        .build()
                );
                
                builder.setMapActionStrip(mapActionStripBuilder.build());
                
                return builder.build();
            }
        }
        
        // Search Screen
        public class SearchScreen extends Screen {
            
            private String currentSearchText = "";
            
            public SearchScreen(@NonNull CarContext carContext) {
                super(carContext);
            }
            
            @NonNull
            @Override
            public Template onGetTemplate() {
                SearchTemplate.Builder builder = new SearchTemplate.Builder(this::onSearchTextChanged);
                
                builder.setHeaderAction(Action.BACK);
                builder.setShowKeyboard(true);
                builder.setSearchHint("Where to?");
                
                // Add search results if available
                if (currentSearchResults != null && currentSearchResults.size() > 0) {
                    ItemList.Builder itemListBuilder = new ItemList.Builder();
                    
                    for (int i = 0; i < currentSearchResults.size(); i++) {
                        ReadableMap result = currentSearchResults.getMap(i);
                        if (result != null) {
                            String title = result.getString("title");
                            String subtitle = result.getString("subtitle");
                            
                            Row.Builder rowBuilder = new Row.Builder()
                                .setTitle(title != null ? title : "")
                                .addText(subtitle != null ? subtitle : "")
                                .setOnClickListener(() -> {
                                    // Handle search result selection
                                    getScreenManager().pop();
                                });
                            
                            itemListBuilder.addItem(rowBuilder.build());
                        }
                    }
                    
                    builder.setItemList(itemListBuilder.build());
                }
                
                return builder.build();
            }
            
            private void onSearchTextChanged(String searchText) {
                currentSearchText = searchText;
                if (module != null) {
                    module.onSearchUpdated(searchText);
                }
            }
        }
        
        // Settings Screen
        public class SettingsScreen extends Screen {
            
            public SettingsScreen(@NonNull CarContext carContext) {
                super(carContext);
            }
            
            @NonNull
            @Override
            public Template onGetTemplate() {
                ItemList.Builder itemListBuilder = new ItemList.Builder();
                
                // Add settings items
                itemListBuilder.addItem(
                    new Row.Builder()
                        .setTitle("Voice Guidance")
                        .addText("Enable turn-by-turn directions")
                        .setToggle(new androidx.car.app.model.Toggle.Builder(checked -> {
                            // Handle toggle change
                        }).setChecked(true).build())
                        .build()
                );
                
                itemListBuilder.addItem(
                    new Row.Builder()
                        .setTitle("Avoid Tolls")
                        .addText("Route around toll roads")
                        .setToggle(new androidx.car.app.model.Toggle.Builder(checked -> {
                            // Handle toggle change
                        }).setChecked(false).build())
                        .build()
                );
                
                return new ListTemplate.Builder()
                    .setSingleList(itemListBuilder.build())
                    .setTitle("VibeVoyage Settings")
                    .setHeaderAction(Action.BACK)
                    .build();
            }
        }
    }
}
