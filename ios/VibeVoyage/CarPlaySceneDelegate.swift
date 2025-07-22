import UIKit
import CarPlay

@available(iOS 13.0, *)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    var interfaceController: CPInterfaceController?
    var carPlayModule: CarPlayModule?
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, 
                                 didConnect interfaceController: CPInterfaceController) {
        self.interfaceController = interfaceController
        
        // Get CarPlayModule instance from React Native bridge
        if let bridge = RCTBridge.current(),
           let carPlayModule = bridge.module(for: CarPlayModule.self) as? CarPlayModule {
            self.carPlayModule = carPlayModule
            carPlayModule.templateApplicationScene(templateApplicationScene, didConnect: interfaceController)
        }
        
        // Set up initial template
        setupInitialTemplate()
    }
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, 
                                 didDisconnect interfaceController: CPInterfaceController) {
        // Notify CarPlayModule of disconnection
        if let carPlayModule = self.carPlayModule {
            carPlayModule.templateApplicationScene(templateApplicationScene, didDisconnect: interfaceController)
        }
        
        self.interfaceController = nil
        self.carPlayModule = nil
    }
    
    private func setupInitialTemplate() {
        guard let interfaceController = self.interfaceController else { return }
        
        // Create initial navigation template
        let mapTemplate = CPMapTemplate()
        
        // Add search button
        let searchButton = CPBarButton(title: "Search") { [weak self] _ in
            self?.presentSearchTemplate()
        }
        
        // Add settings button
        let settingsButton = CPBarButton(title: "Settings") { [weak self] _ in
            self?.presentSettingsTemplate()
        }
        
        mapTemplate.leadingNavigationBarButtons = [searchButton]
        mapTemplate.trailingNavigationBarButtons = [settingsButton]
        
        // Add map buttons
        let centerButton = CPMapButton { [weak self] _ in
            self?.handleCenterButtonPress()
        }
        
        let zoomInButton = CPMapButton { [weak self] _ in
            self?.handleZoomInButtonPress()
        }
        
        mapTemplate.mapButtons = [centerButton, zoomInButton]
        
        interfaceController.setRootTemplate(mapTemplate, animated: false, completion: nil)
    }
    
    private func presentSearchTemplate() {
        guard let interfaceController = self.interfaceController else { return }
        
        let searchTemplate = CPSearchTemplate()
        searchTemplate.delegate = self
        
        interfaceController.pushTemplate(searchTemplate, animated: true, completion: nil)
    }
    
    private func presentSettingsTemplate() {
        guard let interfaceController = self.interfaceController else { return }
        
        // Create settings list
        let voiceGuidanceItem = CPListItem(text: "Voice Guidance", detailText: "Enable turn-by-turn directions")
        let avoidTollsItem = CPListItem(text: "Avoid Tolls", detailText: "Route around toll roads")
        let avoidHighwaysItem = CPListItem(text: "Avoid Highways", detailText: "Use local roads when possible")
        
        let settingsSection = CPListSection(items: [voiceGuidanceItem, avoidTollsItem, avoidHighwaysItem], 
                                          header: "Navigation Settings", 
                                          sectionIndexTitle: nil)
        
        let listTemplate = CPListTemplate(title: "VibeVoyage Settings", sections: [settingsSection])
        listTemplate.delegate = self
        
        interfaceController.pushTemplate(listTemplate, animated: true, completion: nil)
    }
    
    private func handleCenterButtonPress() {
        // Send event to React Native
        sendEventToReactNative(eventName: "CarPlay.buttonPressed", 
                              body: ["buttonId": "center", "templateId": "map"])
    }
    
    private func handleZoomInButtonPress() {
        // Send event to React Native
        sendEventToReactNative(eventName: "CarPlay.buttonPressed", 
                              body: ["buttonId": "zoom_in", "templateId": "map"])
    }
    
    private func sendEventToReactNative(eventName: String, body: [String: Any]) {
        if let bridge = RCTBridge.current() {
            bridge.eventDispatcher().sendAppEvent(withName: eventName, body: body)
        }
    }
}

// MARK: - CPSearchTemplateDelegate

@available(iOS 13.0, *)
extension CarPlaySceneDelegate: CPSearchTemplateDelegate {
    func searchTemplate(_ searchTemplate: CPSearchTemplate, 
                       updatedSearchText searchText: String, 
                       completionHandler: @escaping ([CPListItem]) -> Void) {
        
        // Send search text to React Native
        sendEventToReactNative(eventName: "CarPlay.searchUpdated", 
                              body: ["searchText": searchText])
        
        // Return empty results for now - will be updated via CarPlayModule
        completionHandler([])
    }
    
    func searchTemplate(_ searchTemplate: CPSearchTemplate, 
                       selectedResult item: CPListItem, 
                       completionHandler: @escaping () -> Void) {
        
        // Send selection to React Native
        sendEventToReactNative(eventName: "CarPlay.searchSelected", 
                              body: ["itemId": item.userInfo ?? ""])
        
        completionHandler()
    }
}

// MARK: - CPListTemplateDelegate

@available(iOS 13.0, *)
extension CarPlaySceneDelegate: CPListTemplateDelegate {
    func listTemplate(_ listTemplate: CPListTemplate, 
                     didSelect item: CPListItem, 
                     completionHandler: @escaping () -> Void) {
        
        // Send selection to React Native
        sendEventToReactNative(eventName: "CarPlay.listItemSelected", 
                              body: ["itemId": item.text ?? "", "templateTitle": listTemplate.title ?? ""])
        
        completionHandler()
    }
}

// MARK: - RCTBridge Extension

extension RCTBridge {
    static func current() -> RCTBridge? {
        return RCTBridge.currentBridge()
    }
}
