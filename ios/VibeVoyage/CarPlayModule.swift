import Foundation
import CarPlay
import React

@objc(CarPlayModule)
class CarPlayModule: NSObject, RCTBridgeModule {
    
    static func moduleName() -> String! {
        return "CarPlayModule"
    }
    
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    private var interfaceController: CPInterfaceController?
    private var mapTemplate: CPMapTemplate?
    private var searchTemplate: CPSearchTemplate?
    private var listTemplate: CPListTemplate?
    private var isConnected = false
    
    // MARK: - Initialization
    
    @objc
    func initialize(_ config: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            do {
                // Set up CarPlay scene delegate
                self.setupCarPlaySceneDelegate()
                resolver(["success": true])
            } catch {
                rejecter("CARPLAY_INIT_ERROR", "Failed to initialize CarPlay", error)
            }
        }
    }
    
    private func setupCarPlaySceneDelegate() {
        // CarPlay scene delegate setup would be handled in SceneDelegate
        // This is a placeholder for the native implementation
        print("CarPlay scene delegate setup initiated")
    }
    
    // MARK: - Template Management
    
    @objc
    func setRootTemplate(_ templateConfig: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            guard let interfaceController = self.interfaceController else {
                rejecter("CARPLAY_NOT_CONNECTED", "CarPlay not connected", nil)
                return
            }
            
            let templateType = templateConfig["type"] as? String ?? "navigation"
            
            switch templateType {
            case "navigation":
                self.setupNavigationTemplate(templateConfig, interfaceController: interfaceController)
            case "search":
                self.setupSearchTemplate(templateConfig, interfaceController: interfaceController)
            case "list":
                self.setupListTemplate(templateConfig, interfaceController: interfaceController)
            default:
                self.setupNavigationTemplate(templateConfig, interfaceController: interfaceController)
            }
            
            resolver(["success": true])
        }
    }
    
    private func setupNavigationTemplate(_ config: NSDictionary, interfaceController: CPInterfaceController) {
        let mapTemplate = CPMapTemplate()
        
        // Configure navigation bar buttons
        if let leadingButtons = config["leadingNavigationBarButtons"] as? [[String: Any]] {
            mapTemplate.leadingNavigationBarButtons = createBarButtons(leadingButtons)
        }
        
        if let trailingButtons = config["trailingNavigationBarButtons"] as? [[String: Any]] {
            mapTemplate.trailingNavigationBarButtons = createBarButtons(trailingButtons)
        }
        
        // Configure map buttons
        if let mapButtons = config["mapButtons"] as? [[String: Any]] {
            mapTemplate.mapButtons = createMapButtons(mapButtons)
        }
        
        self.mapTemplate = mapTemplate
        interfaceController.setRootTemplate(mapTemplate, animated: true, completion: nil)
    }
    
    private func setupSearchTemplate(_ config: NSDictionary, interfaceController: CPInterfaceController) {
        let searchTemplate = CPSearchTemplate()
        
        searchTemplate.delegate = self
        
        self.searchTemplate = searchTemplate
        interfaceController.pushTemplate(searchTemplate, animated: true, completion: nil)
    }
    
    private func setupListTemplate(_ config: NSDictionary, interfaceController: CPInterfaceController) {
        let title = config["title"] as? String ?? "Settings"
        let sections = config["sections"] as? [[String: Any]] ?? []
        
        var listSections: [CPListSection] = []
        
        for sectionConfig in sections {
            let sectionTitle = sectionConfig["header"] as? String
            let items = sectionConfig["items"] as? [[String: Any]] ?? []
            
            var listItems: [CPListItem] = []
            
            for itemConfig in items {
                let itemTitle = itemConfig["title"] as? String ?? ""
                let itemSubtitle = itemConfig["subtitle"] as? String
                
                let listItem = CPListItem(text: itemTitle, detailText: itemSubtitle)
                listItem.userInfo = itemConfig["id"]
                listItems.append(listItem)
            }
            
            let section = CPListSection(items: listItems, header: sectionTitle, sectionIndexTitle: nil)
            listSections.append(section)
        }
        
        let listTemplate = CPListTemplate(title: title, sections: listSections)
        listTemplate.delegate = self
        
        self.listTemplate = listTemplate
        interfaceController.pushTemplate(listTemplate, animated: true, completion: nil)
    }
    
    private func createBarButtons(_ buttonConfigs: [[String: Any]]) -> [CPBarButton] {
        return buttonConfigs.compactMap { config in
            guard let id = config["id"] as? String,
                  let title = config["title"] as? String else { return nil }
            
            let button = CPBarButton(title: title) { [weak self] _ in
                self?.handleButtonPress(id: id, templateId: "navigation")
            }
            
            return button
        }
    }
    
    private func createMapButtons(_ buttonConfigs: [[String: Any]]) -> [CPMapButton] {
        return buttonConfigs.compactMap { config in
            guard let id = config["id"] as? String,
                  let title = config["title"] as? String else { return nil }
            
            let button = CPMapButton { [weak self] _ in
                self?.handleButtonPress(id: id, templateId: "map")
            }
            
            button.isEnabled = true
            return button
        }
    }
    
    // MARK: - Navigation Updates
    
    @objc
    func updateNavigationInfo(_ navigationData: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            guard let mapTemplate = self.mapTemplate else {
                rejecter("CARPLAY_NO_MAP_TEMPLATE", "No map template available", nil)
                return
            }
            
            // Update navigation guidance
            if let currentInstruction = navigationData["currentInstruction"] as? String {
                let maneuver = CPManeuver()
                maneuver.instructionVariants = [currentInstruction]
                
                let travelEstimates = CPTravelEstimates(
                    distanceRemaining: Measurement(value: 1000, unit: UnitLength.meters),
                    timeRemaining: 300
                )
                
                mapTemplate.updateEstimates(travelEstimates, for: maneuver)
            }
            
            resolver(["success": true])
        }
    }
    
    @objc
    func updateSearchResults(_ results: NSArray, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            guard let searchTemplate = self.searchTemplate else {
                rejecter("CARPLAY_NO_SEARCH_TEMPLATE", "No search template available", nil)
                return
            }
            
            var searchItems: [CPListItem] = []
            
            for result in results {
                if let resultDict = result as? [String: Any],
                   let title = resultDict["title"] as? String {
                    let subtitle = resultDict["subtitle"] as? String
                    let item = CPListItem(text: title, detailText: subtitle)
                    item.userInfo = resultDict["id"]
                    searchItems.append(item)
                }
            }
            
            searchTemplate.updateSearchResults(searchItems)
            resolver(["success": true])
        }
    }
    
    // MARK: - Event Handling
    
    private func handleButtonPress(id: String, templateId: String) {
        let eventData: [String: Any] = [
            "buttonId": id,
            "templateId": templateId
        ]
        
        sendEvent(withName: "CarPlay.buttonPressed", body: eventData)
    }
    
    private func sendEvent(withName name: String, body: Any?) {
        // Send event to React Native
        if let bridge = RCTBridge.current() {
            bridge.eventDispatcher().sendAppEvent(withName: name, body: body)
        }
    }
    
    // MARK: - CarPlay Scene Delegate Methods
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, 
                                 didConnect interfaceController: CPInterfaceController) {
        self.interfaceController = interfaceController
        self.isConnected = true
        
        sendEvent(withName: "CarPlay.connected", body: ["connected": true])
    }
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, 
                                 didDisconnect interfaceController: CPInterfaceController) {
        self.interfaceController = nil
        self.isConnected = false
        
        sendEvent(withName: "CarPlay.disconnected", body: ["connected": false])
    }
}

// MARK: - CPSearchTemplateDelegate

extension CarPlayModule: CPSearchTemplateDelegate {
    func searchTemplate(_ searchTemplate: CPSearchTemplate, updatedSearchText searchText: String, completionHandler: @escaping ([CPListItem]) -> Void) {
        
        sendEvent(withName: "CarPlay.searchUpdated", body: ["searchText": searchText])
        
        // Return empty results for now - will be updated via updateSearchResults
        completionHandler([])
    }
    
    func searchTemplate(_ searchTemplate: CPSearchTemplate, selectedResult item: CPListItem, completionHandler: @escaping () -> Void) {
        
        sendEvent(withName: "CarPlay.searchSelected", body: ["itemId": item.userInfo])
        completionHandler()
    }
}

// MARK: - CPListTemplateDelegate

extension CarPlayModule: CPListTemplateDelegate {
    func listTemplate(_ listTemplate: CPListTemplate, didSelect item: CPListItem, completionHandler: @escaping () -> Void) {
        
        sendEvent(withName: "CarPlay.listItemSelected", body: ["itemId": item.userInfo])
        completionHandler()
    }
}

// MARK: - React Native Bridge

extension CarPlayModule {
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc
    func constantsToExport() -> [AnyHashable: Any]! {
        return [
            "isCarPlaySupported": CPTemplateApplicationScene.self != nil,
            "isConnected": isConnected
        ]
    }
    
    @objc
    func supportedEvents() -> [String]! {
        return [
            "CarPlay.connected",
            "CarPlay.disconnected",
            "CarPlay.buttonPressed",
            "CarPlay.searchUpdated",
            "CarPlay.searchSelected",
            "CarPlay.listItemSelected"
        ]
    }
}
