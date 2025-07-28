/**
 * UI Manager Module
 * Handles all user interface interactions and updates
 */
class UIManager extends BaseModule {
    constructor() {
        super('UIManager');
        
        // UI state
        this.isInitialized = false;
        this.activeModals = new Set();
        this.notifications = [];
        
        // UI elements cache
        this.elements = new Map();
        
        // Event handlers
        this.boundHandlers = new Map();
    }

    async initialize() {
        await super.initialize();
        
        try {
            this.cacheElements();
            this.setupEventHandlers();
            this.initializeComponents();
            this.log('UI manager initialized successfully', 'success');
        } catch (error) {
            this.handleError(error, 'UI manager initialization failed');
            throw error;
        }
    }

    cacheElements() {
        const elementIds = [
            'fromInput',
            'toInput',
            'navigateBtn',
            'map',
            'navPanel',
            'settingsModal',
            'notificationContainer'
        ];

        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements.set(id, element);
            } else {
                this.log(`Element not found: ${id}`, 'warning');
            }
        });
    }

    setupEventHandlers() {
        // Navigation button
        this.bindEvent('navigateBtn', 'click', this.handleNavigationToggle.bind(this));
        
        // Input handlers
        this.bindEvent('fromInput', 'input', this.handleFromInput.bind(this));
        this.bindEvent('toInput', 'input', this.handleToInput.bind(this));
        
        // Map click handler will be set up by MapManager
        
        // Window events
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    bindEvent(elementId, event, handler) {
        const element = this.elements.get(elementId);
        if (element) {
            element.addEventListener(event, handler);
            this.boundHandlers.set(`${elementId}_${event}`, { element, event, handler });
        }
    }

    initializeComponents() {
        this.initializeNotificationSystem();
        this.initializeModalSystem();
        this.updateNavigationButton();
    }

    initializeNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!this.elements.get('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
            this.elements.set('notificationContainer', container);
        }
    }

    initializeModalSystem() {
        // Set up modal backdrop click handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeTopModal();
            }
        });

        // ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                this.closeTopModal();
            }
        });
    }

    /**
     * Event handlers
     */
    handleNavigationToggle() {
        this.emit('navigation:toggle');
    }

    handleFromInput(event) {
        const query = event.target.value;
        this.emit('search:from', { query });
    }

    handleToInput(event) {
        const query = event.target.value;
        this.emit('search:to', { query });
    }

    handleResize() {
        this.emit('ui:resize');
    }

    handleBeforeUnload(event) {
        this.emit('ui:beforeunload', event);
    }

    /**
     * UI update methods
     */
    updateNavigationButton(isNavigating = false) {
        const button = this.elements.get('navigateBtn');
        if (!button) return;

        if (isNavigating) {
            button.textContent = '🛑 Stop Navigation';
            button.className = 'navigate-btn stop-navigation';
        } else {
            button.textContent = '🚗 Start Navigation';
            button.className = 'navigate-btn start-navigation';
        }
    }

    updateLocationInputs(from = null, to = null) {
        if (from) {
            const fromInput = this.elements.get('fromInput');
            if (fromInput) {
                fromInput.value = this.formatLocationForInput(from);
            }
        }

        if (to) {
            const toInput = this.elements.get('toInput');
            if (toInput) {
                toInput.value = this.formatLocationForInput(to);
            }
        }
    }

    formatLocationForInput(location) {
        if (location.name) return location.name;
        if (location.address) return location.address;
        return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }

    /**
     * Notification system
     */
    showNotification(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type, duration);
        this.displayNotification(notification);
        
        this.emit('notification:shown', { message, type, duration });
        
        return notification.id;
    }

    createNotification(message, type, duration) {
        const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const notification = {
            id,
            message,
            type,
            duration,
            createdAt: Date.now()
        };

        this.notifications.push(notification);
        return notification;
    }

    displayNotification(notification) {
        const container = this.elements.get('notificationContainer');
        if (!container) return;

        const element = document.createElement('div');
        element.id = notification.id;
        element.className = `notification notification-${notification.type}`;
        element.style.cssText = `
            background: ${this.getNotificationColor(notification.type)};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            max-width: 300px;
            word-wrap: break-word;
        `;
        element.textContent = notification.message;

        // Click to dismiss
        element.addEventListener('click', () => {
            this.dismissNotification(notification.id);
        });

        container.appendChild(element);

        // Animate in
        setTimeout(() => {
            element.style.transform = 'translateX(0)';
        }, 10);

        // Auto dismiss
        if (notification.duration > 0) {
            setTimeout(() => {
                this.dismissNotification(notification.id);
            }, notification.duration);
        }
    }

    dismissNotification(notificationId) {
        const element = document.getElementById(notificationId);
        if (!element) return;

        element.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);

        // Remove from notifications array
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        
        this.emit('notification:dismissed', notificationId);
    }

    getNotificationColor(type) {
        const colors = {
            success: '#00FF88',
            error: '#FF6B6B',
            warning: '#FFB347',
            info: '#4ECDC4'
        };
        return colors[type] || colors.info;
    }

    /**
     * Modal system
     */
    showModal(modalId, content = null) {
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = this.createModal(modalId, content);
        }

        modal.style.display = 'block';
        this.activeModals.add(modalId);
        
        // Add backdrop if not exists
        this.addModalBackdrop();
        
        this.emit('modal:shown', modalId);
    }

    createModal(modalId, content) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00FF88;
            border-radius: 12px;
            padding: 20px;
            color: white;
            z-index: 10001;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
        `;

        if (content) {
            modal.innerHTML = content;
        }

        document.body.appendChild(modal);
        return modal;
    }

    addModalBackdrop() {
        if (document.querySelector('.modal-backdrop')) return;

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
        `;

        document.body.appendChild(backdrop);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }

        this.activeModals.delete(modalId);
        
        if (this.activeModals.size === 0) {
            this.removeModalBackdrop();
        }
        
        this.emit('modal:closed', modalId);
    }

    closeTopModal() {
        if (this.activeModals.size > 0) {
            const topModal = Array.from(this.activeModals).pop();
            this.closeModal(topModal);
        }
    }

    removeModalBackdrop() {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }

    /**
     * Progress indicators
     */
    showProgress(message = 'Loading...') {
        const progressId = 'globalProgress';
        let progress = document.getElementById(progressId);
        
        if (!progress) {
            progress = document.createElement('div');
            progress.id = progressId;
            progress.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 20px;
                border-radius: 8px;
                z-index: 10002;
                text-align: center;
            `;
            document.body.appendChild(progress);
        }

        progress.innerHTML = `
            <div class="spinner"></div>
            <div style="margin-top: 10px;">${message}</div>
        `;
        progress.style.display = 'block';
    }

    hideProgress() {
        const progress = document.getElementById('globalProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }

    /**
     * Utility methods
     */
    createElement(tag, className = '', styles = {}) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        
        Object.assign(element.style, styles);
        return element;
    }

    /**
     * Cleanup
     */
    destroy() {
        // Remove event listeners
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers.clear();

        // Clear notifications
        this.notifications.forEach(notification => {
            this.dismissNotification(notification.id);
        });

        // Close modals
        this.activeModals.forEach(modalId => {
            this.closeModal(modalId);
        });

        // Clear elements cache
        this.elements.clear();

        super.destroy();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}
